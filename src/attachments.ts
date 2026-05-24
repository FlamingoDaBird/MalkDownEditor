import * as path from "path";
import * as vscode from "vscode";
import type { ShowEditorDialogMessage, UploadAttachmentMessage } from "./shared/protocol";
import {
  DEFAULT_ATTACHMENT_TRASH_ENABLED,
  DEFAULT_ATTACHMENT_TRASH_FOLDER,
  DEFAULT_ATTACHMENT_TRASH_PRESERVE_ORIGINAL_PATH,
  DEFAULT_ATTACHMENT_TRASH_WRITE_INDEX,
  buildTrashRelativePath,
  executeAttachmentTrashMove,
  normalizeRelativePath,
  normalizeTrashRootPath,
  shouldOfferAttachmentTrash,
  shouldWriteAttachmentTrashIndex,
  type AttachmentTrashSettings,
} from "./utils/attachment-trash";

type AttachmentLocationMode =
  | "markdown-folder"
  | "markdown-folder-attachments"
  | "workspace-relative-path"
  | "ask-each-time";

interface AttachmentSettings {
  locationMode: AttachmentLocationMode;
  folderName: string;
  workspacePath: string;
  alwaysUseOriginalFilename: boolean;
  alwaysConfirmNameAndPath: boolean;
  askBeforeDeletingFiles: boolean;
  generatedNameDigits: number;
  trash: AttachmentTrashSettings;
}

export interface SavedAttachment {
  markdownPath: string;
  directory: vscode.Uri;
}

interface AttachmentSaveDetails {
  directory: vscode.Uri;
  filename: string;
}

interface ImageReference {
  source: string;
  uri: vscode.Uri;
  count: number;
}

interface PendingAttachmentFile {
  uri: vscode.Uri;
  documentUri: vscode.Uri;
  timer?: ReturnType<typeof setTimeout>;
  action?: AttachmentRemovalAction;
}

type AttachmentRemovalAction = "delete" | "trash";
type AttachmentDeletionChoice =
  | "deleteFile"
  | "trashFile"
  | "keepFile"
  | "undoRemove";
type EditorDialogPrompt = Omit<ShowEditorDialogMessage, "type" | "requestId">;
type EditorDialogPromptHandler = (
  dialog: EditorDialogPrompt,
) => Promise<string | undefined>;

const DEFAULT_ATTACHMENT_FOLDER = ".attachments";
const DEFAULT_WORKSPACE_PATH = "attachments";
const DEFAULT_ATTACHMENT_LOCATION_MODE: AttachmentLocationMode =
  "markdown-folder-attachments";
const DEFAULT_ALWAYS_USE_ORIGINAL_FILENAME = false;
const DEFAULT_ALWAYS_CONFIRM_NAME_AND_PATH = false;
const DEFAULT_ASK_BEFORE_DELETING_FILES = true;
const DEFAULT_GENERATED_NAME_DIGITS = 9;
const PENDING_UPLOAD_REFERENCE_CHECK_DELAY_MS = 3000;
const PENDING_ATTACHMENT_DELETE_DELAY_MS = 5000;
const LAST_ATTACHMENT_DIRECTORY_KEY = "mdeditor.lastAttachmentDirectory";
const SAVED_ATTACHMENTS_KEY = "mdeditor.savedAttachments";
const ATTACHMENT_SETTING_KEYS = [
  "attachments.locationMode",
  "attachments.folderName",
  "attachments.path",
  "attachments.alwaysUseOriginalFilename",
  "attachments.alwaysConfirmNameAndPath",
  "attachments.askBeforeDeletingFiles",
  "attachments.generatedNameDigits",
  "attachments.trash.enabled",
  "attachments.trash.folderName",
  "attachments.trash.preserveOriginalPath",
  "attachments.trash.writeIndex",
] as const;
const DEFAULT_ATTACHMENT_SETTINGS: Record<
  (typeof ATTACHMENT_SETTING_KEYS)[number],
  string | boolean | number
> = {
  "attachments.locationMode": DEFAULT_ATTACHMENT_LOCATION_MODE,
  "attachments.folderName": DEFAULT_ATTACHMENT_FOLDER,
  "attachments.path": DEFAULT_WORKSPACE_PATH,
  "attachments.alwaysUseOriginalFilename": DEFAULT_ALWAYS_USE_ORIGINAL_FILENAME,
  "attachments.alwaysConfirmNameAndPath": DEFAULT_ALWAYS_CONFIRM_NAME_AND_PATH,
  "attachments.askBeforeDeletingFiles": DEFAULT_ASK_BEFORE_DELETING_FILES,
  "attachments.generatedNameDigits": DEFAULT_GENERATED_NAME_DIGITS,
  "attachments.trash.enabled": DEFAULT_ATTACHMENT_TRASH_ENABLED,
  "attachments.trash.folderName": DEFAULT_ATTACHMENT_TRASH_FOLDER,
  "attachments.trash.preserveOriginalPath": DEFAULT_ATTACHMENT_TRASH_PRESERVE_ORIGINAL_PATH,
  "attachments.trash.writeIndex": DEFAULT_ATTACHMENT_TRASH_WRITE_INDEX,
};

export class AttachmentManager {
  private _settingsSetupPromise: Promise<void> | undefined;
  private readonly _pendingDeletePrompts = new Set<string>();
  private readonly _pendingDeletions = new Map<string, PendingAttachmentFile>();
  private readonly _pendingUploadedAttachments = new Map<string, PendingAttachmentFile>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  async saveUploadedAttachment(
    document: vscode.TextDocument,
    message: UploadAttachmentMessage,
  ): Promise<SavedAttachment> {
    await this._ensureAttachmentSettingsConfigured(document.uri);

    const settings = this._getSettings(document.uri);
    let directory = settings.locationMode === "ask-each-time"
      ? this._lastDirectory() ?? this._dirnameUri(document.uri)
      : await this._resolveAttachmentDirectory(document, settings);
    let filename = await this._createInitialFilename(
      document,
      directory,
      message,
      settings,
    );

    if (
      settings.alwaysConfirmNameAndPath ||
      settings.locationMode === "ask-each-time"
    ) {
      const details = await this._promptForAttachmentSaveDetails(
        document,
        message,
        settings,
        directory,
        filename,
      );
      directory = details.directory;
      filename = details.filename;
    }

    filename = await this._ensureUniqueFilename(directory, filename);

    await vscode.workspace.fs.createDirectory(directory);

    const fileUri = vscode.Uri.joinPath(directory, filename);
    const bytes = Buffer.from(message.dataBase64, "base64");
    await vscode.workspace.fs.writeFile(fileUri, bytes);
    await this._rememberSavedAttachment(document.uri, fileUri);
    this._trackPendingUploadedAttachment(document, fileUri);

    await this.context.workspaceState.update(
      LAST_ATTACHMENT_DIRECTORY_KEY,
      directory.toString(),
    );

    return {
      markdownPath: this._toMarkdownRelativePath(document.uri, fileUri),
      directory,
    };
  }

