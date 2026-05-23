interface VsCodeApi {
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

declare global {
  interface Window {
    __mdEditorVsCodeApi?: VsCodeApi;
    __mdEditorBootLog?: (
      stage: string,
      message: string,
      details?: unknown,
    ) => void;
  }
}

/**
 * Bridge between the webview and VS Code host.
 * Wraps the VS Code webview API for message passing.
 */
export class WebviewBridge {
  private _onMessage: ((message: unknown) => void) | null = null;
  private readonly _vscode: VsCodeApi;

  constructor() {
    this._vscode = window.__mdEditorVsCodeApi ?? acquireVsCodeApi();
    window.__mdEditorVsCodeApi = this._vscode;
    window.__mdEditorBootLog?.("module-bridge", "Webview bridge initialized");

    window.addEventListener("message", (event) => {
      if (event.data && typeof event.data === "object") {
        this._onMessage?.(event.data);
      }
    });
  }

  postMessage(message: unknown): void {
    this._vscode.postMessage(message);
  }

  onMessage(handler: (message: unknown) => void): void {
    this._onMessage = handler;
  }
}
