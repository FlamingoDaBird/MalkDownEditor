import * as path from "path";
import * as vscode from "vscode";
import { AttachmentManager } from "./attachments";
import { parseMarkdownToStructure } from "./utils/markdown-parser";
import type {
  CodeBlockSettings,
  DateTimeAction,
  DateTimeSettings,
  HostToWebviewMessage,
  ResolveAttachmentSrcMessage,
  TableSettings,
  UploadAttachmentMessage,
  WebviewToHostMessage,
} from "./shared/protocol";

export const VIEW_TYPE = "mdeditor.markdownEditor";

// Minimal message bridge for the webview
class WebviewBridge {
  constructor(readonly panel: vscode.WebviewPanel) {}

  postMessage(message: HostToWebviewMessage) {
    void this.panel.webview.postMessage(message);
  }
}

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  static viewType = VIEW_TYPE;

  static async createOrShow(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const provider = MarkdownEditorProvider._instance;
    if (provider) {
      provider._updateWebview(panel);
      return;
    }
  }

  private static _instance: MarkdownEditorProvider | undefined;
  private _statusBar: vscode.StatusBarItem;
  private readonly _attachments: AttachmentManager;
  private readonly _bridges = new Map<string, WebviewBridge>();
  private readonly _readOnlyStates = new Map<string, boolean>();

  constructor(readonly context: vscode.ExtensionContext) {
    MarkdownEditorProvider._instance = this;
    this._attachments = new AttachmentManager(context);
    this._statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this._statusBar.text = "$(markdown) MD Editor";
    this._statusBar.command = "mdeditor.open";
    this._statusBar.show();
    context.subscriptions.push(this._statusBar);
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    const localResourceRoots = this._getLocalResourceRoots(document);
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots,
    };
    const addLocalResourceRoot = (uri: vscode.Uri) => {
      if (localResourceRoots.some((root) => root.toString() === uri.toString())) {
        return;
      }

      localResourceRoots.push(uri);
      webviewPanel.webview.options = {
        ...webviewPanel.webview.options,
        localResourceRoots,
      };
    };

    const bridge = new WebviewBridge(webviewPanel);

    // Get theme from VS Code settings
    const config = vscode.workspace.getConfiguration("mdEditor");
    const theme = config.get<string>("theme", "vscode-dark");
    
    // Apply theme class to webview for proper theming
    const themeClass = theme === "vscode-light" ? "theme-light" : (theme === "vscode-high-contrast" ? "theme-high-contrast" : "theme-dark");

    let webviewReady = false;
    const sendInit = async () => {
      const structure = await parseMarkdownToStructure(document.getText());
      const version = document.version;
      webviewReady = true;

      bridge.postMessage({
        type: "init",
        markdown: structure.markdown,
        version,
        headers: structure.headers,
        editable: !this._isReadOnly(document.uri),
        readOnly: this._isReadOnly(document.uri),
        theme: { name: theme },
        themeClass,
        dateTime: this._getDateTimeSettings(document.uri),
        tables: this._getTableSettings(document.uri),
        codeBlocks: this._getCodeBlockSettings(document.uri),
      });
    };

    // Listen for webview messages
    const messageDisposable = webviewPanel.webview.onDidReceiveMessage(async (message: WebviewToHostMessage) => {
      switch (message.type) {
        case "edit":
          await this._applyEdit(document, message);
          break;
        case "ready":
          await sendInit();
          break;
        case "save":
          await document.save();
          break;
        case "error":
          console.error("MD Editor webview error:", message.message, message.stack);
          break;
        case "uploadAttachment":
          await this._handleAttachmentUpload(
            document,
            message,
            bridge,
            addLocalResourceRoot,
          );
          break;
        case "resolveAttachmentSrc":
          this._handleResolveAttachmentSrc(document, webviewPanel.webview, message, bridge);
          break;
      }
    });

    webviewPanel.webview.html = this._getWebviewHtml(webviewPanel.webview);

    // Sync on document changes
    const disposable = vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (webviewReady && e.document.uri.toString() === document.uri.toString()) {
        // Flush pending deletions (handles undo/redo for attachment files)
        await this._attachments.flushPendingDeletions(e.document);

        const changedStructure = await parseMarkdownToStructure(document.getText());
        bridge.postMessage({
          type: "externalUpdate",
          markdown: changedStructure.markdown,
          version: document.version,
          headers: changedStructure.headers,
        });
      }
    });

    const settingsDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (!webviewReady) return;
      if (
        !e.affectsConfiguration("mdEditor.dateTime", document.uri) &&
        !e.affectsConfiguration("mdEditor.tables", document.uri) &&
        !e.affectsConfiguration("mdEditor.codeBlocks", document.uri)
      ) {
        return;
      }

      bridge.postMessage({
        type: "settingsUpdated",
        dateTime: this._getDateTimeSettings(document.uri),
        tables: this._getTableSettings(document.uri),
        codeBlocks: this._getCodeBlockSettings(document.uri),
      });
    });

    webviewPanel.onDidDispose(() => {
      disposable.dispose();
      settingsDisposable.dispose();
      messageDisposable.dispose();
      if (this._bridges.get(document.uri.toString()) === bridge) {
        this._bridges.delete(document.uri.toString());
      }
    });

    this._bridges.set(document.uri.toString(), bridge);
  }

  runDateTimeAction(documentUri: vscode.Uri, action: DateTimeAction): boolean {
    const bridge = this._bridges.get(documentUri.toString());
    if (!bridge) return false;

    bridge.postMessage({
      type: "runDateTimeAction",
      action,
    });
    return true;
  }

  toggleReadOnly(documentUri: vscode.Uri): boolean | undefined {
    return this.setReadOnly(documentUri, !this._isReadOnly(documentUri));
  }

  setReadOnly(documentUri: vscode.Uri, readOnly: boolean): boolean | undefined {
    const key = documentUri.toString();
    const bridge = this._bridges.get(key);
    if (!bridge) return undefined;

    this._readOnlyStates.set(key, readOnly);
    bridge.postMessage({
      type: "setReadOnly",
      readOnly,
    });
    return readOnly;
  }

  isReadOnly(documentUri: vscode.Uri): boolean {
    return this._isReadOnly(documentUri);
  }

  private _isReadOnly(documentUri: vscode.Uri): boolean {
    return this._readOnlyStates.get(documentUri.toString()) ?? false;
  }

  private _getLocalResourceRoots(document: vscode.TextDocument): vscode.Uri[] {
    const roots = [
      vscode.Uri.file(path.join(this.context.extensionPath, "dist", "webview")),
      this._dirnameUri(document.uri),
      ...(vscode.workspace.workspaceFolders?.map((folder) => folder.uri) ?? []),
    ];
    const seen = new Set<string>();

    return roots.filter((root) => {
      const key = root.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private _getWebviewHtml(webview: vscode.Webview): string {
    const fs = require("fs") as typeof import("fs");
    const htmlPath = path.join(this.context.extensionPath, "dist", "webview", "index.html");
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "dist", "webview", "index.js")),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "dist", "webview", "index.css")),
    );

    let htmlContent = fs.readFileSync(htmlPath, "utf-8");
    htmlContent = htmlContent.replace(
      /<link[^>]*href="[^"]*index\.css"[^>]*>/,
      `<link rel="stylesheet" href="${styleUri.toString()}">`,
    );
    htmlContent = htmlContent.replace(
      /<script[^>]*src="[^"]*index\.js"[^>]*><\/script>/,
      `<script type="module" src="${scriptUri.toString()}"></script>`,
    );

    return htmlContent;
  }

  private _getDateTimeSettings(resource: vscode.Uri): DateTimeSettings {
    const config = vscode.workspace.getConfiguration("mdEditor", resource);

    return {
      dateFormat: config.get<string>("dateTime.dateFormat", "yyyy-MM-dd"),
      timeFormat: config.get<string>("dateTime.timeFormat", "HH:mm"),
      lastUpdatedTemplate: config.get<string>(
        "dateTime.lastUpdatedTemplate",
        "Last updated: {date} {time}",
      ),
      historyEntryTemplate: config.get<string>(
        "dateTime.historyEntryTemplate",
        "- {date} {time} - ",
      ),
      customTemplate: config.get<string>(
        "dateTime.customTemplate",
        "{date} {time}",
      ),
      inlineSlashShortcuts: config.get<boolean>(
        "dateTime.inlineSlashShortcuts",
        true,
      ),
    };
  }

  private _getTableSettings(resource: vscode.Uri): TableSettings {
    const config = vscode.workspace.getConfiguration("mdEditor", resource);
    const defaultRows = config.get<number>("tables.defaultRows", 3);
    const defaultColumns = config.get<number>("tables.defaultColumns", 3);
    const insertBehavior = config.get<TableSettings["insertBehavior"]>(
      "tables.insertBehavior",
      "useDefaultSize",
    );

    return {
      floatingToolbar: config.get<boolean>("tables.floatingToolbar", true),
      contextMenu: config.get<boolean>("tables.contextMenu", true),
      milkdownControls: config.get<boolean>("tables.milkdownControls", true),
      slashMenu: config.get<boolean>("tables.slashMenu", true),
      defaultRows: Math.min(Math.max(Math.trunc(defaultRows), 1), 50),
      defaultColumns: Math.min(Math.max(Math.trunc(defaultColumns), 1), 20),
      insertBehavior: insertBehavior === "askEveryTime"
        ? "askEveryTime"
        : "useDefaultSize",
    };
  }

  private _getCodeBlockSettings(resource: vscode.Uri): CodeBlockSettings {
    const config = vscode.workspace.getConfiguration("mdEditor", resource);

    return {
      alwaysShowLanguage: config.get<boolean>(
        "codeBlocks.alwaysShowLanguage",
        true,
      ),
      alwaysShowCopyButton: config.get<boolean>(
        "codeBlocks.alwaysShowCopyButton",
        true,
      ),
    };
  }

  private async _handleAttachmentUpload(
    document: vscode.TextDocument,
    message: UploadAttachmentMessage,
    bridge: WebviewBridge,
    addLocalResourceRoot: (uri: vscode.Uri) => void,
  ): Promise<void> {
    try {
      const saved = await this._attachments.saveUploadedAttachment(document, message);
      addLocalResourceRoot(saved.directory);
      bridge.postMessage({
        type: "attachmentUploaded",
        requestId: message.requestId,
        ok: true,
        src: saved.markdownPath,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("cancelled")) {
        void vscode.window.showErrorMessage(`Failed to save attachment: ${errorMessage}`);
      }
      bridge.postMessage({
        type: "attachmentUploaded",
        requestId: message.requestId,
        ok: false,
        message: errorMessage,
      });
    }
  }

  private _handleResolveAttachmentSrc(
    document: vscode.TextDocument,
    webview: vscode.Webview,
    message: ResolveAttachmentSrcMessage,
    bridge: WebviewBridge,
  ): void {
    try {
      bridge.postMessage({
        type: "attachmentSrcResolved",
        requestId: message.requestId,
        ok: true,
        src: this._attachments.resolveImageSrc(document, webview, message.src),
      });
    } catch (error) {
      bridge.postMessage({
        type: "attachmentSrcResolved",
        requestId: message.requestId,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async _applyEdit(
    document: vscode.TextDocument,
    message: { markdown: string; version: number },
  ): Promise<void> {
    if (this._isReadOnly(document.uri)) return;

    const previousMarkdown = document.getText();
    const edit = new vscode.WorkspaceEdit();
    const range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(previousMarkdown.length),
    );
    edit.replace(document.uri, range, message.markdown);
    const applied = await vscode.workspace.applyEdit(edit);

    if (applied) {
      void this._attachments
        .promptForDeletedAttachments(document, previousMarkdown, message.markdown)
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Failed to check deleted attachments:", message);
        });
    }
  }

  private _updateWebview(panel: vscode.WebviewPanel): void {
    // Update the webview panel reference
  }

  private _dirnameUri(uri: vscode.Uri): vscode.Uri {
    if (uri.scheme === "file") {
      return vscode.Uri.file(path.dirname(uri.fsPath));
    }

    const dirname = path.posix.dirname(uri.path);
    return uri.with({ path: dirname === "." ? "/" : dirname });
  }
}
