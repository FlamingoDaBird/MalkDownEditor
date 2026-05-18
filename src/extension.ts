import * as vscode from "vscode";
import { MarkdownEditorProvider } from "./provider";
import type { DateTimeAction } from "./shared/protocol";

function getUriFromTabInput(input: unknown): vscode.Uri | undefined {
  if (input instanceof vscode.TabInputText) {
    return input.uri;
  }

  if (input instanceof vscode.TabInputCustom) {
    return input.uri;
  }

  if (
    input &&
    typeof input === "object" &&
    "uri" in input &&
    (input as { uri?: unknown }).uri instanceof vscode.Uri
  ) {
    return (input as { uri: vscode.Uri }).uri;
  }

  return undefined;
}

function getActiveTab(): vscode.Tab | undefined {
  return vscode.window.tabGroups.activeTabGroup.activeTab;
}

function getActiveResource(resource?: vscode.Uri): vscode.Uri | undefined {
  return (
    resource ??
    vscode.window.activeTextEditor?.document.uri ??
    getUriFromTabInput(getActiveTab()?.input)
  );
}

function isActiveMarkdownEditor(uri: vscode.Uri): boolean {
  const input = getActiveTab()?.input;

  return (
    input instanceof vscode.TabInputCustom &&
    input.viewType === MarkdownEditorProvider.viewType &&
    input.uri.toString() === uri.toString()
  );
}

async function openRawMarkdown(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.commands.executeCommand("vscode.openWith", uri, "default");
  } catch {
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
      viewColumn: vscode.window.tabGroups.activeTabGroup.viewColumn,
      preview: false,
    });
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new MarkdownEditorProvider(context);

  // Load CSS file
  const cssUri = vscode.Uri.joinPath(context.extensionUri, "dist", "webview", "index.css");

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      provider,
      {
        supportsMultipleEditorsPerDocument: false,
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );

  const updateReadOnlyContext = async () => {
    const targetUri = getActiveResource();
    const readOnly = targetUri && isActiveMarkdownEditor(targetUri)
      ? provider.isReadOnly(targetUri)
      : false;

    await vscode.commands.executeCommand(
      "setContext",
      "mdeditor.readOnly",
      readOnly,
    );
  };

  const setReadOnlyMode = async (
    nextReadOnly: boolean | undefined,
    resource?: vscode.Uri,
  ) => {
    const targetUri = getActiveResource(resource);

    if (!targetUri) {
      await vscode.window.showWarningMessage(
        "Open a Markdown file in MD Editor before toggling read-only mode.",
      );
      return;
    }

    const readOnly = nextReadOnly === undefined
      ? provider.toggleReadOnly(targetUri)
      : provider.setReadOnly(targetUri, nextReadOnly);

    if (readOnly === undefined) {
      await vscode.window.showWarningMessage(
        "Switch to MD Editor before toggling read-only mode.",
      );
      await updateReadOnlyContext();
      return;
    }

    await updateReadOnlyContext();
    await vscode.window.showInformationMessage(
      readOnly
        ? "MD Editor is now read-only."
        : "MD Editor editing is enabled.",
    );
  };

  context.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs(() => {
      void updateReadOnlyContext();
    }),
    vscode.window.tabGroups.onDidChangeTabGroups(() => {
      void updateReadOnlyContext();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      void updateReadOnlyContext();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("mdeditor.open", async (resource?: vscode.Uri) => {
      const targetUri = getActiveResource(resource);

      if (!targetUri) {
        await vscode.window.showWarningMessage(
          "Open a Markdown file before launching MD Editor.",
        );
        return;
      }

      if (isActiveMarkdownEditor(targetUri)) {
        await openRawMarkdown(targetUri);
        return;
      }

      await vscode.commands.executeCommand(
        "vscode.openWith",
        targetUri,
        MarkdownEditorProvider.viewType,
      );
      await updateReadOnlyContext();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("mdeditor.css", () => {
      vscode.window.showInformationMessage(`CSS URI: ${cssUri.toString(true)}`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("mdeditor.openSettings", async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "mdEditor",
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mdeditor.toggleReadOnly",
      (resource?: vscode.Uri) => setReadOnlyMode(undefined, resource),
    ),
    vscode.commands.registerCommand(
      "mdeditor.enableReadOnly",
      (resource?: vscode.Uri) => setReadOnlyMode(true, resource),
    ),
    vscode.commands.registerCommand(
      "mdeditor.disableReadOnly",
      (resource?: vscode.Uri) => setReadOnlyMode(false, resource),
    ),
  );

  const runDateTimeCommand = async (action: DateTimeAction) => {
    const targetUri = getActiveResource();

    if (!targetUri) {
      await vscode.window.showWarningMessage(
        "Open a Markdown file in MD Editor before inserting a timestamp.",
      );
      return;
    }

    if (!provider.runDateTimeAction(targetUri, action)) {
      await vscode.window.showWarningMessage(
        "Switch to MD Editor before inserting a timestamp.",
      );
    }
  };

  const dateTimeCommands: Array<[string, DateTimeAction]> = [
    ["mdeditor.insertDate", "insertDate"],
    ["mdeditor.insertTime", "insertTime"],
    ["mdeditor.insertDateTime", "insertDateTime"],
    ["mdeditor.insertLastUpdated", "insertLastUpdated"],
    ["mdeditor.updateLastUpdated", "updateLastUpdated"],
    ["mdeditor.insertHistoryEntry", "insertHistoryEntry"],
    ["mdeditor.insertCustomDateTime", "insertCustom"],
  ];

  for (const [command, action] of dateTimeCommands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, () => runDateTimeCommand(action)),
    );
  }

  void updateReadOnlyContext();
}

export function deactivate(): void {
  // Nothing to clean up
}