  resolveImageSrc(
    document: vscode.TextDocument,
    webview: vscode.Webview,
    src: string,
  ): string {
    if (this._isBrowserUrl(src)) return src;

    const fileUri = this._resolveMarkdownImageUri(document.uri, src);
    return webview.asWebviewUri(fileUri).toString();
  }

  resolveImageFilePath(
    document: vscode.TextDocument,
    src: string,
  ): string {
    if (this._isBrowserUrl(src)) return src;

    const fileUri = this._resolveMarkdownImageUri(document.uri, src);
    return fileUri.scheme === "file" ? fileUri.fsPath : fileUri.toString();
  }

  async promptForDeletedAttachments(
    document: vscode.TextDocument,
    previousMarkdown: string,
    nextMarkdown: string,
    showDialog?: EditorDialogPromptHandler,
  ): Promise<vscode.Uri[]> {
    if (previousMarkdown === nextMarkdown) return [];

    const settings = this._getSettings(document.uri);
    if (!settings.askBeforeDeletingFiles) {
      this._clearReferencedPendingUploads(document.uri, nextMarkdown);
      return [];
    }

    const previousRefs = this._collectLocalImageReferences(
      document.uri,
      previousMarkdown,
    );
    const nextRefs = this._collectLocalImageReferences(
      document.uri,
      nextMarkdown,
    );

    const deletedFiles: vscode.Uri[] = [];
    const promptedKeys = new Set<string>();

    for (const [key, reference] of previousRefs) {
      if (nextRefs.has(key)) continue;

      promptedKeys.add(key);
      const choice = await this._promptForAttachmentDeletion(
        document,
        reference.uri,
        { allowUndoRemove: true },
        showDialog,
      );

      if (choice === "undoRemove") {
        await this._restoreMarkdown(document, previousMarkdown);
        return deletedFiles;
      }

      if (choice === "deleteFile" || choice === "trashFile") {
        deletedFiles.push(reference.uri);
      }
    }

    await this._promptForAbandonedUploadedAttachments(
      document,
      previousRefs,
      nextRefs,
      promptedKeys,
      deletedFiles,
      showDialog,
    );

    return deletedFiles;
  }

  /**
   * Flush pending deletions: delete tracked files that are still unreferenced.
   * Called when the document changes again (new edit) to actually delete the files.
   * Also restores files that are now referenced (undo case).
   */
  async flushPendingDeletions(document: vscode.TextDocument): Promise<void> {
    if (this._pendingDeletions.size === 0) return;

    const documentKey = this._documentRegistryKey(document.uri);

    for (const [key, info] of [...this._pendingDeletions]) {
      if (this._documentRegistryKey(info.documentUri) !== documentKey) {
        continue;
      }

      await this._flushPendingDeletion(document, key);
    }
  }

  async collectDeletedAttachments(
    document: vscode.TextDocument,
    previousMarkdown: string,
    nextMarkdown: string,
  ): Promise<vscode.Uri[]> {
    if (previousMarkdown === nextMarkdown) return [];

    const previousRefs = this._collectLocalImageReferences(
      document.uri,
      previousMarkdown,
    );
    if (previousRefs.size === 0) return [];

    const nextRefs = this._collectLocalImageReferences(
      document.uri,
      nextMarkdown,
    );

    const deletedFiles: vscode.Uri[] = [];

    for (const [key, reference] of previousRefs) {
      if (nextRefs.has(key)) continue;
      if (await this._shouldOfferAttachmentDeletion(document.uri, reference.uri)) {
        deletedFiles.push(reference.uri);
      }
    }

    return deletedFiles;
  }

  async restoreDeletedAttachment(fileUri: vscode.Uri): Promise<void> {
    // Check if file was previously tracked as a saved attachment
    // If so, we need to recreate it (but we don't have the original content)
    // For now, we just log a warning
    try {
      const exists = await this._isExistingFile(fileUri);
      if (!exists) {
        void vscode.window.showWarningMessage(
          `Cannot restore deleted attachment — the file was already removed from disk: ${this._displayUri(fileUri)}`,
        );
      }
    } catch {
      // Silently ignore
    }
  }

  private _getSettings(resource: vscode.Uri): AttachmentSettings {
    const config = vscode.workspace.getConfiguration("mdEditor", resource);
    const locationMode = config.get<AttachmentLocationMode>(
      "attachments.locationMode",
      DEFAULT_ATTACHMENT_LOCATION_MODE,
    );

    return {
      locationMode,
      folderName: config.get<string>(
        "attachments.folderName",
        DEFAULT_ATTACHMENT_FOLDER,
      ),
      workspacePath: config.get<string>(
        "attachments.path",
        DEFAULT_WORKSPACE_PATH,
      ),
      alwaysUseOriginalFilename: config.get<boolean>(
        "attachments.alwaysUseOriginalFilename",
        DEFAULT_ALWAYS_USE_ORIGINAL_FILENAME,
      ),
      alwaysConfirmNameAndPath: config.get<boolean>(
        "attachments.alwaysConfirmNameAndPath",
        DEFAULT_ALWAYS_CONFIRM_NAME_AND_PATH,
      ),
      askBeforeDeletingFiles: config.get<boolean>(
        "attachments.askBeforeDeletingFiles",
        DEFAULT_ASK_BEFORE_DELETING_FILES,
      ),
      generatedNameDigits: Math.max(
        1,
        Math.min(
          18,
          config.get<number>(
            "attachments.generatedNameDigits",
            DEFAULT_GENERATED_NAME_DIGITS,
          ),
        ),
      ),
      trash: {
        enabled: config.get<boolean>(
          "attachments.trash.enabled",
          DEFAULT_ATTACHMENT_TRASH_ENABLED,
        ),
        folderName: config.get<string>(
          "attachments.trash.folderName",
          DEFAULT_ATTACHMENT_TRASH_FOLDER,
        ),
        preserveOriginalPath: config.get<boolean>(
          "attachments.trash.preserveOriginalPath",
          DEFAULT_ATTACHMENT_TRASH_PRESERVE_ORIGINAL_PATH,
        ),
        writeIndex: config.get<boolean>(
          "attachments.trash.writeIndex",
          DEFAULT_ATTACHMENT_TRASH_WRITE_INDEX,
        ),
      },
    };
  }

  private async _ensureAttachmentSettingsConfigured(
    resource: vscode.Uri,
  ): Promise<void> {
    if (this._hasExplicitAttachmentSettings(resource)) return;

    this._settingsSetupPromise ??= this._promptForInitialAttachmentSettings(
      resource,
    ).finally(() => {
      this._settingsSetupPromise = undefined;
    });

    await this._settingsSetupPromise;
  }

  private _hasExplicitAttachmentSettings(resource: vscode.Uri): boolean {
    const config = vscode.workspace.getConfiguration("mdEditor", resource);

    return ATTACHMENT_SETTING_KEYS.some((key) => {
      const inspection = config.inspect<unknown>(key);
      if (!inspection) return false;

      return [
        inspection.globalValue,
        inspection.workspaceValue,
        inspection.workspaceFolderValue,
        inspection.globalLanguageValue,
        inspection.workspaceLanguageValue,
        inspection.workspaceFolderLanguageValue,
      ].some((value) => value !== undefined);
    });
  }

  private async _promptForInitialAttachmentSettings(
    resource: vscode.Uri,
  ): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      "MalkDown Editor attachment settings are not configured yet.",
      {
        modal: true,
        detail: [
          "Default attachment setup",
          "",
          "Folder:",
          ".attachments next to the current Markdown file",
          "",
          "Filename format:",
          "<markdown-file>-000000001.<ext>",
          "",
          "Example:",
          "features-000000001.png",
          "",
          "Attachment trash:",
          `${DEFAULT_ATTACHMENT_TRASH_FOLDER} in the workspace root`,
        ].join("\n"),
      },
      "Use Defaults",
      "Open Settings",
      "Cancel",
    );

    if (choice === "Use Defaults") {
      await this._persistDefaultAttachmentSettings(resource);
      return;
    }

    if (choice === "Open Settings") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "mdEditor.attachments",
      );
    }

    throw new Error("Attachment upload cancelled.");
  }

  private async _persistDefaultAttachmentSettings(
    resource: vscode.Uri,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration("mdEditor", resource);
    const target = vscode.workspace.workspaceFolders?.length
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;

    for (const key of ATTACHMENT_SETTING_KEYS) {
      await config.update(key, DEFAULT_ATTACHMENT_SETTINGS[key], target);
    }
  }

  private _collectLocalImageReferences(
    markdownUri: vscode.Uri,
    markdown: string,
  ): Map<string, ImageReference> {
    const references = new Map<string, ImageReference>();

    for (const source of this._extractImageSources(markdown)) {
      const uri = this._resolveDeletableImageUri(markdownUri, source);
      if (!uri) continue;

      const key = this._canonicalUriKey(uri);
      const existing = references.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }

      references.set(key, { source, uri, count: 1 });
    }

    return references;
  }

  private _extractImageSources(markdown: string): string[] {
    return [
      ...this._extractMarkdownImageSources(markdown),
      ...this._extractHtmlImageSources(markdown),
    ];
  }

  private _extractMarkdownImageSources(markdown: string): string[] {
    const sources: string[] = [];
    const expression = /!\[[^\]\n]*\]\(([^)\n]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = expression.exec(markdown))) {
      const source = this._parseMarkdownLinkDestination(match[1]);
      if (source) sources.push(source);
    }

    return sources;
  }

  private _extractHtmlImageSources(markdown: string): string[] {
    const sources: string[] = [];
    const expression = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
    let match: RegExpExecArray | null;

    while ((match = expression.exec(markdown))) {
      const source = match[1] ?? match[2] ?? match[3];
      if (source) sources.push(source);
    }

    return sources;
  }

  private _parseMarkdownLinkDestination(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith("<")) {
      const closingIndex = trimmed.indexOf(">");
      return closingIndex > 1 ? trimmed.slice(1, closingIndex).trim() : undefined;
    }

    const quotedTitleIndex = trimmed.search(/\s["'(]/);
    return (quotedTitleIndex === -1
      ? trimmed
      : trimmed.slice(0, quotedTitleIndex)).trim() || undefined;
  }

  private _resolveDeletableImageUri(
    markdownUri: vscode.Uri,
    source: string,
  ): vscode.Uri | undefined {
    if (!source || this._isBrowserUrl(source)) return undefined;
    if (/^file:/i.test(source)) return undefined;

    const withoutFragment = source.split("#")[0].split("?")[0];
    if (!withoutFragment) return undefined;

    const decoded = this._safeDecodeUriComponentPath(withoutFragment);
    if (path.posix.isAbsolute(decoded) || path.isAbsolute(decoded)) {
      return undefined;
    }

    const uri = this._resolveMarkdownImageUri(markdownUri, source);
    return uri.scheme === "file" ? uri : undefined;
  }

  private async _shouldOfferAttachmentDeletion(
    markdownUri: vscode.Uri,
    fileUri: vscode.Uri,
  ): Promise<boolean> {
    if (fileUri.scheme !== "file") return false;
    if (!(await this._isExistingFile(fileUri))) return false;
    if (this._isTrackedAttachment(markdownUri, fileUri)) return true;

    return this._managedAttachmentDirectories(markdownUri).some((directory) =>
      this._isEqualOrChildUri(fileUri, directory),
    );
  }

  private _trackPendingUploadedAttachment(
    document: vscode.TextDocument,
    fileUri: vscode.Uri,
  ): void {
    const key = this._canonicalUriKey(fileUri);
    const existing = this._pendingUploadedAttachments.get(key);
    if (existing?.timer) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      void this._checkPendingUploadedAttachment(document, key).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to check pending uploaded attachment:", message);
      });
    }, PENDING_UPLOAD_REFERENCE_CHECK_DELAY_MS);

    this._pendingUploadedAttachments.set(key, {
      uri: fileUri,
      documentUri: document.uri,
      timer,
    });
  }

  private _clearPendingUploadedAttachment(key: string): void {
    const pending = this._pendingUploadedAttachments.get(key);
    if (pending?.timer) clearTimeout(pending.timer);
    this._pendingUploadedAttachments.delete(key);
  }

  private _clearReferencedPendingUploads(
    markdownUri: vscode.Uri,
    markdown: string,
  ): void {
    if (this._pendingUploadedAttachments.size === 0) return;

    const documentKey = this._documentRegistryKey(markdownUri);
    const refs = this._collectLocalImageReferences(markdownUri, markdown);

    for (const [key, pending] of [...this._pendingUploadedAttachments]) {
      if (this._documentRegistryKey(pending.documentUri) !== documentKey) {
        continue;
      }

      if (refs.has(key)) {
        this._clearPendingUploadedAttachment(key);
      }
    }
  }

  private async _checkPendingUploadedAttachment(
    document: vscode.TextDocument,
    key: string,
  ): Promise<void> {
    const pending = this._pendingUploadedAttachments.get(key);
    if (!pending) return;
    if (
      this._documentRegistryKey(pending.documentUri) !==
      this._documentRegistryKey(document.uri)
    ) {
      return;
    }

    const settings = this._getSettings(document.uri);
    if (!settings.askBeforeDeletingFiles) {
      this._clearPendingUploadedAttachment(key);
      return;
    }

    const currentRefs = this._collectLocalImageReferences(
      document.uri,
      document.getText(),
    );

    if (currentRefs.has(key)) {
      this._clearPendingUploadedAttachment(key);
      return;
    }

    await this._promptForAttachmentDeletion(document, pending.uri);
    this._clearPendingUploadedAttachment(key);
  }

  private async _promptForAbandonedUploadedAttachments(
    document: vscode.TextDocument,
    previousRefs: Map<string, ImageReference>,
    nextRefs: Map<string, ImageReference>,
    promptedKeys: Set<string>,
    deletedFiles: vscode.Uri[],
    showDialog?: EditorDialogPromptHandler,
  ): Promise<void> {
    if (this._pendingUploadedAttachments.size === 0) return;

    const documentKey = this._documentRegistryKey(document.uri);

    for (const [key, pending] of [...this._pendingUploadedAttachments]) {
      if (this._documentRegistryKey(pending.documentUri) !== documentKey) {
        continue;
      }

      if (nextRefs.has(key)) {
        this._clearPendingUploadedAttachment(key);
        continue;
      }

      if (previousRefs.has(key) || promptedKeys.has(key)) {
        this._clearPendingUploadedAttachment(key);
        continue;
      }

      const choice = await this._promptForAttachmentDeletion(
        document,
        pending.uri,
        {},
        showDialog,
      );
      if (choice === "deleteFile" || choice === "trashFile") {
        deletedFiles.push(pending.uri);
      }

      this._clearPendingUploadedAttachment(key);
    }
  }

  private async _promptForAttachmentDeletion(
    document: vscode.TextDocument,
    fileUri: vscode.Uri,
    options: { allowUndoRemove?: boolean } = {},
    showDialog?: EditorDialogPromptHandler,
  ): Promise<AttachmentDeletionChoice> {
    const key = this._canonicalUriKey(fileUri);
    if (this._pendingDeletePrompts.has(key)) return "keepFile";
    if (!(await this._shouldOfferAttachmentDeletion(document.uri, fileUri))) {
      return "keepFile";
    }

    const filename = this._basename(fileUri);
    const cancel = "Cancel";
    const removeFromPage = "Remove from Page";
    const moveToTrash = "Move to Trash";
    const deleteEverywhere = "Delete Everywhere";
    const settings = this._getSettings(document.uri);
    const trashRoot = settings.trash.enabled
      ? this._resolveAttachmentTrashRoot(document.uri, settings)
      : undefined;
    const canMoveToTrash =
      !!trashRoot && shouldOfferAttachmentTrash(settings.trash, fileUri.scheme);
    const statusDetail = options.allowUndoRemove
      ? "The attachment reference has been removed from the Markdown document. The file on disk has not been deleted yet."
      : "This attachment is no longer referenced by the Markdown document. The file on disk has not been deleted yet.";
    const detailSections: NonNullable<EditorDialogPrompt["detailsSections"]> = [
      {
        label: "Status",
        text: statusDetail,
      },
      {
        label: cancel,
        text: options.allowUndoRemove
          ? "Put the attachment reference back into the Markdown document."
          : "Leave the file on disk.",
      },
      {
        label: removeFromPage,
        text: "Keep the Markdown change, but leave the file on disk.",
      },
    ];
    if (canMoveToTrash) {
      detailSections.push({
        label: moveToTrash,
        text: "Keep the Markdown change and move the file into the attachment trash so it can be recovered later.",
      });
    }
    detailSections.push({
      label: deleteEverywhere,
      text: "Keep the Markdown change and delete the file from disk.",
      kind: "destructive",
    });
    if (trashRoot) {
      detailSections.push({
        label: "Trash folder",
        text: this._absoluteDisplayUri(trashRoot),
        monospace: true,
      });
    }
    detailSections.push({
      label: "Full path",
      text: this._absoluteDisplayUri(fileUri),
      monospace: true,
    });
    const detail = detailSections
      .map((section) => (
        section.label
          ? `${section.label}:\n${section.text}`
          : section.text
      ))
      .join("\n\n");
    const mapDialogResult = (buttonId: string | undefined): AttachmentDeletionChoice => {
      if (buttonId === "deleteEverywhere") return "deleteFile";
      if (buttonId === "moveToTrash" && canMoveToTrash) return "trashFile";
      if (buttonId === "cancel" && options.allowUndoRemove) return "undoRemove";
      return "keepFile";
    };

    this._pendingDeletePrompts.add(key);
    try {
      if (showDialog) {
        const buttons: EditorDialogPrompt["buttons"] = [
          {
            id: "cancel",
            label: cancel,
            kind: "secondary",
            placement: "left",
            default: true,
            cancel: true,
          },
          {
            id: "removeFromPage",
            label: removeFromPage,
            kind: "secondary",
            placement: "right",
          },
        ];
        if (canMoveToTrash) {
          buttons.push({
            id: "moveToTrash",
            label: moveToTrash,
            kind: "primary",
            placement: "right",
          });
        }
        buttons.push({
          id: "deleteEverywhere",
          label: deleteEverywhere,
          kind: "destructive",
          placement: "right",
        });

        const buttonId = await showDialog({
          title: "Remove attachment?",
          body: [`File name: ${filename}`],
          details: detail,
          detailsSections: detailSections,
          detailsLabel: "More details",
          buttons,
        });

        if (buttonId !== undefined) {
          const result = mapDialogResult(buttonId);
          if (result === "deleteFile") {
            this._queuePendingAttachmentRemoval(document, fileUri, "delete");
          }
          if (result === "trashFile") {
            this._queuePendingAttachmentRemoval(document, fileUri, "trash");
          }
          return result;
        }
      }

      const choices: vscode.MessageItem[] = [
        { title: deleteEverywhere },
        ...(canMoveToTrash ? [{ title: moveToTrash }] : []),
        { title: removeFromPage },
        { title: cancel, isCloseAffordance: true },
      ];
      const fallbackDetail = [
        "This fallback native dialog cannot collapse details.",
        "",
        detail,
      ].join("\n");
      const choice = await vscode.window.showWarningMessage(
        `Remove attachment?\n\nFile name: ${filename}`,
        { modal: true, detail: fallbackDetail },
        ...choices,
      );

      const result = mapDialogResult(
        choice?.title === deleteEverywhere
          ? "deleteEverywhere"
          : choice?.title === moveToTrash
            ? "moveToTrash"
          : choice?.title === removeFromPage
            ? "removeFromPage"
            : "cancel",
      );
      if (result === "deleteFile") {
        this._queuePendingAttachmentRemoval(document, fileUri, "delete");
      }
      if (result === "trashFile") {
        this._queuePendingAttachmentRemoval(document, fileUri, "trash");
      }
      return result;
    } finally {
      this._pendingDeletePrompts.delete(key);
    }
  }

  private async _restoreMarkdown(
    document: vscode.TextDocument,
    markdown: string,
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );

    edit.replace(document.uri, range, markdown);
    await vscode.workspace.applyEdit(edit);
  }

  private _queuePendingAttachmentRemoval(
    document: vscode.TextDocument,
    fileUri: vscode.Uri,
    action: AttachmentRemovalAction,
  ): void {
    const key = this._canonicalUriKey(fileUri);
    const existing = this._pendingDeletions.get(key);
    if (existing?.timer) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      void this._flushPendingDeletion(document, key).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(
          `Failed to ${action === "trash" ? "move attachment to trash" : "delete attachment"}: ${message}`,
        );
      });
    }, PENDING_ATTACHMENT_DELETE_DELAY_MS);

    this._pendingDeletions.set(key, {
      uri: fileUri,
      documentUri: document.uri,
      timer,
      action,
    });
  }

  private _clearPendingDeletion(key: string): void {
    const pending = this._pendingDeletions.get(key);
    if (pending?.timer) clearTimeout(pending.timer);
    this._pendingDeletions.delete(key);
  }

  private async _flushPendingDeletion(
    document: vscode.TextDocument,
    key: string,
  ): Promise<void> {
    const info = this._pendingDeletions.get(key);
    if (!info) return;
    if (
      this._documentRegistryKey(info.documentUri) !==
      this._documentRegistryKey(document.uri)
    ) {
      return;
    }

    const currentRefs = this._collectLocalImageReferences(
      document.uri,
      document.getText(),
    );

    if (currentRefs.has(key)) {
      this._clearPendingDeletion(key);
      return;
    }

    try {
      if (await this._isExistingFile(info.uri)) {
        if (info.action === "trash") {
          await this._moveAttachmentToTrash(document, info.uri);
        } else {
          await vscode.workspace.fs.delete(info.uri, {
            recursive: false,
            useTrash: true,
          });
        }
      }
      await this._forgetSavedAttachment(info.documentUri, info.uri);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `Failed to ${info.action === "trash" ? "move attachment to trash" : "delete attachment"}: ${message}`,
      );
    } finally {
      this._clearPendingDeletion(key);
    }
  }

  private async _moveAttachmentToTrash(
    document: vscode.TextDocument,
    fileUri: vscode.Uri,
  ): Promise<void> {
    const settings = this._getSettings(document.uri);
    const trashRoot = this._resolveAttachmentTrashRoot(document.uri, settings);
    if (!trashRoot) throw new Error("Attachment trash is not enabled.");

    if (this._isEqualOrChildUri(fileUri, trashRoot)) {
      return;
    }

    const relativeTrashPath = this._trashRelativeFilePath(
      document.uri,
      fileUri,
      settings,
    );
    await executeAttachmentTrashMove({
      document: document.uri,
      source: fileUri,
      trashRoot,
      trashRelativePath: relativeTrashPath,
      writeIndex: shouldWriteAttachmentTrashIndex(settings.trash),
      fs: {
        basename: (uri) => this._basename(uri),
        dirname: (uri) => this._dirnameUri(uri),
        join: (base, relativePath) => this._joinRelativePath(base, relativePath),
        exists: (uri) => this._exists(uri),
        createDirectory: (uri) =>
          Promise.resolve(vscode.workspace.fs.createDirectory(uri)),
        rename: (source, target) =>
          Promise.resolve(
            vscode.workspace.fs.rename(source, target, { overwrite: false }),
          ),
        readFile: async (uri) => {
          try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            return Buffer.from(bytes).toString("utf8");
          } catch {
            return undefined;
          }
        },
        writeFile: (uri, contents) =>
          Promise.resolve(
            vscode.workspace.fs.writeFile(uri, Buffer.from(contents, "utf8")),
          ),
        toDisplayPath: (uri) => this._displayUri(uri),
        toKey: (uri) => uri.toString(),
      },
    });
  }

  private _resolveAttachmentTrashRoot(
    markdownUri: vscode.Uri,
    settings: AttachmentSettings,
  ): vscode.Uri | undefined {
    if (!settings.trash.enabled) return undefined;

    const trashPath = this._normalizeTrashRootPath(settings.trash.folderName);
    const workspaceFolder =
      vscode.workspace.getWorkspaceFolder(markdownUri) ??
      vscode.workspace.workspaceFolders?.[0];
    const root = workspaceFolder?.uri ?? this._dirnameUri(markdownUri);

    return this._joinRelativePath(root, trashPath);
  }

  private _normalizeTrashRootPath(value: string): string {
    return normalizeTrashRootPath(value, DEFAULT_ATTACHMENT_TRASH_FOLDER);
  }

  private _trashRelativeFilePath(
    markdownUri: vscode.Uri,
    fileUri: vscode.Uri,
    settings: AttachmentSettings,
  ): string {
    const workspaceFolder =
      vscode.workspace.getWorkspaceFolder(fileUri) ??
      vscode.workspace.getWorkspaceFolder(markdownUri) ??
      vscode.workspace.workspaceFolders?.[0];

    let relativePath: string | undefined;
    if (
      workspaceFolder?.uri.scheme === "file" &&
      fileUri.scheme === "file"
    ) {
      relativePath = path
        .relative(workspaceFolder.uri.fsPath, fileUri.fsPath)
        .split(path.sep)
        .join("/");
    }

    if (!relativePath || relativePath.startsWith("../") || relativePath === "..") {
      const documentBase = this._slugify(
        this._basenameWithoutExtension(markdownUri),
        "document",
      );
      relativePath = `${documentBase}/${this._basename(fileUri)}`;
    }

    return buildTrashRelativePath({
      settings: settings.trash,
      workspaceRelativePath: relativePath,
      documentBaseName: this._basenameWithoutExtension(markdownUri),
      filename: this._basename(fileUri),
    });
  }

  private _managedAttachmentDirectories(markdownUri: vscode.Uri): vscode.Uri[] {
    const settings = this._getSettings(markdownUri);
    const markdownDirectory = this._dirnameUri(markdownUri);

    switch (settings.locationMode) {
      case "markdown-folder":
        return [markdownDirectory];

      case "markdown-folder-attachments":
        return [
          vscode.Uri.joinPath(
            markdownDirectory,
            this._normalizeSingleFolder(
              settings.folderName,
              DEFAULT_ATTACHMENT_FOLDER,
            ),
          ),
        ];

      case "workspace-relative-path": {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(markdownUri);
        const workspaceRoot =
          workspaceFolder?.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
        if (!workspaceRoot) return [];

        const relativePath = this._normalizeRelativePath(settings.workspacePath);
        return relativePath ? [this._joinRelativePath(workspaceRoot, relativePath)] : [];
      }

      case "ask-each-time":
        return this._lastDirectory() ? [this._lastDirectory()!] : [];
    }
  }

  private async _rememberSavedAttachment(
    markdownUri: vscode.Uri,
    fileUri: vscode.Uri,
  ): Promise<void> {
    const registry = this._savedAttachmentRegistry();
    const documentKey = this._documentRegistryKey(markdownUri);
    const fileKey = this._canonicalUriKey(fileUri);
    const files = new Set(registry[documentKey] ?? []);
    files.add(fileKey);

    await this.context.workspaceState.update(SAVED_ATTACHMENTS_KEY, {
      ...registry,
      [documentKey]: [...files].sort(),
    });
  }

  private async _forgetSavedAttachment(
    markdownUri: vscode.Uri,
    fileUri: vscode.Uri,
  ): Promise<void> {
    const registry = this._savedAttachmentRegistry();
    const documentKey = this._documentRegistryKey(markdownUri);
    const fileKey = this._canonicalUriKey(fileUri);
    const files = (registry[documentKey] ?? []).filter((key) => key !== fileKey);

    if (files.length > 0) {
      registry[documentKey] = files;
    } else {
      delete registry[documentKey];
    }

    await this.context.workspaceState.update(SAVED_ATTACHMENTS_KEY, registry);
  }

  private _isTrackedAttachment(
    markdownUri: vscode.Uri,
    fileUri: vscode.Uri,
  ): boolean {
    const registry = this._savedAttachmentRegistry();
    const files = registry[this._documentRegistryKey(markdownUri)] ?? [];
    return files.includes(this._canonicalUriKey(fileUri));
  }

  private _savedAttachmentRegistry(): Record<string, string[]> {
    return {
      ...this.context.workspaceState.get<Record<string, string[]>>(
        SAVED_ATTACHMENTS_KEY,
        {},
      ),
    };
  }

  private async _resolveAttachmentDirectory(
    document: vscode.TextDocument,
    settings: AttachmentSettings,
  ): Promise<vscode.Uri> {
    const markdownDirectory = this._dirnameUri(document.uri);

    switch (settings.locationMode) {
      case "markdown-folder":
        return markdownDirectory;

      case "markdown-folder-attachments":
        return vscode.Uri.joinPath(
          markdownDirectory,
          this._normalizeSingleFolder(settings.folderName, DEFAULT_ATTACHMENT_FOLDER),
        );

      case "workspace-relative-path":
        return this._resolveWorkspaceAttachmentDirectory(document, settings);

      case "ask-each-time":
        return this._promptForDirectory(document, this._lastDirectory() ?? markdownDirectory);
    }
  }

  private async _resolveWorkspaceAttachmentDirectory(
    document: vscode.TextDocument,
    settings: AttachmentSettings,
  ): Promise<vscode.Uri> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const workspaceRoot = workspaceFolder?.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;

    if (!workspaceRoot) {
      return this._promptForDirectory(document, this._dirnameUri(document.uri));
    }

    let relativePath = this._normalizeRelativePath(settings.workspacePath);
    if (!relativePath) {
      const input = await vscode.window.showInputBox({
        title: "Attachment Folder",
        prompt: "Enter a workspace-relative folder for Markdown attachments.",
        value: DEFAULT_WORKSPACE_PATH,
        validateInput: (value) => {
          try {
            this._normalizeRelativePath(value);
            return undefined;
          } catch (error) {
            return error instanceof Error ? error.message : String(error);
          }
        },
      });

      if (input === undefined) throw new Error("Attachment upload cancelled.");

      relativePath = this._normalizeRelativePath(input);
      await vscode.workspace
        .getConfiguration("mdEditor", document.uri)
        .update(
          "attachments.path",
          relativePath,
          vscode.ConfigurationTarget.Workspace,
        );
    }

    return this._joinRelativePath(workspaceRoot, relativePath);
  }

  private async _createInitialFilename(
    document: vscode.TextDocument,
    directory: vscode.Uri,
    message: UploadAttachmentMessage,
    settings: AttachmentSettings,
  ): Promise<string> {
    if (settings.alwaysUseOriginalFilename) {
      return this._sanitizeOriginalFilename(message.name, message.mimeType);
    }

    return this._generateNumberedFilename(document, directory, message, settings);
  }

  private async _generateNumberedFilename(
    document: vscode.TextDocument,
    directory: vscode.Uri,
    message: UploadAttachmentMessage,
    settings: AttachmentSettings,
  ): Promise<string> {
    const markdownBase = this._slugify(
      this._basenameWithoutExtension(document.uri),
      "attachment",
    );
    const extension = this._extensionForUpload(message);
    const nextNumber = await this._nextNumber(directory, markdownBase, settings.generatedNameDigits);

    return `${markdownBase}-${String(nextNumber).padStart(settings.generatedNameDigits, "0")}${extension}`;
  }

  private async _nextNumber(
    directory: vscode.Uri,
    markdownBase: string,
    digits: number,
  ): Promise<number> {
    const expression = new RegExp(
      `^${this._escapeRegExp(markdownBase)}-(\\d{${digits}})\\.[^.]+$`,
      "i",
    );
    let max = 0;

    try {
      const entries = await vscode.workspace.fs.readDirectory(directory);
      for (const [name, type] of entries) {
        if ((type & vscode.FileType.File) === 0) continue;

        const match = name.match(expression);
        if (!match) continue;

        max = Math.max(max, Number(match[1]));
      }
    } catch {
      return 1;
    }

    return max + 1;
  }

  private async _promptForDirectory(
    document: vscode.TextDocument,
    defaultUri: vscode.Uri,
  ): Promise<vscode.Uri> {
    const selected = await vscode.window.showOpenDialog({
      title: "Select Attachment Folder",
      openLabel: "Use Folder",
      defaultUri,
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
    });

    if (!selected?.[0]) throw new Error("Attachment upload cancelled.");
    return selected[0];
  }

  private async _promptForAttachmentSaveDetails(
    document: vscode.TextDocument,
    message: UploadAttachmentMessage,
    settings: AttachmentSettings,
    initialDirectory: vscode.Uri,
    defaultFilename: string,
  ): Promise<AttachmentSaveDetails> {
    return new Promise((resolve, reject) => {
      const generateNameButton: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon("refresh"),
        tooltip: "Generate Name",
      };
      const originalNameButton: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon("file"),
        tooltip: "Use Original Filename",
      };
      const chooseFolderButton: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon("folder-opened"),
        tooltip: "Choose Attachment Folder",
      };
      const input = vscode.window.createInputBox();
      const disposables: vscode.Disposable[] = [];
      let directory = initialDirectory;
      let filenameSource: "generated" | "original" | "custom" =
        settings.alwaysUseOriginalFilename ? "original" : "generated";
      let pickingFolder = false;
      let programmaticValue: string | undefined = defaultFilename;
      let settled = false;

      const cleanup = () => {
        for (const disposable of disposables) {
          disposable.dispose();
        }
        input.dispose();
      };

      const setPrompt = () => {
        input.prompt = [
          `Folder: ${this._displayUri(directory)}`,
          `Original: ${message.name || "unnamed file"}`,
        ].join(" | ");
      };

      const setFilename = (
        value: string,
        source: "generated" | "original" | "custom",
      ) => {
        filenameSource = source;
        programmaticValue = value;
        input.value = value;
        input.valueSelection = [0, value.length];
        input.validationMessage = this._validateAttachmentFilenameInput(value);
      };

      const finish = (details: AttachmentSaveDetails) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(details);
      };

      const cancel = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Attachment upload cancelled."));
      };

      const setGeneratedName = async () => {
        input.busy = true;
        input.enabled = false;
        try {
          const generated = await this._generateNumberedFilename(
            document,
            directory,
            message,
            settings,
          );
          setFilename(generated, "generated");
        } finally {
          input.enabled = true;
          input.busy = false;
        }
      };

      const chooseFolder = async () => {
        pickingFolder = true;
        input.busy = true;
        input.enabled = false;
        try {
          const selected = await vscode.window.showOpenDialog({
            title: "Select Attachment Folder",
            openLabel: "Use Folder",
            defaultUri: directory,
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          });

          if (selected?.[0]) {
            directory = selected[0];
            setPrompt();
            if (filenameSource === "generated") {
              await setGeneratedName();
            }
          }
        } finally {
          pickingFolder = false;
          input.enabled = true;
          input.busy = false;
          if (!settled) input.show();
        }
      };

      input.title = "Save Markdown Attachment";
      input.placeholder = "Attachment filename";
      input.ignoreFocusOut = true;
      input.buttons = [
        generateNameButton,
        originalNameButton,
        chooseFolderButton,
      ];
      setPrompt();
      setFilename(defaultFilename, filenameSource);

      disposables.push(
        input.onDidChangeValue((value) => {
          if (programmaticValue === value) {
            programmaticValue = undefined;
          } else {
            filenameSource = "custom";
          }

          input.validationMessage =
            this._validateAttachmentFilenameInput(value);
        }),
      );

      disposables.push(
        input.onDidAccept(() => {
          const validationMessage = this._validateAttachmentFilenameInput(
            input.value,
          );
          if (validationMessage) {
            input.validationMessage = validationMessage;
            return;
          }

          finish({
            directory,
            filename: this._sanitizeOriginalFilename(
              input.value,
              message.mimeType,
            ),
          });
        }),
      );

      disposables.push(
        input.onDidTriggerButton((button) => {
          void (async () => {
            if (button === generateNameButton) {
              await setGeneratedName();
              return;
            }

            if (button === originalNameButton) {
              setFilename(
                this._sanitizeOriginalFilename(message.name, message.mimeType),
                "original",
              );
              return;
            }

            if (button === chooseFolderButton) {
              await chooseFolder();
            }
          })().catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            input.validationMessage = message;
          });
        }),
      );

      disposables.push(
        input.onDidHide(() => {
          if (!pickingFolder) cancel();
        }),
      );

      input.show();
    });
  }

  private _validateAttachmentFilenameInput(value: string): string | undefined {
    if (!value.trim()) return "Filename is required.";
    if (value.includes("/") || value.includes("\\")) {
      return "Use the folder button to choose a folder.";
    }

    return undefined;
  }

  private async _ensureUniqueFilename(
    directory: vscode.Uri,
    filename: string,
  ): Promise<string> {
    let candidate = filename;
    const parsed = path.posix.parse(filename);
    let index = 1;

    while (await this._exists(vscode.Uri.joinPath(directory, candidate))) {
      candidate = `${parsed.name}-${index}${parsed.ext}`;
      index += 1;
    }

    return candidate;
  }

  private async _exists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private async _isExistingFile(uri: vscode.Uri): Promise<boolean> {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      return (stat.type & vscode.FileType.File) !== 0;
    } catch {
      return false;
    }
  }

  private _resolveMarkdownImageUri(markdownUri: vscode.Uri, src: string): vscode.Uri {
    if (/^file:/i.test(src)) {
      return vscode.Uri.parse(src);
    }

    const withoutFragment = src.split("#")[0].split("?")[0];
    const decoded = this._safeDecodeUriComponentPath(withoutFragment);

    if (markdownUri.scheme === "file") {
      return vscode.Uri.file(path.resolve(path.dirname(markdownUri.fsPath), decoded));
    }

    return this._joinRelativePath(this._dirnameUri(markdownUri), decoded);
  }

  private _toMarkdownRelativePath(markdownUri: vscode.Uri, fileUri: vscode.Uri): string {
    let relativePath: string;

    if (markdownUri.scheme === "file" && fileUri.scheme === "file") {
      relativePath = path.relative(path.dirname(markdownUri.fsPath), fileUri.fsPath);
      relativePath = relativePath.split(path.sep).join("/");
    } else {
      relativePath = path.posix.relative(
        path.posix.dirname(markdownUri.path),
        fileUri.path,
      );
    }

    return relativePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  private _sanitizeOriginalFilename(name: string, mimeType: string): string {
    const fallbackExtension = this._extensionForMimeType(mimeType) || ".bin";
    const normalized = name.trim().replace(/\\/g, "/").split("/").pop() || "attachment";
    const parsed = path.posix.parse(normalized);
    const extension = (parsed.ext || fallbackExtension).toLowerCase();
    const base = parsed.name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "attachment";

    return `${base}${extension}`;
  }

  private _extensionForUpload(message: UploadAttachmentMessage): string {
    const originalExtension = path.posix.extname(message.name).toLowerCase();
    return originalExtension || this._extensionForMimeType(message.mimeType) || ".bin";
  }

  private _extensionForMimeType(mimeType: string): string | undefined {
    switch (mimeType.toLowerCase()) {
      case "image/jpeg":
      case "image/jpg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/gif":
        return ".gif";
      case "image/webp":
        return ".webp";
      case "image/svg+xml":
        return ".svg";
      case "image/avif":
        return ".avif";
      default:
        return undefined;
    }
  }

  private _basenameWithoutExtension(uri: vscode.Uri): string {
    const basename = uri.scheme === "file"
      ? path.basename(uri.fsPath)
      : path.posix.basename(uri.path);
    return basename.replace(/\.[mM][dD]$/, "");
  }

  private _basename(uri: vscode.Uri): string {
    return uri.scheme === "file"
      ? path.basename(uri.fsPath)
      : path.posix.basename(uri.path);
  }

  private _slugify(value: string, fallback: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || fallback;
  }

  private _normalizeSingleFolder(value: string, fallback: string): string {
    const normalized = this._normalizeRelativePath(value || fallback);
    if (!normalized || normalized.includes("/")) return fallback;
    return normalized;
  }

  private _normalizeRelativePath(value: string): string {
    return normalizeRelativePath(value);
  }

  private _joinRelativePath(base: vscode.Uri, relativePath: string): vscode.Uri {
    const normalized = this._normalizeRelativePath(relativePath);
    if (!normalized) return base;
    return vscode.Uri.joinPath(base, ...normalized.split("/"));
  }

  private _dirnameUri(uri: vscode.Uri): vscode.Uri {
    if (uri.scheme === "file") {
      return vscode.Uri.file(path.dirname(uri.fsPath));
    }

    const dirname = path.posix.dirname(uri.path);
    return uri.with({ path: dirname === "." ? "/" : dirname });
  }

  private _lastDirectory(): vscode.Uri | undefined {
    const value = this.context.workspaceState.get<string>(LAST_ATTACHMENT_DIRECTORY_KEY);
    return value ? vscode.Uri.parse(value) : undefined;
  }

  private _documentRegistryKey(uri: vscode.Uri): string {
    return uri.toString();
  }

  private _canonicalUriKey(uri: vscode.Uri): string {
    if (uri.scheme === "file") {
      return vscode.Uri.file(path.resolve(uri.fsPath)).toString();
    }

    return uri.toString();
  }

  private _isEqualOrChildUri(child: vscode.Uri, parent: vscode.Uri): boolean {
    if (child.scheme !== parent.scheme) return false;

    if (child.scheme === "file" && parent.scheme === "file") {
      const relativePath = path.relative(parent.fsPath, child.fsPath);
      return (
        relativePath === "" ||
        (!!relativePath &&
          !relativePath.startsWith("..") &&
          !path.isAbsolute(relativePath))
      );
    }

    const parentPath = parent.path.endsWith("/") ? parent.path : `${parent.path}/`;
    return child.path === parent.path || child.path.startsWith(parentPath);
  }

  private _displayUri(uri: vscode.Uri): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder && uri.scheme === "file" && workspaceFolder.uri.scheme === "file") {
      return path.relative(workspaceFolder.uri.fsPath, uri.fsPath).split(path.sep).join("/");
    }

    return uri.scheme === "file" ? uri.fsPath : uri.toString();
  }

  private _absoluteDisplayUri(uri: vscode.Uri): string {
    return uri.scheme === "file" ? uri.fsPath : uri.toString();
  }

  private _safeDecodeUriComponentPath(value: string): string {
    try {
      return value
        .split("/")
        .map((segment) => decodeURIComponent(segment))
        .join("/");
    } catch {
      return value;
    }
  }

  private _isBrowserUrl(src: string): boolean {
    return /^(https?:|data:|blob:|vscode-webview-resource:|vscode-resource:)/i.test(src);
  }

  private _escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
