import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import { DOMSerializer } from "@milkdown/kit/prose/model";
import {
  NodeSelection,
  Selection,
  TextSelection,
  type Command,
} from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { insertTableCommand } from "@milkdown/kit/preset/gfm";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  isInTable,
} from "@milkdown/kit/prose/tables";
import {
  blockquoteSchema,
  codeBlockSchema,
  paragraphSchema,
  setBlockTypeCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { insert } from "@milkdown/kit/utils";
// Load Milkdown theme CSS
import "./styles/milkdown/style.css";
import "./styles/milkdown/reset.css";
import "./styles/milkdown/prosemirror.css";
import "./styles/editor.css";
import { WebviewBridge } from "./bridge";
import type {
  CodeBlockSettings,
  DateTimeAction,
  DateTimeSettings,
  EditorDialogButton,
  HostToWebviewMessage,
  ShowEditorDialogMessage,
  TableSettings,
  WebviewToHostMessage,
} from "../shared/protocol";

const bridge = new WebviewBridge();
let editor: Crepe | undefined;
let editorMounted = false;
let initialMountStarted = false;
let currentVersion = 0;
let themeClass: string | undefined = undefined;
let didWarnAboutInvalidDomSpec = false;
let applyingExternalUpdate = false;
let requestSequence = 0;
let generatedControlObserver: MutationObserver | undefined;
let tableToolbarElement: HTMLElement | undefined;
let tableContextMenuElement: HTMLElement | undefined;
let tableSlashMenuElement: HTMLElement | undefined;
let tableInsertDialogElement: HTMLElement | undefined;
let tableUiCleanup: (() => void) | undefined;
let tableUiUpdateAnimationFrame: number | undefined;
let tableSlashMenuUpdateAnimationFrame: number | undefined;
let tableSlashMenuActiveIndex = 0;
let tableSlashMenuVisibleItems: TableActionItem[] = [];
let imageDeleteControlsCleanup: (() => void) | undefined;
let imageLightboxCleanup: (() => void) | undefined;
let activeEditorDialog:
  | { requestId: string; cancelButtonId?: string; close: (buttonId?: string) => void }
  | undefined;
const lockedImageSources = new Set<string>();
let readOnlyMode = false;
let readOnlyBadgeElement: HTMLElement | undefined;
let dateTimeSettings: DateTimeSettings = {
  dateFormat: "yyyy-MM-dd",
  timeFormat: "HH:mm",
  lastUpdatedTemplate: "Last updated: {date} {time}",
  historyEntryTemplate: "- {date} {time} - ",
  customTemplate: "{date} {time}",
  inlineSlashShortcuts: true,
};
let tableSettings: TableSettings = {
  floatingToolbar: true,
  contextMenu: true,
  milkdownControls: true,
  slashMenu: true,
  defaultRows: 3,
  defaultColumns: 3,
  insertBehavior: "useDefaultSize",
};
let codeBlockSettings: CodeBlockSettings = {
  alwaysShowLanguage: true,
  alwaysShowCopyButton: true,
};

interface PendingRequest {
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
  timeout: number;
}

const pendingAttachmentUploads = new Map<string, PendingRequest>();
const pendingAttachmentSrcResolutions = new Map<string, PendingRequest>();
const pendingAttachmentPathCopies = new Map<string, PendingRequest>();
const ATTACHMENT_SRC_FALLBACK_TIMEOUT_MS = 3000;
const MILKDOWN_STARTUP_TIMEOUT_MS = 15000;
bootLog("module-start", "Webview module started", {
  readyState: document.readyState,
  hidden: document.hidden,
  visibilityState: document.visibilityState,
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight,
  },
  location: String(window.location),
});
bootLog("document-state", "Initial webview document state", documentStateSnapshot());
document.addEventListener("visibilitychange", () => {
  bootLog("visibility-change", "Webview document visibility changed", documentStateSnapshot());
});
window.addEventListener("focus", () => {
  bootLog("window-focus", "Webview window focused", documentStateSnapshot());
});
window.addEventListener("blur", () => {
  bootLog("window-blur", "Webview window blurred", documentStateSnapshot());
});
let initWatchdog: number | undefined = window.setTimeout(() => {
  if (editorMounted) return;

  showFatalError(
    new Error(
      "MalkDown Editor did not receive initialization from the extension host.",
    ),
  );
}, 15000);
setLoadingStatus("MalkDown Editor script loaded. Waiting for extension host...");

const quoteToolbarIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M7.17 17C7.68 17 8.15 16.71 8.37 16.26L9.79 13.42C9.93 13.14 10 12.84 10 12.53V8C10 7.45 9.55 7 9 7H5C4.45 7 4 7.45 4 8V12C4 12.55 4.45 13 5 13H7L5.97 15.06C5.52 15.95 6.17 17 7.17 17ZM17.17 17C17.68 17 18.15 16.71 18.37 16.26L19.79 13.42C19.93 13.14 20 12.84 20 12.53V8C20 7.45 19.55 7 19 7H15C14.45 7 14 7.45 14 8V12C14 12.55 14.45 13 15 13H17L15.97 15.06C15.52 15.95 16.17 17 17.17 17Z"
    />
  </svg>
`;

const codeBlockToolbarIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm1 2v14h16V5H4Zm8 10h6v2h-6v-2Zm-3.33-3L5.84 9.17l1.41-1.41L11.5 12l-4.25 4.24l-1.41-1.41L8.67 12Z"
    />
  </svg>
`;

const calendarToolbarIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v12A2.5 2.5 0 0 1 19.5 21h-15A2.5 2.5 0 0 1 2 18.5v-12A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12.5 8h-15v8.5a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V10ZM5 6a.5.5 0 0 0-.5.5V8h15V6.5A.5.5 0 0 0 19 6H5Zm2 7h3v3H7v-3Zm5 0h5v2h-5v-2Z"
    />
  </svg>
`;

const clockToolbarIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M12 2a10 10 0 1 1 0 20a10 10 0 0 1 0-20Zm0 2a8 8 0 1 0 0 16a8 8 0 0 0 0-16Zm1 3v4.59l3.2 3.2l-1.4 1.42l-3.8-3.8V7h2Z"
    />
  </svg>
`;

const historyToolbarIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M13 3a9 9 0 1 1-8.06 5H3V6h5v5H6V9.54A7 7 0 1 0 13 5V3Zm-1 4h2v5.17l3.24 3.24l-1.42 1.42L12 13V7Z"
    />
  </svg>
`;

const tableInsertIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-2V9h-5v4h2v2h-2v4h2v2H6a2 2 0 0 1-2-2V5Zm2 0v2h5V5H6Zm7 0v2h5V5h-5ZM6 9v4h5V9H6Zm0 6v4h5v-4H6Zm12 0v-3h2v3h3v2h-3v3h-2v-3h-3v-2h3Z"
    />
  </svg>
`;

const rowAboveIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M11 3h2v3h3v2h-3v3h-2V8H8V6h3V3ZM4 13h16v2H4v-2Zm0 4h16v2H4v-2Z"
    />
  </svg>
`;

const rowBelowIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M4 5h16v2H4V5Zm0 4h16v2H4V9Zm7 4h2v3h3v2h-3v3h-2v-3H8v-2h3v-3Z"
    />
  </svg>
`;

const columnLeftIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M3 11h3V8h2v3h3v2H8v3H6v-3H3v-2Zm11-7h2v16h-2V4Zm4 0h2v16h-2V4Z"
    />
  </svg>
`;

const columnRightIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M4 4h2v16H4V4Zm4 0h2v16H8V4Zm8 7h-3V9h3V6h2v3h3v2h-3v3h-2v-3Z"
    />
  </svg>
`;

const deleteRowIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M4 5h16v2H4V5Zm0 12h16v2H4v-2Zm4.4-3.6L6 11l1.4-1.4l2.4 2.4l2.4-2.4L13.6 11l-2.4 2.4l2.4 2.4l-1.4 1.4l-2.4-2.4l-2.4 2.4L6 15.8l2.4-2.4Zm7.6-1.4h4v2h-4v-2Z"
    />
  </svg>
`;

const deleteColumnIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M5 4h2v16H5V4Zm12 0h2v16h-2V4Zm-6.6 8L8 9.6L9.4 8l2.6 2.6L14.6 8L16 9.6L13.6 12l2.4 2.4l-1.4 1.6l-2.6-2.6L9.4 16L8 14.4l2.4-2.4Z"
    />
  </svg>
`;

const deleteTableIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M7 3h10l1 2h4v2H2V5h4l1-2Zm-2 6h14l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 9Zm4 2v8h2v-8H9Zm4 0v8h2v-8h-2Z"
    />
  </svg>
`;

const imageZoomIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M10.5 4a6.5 6.5 0 0 1 5.17 10.45l4.44 4.44l-1.42 1.42l-4.44-4.44A6.5 6.5 0 1 1 10.5 4Zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9Zm-.75 1.5h1.5v2.25h2.25v1.5h-2.25v2.25h-1.5v-2.25H7.5v-1.5h2.25V7.5Z"
    />
  </svg>
`;

const imageCopyAttachmentIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"
    />
  </svg>
`;

const imageCopyFilePathIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M5 3h8.5L19 8.5V21H5V3Zm8 2v4h4l-4-4ZM7 5v14h10v-8h-6V5H7Zm1.5 10H10v1.5H8.5V15Zm2.5 0h1.5v1.5H11V15Zm2.5 0H15v1.5h-1.5V15Z"
    />
  </svg>
`;

const imageResizeSmallerIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M5 5h14v14H5V5Zm2 2v10h10V7H7Zm2 4h6v2H9v-2Z"
    />
  </svg>
`;

const imageResizeLargerIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M5 5h14v14H5V5Zm2 2v10h10V7H7Zm4 2h2v2h2v2h-2v2h-2v-2H9v-2h2V9Z"
    />
  </svg>
`;

const imageResizeResetIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M12 5a7 7 0 1 1-6.32 4H3V7h6v6H7v-2.62A5 5 0 1 0 12 7V5Zm-2 5h4v4h-4v-4Z"
    />
  </svg>
`;

const imageLockOpenIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M17 8h-1V6a4 4 0 0 0-7.75-1.38l1.88.68A2 2 0 0 1 14 6v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm0 11H7v-9h10v9Zm-5-2a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3Z"
    />
  </svg>
`;

const imageLockClosedIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm7 13H7v-9h10v9Zm-5-2a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3Z"
    />
  </svg>
`;

// Theme configuration - ensure we have a default
interface ThemeStyle {
  variables: Record<string, string>;
}

const THEME_STYLES: Record<string, ThemeStyle> = {
  "vscode-dark": {
    variables: {
      "--crepe-color-background": "#1f1b16",
      "--crepe-color-on-background": "#eae1d9",
      "--crepe-color-surface": "#18120b",
    },
  },
  "vscode-light": {
    variables: {
      "--crepe-color-background": "#ffffff",
      "--crepe-color-on-background": "#1e1e1e",
      "--crepe-color-surface": "#f5f5f5",
    },
  },
  "vscode-high-contrast": {
    variables: {
      "--crepe-color-background": "#000000",
      "--crepe-color-on-background": "#ffffff",
      "--crepe-color-surface": "#1a1a1a",
    },
  },
  "default": {
    variables: {
      "--crepe-color-background": "#1f1b16",
      "--crepe-color-on-background": "#eae1d9",
      "--crepe-color-surface": "#18120b",
    },
  },
} as const;

// Apply theme variables to DOM
function applyThemeVariables(themeName: string | undefined) {
  const name = themeName || "default";
  const theme = THEME_STYLES[name] || THEME_STYLES["default"];
  const root = document.documentElement;

  // Apply theme variables to CSS variables
  Object.entries(theme.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function setThemeClass(nextThemeClass: string | undefined) {
  document.documentElement.classList.remove(
    "theme-dark",
    "theme-light",
    "theme-high-contrast",
  );
  document.documentElement.classList.add(nextThemeClass || "theme-dark");
}

function applyTableSettings() {
  document.documentElement.classList.toggle(
    "md-table-milkdown-controls-disabled",
    !tableSettings.milkdownControls,
  );

  if (!tableSettings.floatingToolbar) {
    hideTableToolbar();
  } else {
    scheduleTableToolbarUpdate();
  }

  if (!tableSettings.contextMenu) {
    hideTableContextMenu();
  }

  if (!tableSettings.slashMenu) {
    hideTableSlashMenu();
  } else {
    scheduleTableSlashMenuUpdate();
  }
}

function applyCodeBlockSettings() {
  document.documentElement.classList.toggle(
    "md-code-block-language-visible",
    codeBlockSettings.alwaysShowLanguage,
  );
  document.documentElement.classList.toggle(
    "md-code-block-copy-visible",
    codeBlockSettings.alwaysShowCopyButton,
  );
}

function ensureReadOnlyBadge(): HTMLElement {
  if (readOnlyBadgeElement) return readOnlyBadgeElement;

  const badge = document.createElement("div");
  badge.className = "md-editor-readonly-badge";
  badge.textContent = "READ ONLY";
  badge.setAttribute("role", "status");
  badge.setAttribute("aria-live", "polite");
  document.body.appendChild(badge);
  readOnlyBadgeElement = badge;
  return badge;
}

function applyReadOnlyMode(nextReadOnly: boolean, options: { notify?: boolean } = {}) {
  readOnlyMode = nextReadOnly;
  document.documentElement.classList.toggle("md-editor-readonly", readOnlyMode);

  if (readOnlyMode) {
    ensureReadOnlyBadge();
    hideTableToolbar();
    hideTableContextMenu();
    hideTableSlashMenu();
    hideTableInsertDialog();
  } else {
    readOnlyBadgeElement?.remove();
    readOnlyBadgeElement = undefined;
    scheduleTableToolbarUpdate();
    scheduleTableSlashMenuUpdate();
  }

  editor?.setReadonly(readOnlyMode);

  if (options.notify) {
    showEditorToast(
      readOnlyMode ? "Read-only mode enabled" : "Editing enabled",
      "success",
    );
  }
}

function shouldBlockEditAction(): boolean {
  if (!readOnlyMode) return false;

  showEditorToast("Read-only mode is on.", "error");
  return true;
}

function getErrorDetails(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function setLoadingStatus(message: string): void {
  const loading = document.querySelector<HTMLElement>(".md-editor-loading");
  if (loading) loading.textContent = message;
  bootLog("module-status", message);
}

function bootLog(stage: string, message: string, details?: unknown): void {
  window.__mdEditorBootLog?.(stage, message, details);
}

function elementSnapshot(element: Element | null): Record<string, unknown> | null {
  if (!(element instanceof HTMLElement)) return null;

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return {
    tag: element.tagName.toLowerCase(),
    className: element.className,
    text: element.textContent?.slice(0, 120) ?? "",
    rect: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      left: Math.round(rect.left),
    },
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
  };
}

function elementIdentity(element: Element | null): Record<string, unknown> | null {
  if (!(element instanceof HTMLElement)) return null;

  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.className || undefined,
    text: element.textContent?.slice(0, 80) ?? "",
  };
}

function documentStateSnapshot(): Record<string, unknown> {
  const centerX = Math.max(0, Math.floor(window.innerWidth / 2));
  const centerY = Math.max(0, Math.floor(window.innerHeight / 2));
  const topLeft = document.elementFromPoint(8, 8);
  const center = document.elementFromPoint(centerX, centerY);

  return {
    readyState: document.readyState,
    hidden: document.hidden,
    visibilityState: document.visibilityState,
    hasFocus: document.hasFocus(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scroll: {
      x: Math.round(window.scrollX),
      y: Math.round(window.scrollY),
    },
    activeElement: elementIdentity(document.activeElement),
    elementAtTopLeft: elementIdentity(topLeft),
    elementAtCenter: elementIdentity(center),
  };
}

function editorDomSnapshot(root: HTMLElement): Record<string, unknown> {
  const milkdown = root.querySelector(".milkdown");
  const proseMirror = root.querySelector(".ProseMirror");
  const loading = root.querySelector(".md-editor-loading");

  return {
    document: documentStateSnapshot(),
    html: elementSnapshot(document.documentElement),
    body: elementSnapshot(document.body),
    root: elementSnapshot(root),
    childCount: root.childElementCount,
    firstChild: elementSnapshot(root.firstElementChild),
    loading: elementSnapshot(loading),
    milkdown: elementSnapshot(milkdown),
    proseMirror: elementSnapshot(proseMirror),
    milkdownCount: root.querySelectorAll(".milkdown").length,
    proseMirrorCount: root.querySelectorAll(".ProseMirror").length,
    loadingCount: root.querySelectorAll(".md-editor-loading").length,
    bodyClass: document.body.className,
    documentClass: document.documentElement.className,
  };
}

function forceWebviewRepaint(root: HTMLElement): void {
  document.body.classList.add("md-editor-mounted");
  root.style.transform = "translateZ(0)";
  void root.offsetHeight;
  window.requestAnimationFrame(() => {
    root.style.transform = "";
    bootLog("render-nudge", "Forced webview repaint after mount", editorDomSnapshot(root));
  });
}

function showFatalError(error: unknown) {
  if (initWatchdog !== undefined) {
    window.clearTimeout(initWatchdog);
    initWatchdog = undefined;
  }

  const details = getErrorDetails(error);
  const root = document.getElementById("editor") || document.body;
  const wrapper = document.createElement("div");
  const title = document.createElement("h1");
  const message = document.createElement("pre");

  wrapper.className = "md-editor-error";
  title.textContent = "MalkDown Editor failed to load";
  message.textContent = details.stack || details.message;

  wrapper.append(title, message);
  root.replaceChildren(wrapper);

  try {
    bridge.postMessage({
      type: "error",
      message: details.message,
      stack: details.stack,
    } as WebviewToHostMessage);
  } catch (postError) {
    console.error("Failed to report webview error to host:", postError);
  }
}

function reportNonFatalWebviewError(context: string, error: unknown): void {
  const details = getErrorDetails(error);
  const message = `${context}: ${details.message}`;

  console.error("MalkDown Editor webview non-fatal error:", message, details.stack);

  try {
    bridge.postMessage({
      type: "error",
      message,
      stack: details.stack,
    } as WebviewToHostMessage);
  } catch {
    // Best effort only; startup and editing should continue.
  }
}

function buttonKindClass(button: EditorDialogButton): string {
  switch (button.kind) {
    case "destructive":
      return "md-editor-dialog__button--destructive";
    case "primary":
      return "md-editor-dialog__button--primary";
    default:
      return "md-editor-dialog__button--secondary";
  }
}

function focusableDialogElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      [
        "button:not([disabled])",
        "summary",
        "a[href]",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(","),
    ),
  ).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function showEditorDialog(message: ShowEditorDialogMessage): void {
  activeEditorDialog?.close(activeEditorDialog.cancelButtonId);

  const overlay = document.createElement("div");
  overlay.className = "md-editor-dialog-backdrop";

  const dialog = document.createElement("section");
  dialog.className = "md-editor-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", `md-editor-dialog-title-${message.requestId}`);

  const title = document.createElement("h2");
  title.id = `md-editor-dialog-title-${message.requestId}`;
  title.className = "md-editor-dialog__title";
  title.textContent = message.title;
  dialog.appendChild(title);

  if (message.body?.length) {
    const body = document.createElement("div");
    body.className = "md-editor-dialog__body";
    for (const line of message.body) {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      body.appendChild(paragraph);
    }
    dialog.appendChild(body);
  }

  if (message.details || message.detailsSections?.length) {
    const details = document.createElement("details");
    details.className = "md-editor-dialog__details";

    const summary = document.createElement("summary");
    summary.textContent = message.detailsLabel || "More details";
    details.appendChild(summary);

    const detailsBody = document.createElement("div");
    detailsBody.className = "md-editor-dialog__details-body";
    if (message.detailsSections?.length) {
      for (const section of message.detailsSections) {
        const sectionElement = document.createElement("div");
        sectionElement.className = "md-editor-dialog__detail-section";

        if (section.label) {
          const label = document.createElement("div");
          label.className = [
            "md-editor-dialog__detail-label",
            section.kind === "destructive"
              ? "md-editor-dialog__detail-label--destructive"
              : "",
          ].filter(Boolean).join(" ");
          label.textContent = `${section.label}:`;
          sectionElement.appendChild(label);
        }

        const text = document.createElement("div");
        text.className = [
          "md-editor-dialog__detail-text",
          section.monospace ? "md-editor-dialog__detail-text--monospace" : "",
          section.kind === "destructive"
            ? "md-editor-dialog__detail-text--destructive"
            : "",
        ].filter(Boolean).join(" ");
        text.textContent = section.text;
        sectionElement.appendChild(text);
        detailsBody.appendChild(sectionElement);
      }
    } else {
      detailsBody.textContent = message.details ?? "";
    }
    details.appendChild(detailsBody);
    dialog.appendChild(details);
  }

  const actions = document.createElement("div");
  actions.className = "md-editor-dialog__actions";
  const leftActions = document.createElement("div");
  leftActions.className = "md-editor-dialog__actions-group";
  const rightActions = document.createElement("div");
  rightActions.className = "md-editor-dialog__actions-group";

  const defaultButton =
    message.buttons.find((button) => button.default) ??
    message.buttons.find((button) => button.cancel) ??
    message.buttons[0];
  const cancelButton =
    message.buttons.find((button) => button.cancel) ??
    defaultButton;
  let didClose = false;

  const close = (buttonId?: string) => {
    if (didClose) return;
    didClose = true;
    overlay.removeEventListener("keydown", onKeyDown, { capture: true });
    overlay.remove();
    activeEditorDialog = undefined;
    bridge.postMessage({
      type: "dialogResult",
      requestId: message.requestId,
      buttonId,
    } as WebviewToHostMessage);
  };

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(cancelButton?.id);
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = focusableDialogElements(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;

    event.preventDefault();
    focusable[nextIndex].focus();
  }

  for (const item of message.buttons) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `md-editor-dialog__button ${buttonKindClass(item)}`;
    button.textContent = item.label;
    button.addEventListener("click", () => close(item.id));

    if (item.default) {
      button.dataset.default = "true";
    }
    if (item.cancel) {
      button.dataset.cancel = "true";
    }

    if (item.placement === "left") {
      leftActions.appendChild(button);
    } else {
      rightActions.appendChild(button);
    }
  }

  actions.append(leftActions, rightActions);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  overlay.addEventListener("keydown", onKeyDown, { capture: true });
  document.body.appendChild(overlay);

  activeEditorDialog = {
    requestId: message.requestId,
    cancelButtonId: cancelButton?.id,
    close,
  };

  window.requestAnimationFrame(() => {
    const defaultElement = dialog.querySelector<HTMLElement>(
      `[data-default='true']`,
    );
    defaultElement?.focus();
  });
}

function isDomNode(value: unknown): value is Node {
  return typeof Node !== "undefined" && value instanceof Node;
}

function isDomResult(value: unknown): value is { dom: Node } {
  return (
    !!value &&
    typeof value === "object" &&
    "dom" in value &&
    isDomNode((value as { dom?: unknown }).dom)
  );
}

function warnInvalidDomSpec(context: string, value: unknown) {
  if (didWarnAboutInvalidDomSpec) return;

  didWarnAboutInvalidDomSpec = true;
  console.warn("MalkDown Editor sanitized an invalid Milkdown DOM spec.", {
    context,
    value,
  });
}

function domNodeToSpec(value: Node): unknown {
  if (value.nodeType === 3) {
    return value.textContent ?? "";
  }

  if (typeof Element !== "undefined" && value instanceof Element) {
    const namespace = value.namespaceURI;
    const isHtmlNamespace =
      !namespace || namespace === "http://www.w3.org/1999/xhtml";
    const tagName = isHtmlNamespace
      ? value.localName
      : `${namespace} ${value.localName}`;
    const attrs: Record<string, string> = {};

    for (const attr of Array.from(value.attributes)) {
      const attrName = attr.namespaceURI
        ? `${attr.namespaceURI} ${attr.localName}`
        : attr.name;
      attrs[attrName] = attr.value;
    }

    const output: unknown[] = [tagName];
    if (Object.keys(attrs).length > 0) {
      output.push(attrs);
    }

    for (const child of Array.from(value.childNodes)) {
      output.push(domNodeToSpec(child));
    }

    return output;
  }

  return value.textContent ?? "";
}

function renderDomNode(value: Node) {
  return { dom: value };
}

function sanitizeDomSpec(value: unknown, context: string, depth = 0): unknown {
  if (isDomNode(value)) {
    return depth === 0 ? value : domNodeToSpec(value);
  }

  if (isDomResult(value)) {
    return depth === 0 ? value : domNodeToSpec(value.dom);
  }

  if (
    typeof value === "string" ||
    value === 0
  ) {
    return value;
  }

  if (!Array.isArray(value)) {
    warnInvalidDomSpec(context, value);
    return depth === 0
      ? ["span", { "data-md-editor-invalid-dom-spec": context }, String(value ?? "")]
      : String(value ?? "");
  }

  const [tagName] = value;
  if (typeof tagName !== "string") {
    warnInvalidDomSpec(context, value);
    return depth === 0
      ? ["span", { "data-md-editor-invalid-dom-spec": context }]
      : "";
  }

  const output: unknown[] = [tagName];
  const maybeAttrs = value[1];
  const hasAttrs =
    !!maybeAttrs &&
    typeof maybeAttrs === "object" &&
    !Array.isArray(maybeAttrs) &&
    !isDomNode(maybeAttrs);
  let childStart = 1;

  if (hasAttrs) {
    output.push(maybeAttrs);
    childStart = 2;
  }

  const children = value.slice(childStart);
  const contentHoleCount = children.filter((child) => child === 0).length;
  if (contentHoleCount > 0 && children.length > 1) {
    warnInvalidDomSpec(context, value);
    output.push(0);
    return output;
  }

  for (const child of children) {
    output.push(sanitizeDomSpec(child, context, depth + 1));
  }

  return output;
}

function installDomSpecSanitizer() {
  type RenderSpecResult = { dom: Node; contentDOM?: HTMLElement };
  type RenderSpec = (
    doc: Document,
    structure: unknown,
    xmlNS?: string | null,
    blockArraysIn?: unknown,
  ) => RenderSpecResult;
  const serializer = DOMSerializer as unknown as {
    __mdEditorRenderSpecPatched?: boolean;
    renderSpec: RenderSpec;
  };

  if (serializer.__mdEditorRenderSpecPatched) return;

  const renderSpec = serializer.renderSpec.bind(serializer) as RenderSpec;
  serializer.renderSpec = ((doc, structure, xmlNS, blockArraysIn) => {
    if (isDomNode(structure)) {
      return renderDomNode(structure);
    }

    if (isDomResult(structure)) {
      return structure as RenderSpecResult;
    }

    try {
      return renderSpec(doc, structure, xmlNS, blockArraysIn);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("Invalid array passed to renderSpec") ||
        message.includes("Content hole must be the only child")
      ) {
        const sanitized = sanitizeDomSpec(
          structure,
          "DOMSerializer.renderSpec",
        );

        if (isDomNode(sanitized)) {
          return renderDomNode(sanitized);
        }

        if (isDomResult(sanitized)) {
          return sanitized as RenderSpecResult;
        }

        return renderSpec(doc, sanitized as typeof structure, xmlNS, blockArraysIn);
      }

      throw error;
    }
  }) as RenderSpec;

  serializer.__mdEditorRenderSpecPatched = true;
}

installDomSpecSanitizer();

// Handle messages from host
bridge.onMessage((message) => {
  const msg = message as HostToWebviewMessage;
  bootLog("host-message", `Received host message: ${msg.type}`);
  switch (msg.type) {
    case "attachmentUploaded":
      if (msg.ok && msg.src) {
        showEditorToast(`Attachment saved: ${msg.src}`, "success");
      } else if (msg.message && !msg.message.toLowerCase().includes("cancelled")) {
        showEditorToast(`Attachment save failed: ${msg.message}`, "error");
      }
      settlePendingRequest(
        pendingAttachmentUploads,
        msg.requestId,
        msg.ok,
        msg.src,
        msg.message,
      );
      break;
    case "attachmentSrcResolved":
      settlePendingRequest(
        pendingAttachmentSrcResolutions,
        msg.requestId,
        msg.ok,
        msg.src,
        msg.message,
      );
      break;
    case "attachmentPathCopied":
      if (msg.ok) {
        showEditorToast("Image file path copied", "success");
      } else if (msg.message) {
        showEditorToast(`Copy failed: ${msg.message}`, "error");
      }
      settlePendingRequest(
        pendingAttachmentPathCopies,
        msg.requestId,
        msg.ok,
        msg.path,
        msg.message,
      );
      break;
    case "runDateTimeAction":
      runDateTimeAction(msg.action);
      break;
    case "setReadOnly":
      applyReadOnlyMode(msg.readOnly, { notify: true });
      break;
    case "showDialog":
      showEditorDialog(msg);
      break;
    case "settingsUpdated":
      dateTimeSettings = msg.dateTime;
      tableSettings = msg.tables;
      codeBlockSettings = msg.codeBlocks;
      applyTableSettings();
      applyCodeBlockSettings();
      break;
    case "fatalError":
      showFatalError(
        new Error(msg.stack ? `${msg.message}\n\n${msg.stack}` : msg.message),
      );
      break;
    case "init":
      bootLog("init-received", "Received init message", {
        version: msg.version,
        markdownLength: msg.markdown.length,
        readOnly: msg.readOnly,
      });
      if (editorMounted && msg.version <= currentVersion) return;
      if (initialMountStarted && !editorMounted) return;

      initialMountStarted = true;
      currentVersion = msg.version;
      themeClass = msg.themeClass || "theme-dark";
      dateTimeSettings = msg.dateTime;
      tableSettings = msg.tables;
      codeBlockSettings = msg.codeBlocks;
      readOnlyMode = msg.readOnly;
      applyThemeVariables(msg.theme?.name);
      applyTableSettings();
      applyCodeBlockSettings();
      setLoadingStatus("Creating MalkDown Editor...");
      void mountEditor(msg.markdown)
        .catch(showFatalError)
        .finally(() => {
          initialMountStarted = false;
        });
      break;
    case "externalUpdate":
      bootLog("external-update", "Received external update", {
        version: msg.version,
        currentVersion,
        markdownLength: msg.markdown.length,
      });
      if (msg.version <= currentVersion) return;
      currentVersion = msg.version;
      void updateEditor(msg.markdown).catch(showFatalError);
      break;
  }
});

function createRequestId(prefix: string): string {
  requestSequence += 1;
  return `${prefix}-${Date.now()}-${requestSequence}`;
}

function settlePendingRequest(
  requests: Map<string, PendingRequest>,
  requestId: string,
  ok: boolean,
  value?: string,
  message?: string,
) {
  const pending = requests.get(requestId);
  if (!pending) return;

  window.clearTimeout(pending.timeout);
  requests.delete(requestId);

  if (ok && value) {
    pending.resolve(value);
    return;
  }

  pending.reject(new Error(message || "Attachment request failed."));
}

function fileToBase64(file: File): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  });
}

async function uploadAttachment(file: File): Promise<string> {
  if (readOnlyMode) {
    throw new Error("Read-only mode is on.");
  }

  const requestId = createRequestId("upload");
  const dataBase64 = await fileToBase64(file);

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingAttachmentUploads.delete(requestId);
      reject(new Error("Attachment upload timed out."));
    }, 120000);

    pendingAttachmentUploads.set(requestId, { resolve, reject, timeout });
    bridge.postMessage({
      type: "uploadAttachment",
      requestId,
      name: file.name,
      mimeType: file.type,
      dataBase64,
    } as WebviewToHostMessage);
  });
}

function isBrowserUrl(src: string): boolean {
  return /^(https?:|data:|blob:|vscode-webview-resource:|vscode-resource:)/i.test(src);
}

function resolveAttachmentSrc(src: string): Promise<string> | string {
  if (!src || isBrowserUrl(src)) return src;

  const requestId = createRequestId("src");
  bootLog("attachment-src-request", "Requesting attachment URL", {
    requestId,
    src,
  });
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingAttachmentSrcResolutions.delete(requestId);
      console.warn(
        `Attachment URL resolution timed out for ${src}; using original source.`,
      );
      resolve(src);
    }, ATTACHMENT_SRC_FALLBACK_TIMEOUT_MS);

    pendingAttachmentSrcResolutions.set(requestId, { resolve, reject, timeout });
    bridge.postMessage({
      type: "resolveAttachmentSrc",
      requestId,
      src,
    } as WebviewToHostMessage);
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      bootLog("timeout", message, { timeoutMs });
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function copyAttachmentPath(src: string): Promise<string> {
  if (!src) {
    return Promise.reject(new Error("Image path is empty."));
  }

  const requestId = createRequestId("copy-path");
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingAttachmentPathCopies.delete(requestId);
      reject(new Error("Copy image path timed out."));
    }, 10000);

    pendingAttachmentPathCopies.set(requestId, { resolve, reject, timeout });
    bridge.postMessage({
      type: "copyAttachmentPath",
      requestId,
      src,
    } as WebviewToHostMessage);
  });
}

function padNumber(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

function formatDateTimePart(date: Date, format: string): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const replacements: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    yy: String(date.getFullYear()).slice(-2),
    MM: padNumber(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    dd: padNumber(date.getDate()),
    d: String(date.getDate()),
    HH: padNumber(hours24),
    H: String(hours24),
    hh: padNumber(hours12),
    h: String(hours12),
    mm: padNumber(date.getMinutes()),
    ss: padNumber(date.getSeconds()),
    a: hours24 < 12 ? "AM" : "PM",
  };

  return format.replace(
    /yyyy|yy|MM|M|dd|d|HH|H|hh|h|mm|ss|a/g,
    (token) => replacements[token] ?? token,
  );
}

function renderDateTimeTemplate(template: string, date = new Date()): string {
  const formattedDate = formatDateTimePart(
    date,
    dateTimeSettings.dateFormat || "yyyy-MM-dd",
  );
  const formattedTime = formatDateTimePart(
    date,
    dateTimeSettings.timeFormat || "HH:mm",
  );
  const formattedDateTime = `${formattedDate} ${formattedTime}`;

  return template
    .replace(/\{date\}/g, formattedDate)
    .replace(/\{time\}/g, formattedTime)
    .replace(/\{datetime\}/g, formattedDateTime);
}

function dateTimeTextForAction(action: DateTimeAction): string {
  switch (action) {
    case "insertDate":
      return renderDateTimeTemplate("{date}");
    case "insertTime":
      return renderDateTimeTemplate("{time}");
    case "insertDateTime":
      return renderDateTimeTemplate("{datetime}");
    case "insertLastUpdated":
    case "updateLastUpdated":
      return renderDateTimeTemplate(dateTimeSettings.lastUpdatedTemplate);
    case "insertHistoryEntry":
      return renderDateTimeTemplate(dateTimeSettings.historyEntryTemplate);
    case "insertCustom":
      return renderDateTimeTemplate(dateTimeSettings.customTemplate);
  }
}

function lastUpdatedPrefix(): string | undefined {
  const [prefix] = dateTimeSettings.lastUpdatedTemplate.split(
    /\{date\}|\{time\}|\{datetime\}/,
  );
  const trimmed = prefix.trim();
  return trimmed || undefined;
}

function isLastUpdatedText(value: string): boolean {
  const text = value.trim();
  const prefix = lastUpdatedPrefix();
  if (prefix && text.toLowerCase().startsWith(prefix.toLowerCase())) {
    return true;
  }

  return /^last updated\s*:/i.test(text);
}

function replaceCurrentTextBlockIfLastUpdated(nextText: string): boolean {
  if (!editor) return false;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const { state } = view;
    const { $from } = state.selection;
    let textBlockDepth = -1;

    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).isTextblock) {
        textBlockDepth = depth;
        break;
      }
    }

    if (textBlockDepth === -1) return false;

    const node = $from.node(textBlockDepth);
    if (!isLastUpdatedText(node.textContent)) return false;

    const from = $from.start(textBlockDepth);
    const to = $from.end(textBlockDepth);
    view.dispatch(state.tr.insertText(nextText, from, to).scrollIntoView());
    view.focus();
    return true;
  });
}

function deleteActiveSlashQuery(): boolean {
  if (!editor) return false;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const { state } = view;
    const { selection } = state;
    if (!selection.empty) return false;

    const { $from } = selection;
    let textBlockDepth = -1;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).isTextblock) {
        textBlockDepth = depth;
        break;
      }
    }

    if (textBlockDepth === -1) return false;

    const blockStart = $from.start(textBlockDepth);
    const cursor = selection.from;
    const textBeforeCursor = state.doc.textBetween(
      blockStart,
      cursor,
      "\n",
      "\n",
    );

    if (textBeforeCursor.startsWith("/")) {
      view.dispatch(state.tr.delete(blockStart, cursor).scrollIntoView());
      view.focus();
      return true;
    }

    const match = textBeforeCursor.match(/(^|\s)(\/[^\s/]*)$/);
    if (!match) return false;

    const slashToken = match[2];
    const from = cursor - slashToken.length;
    view.dispatch(state.tr.delete(from, cursor).scrollIntoView());
    view.focus();
    return true;
  });
}

const inlineDateTimeShortcutActions = new Map<string, DateTimeAction>([
  ["d", "insertDate"],
  ["date", "insertDate"],
  ["today", "insertDate"],
  ["t", "insertTime"],
  ["time", "insertTime"],
  ["dt", "insertDateTime"],
  ["datetime", "insertDateTime"],
  ["updated", "insertLastUpdated"],
  ["lastupdated", "insertLastUpdated"],
  ["lu", "insertLastUpdated"],
  ["history", "insertHistoryEntry"],
  ["hist", "insertHistoryEntry"],
]);

function findInlineDateTimeShortcut(
  textBeforeCursor: string,
): { action: DateTimeAction; fromOffset: number; toOffset: number } | undefined {
  const match = textBeforeCursor.match(/\/([a-z]+)$/i);
  if (!match || match.index === undefined) return undefined;

  const slashIndex = match.index;
  const shortcut = match[1].toLowerCase();
  const action = inlineDateTimeShortcutActions.get(shortcut);
  if (!action) return undefined;

  const beforeSlash = textBeforeCursor.slice(0, slashIndex);
  const previousCharacter = beforeSlash[beforeSlash.length - 1];
  if (previousCharacter && /[A-Za-z0-9_./:-]/.test(previousCharacter)) {
    return undefined;
  }

  if (/https?:\/\/\S*$/i.test(beforeSlash) || /(?:^|\s)\/[^\s]*$/.test(beforeSlash)) {
    return undefined;
  }

  return {
    action,
    fromOffset: slashIndex,
    toOffset: textBeforeCursor.length,
  };
}

function replaceInlineDateTimeShortcut(): boolean {
  if (readOnlyMode) return false;
  if (!editor || !dateTimeSettings.inlineSlashShortcuts) return false;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const { state } = view;
    const { selection } = state;
    if (!selection.empty) return false;

    const { $from } = selection;
    let textBlockDepth = -1;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).isTextblock) {
        textBlockDepth = depth;
        break;
      }
    }

    if (textBlockDepth === -1) return false;

    const blockStart = $from.start(textBlockDepth);
    const cursor = selection.from;
    const textBeforeCursor = state.doc.textBetween(
      blockStart,
      cursor,
      "\n",
      "\n",
    );
    const shortcut = findInlineDateTimeShortcut(textBeforeCursor);
    if (!shortcut) return false;

    const from = blockStart + shortcut.fromOffset;
    const to = blockStart + shortcut.toOffset;
    const replacement = dateTimeTextForAction(shortcut.action);

    view.dispatch(state.tr.insertText(replacement, from, to).scrollIntoView());
    view.focus();
    return true;
  });
}

function insertDateTimeMarkdown(action: DateTimeAction) {
  if (!editor) return;
  if (shouldBlockEditAction()) return;

  const markdown = dateTimeTextForAction(action);
  const inline = action === "insertDate" ||
    action === "insertTime" ||
    action === "insertDateTime" ||
    action === "insertCustom";

  deleteActiveSlashQuery();
  editor.editor.action(insert(markdown, inline));
}

function runDateTimeAction(action: DateTimeAction) {
  if (shouldBlockEditAction()) return;

  if (action === "updateLastUpdated") {
    const nextText = dateTimeTextForAction(action);
    if (replaceCurrentTextBlockIfLastUpdated(nextText)) return;
  }

  insertDateTimeMarkdown(action);
}

function normalizeTableDimension(
  value: number,
  fallback: number,
  max: number,
): number {
  if (!Number.isFinite(value)) return fallback;

  return clamp(Math.trunc(value), 1, max);
}

function tableDefaultRows(): number {
  return normalizeTableDimension(tableSettings.defaultRows, 3, 50);
}

function tableDefaultColumns(): number {
  return normalizeTableDimension(tableSettings.defaultColumns, 3, 20);
}

function selectionAnchor(): FloatingAnchor | undefined {
  if (!editor) return undefined;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);

    try {
      return view.coordsAtPos(view.state.selection.from);
    } catch {
      return undefined;
    }
  });
}

function hideTableInsertDialog() {
  tableInsertDialogElement?.remove();
  tableInsertDialogElement = undefined;
}

function insertTableWithSize(
  rows: number,
  columns: number,
  options: { cleanupSlash?: boolean } = {},
) {
  if (!editor) return;
  if (shouldBlockEditAction()) return;

  hideTableInsertDialog();
  hideTableContextMenu();
  hideTableSlashMenu();

  if (options.cleanupSlash) {
    deleteActiveSlashQuery();
  }

  const rowCount = normalizeTableDimension(rows, tableDefaultRows(), 50);
  const columnCount = normalizeTableDimension(
    columns,
    tableDefaultColumns(),
    20,
  );

  editor.editor.action((ctx) => {
    const commands = ctx.get(commandsCtx);
    const view = ctx.get(editorViewCtx);

    view.focus();
    commands.call(insertTableCommand.key, {
      row: rowCount,
      col: columnCount,
    });
  });
}

function createDimensionControl(
  label: string,
  initialValue: number,
  max: number,
): { element: HTMLElement; value: () => number } {
  const wrapper = document.createElement("label");
  const labelText = document.createElement("span");
  const controls = document.createElement("span");
  const decrement = document.createElement("button");
  const input = document.createElement("input");
  const increment = document.createElement("button");

  wrapper.className = "md-table-insert-dialog__field";
  labelText.textContent = label;
  controls.className = "md-table-insert-dialog__stepper";

  decrement.type = "button";
  decrement.className = "md-table-insert-dialog__stepper-button";
  decrement.textContent = "-";
  setControlLabel(decrement, `Decrease ${label.toLowerCase()}`);

  input.type = "number";
  input.min = "1";
  input.max = String(max);
  input.step = "1";
  input.value = String(normalizeTableDimension(initialValue, 3, max));
  input.className = "md-table-insert-dialog__input";
  input.setAttribute("aria-label", label);

  increment.type = "button";
  increment.className = "md-table-insert-dialog__stepper-button";
  increment.textContent = "+";
  setControlLabel(increment, `Increase ${label.toLowerCase()}`);

  const value = () =>
    normalizeTableDimension(Number(input.value), initialValue, max);

  const setValue = (next: number) => {
    input.value = String(normalizeTableDimension(next, initialValue, max));
  };

  decrement.addEventListener("click", () => setValue(value() - 1));
  increment.addEventListener("click", () => setValue(value() + 1));
  input.addEventListener("blur", () => setValue(value()));

  controls.append(decrement, input, increment);
  wrapper.append(labelText, controls);

  return {
    element: wrapper,
    value,
  };
}

function showTableInsertDialog(options: { cleanupSlash?: boolean } = {}) {
  if (!editor) return;
  if (shouldBlockEditAction()) return;

  hideTableInsertDialog();
  hideTableContextMenu();
  hideTableSlashMenu();

  if (options.cleanupSlash) {
    deleteActiveSlashQuery();
  }

  const dialog = document.createElement("div");
  const title = document.createElement("div");
  const controls = document.createElement("div");
  const actions = document.createElement("div");
  const insertButton = document.createElement("button");
  const cancelButton = document.createElement("button");
  const rows = createDimensionControl("Rows", tableDefaultRows(), 50);
  const columns = createDimensionControl("Columns", tableDefaultColumns(), 20);

  dialog.className = "md-table-insert-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "false");
  dialog.setAttribute("aria-label", "Insert table");

  title.className = "md-table-insert-dialog__title";
  title.textContent = "Insert table";

  controls.className = "md-table-insert-dialog__controls";
  controls.append(rows.element, columns.element);

  actions.className = "md-table-insert-dialog__actions";

  cancelButton.type = "button";
  cancelButton.className = "md-table-insert-dialog__button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", hideTableInsertDialog);

  insertButton.type = "button";
  insertButton.className = "md-table-insert-dialog__button md-table-insert-dialog__button--primary";
  insertButton.textContent = "Insert";
  insertButton.addEventListener("click", () => {
    insertTableWithSize(rows.value(), columns.value());
  });

  actions.append(cancelButton, insertButton);
  dialog.append(title, controls, actions);
  document.body.appendChild(dialog);
  tableInsertDialogElement = dialog;

  const anchor = selectionAnchor();
  positionFloatingElement(
    dialog,
    anchor ?? {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      bottom: window.innerHeight / 2,
      width: 0,
    },
    anchor ? "above" : "point",
    anchor ? undefined : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  );

  window.setTimeout(() => {
    dialog.querySelector<HTMLInputElement>("input")?.focus();
  }, 0);
}

function runInsertTableAction(options: {
  cleanupSlash?: boolean;
  custom?: boolean;
} = {}) {
  if (
    options.custom ||
    tableSettings.insertBehavior === "askEveryTime"
  ) {
    showTableInsertDialog({ cleanupSlash: options.cleanupSlash });
    return;
  }

  insertTableWithSize(
    tableDefaultRows(),
    tableDefaultColumns(),
    { cleanupSlash: options.cleanupSlash },
  );
}

type TableAction =
  | "addRowBefore"
  | "addRowAfter"
  | "addColumnBefore"
  | "addColumnAfter"
  | "deleteRow"
  | "deleteColumn"
  | "deleteTable";

type TableSelectionAction = TableAction;

interface FloatingAnchor {
  left: number;
  top: number;
  right?: number;
  bottom: number;
  width?: number;
  height?: number;
}

interface TableActionItem {
  action: TableAction;
  label: string;
  icon: string;
  destructive?: boolean;
  separatorBefore?: boolean;
}

const tableActionItems: TableActionItem[] = [
  {
    action: "addRowBefore",
    label: "Add row above",
    icon: rowAboveIcon,
  },
  {
    action: "addRowAfter",
    label: "Add row below",
    icon: rowBelowIcon,
  },
  {
    action: "addColumnBefore",
    label: "Add column left",
    icon: columnLeftIcon,
    separatorBefore: true,
  },
  {
    action: "addColumnAfter",
    label: "Add column right",
    icon: columnRightIcon,
  },
  {
    action: "deleteRow",
    label: "Delete row",
    icon: deleteRowIcon,
    destructive: true,
    separatorBefore: true,
  },
  {
    action: "deleteColumn",
    label: "Delete column",
    icon: deleteColumnIcon,
    destructive: true,
  },
  {
    action: "deleteTable",
    label: "Delete table",
    icon: deleteTableIcon,
    destructive: true,
  },
];

const tableSelectionCommands: Record<TableSelectionAction, Command> = {
  addRowBefore,
  addRowAfter,
  addColumnBefore,
  addColumnAfter,
  deleteRow,
  deleteColumn,
  deleteTable,
};

function runTableAction(
  action: TableAction,
  options: { cleanupSlash?: boolean } = {},
) {
  if (!editor) return;
  if (shouldBlockEditAction()) return;

  hideTableContextMenu();
  hideTableSlashMenu();
  if (options.cleanupSlash) {
    deleteActiveSlashQuery();
  }

  let handled = false;
  editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    view.focus();

    handled = tableSelectionCommands[action](
      view.state,
      view.dispatch,
      view,
    );
  });

  if (!handled) {
    showEditorToast("Place the cursor inside a table first.", "error");
  }

  scheduleTableToolbarUpdate();
}

function elementFromNode(node: Node | EventTarget | null): Element | undefined {
  if (!node) return undefined;
  if (node instanceof Element) return node;
  if (node instanceof Node) return node.parentElement ?? undefined;
  return undefined;
}

function closestTableBlock(
  target: Node | EventTarget | null,
): HTMLElement | undefined {
  const tableBlock = elementFromNode(target)?.closest(
    ".milkdown-table-block",
  ) as HTMLElement | null | undefined;

  return tableBlock ?? undefined;
}

function setControlLabel(element: HTMLElement, label: string) {
  element.title = label;
  element.setAttribute("aria-label", label);
}

function setSelectionFromPoint(clientX: number, clientY: number): boolean {
  if (!editor) return false;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const position = view.posAtCoords({ left: clientX, top: clientY });
    if (!position) return false;

    try {
      const selection = Selection.near(view.state.doc.resolve(position.pos));
      view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
      view.focus();
      return true;
    } catch {
      return false;
    }
  });
}

function createTableToolbarButton(item: TableActionItem): HTMLButtonElement {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "md-table-toolbar__button";
  if (item.destructive) {
    button.classList.add("md-table-toolbar__button--destructive");
  }
  button.innerHTML = item.icon;
  setControlLabel(button, item.label);
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    runTableAction(item.action);
  });

  return button;
}

function createTableToolbar(): HTMLElement {
  const toolbar = document.createElement("div");

  toolbar.className = "md-table-toolbar";
  toolbar.dataset.show = "false";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Table editing");
  toolbar.addEventListener("pointerdown", (event) => {
    event.preventDefault();
  });

  for (const item of tableActionItems) {
    if (item.separatorBefore) {
      const divider = document.createElement("span");
      divider.className = "md-table-toolbar__divider";
      toolbar.appendChild(divider);
    }

    toolbar.appendChild(createTableToolbarButton(item));
  }

  return toolbar;
}

function createTableContextMenu(): HTMLElement {
  const menu = document.createElement("div");

  menu.className = "md-table-context-menu";
  menu.dataset.show = "false";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Table actions");

  for (const item of tableActionItems) {
    if (item.separatorBefore) {
      const divider = document.createElement("div");
      divider.className = "md-table-context-menu__divider";
      menu.appendChild(divider);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "md-table-context-menu__item";
    button.setAttribute("role", "menuitem");
    if (item.destructive) {
      button.classList.add("md-table-context-menu__item--destructive");
    }
    button.innerHTML = `${item.icon}<span>${item.label}</span>`;
    setControlLabel(button, item.label);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      runTableAction(item.action);
    });
    menu.appendChild(button);
  }

  return menu;
}

function createTableSlashMenu(): HTMLElement {
  const menu = document.createElement("div");

  menu.className = "md-table-slash-menu";
  menu.dataset.show = "false";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Table Tools");

  return menu;
}

function isTargetInsideTableUi(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;

  return Boolean(
    tableToolbarElement?.contains(target) ||
      tableContextMenuElement?.contains(target) ||
      tableSlashMenuElement?.contains(target) ||
      tableInsertDialogElement?.contains(target),
  );
}

function hideTableToolbar() {
  if (!tableToolbarElement) return;

  tableToolbarElement.dataset.show = "false";
  tableToolbarElement.style.visibility = "";
}

function hideTableContextMenu() {
  if (!tableContextMenuElement) return;

  tableContextMenuElement.dataset.show = "false";
  tableContextMenuElement.style.visibility = "";
}

function hideTableSlashMenu() {
  if (!tableSlashMenuElement) return;

  tableSlashMenuElement.dataset.show = "false";
  tableSlashMenuElement.style.visibility = "";
  tableSlashMenuVisibleItems = [];
  tableSlashMenuActiveIndex = 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function positionFloatingElement(
  element: HTMLElement,
  anchor: FloatingAnchor,
  placement: "above" | "point",
  point?: { x: number; y: number },
) {
  element.dataset.show = "true";
  element.style.visibility = "hidden";
  element.style.left = "0px";
  element.style.top = "0px";

  const rect = element.getBoundingClientRect();
  const viewportPadding = 8;
  const maxLeft = Math.max(
    viewportPadding,
    window.innerWidth - rect.width - viewportPadding,
  );
  const maxTop = Math.max(
    viewportPadding,
    window.innerHeight - rect.height - viewportPadding,
  );
  const anchorWidth = anchor.width ??
    Math.max(0, (anchor.right ?? anchor.left) - anchor.left);
  let left = anchor.left + anchorWidth / 2 - rect.width / 2;
  let top = anchor.top - rect.height - 8;

  if (placement === "point" && point) {
    left = point.x;
    top = point.y;
  } else if (top < viewportPadding) {
    top = anchor.bottom + 8;
  }

  element.style.left = `${clamp(left, viewportPadding, maxLeft)}px`;
  element.style.top = `${clamp(top, viewportPadding, maxTop)}px`;
  element.style.visibility = "";
}

function activeTableBlock(): HTMLElement | undefined {
  if (!editor) return undefined;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    if (!isInTable(view.state)) return undefined;

    try {
      const { from } = view.state.selection;
      const { node } = view.domAtPos(from);
      const tableBlock = closestTableBlock(node);
      if (tableBlock) return tableBlock;

      const coords = view.coordsAtPos(from);
      return closestTableBlock(
        document.elementFromPoint(coords.left, coords.top),
      );
    } catch {
      return undefined;
    }
  });
}

function updateTableToolbarPosition() {
  if (readOnlyMode) {
    hideTableToolbar();
    return;
  }

  if (!tableSettings.floatingToolbar) {
    hideTableToolbar();
    return;
  }

  const tableBlock = activeTableBlock();
  if (!tableToolbarElement || !tableBlock) {
    hideTableToolbar();
    return;
  }

  positionFloatingElement(
    tableToolbarElement,
    tableBlock.getBoundingClientRect(),
    "above",
  );
}

function scheduleTableToolbarUpdate() {
  if (tableUiUpdateAnimationFrame !== undefined) {
    window.cancelAnimationFrame(tableUiUpdateAnimationFrame);
  }

  tableUiUpdateAnimationFrame = window.requestAnimationFrame(() => {
    tableUiUpdateAnimationFrame = undefined;
    updateTableToolbarPosition();
  });
}

function tableSlashMenuQuery():
  | { filter: string; coords: FloatingAnchor }
  | undefined {
  if (readOnlyMode) return undefined;
  if (!editor || !tableSettings.slashMenu) return undefined;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const { state } = view;
    const { selection } = state;
    if (!selection.empty || !isInTable(state)) return undefined;

    const { $from } = selection;
    let textBlockDepth = -1;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).isTextblock) {
        textBlockDepth = depth;
        break;
      }
    }

    if (textBlockDepth === -1) return undefined;

    const blockStart = $from.start(textBlockDepth);
    const cursor = selection.from;
    const textBeforeCursor = state.doc.textBetween(
      blockStart,
      cursor,
      "\n",
      "\n",
    );
    const match = textBeforeCursor.match(/^\/([a-z-]*)$/i);
    if (!match) return undefined;

    return {
      filter: match[1],
      coords: view.coordsAtPos(cursor),
    };
  });
}

function normalizedMenuText(value: string): string {
  return value.toLowerCase().replace(/[\s-]/g, "");
}

function filteredTableSlashItems(filter: string): TableActionItem[] {
  const normalizedFilter = normalizedMenuText(filter);
  if (!normalizedFilter) return tableActionItems;

  return tableActionItems.filter((item) =>
    normalizedMenuText(item.label).includes(normalizedFilter) ||
      normalizedMenuText(item.action).includes(normalizedFilter),
  );
}

function renderTableSlashMenu(items: TableActionItem[]) {
  const menu = tableSlashMenuElement;
  if (!menu) return;

  menu.replaceChildren();
  tableSlashMenuVisibleItems = items;
  tableSlashMenuActiveIndex = clamp(
    tableSlashMenuActiveIndex,
    0,
    Math.max(items.length - 1, 0),
  );

  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "md-table-slash-menu__item";
    button.setAttribute("role", "menuitem");
    if (index === tableSlashMenuActiveIndex) {
      button.classList.add("md-table-slash-menu__item--active");
    }
    if (item.destructive) {
      button.classList.add("md-table-slash-menu__item--destructive");
    }

    button.innerHTML = `${item.icon}<span>${item.label}</span>`;
    setControlLabel(button, item.label);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      runTableAction(item.action, { cleanupSlash: true });
    });
    menu.appendChild(button);
  });
}

function updateTableSlashMenu() {
  if (!tableSlashMenuElement || !tableSettings.slashMenu) {
    hideTableSlashMenu();
    return;
  }

  if (getVisibleSlashMenu()) {
    hideTableSlashMenu();
    return;
  }

  const query = tableSlashMenuQuery();
  if (!query) {
    hideTableSlashMenu();
    return;
  }

  const items = filteredTableSlashItems(query.filter);
  if (items.length === 0) {
    hideTableSlashMenu();
    return;
  }

  renderTableSlashMenu(items);
  positionFloatingElement(
    tableSlashMenuElement,
    query.coords,
    "point",
    { x: query.coords.left, y: query.coords.bottom + 8 },
  );
}

function scheduleTableSlashMenuUpdate() {
  if (tableSlashMenuUpdateAnimationFrame !== undefined) {
    window.cancelAnimationFrame(tableSlashMenuUpdateAnimationFrame);
  }

  tableSlashMenuUpdateAnimationFrame = window.requestAnimationFrame(() => {
    tableSlashMenuUpdateAnimationFrame = undefined;
    updateTableSlashMenu();
  });
}

function isTableSlashMenuVisible(): boolean {
  return tableSlashMenuElement?.dataset.show === "true";
}

function moveTableSlashMenuSelection(delta: number) {
  if (tableSlashMenuVisibleItems.length === 0) return;

  const itemCount = tableSlashMenuVisibleItems.length;
  tableSlashMenuActiveIndex = (
    tableSlashMenuActiveIndex + delta + itemCount
  ) % itemCount;
  renderTableSlashMenu(tableSlashMenuVisibleItems);
}

function runActiveTableSlashMenuItem() {
  const item = tableSlashMenuVisibleItems[tableSlashMenuActiveIndex];
  if (!item) return;

  runTableAction(item.action, { cleanupSlash: true });
}

function handleTableSlashMenuKeydown(event: KeyboardEvent): boolean {
  if (!isTableSlashMenuVisible()) return false;

  switch (event.key) {
    case "ArrowDown":
      moveTableSlashMenuSelection(1);
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    case "ArrowUp":
      moveTableSlashMenuSelection(-1);
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    case "Enter":
    case "Tab":
      runActiveTableSlashMenuItem();
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    case "Escape":
      hideTableSlashMenu();
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    default:
      return false;
  }
}

function showTableContextMenu(clientX: number, clientY: number) {
  if (!tableContextMenuElement) return;

  const anchor = new DOMRect(clientX, clientY, 0, 0);
  positionFloatingElement(
    tableContextMenuElement,
    anchor,
    "point",
    { x: clientX, y: clientY },
  );
}

function disposeTableControls() {
  tableUiCleanup?.();
  tableUiCleanup = undefined;

  if (tableUiUpdateAnimationFrame !== undefined) {
    window.cancelAnimationFrame(tableUiUpdateAnimationFrame);
    tableUiUpdateAnimationFrame = undefined;
  }

  if (tableSlashMenuUpdateAnimationFrame !== undefined) {
    window.cancelAnimationFrame(tableSlashMenuUpdateAnimationFrame);
    tableSlashMenuUpdateAnimationFrame = undefined;
  }

  tableToolbarElement?.remove();
  tableContextMenuElement?.remove();
  tableSlashMenuElement?.remove();
  tableInsertDialogElement?.remove();
  tableToolbarElement = undefined;
  tableContextMenuElement = undefined;
  tableSlashMenuElement = undefined;
  tableInsertDialogElement = undefined;
  tableSlashMenuVisibleItems = [];
  tableSlashMenuActiveIndex = 0;
}

function installTableControls(root: HTMLElement) {
  disposeTableControls();

  tableToolbarElement = createTableToolbar();
  tableContextMenuElement = createTableContextMenu();
  tableSlashMenuElement = createTableSlashMenu();
  document.body.append(
    tableToolbarElement,
    tableContextMenuElement,
    tableSlashMenuElement,
  );

  const onContextMenu = (event: MouseEvent) => {
    if (!tableSettings.contextMenu) return;

    const tableBlock = closestTableBlock(event.target);
    if (!tableBlock) return;

    event.preventDefault();
    hideTableSlashMenu();
    setSelectionFromPoint(event.clientX, event.clientY);
    showTableContextMenu(event.clientX, event.clientY);
    scheduleTableToolbarUpdate();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!isTargetInsideTableUi(event.target)) {
      hideTableContextMenu();
      hideTableSlashMenu();
      hideTableInsertDialog();
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (handleTableSlashMenuKeydown(event)) return;

    if (event.key === "Escape") {
      hideTableContextMenu();
      hideTableSlashMenu();
      hideTableInsertDialog();
    }
    scheduleTableToolbarUpdate();
  };

  const onUpdate = () => {
    applyGeneratedControlLabels(document.body);
    scheduleTableToolbarUpdate();
    scheduleTableSlashMenuUpdate();
  };

  root.addEventListener("contextmenu", onContextMenu);
  root.addEventListener("keyup", onUpdate);
  root.addEventListener("mouseup", onUpdate);
  root.addEventListener("focusin", onUpdate);
  document.addEventListener("selectionchange", onUpdate);
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("scroll", onUpdate, true);
  window.addEventListener("resize", onUpdate);

  tableUiCleanup = () => {
    root.removeEventListener("contextmenu", onContextMenu);
    root.removeEventListener("keyup", onUpdate);
    root.removeEventListener("mouseup", onUpdate);
    root.removeEventListener("focusin", onUpdate);
    document.removeEventListener("selectionchange", onUpdate);
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("keydown", onKeyDown, { capture: true });
    window.removeEventListener("scroll", onUpdate, true);
    window.removeEventListener("resize", onUpdate);
  };

  scheduleTableToolbarUpdate();
  scheduleTableSlashMenuUpdate();
}

function isSelectionInsideBlockquote(ctx: Ctx): boolean {
  const view = ctx.get(editorViewCtx);
  if (isInTable(view.state)) return false;

  return isSelectionInsideNodeType(ctx, "blockquote");
}

function isSelectionInsideCodeBlock(ctx: Ctx): boolean {
  const view = ctx.get(editorViewCtx);
  if (isInTable(view.state)) return false;

  return isSelectionInsideNodeType(ctx, "code_block");
}

function isSelectionInsideNodeType(ctx: Ctx, nodeTypeName: string): boolean {
  const view = ctx.get(editorViewCtx);
  const { $from, $to } = view.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === nodeTypeName) return true;
  }

  for (let depth = $to.depth; depth > 0; depth -= 1) {
    if ($to.node(depth).type.name === nodeTypeName) return true;
  }

  return false;
}

function toggleSelectionCodeBlock(ctx: Ctx) {
  const view = ctx.get(editorViewCtx);
  if (isInTable(view.state)) return;

  const commands = ctx.get(commandsCtx);
  const nodeType = isSelectionInsideCodeBlock(ctx)
    ? paragraphSchema.type(ctx)
    : codeBlockSchema.type(ctx);

  commands.call(setBlockTypeCommand.key, { nodeType });
}

function isCurrentSelectionInsideTable(): boolean {
  if (!editor) return false;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    return isInTable(view.state);
  });
}

function applyToolbarButtonLabels(root: ParentNode = document) {
  const insideTable = isCurrentSelectionInsideTable();

  for (const toolbar of Array.from(
    root.querySelectorAll<HTMLElement>(".milkdown-toolbar"),
  )) {
    const buttons = Array.from(
      toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-item"),
    );
    if (buttons.length === 0) continue;

    const blockGroupStart = Math.max(4, buttons.length - 2);
    const functionIndexes = buttons
      .map((_, index) => index)
      .filter((index) => index >= 3 && index < blockGroupStart);
    const hasAiAction = functionIndexes.length > 3;
    const aiIndex = hasAiAction
      ? functionIndexes[functionIndexes.length - 1]
      : undefined;
    const linkIndex = hasAiAction
      ? functionIndexes[functionIndexes.length - 2]
      : functionIndexes[functionIndexes.length - 1];
    const inlineMathIndex =
      functionIndexes.length >= 3 ? functionIndexes[1] : undefined;

    const labels = new Map<number, string>([
      [0, "Bold"],
      [1, "Italic"],
      [2, "Strikethrough"],
      [3, "Inline code"],
      [blockGroupStart, "Code Block"],
      [blockGroupStart + 1, "Quote"],
    ]);

    if (inlineMathIndex !== undefined) {
      labels.set(inlineMathIndex, "Inline math");
    }
    if (linkIndex !== undefined) labels.set(linkIndex, "Link");
    if (aiIndex !== undefined) labels.set(aiIndex, "AI");

    buttons.forEach((button, index) => {
      const label = labels.get(index);
      if (!label) return;

      setControlLabel(button, label);
      if (label === "Code Block" || label === "Quote") {
        button.style.display = insideTable ? "none" : "";
        button.toggleAttribute("aria-hidden", insideTable);
      }
    });
  }
}

function applyTableControlLabels(root: ParentNode = document) {
  for (const tableBlock of Array.from(
    root.querySelectorAll<HTMLElement>(".milkdown-table-block"),
  )) {
    const colHandle = tableBlock.querySelector<HTMLElement>(
      ".cell-handle[data-role='col-drag-handle']",
    );
    if (colHandle) {
      setControlLabel(colHandle, "Select or drag column");
      const colButtons = Array.from(
        colHandle.querySelectorAll<HTMLButtonElement>(".button-group button"),
      );
      const colButtonLabels = [
        "Align column left",
        "Align column center",
        "Align column right",
        "Delete column",
      ];

      colButtons.forEach((button, index) => {
        const label = colButtonLabels[index];
        if (label) setControlLabel(button, label);
      });
    }

    const rowHandle = tableBlock.querySelector<HTMLElement>(
      ".cell-handle[data-role='row-drag-handle']",
    );
    if (rowHandle) {
      setControlLabel(rowHandle, "Select or drag row");
      const deleteRowButton = rowHandle.querySelector<HTMLButtonElement>(
        ".button-group button",
      );
      if (deleteRowButton) setControlLabel(deleteRowButton, "Delete row");
    }

    const addRowButton = tableBlock.querySelector<HTMLButtonElement>(
      ".line-handle[data-role='x-line-drag-handle'] .add-button",
    );
    if (addRowButton) setControlLabel(addRowButton, "Add row");

    const addColumnButton = tableBlock.querySelector<HTMLButtonElement>(
      ".line-handle[data-role='y-line-drag-handle'] .add-button",
    );
    if (addColumnButton) setControlLabel(addColumnButton, "Add column");
  }
}

function applyImageControlLabels(root: ParentNode = document) {
  for (const imageBlock of Array.from(
    root.querySelectorAll<HTMLElement>(".milkdown-image-block"),
  )) {
    const generatedCaptionButton = imageBlock.querySelector<HTMLElement>(
      ".image-wrapper .operation > .operation-item:not(.md-image-action-button)",
    );
    if (generatedCaptionButton) {
      setControlLabel(generatedCaptionButton, "Edit image description");
    }
  }
}

function applyGeneratedControlLabels(root: ParentNode = document) {
  applyToolbarButtonLabels(root);
  applyTableControlLabels(root);
  applyImageControlLabels(root);
}

function installGeneratedControlLabels(root: HTMLElement) {
  generatedControlObserver?.disconnect();
  applyGeneratedControlLabels(root);

  generatedControlObserver = new MutationObserver(() => {
    applyGeneratedControlLabels(root);
  });
  generatedControlObserver.observe(root, {
    childList: true,
    subtree: true,
  });
}

function getVisibleSlashMenu(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>(
    ".milkdown .milkdown-slash-menu:not([data-show='false'])",
  ) ?? undefined;
}

function triggerSlashMenuCategory(categoryTab: HTMLElement) {
  categoryTab.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
    }),
  );
}

function moveSlashMenuCategoryWithTab(
  slashMenu: HTMLElement,
  backwards: boolean,
) {
  const categoryTabs = Array.from(
    slashMenu.querySelectorAll<HTMLElement>(".tab-group li"),
  );
  if (categoryTabs.length < 2) return false;

  const selectedIndex = categoryTabs.findIndex((tab) =>
    tab.classList.contains("selected"),
  );
  if (selectedIndex === -1) return false;

  const isFirst = selectedIndex === 0;
  const isLast = selectedIndex === categoryTabs.length - 1;
  if (backwards && isFirst) {
    triggerSlashMenuCategory(categoryTabs[categoryTabs.length - 1]);
    return true;
  }

  if (!backwards && isLast) {
    triggerSlashMenuCategory(categoryTabs[0]);
    return true;
  }

  const key = backwards ? "ArrowLeft" : "ArrowRight";
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
    }),
  );
  return true;
}

window.addEventListener("keydown", (e: KeyboardEvent) => {
  if (readOnlyMode && e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    showEditorToast("Read-only mode is on.", "error");
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }

  if (e.key === "Tab" || e.key === "Enter") {
    if (replaceInlineDateTimeShortcut()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
  }

  if (e.key !== "Tab") return;

  const slashMenu = getVisibleSlashMenu();
  if (!slashMenu) return;

  if (!moveSlashMenuCategoryWithTab(slashMenu, e.shiftKey)) return;

  e.preventDefault();
  e.stopImmediatePropagation();
}, { capture: true });

document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Ctrl+S / Cmd+S - Trigger save
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    bridge.postMessage({ type: "save" } as WebviewToHostMessage);
    showEditorToast("File saved", "success");
  }
});

// Ready!
setLoadingStatus("Webview ready. Waiting for document...");
bootLog("ready-post", "Posting ready message to extension host");
bridge.postMessage({ type: "ready" } as WebviewToHostMessage);

async function mountEditor(markdown: string): Promise<void> {
  const root = document.getElementById("editor");
  if (!root) {
    throw new Error("Editor root element not found.");
  }

  bootLog("mount-start", "Starting editor mount", {
    markdownLength: markdown.length,
    hasExistingEditor: !!editor,
  });
  editorMounted = false;

  // Apply theme class to root element
  setThemeClass(themeClass);

  if (editor) {
    generatedControlObserver?.disconnect();
    generatedControlObserver = undefined;
    imageDeleteControlsCleanup?.();
    imageDeleteControlsCleanup = undefined;
    imageLightboxCleanup?.();
    imageLightboxCleanup = undefined;
    disposeTableControls();
    await editor.destroy();
  }

  root.replaceChildren();
  bootLog("mount-root-ready", "Editor root prepared");
  
  editor = new Crepe({
    root,
    defaultValue: markdown,
    features: {
      [CrepeFeature.Cursor]: true,
    },
    featureConfigs: {
      [CrepeFeature.Cursor]: {
        width: 4,
        color: false,
        virtual: false,
      },
      [CrepeFeature.BlockEdit]: {
        advancedGroup: {
          table: null,
        },
        buildMenu: (builder) => {
          const tablesGroup = builder.addGroup("tables", "Tables");
          tablesGroup
            .addItem("insert-table", {
              label: "Insert Table",
              icon: tableInsertIcon,
              onRun: () => runInsertTableAction({ cleanupSlash: true }),
            })
            .addItem("insert-custom-table", {
              label: "Insert Custom Table",
              icon: tableInsertIcon,
              onRun: () =>
                runInsertTableAction({
                  cleanupSlash: true,
                  custom: true,
                }),
            });

          const dateTimeGroup = builder.addGroup("date-time", "Date & Time");
          dateTimeGroup
            .addItem("date", {
              label: "Today's Date",
              icon: calendarToolbarIcon,
              onRun: () => runDateTimeAction("insertDate"),
            })
            .addItem("time", {
              label: "Current Time",
              icon: clockToolbarIcon,
              onRun: () => runDateTimeAction("insertTime"),
            })
            .addItem("date-time", {
              label: "Date and Time",
              icon: clockToolbarIcon,
              onRun: () => runDateTimeAction("insertDateTime"),
            })
            .addItem("last-updated", {
              label: "Last Updated",
              icon: historyToolbarIcon,
              onRun: () => runDateTimeAction("insertLastUpdated"),
            })
            .addItem("update-last-updated", {
              label: "Update Last Updated",
              icon: historyToolbarIcon,
              onRun: () => runDateTimeAction("updateLastUpdated"),
            })
            .addItem("history-entry", {
              label: "History Entry",
              icon: historyToolbarIcon,
              onRun: () => runDateTimeAction("insertHistoryEntry"),
            })
            .addItem("custom-timestamp", {
              label: "Custom Timestamp",
              icon: calendarToolbarIcon,
              onRun: () => runDateTimeAction("insertCustom"),
            });
        },
      },
      [CrepeFeature.Toolbar]: {
        buildToolbar: (builder) => {
          builder
            .addGroup("blocks", "Blocks")
            .addItem("code-block", {
              icon: codeBlockToolbarIcon,
              active: isSelectionInsideCodeBlock,
              onRun: toggleSelectionCodeBlock,
            })
            .addItem("quote", {
              icon: quoteToolbarIcon,
              active: isSelectionInsideBlockquote,
              onRun: (ctx: Ctx) => {
                const commands = ctx.get(commandsCtx);
                const blockquote = blockquoteSchema.type(ctx);
                commands.call(wrapInBlockTypeCommand.key, {
                  nodeType: blockquote,
                });
              },
            });
        },
      },
      [CrepeFeature.ImageBlock]: {
        onUpload: uploadAttachment,
        proxyDomURL: resolveAttachmentSrc,
      },
    },
  });

  bootLog("milkdown-create-start", "Calling editor.create()");
  await withTimeout(
    editor.create(),
    MILKDOWN_STARTUP_TIMEOUT_MS,
    "Milkdown editor startup timed out.",
  );
  bootLog("milkdown-create-done", "editor.create() resolved");
  applyReadOnlyMode(readOnlyMode);
  bootLog("post-create-controls-start", "Installing post-create controls");
  installGeneratedControlLabels(document.body);
  installTableControls(root);
  try {
    installImageLightbox(root);
  } catch (error) {
    reportNonFatalWebviewError("Image lightbox setup failed", error);
  }

  try {
    installImageActionControls(root);
  } catch (error) {
    reportNonFatalWebviewError("Image action setup failed", error);
  }

  // Sync changes back to host when markdown is updated
  editor.on((api) => {
    api.markdownUpdated((ctx, markdown) => {
      if (applyingExternalUpdate) return;
      if (readOnlyMode) return;

      const nextVersion = currentVersion + 1;
      bridge.postMessage({
        type: "edit",
        markdown: markdown,
        version: nextVersion,
      } as WebviewToHostMessage);
      currentVersion = nextVersion;
    });
  });

  editorMounted = true;
  forceWebviewRepaint(root);
  bridge.postMessage({
    type: "editorMounted",
    version: currentVersion,
    markdownLength: markdown.length,
  } as WebviewToHostMessage);
  bootLog("mount-complete", "Editor mount complete");
  bootLog("dom-snapshot", "Editor DOM snapshot after mount", editorDomSnapshot(root));
  window.requestAnimationFrame(() => {
    bootLog(
      "dom-snapshot-raf",
      "Editor DOM snapshot after animation frame",
      editorDomSnapshot(root),
    );
  });
  for (const delay of [250, 1000, 3000]) {
    window.setTimeout(() => {
      bootLog(
        `dom-snapshot-timeout-${delay}`,
        `Editor DOM snapshot after ${delay}ms`,
        editorDomSnapshot(root),
      );
    }, delay);
  }
  if (initWatchdog !== undefined) {
    window.clearTimeout(initWatchdog);
    initWatchdog = undefined;
  }
}

function showEditorToast(
  message: string,
  kind: "success" | "error",
) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");

  toast.className = `md-editor-toast md-editor-toast--${kind}`;
  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("md-editor-toast--leaving");
  }, 2200);

  window.setTimeout(() => {
    toast.remove();
    if (container.childElementCount === 0) {
      container.remove();
    }
  }, 2600);
}

function ensureToastContainer(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(".md-editor-toast-container");
  if (existing) return existing;

  const container = document.createElement("div");
  container.className = "md-editor-toast-container";
  document.body.appendChild(container);
  return container;
}

let lightboxElement: HTMLElement | null = null;
let lightboxImg: HTMLImageElement | null = null;
let savedSelection: { from: number; to: number } | null = null;
let lightboxScale = 1;
const LIGHTBOX_MIN_SCALE = 1;
const LIGHTBOX_MAX_SCALE = 6;
const LIGHTBOX_SCALE_STEP = 0.2;

function isImageBlockNode(node: { type: { name: string } } | null | undefined): boolean {
  return node?.type.name === "image-block";
}

function findImageBlockPosition(
  view: EditorView,
  imageBlock: HTMLElement,
): number | undefined {
  const candidates = new Set<number>();
  const maxPosition = view.state.doc.content.size;
  const addCandidate = (position: number | undefined | null) => {
    if (position === undefined || position === null || !Number.isFinite(position)) {
      return;
    }

    for (const offset of [0, -1, 1, -2, 2]) {
      const candidate = Math.max(0, Math.min(maxPosition, position + offset));
      candidates.add(candidate);
    }
  };

  try {
    addCandidate(view.posAtDOM(imageBlock, 0));
  } catch {
    // Best-effort fallback below.
  }

  try {
    addCandidate(view.posAtDOM(imageBlock, imageBlock.childNodes.length));
  } catch {
    // Best-effort fallback below.
  }

  try {
    const rect = imageBlock.getBoundingClientRect();
    if (
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.top) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height)
    ) {
      const positionAtCenter = view.posAtCoords({
        left: rect.left + rect.width / 2,
        top: rect.top + rect.height / 2,
      });
      addCandidate(positionAtCenter?.pos);
    }
  } catch {
    // Detached or hidden image blocks may not be mappable yet.
  }

  for (const candidate of candidates) {
    try {
      const node = view.state.doc.nodeAt(candidate);
      if (isImageBlockNode(node)) {
        return candidate;
      }
    } catch {
      // Ignore stale DOM positions.
    }
  }

  return undefined;
}

function imageBlockInfo(
  imageBlock: HTMLElement,
): { src: string; caption: string; ratio: number } | undefined {
  if (!editor) return undefined;

  try {
    return editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const position = findImageBlockPosition(view, imageBlock);
      if (position === undefined) return undefined;

      const node = view.state.doc.nodeAt(position);
      if (!node || !isImageBlockNode(node)) return undefined;

      return {
        src: String(node.attrs.src ?? ""),
        caption: String(node.attrs.caption ?? ""),
        ratio: normalizeImageRatio(node.attrs.ratio),
      };
    });
  } catch {
    return undefined;
  }
}

function normalizeImageRatio(value: unknown): number {
  const ratio = Number(value);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function updateImageBlockHoverMetadata(imageBlock: HTMLElement): void {
  const info = imageBlockInfo(imageBlock);
  const source = info?.src.trim();
  const title = source
    ? `Image: ${source}`
    : "Image";
  const img = imageBlock.querySelector<HTMLImageElement>("img");

  imageBlock.removeAttribute("title");
  imageBlock.setAttribute("aria-label", title);
  img?.setAttribute("title", title);
}

function imageLockKey(imageBlock: HTMLElement): string | undefined {
  return imageBlockInfo(imageBlock)?.src.trim() || undefined;
}

function isImageBlockLocked(imageBlock: HTMLElement): boolean {
  const key = imageLockKey(imageBlock);
  return !!key && lockedImageSources.has(key);
}

function updateImageBlockLockState(imageBlock: HTMLElement): void {
  const locked = isImageBlockLocked(imageBlock);
  const lockButton = imageBlock.querySelector<HTMLButtonElement>(
    ".md-image-lock-button",
  );
  const deleteButton = imageBlock.querySelector<HTMLButtonElement>(
    ".md-image-delete-button",
  );
  const img = imageBlock.querySelector<HTMLImageElement>("img");

  imageBlock.classList.toggle("md-image-block-locked", locked);
  if (img) img.draggable = false;

  if (lockButton) {
    const nextLockState = locked ? "locked" : "unlocked";
    if (lockButton.dataset.lockState !== nextLockState) {
      lockButton.dataset.lockState = nextLockState;
      lockButton.innerHTML = locked ? imageLockClosedIcon : imageLockOpenIcon;
    }
    lockButton.classList.toggle("md-image-lock-button--locked", locked);
    lockButton.setAttribute(
      "aria-label",
      locked ? "Unlock image" : "Lock image",
    );
    lockButton.setAttribute("title", locked ? "Unlock image" : "Lock image");
  }

  if (deleteButton) {
    deleteButton.disabled = locked;
    deleteButton.setAttribute(
      "aria-label",
      locked ? "Image locked" : "Delete image",
    );
    deleteButton.setAttribute("title", locked ? "Image locked" : "Delete image");
  }
}

function focusImageCaptionInput(imageBlock: HTMLElement): void {
  const input = imageBlock.querySelector<HTMLInputElement>(".caption-input");
  if (!input) return;

  input.focus();
  const cursor = input.value.length;
  input.setSelectionRange(cursor, cursor);
}

async function copyAttachmentImage(imageBlock: HTMLElement): Promise<void> {
  const img = imageBlock.querySelector<HTMLImageElement>("img");
  if (!img?.src) throw new Error("Image source is empty.");

  const clipboard = navigator.clipboard as Clipboard & {
    write?: (items: ClipboardItem[]) => Promise<void>;
  };
  if (typeof clipboard.write !== "function" || typeof ClipboardItem === "undefined") {
    throw new Error("Copying image attachments is not supported by this VS Code webview.");
  }

  const response = await fetch(img.src);
  if (!response.ok) {
    throw new Error(`Could not read image data (${response.status}).`);
  }

  let blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("Attachment is not an image.");
  }

  if (
    typeof ClipboardItem.supports === "function" &&
    !ClipboardItem.supports(blob.type)
  ) {
    blob = await imageElementToPngBlob(img);
  }

  await clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
}

function imageElementToPngBlob(img: HTMLImageElement): Promise<Blob> {
  if (!img.naturalWidth || !img.naturalHeight) {
    return Promise.reject(new Error("Image is not ready to copy."));
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Could not prepare image for clipboard."));
  }

  try {
    context.drawImage(img, 0, 0);
  } catch {
    return Promise.reject(new Error("Could not prepare image for clipboard."));
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not prepare image for clipboard."));
      }
    }, "image/png");
  });
}

function applyImageRatioToElement(imageBlock: HTMLElement, ratio: number): void {
  const img = imageBlock.querySelector<HTMLImageElement>("img");
  if (!img) return;

  const currentRatio = imageBlockInfo(imageBlock)?.ratio ?? 1;
  const datasetOrigin = Number(img.dataset.origin);
  const rectHeight = img.getBoundingClientRect().height;
  const fallbackOrigin = currentRatio > 0 && Number.isFinite(rectHeight)
    ? rectHeight / currentRatio
    : undefined;
  const origin = Number.isFinite(datasetOrigin) && datasetOrigin > 0
    ? datasetOrigin
    : fallbackOrigin;
  if (!origin || !Number.isFinite(origin)) return;

  const nextHeight = Number((origin * ratio).toFixed(2));
  img.dataset.origin = origin.toFixed(2);
  img.dataset.height = String(nextHeight);
  img.style.height = `${nextHeight}px`;
}

function setImageResizeRatio(imageBlock: HTMLElement, ratio: number): boolean {
  if (!editor) return false;
  if (shouldBlockEditAction()) return false;
  if (isImageBlockLocked(imageBlock)) {
    showEditorToast("Image is locked.", "error");
    return false;
  }

  const nextRatio = Math.max(0.25, Math.min(3, Number(ratio.toFixed(2))));
  const applied = editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const position = findImageBlockPosition(view, imageBlock);
    if (position === undefined) return false;

    const node = view.state.doc.nodeAt(position);
    if (!node || !isImageBlockNode(node)) return false;

    view.dispatch(
      view.state.tr.setNodeAttribute(position, "ratio", nextRatio).scrollIntoView(),
    );
    return true;
  });

  if (applied) {
    applyImageRatioToElement(imageBlock, nextRatio);
    window.requestAnimationFrame(() => applyImageRatioToElement(imageBlock, nextRatio));
  }

  return applied;
}

function adjustImageResizeRatio(imageBlock: HTMLElement, delta: number): void {
  const currentRatio = imageBlockInfo(imageBlock)?.ratio ?? 1;
  if (setImageResizeRatio(imageBlock, currentRatio + delta)) {
    showEditorToast(`Image size ${Math.round((currentRatio + delta) * 100)}%`, "success");
  }
}

function resetImageResizeRatio(imageBlock: HTMLElement): void {
  if (setImageResizeRatio(imageBlock, 1)) {
    showEditorToast("Image size reset", "success");
  }
}

function toggleImageLock(imageBlock: HTMLElement): void {
  const key = imageLockKey(imageBlock);
  if (!key) {
    showEditorToast("Could not lock image", "error");
    return;
  }

  if (lockedImageSources.has(key)) {
    lockedImageSources.delete(key);
    showEditorToast("Image unlocked", "success");
  } else {
    lockedImageSources.add(key);
    showEditorToast("Image locked", "success");
  }

  updateImageBlockLockState(imageBlock);
}

function selectedLockedImageSource(): string | undefined {
  if (!editor) return undefined;

  try {
    return editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { selection } = view.state;

      for (const position of [selection.from, selection.from - 1]) {
        if (position < 0 || position > view.state.doc.content.size) continue;

        const node = view.state.doc.nodeAt(position);
        const source = isImageBlockNode(node)
          ? String(node?.attrs.src ?? "").trim()
          : "";
        if (source && lockedImageSources.has(source)) {
          return source;
        }
      }

      return undefined;
    });
  } catch {
    return undefined;
  }
}

function setCursorNearImageBlock(imageBlock: HTMLElement): boolean {
  if (!editor) return false;

  try {
    return editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const position = findImageBlockPosition(view, imageBlock);
      if (position === undefined) return false;

      const selection = TextSelection.near(view.state.doc.resolve(position), -1);
      view.dispatch(view.state.tr.setSelection(selection));
      view.dom.blur();
      return true;
    });
  } catch {
    return false;
  }
}

function selectImageBlock(imageBlock: HTMLElement): boolean {
  if (!editor) return false;

  try {
    return editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const position = findImageBlockPosition(view, imageBlock);
      if (position === undefined) return false;

      const node = view.state.doc.nodeAt(position);
      if (!node || !isImageBlockNode(node)) return false;

      view.dispatch(
        view.state.tr
          .setSelection(NodeSelection.create(view.state.doc, position))
          .scrollIntoView(),
      );
      view.focus();
      return true;
    });
  } catch {
    return false;
  }
}

function blockLockedImageEdit(event: Event): boolean {
  const lockedSource = selectedLockedImageSource();
  if (!lockedSource) return false;

  event.preventDefault();
  event.stopImmediatePropagation();
  showEditorToast("Image is locked.", "error");
  return true;
}

function deleteImageBlock(imageBlock: HTMLElement): boolean {
  if (!editor) return false;
  if (shouldBlockEditAction()) return false;
  if (isImageBlockLocked(imageBlock)) {
    showEditorToast("Image is locked.", "error");
    return false;
  }

  try {
    return editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const position = findImageBlockPosition(view, imageBlock);
      if (position === undefined) {
        showEditorToast("Could not delete image", "error");
        return false;
      }

      const node = view.state.doc.nodeAt(position);
      if (!node || !isImageBlockNode(node)) {
        showEditorToast("Could not delete image", "error");
        return false;
      }

      view.dispatch(
        view.state.tr
          .delete(position, position + node.nodeSize)
          .scrollIntoView(),
      );
      view.focus();
      return true;
    });
  } catch {
    showEditorToast("Could not delete image", "error");
    return false;
  }
}

function createImageActionButton(
  className: string,
  icon: string,
  label: string,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `operation-item md-image-action-button ${className}`;
  button.innerHTML = icon;
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  button.setAttribute("contenteditable", "false");
  button.draggable = false;
  return button;
}

function ensureImageActionButtons(root: HTMLElement): void {
  const imageBlocks = root.querySelectorAll<HTMLElement>(".milkdown-image-block");

  for (const imageBlock of imageBlocks) {
    try {
      updateImageBlockHoverMetadata(imageBlock);

      const wrapper = Array.from(imageBlock.children).find((child) =>
        child instanceof HTMLElement &&
        child.classList.contains("image-wrapper")
      ) as HTMLElement | undefined;
      const operation = wrapper?.querySelector<HTMLElement>(".operation");
      if (!operation) continue;

      if (!operation.querySelector(".md-image-zoom-button")) {
        operation.appendChild(
          createImageActionButton(
            "md-image-zoom-button",
            imageZoomIcon,
            "Zoom image",
          ),
        );
      }

      if (!operation.querySelector(".md-image-copy-attachment-button")) {
        operation.appendChild(
          createImageActionButton(
            "md-image-copy-attachment-button",
            imageCopyAttachmentIcon,
            "Copy attachment",
          ),
        );
      }

      if (!operation.querySelector(".md-image-copy-file-path-button")) {
        operation.appendChild(
          createImageActionButton(
            "md-image-copy-file-path-button",
            imageCopyFilePathIcon,
            "Copy file path",
          ),
        );
      }

      if (!operation.querySelector(".md-image-resize-smaller-button")) {
        operation.appendChild(
          createImageActionButton(
            "md-image-resize-smaller-button",
            imageResizeSmallerIcon,
            "Make image smaller",
          ),
        );
      }

      if (!operation.querySelector(".md-image-resize-larger-button")) {
        operation.appendChild(
          createImageActionButton(
            "md-image-resize-larger-button",
            imageResizeLargerIcon,
            "Make image larger",
          ),
        );
      }

      if (!operation.querySelector(".md-image-resize-reset-button")) {
        operation.appendChild(
          createImageActionButton(
            "md-image-resize-reset-button",
            imageResizeResetIcon,
            "Reset image size",
          ),
        );
      }

      if (!operation.querySelector(".md-image-lock-button")) {
        operation.appendChild(
          createImageActionButton(
            "md-image-lock-button",
            imageLockOpenIcon,
            "Lock image",
          ),
        );
      }

      if (!operation.querySelector(".md-image-delete-button")) {
        operation.appendChild(
          createImageActionButton(
            "md-image-delete-button",
            deleteTableIcon,
            "Delete image",
          ),
        );
      }

      updateImageBlockLockState(imageBlock);
    } catch (error) {
      reportNonFatalWebviewError("Image action button refresh failed", error);
    }
  }
}

function installImageActionControls(root: HTMLElement): void {
  imageDeleteControlsCleanup?.();

  let imageActionRefreshScheduled = false;
  const scheduleImageActionRefresh = () => {
    if (imageActionRefreshScheduled) return;

    imageActionRefreshScheduled = true;
    window.setTimeout(() => {
      imageActionRefreshScheduled = false;
      try {
        ensureImageActionButtons(root);
      } catch (error) {
        reportNonFatalWebviewError("Image action mutation refresh failed", error);
      }
    }, 0);
  };

  const observer = new MutationObserver(() => {
    scheduleImageActionRefresh();
  });
  const onPointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".md-image-action-button")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (
      target instanceof HTMLImageElement &&
      target.closest(".milkdown-image-block")
    ) {
      const imageBlock = target.closest<HTMLElement>(".milkdown-image-block");
      if (!imageBlock) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.button === 1) {
        selectImageBlock(imageBlock);
      } else if (event.button === 0) {
        setCursorNearImageBlock(imageBlock);
      }
    }
  };
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>(".md-image-action-button");
    if (!button) {
      const captionButton = target.closest<HTMLElement>(
        ".image-wrapper .operation > .operation-item:not(.md-image-action-button)",
      );
      if (captionButton) {
        const imageBlock = captionButton.closest<HTMLElement>(".milkdown-image-block");
        if (imageBlock) {
          window.setTimeout(() => focusImageCaptionInput(imageBlock), 0);
        }
        return;
      }

      if (
        target instanceof HTMLImageElement &&
        target.closest(".milkdown-image-block")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const imageBlock = button.closest<HTMLElement>(".milkdown-image-block");
    if (!imageBlock) return;

    if (button.classList.contains("md-image-lock-button")) {
      toggleImageLock(imageBlock);
      return;
    }

    if (button.classList.contains("md-image-copy-attachment-button")) {
      void copyAttachmentImage(imageBlock).then(
        () => showEditorToast("Attachment image copied", "success"),
      ).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        showEditorToast(`Copy failed: ${message}`, "error");
      });
      return;
    }

    if (button.classList.contains("md-image-copy-file-path-button")) {
      const info = imageBlockInfo(imageBlock);
      if (!info?.src) {
        showEditorToast("Could not copy file path", "error");
        return;
      }

      void copyAttachmentPath(info.src).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        showEditorToast(`Copy failed: ${message}`, "error");
      });
      return;
    }

    if (button.classList.contains("md-image-resize-smaller-button")) {
      adjustImageResizeRatio(imageBlock, -0.1);
      return;
    }

    if (button.classList.contains("md-image-resize-larger-button")) {
      adjustImageResizeRatio(imageBlock, 0.1);
      return;
    }

    if (button.classList.contains("md-image-resize-reset-button")) {
      resetImageResizeRatio(imageBlock);
      return;
    }

    if (button.classList.contains("md-image-delete-button")) {
      deleteImageBlock(imageBlock);
      return;
    }

    if (button.classList.contains("md-image-zoom-button")) {
      const img = imageBlock.querySelector<HTMLImageElement>("img");
      if (img?.src) {
        const info = imageBlockInfo(imageBlock);
        openImageLightbox(img.src, info?.src || img.alt || "Image");
      }
    }
  };
  const onDragStart = (event: DragEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(".milkdown-image-block")) return;
    if (target.closest(".milkdown-block-handle")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    showEditorToast("Use the block handle to move images.", "error");
  };
  const onCut = (event: ClipboardEvent) => {
    blockLockedImageEdit(event);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.key !== "Delete" &&
      event.key !== "Backspace" &&
      !((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x")
    ) {
      return;
    }

    blockLockedImageEdit(event);
  };
  const onBeforeInput = (event: InputEvent) => {
    if (
      event.inputType !== "deleteContentBackward" &&
      event.inputType !== "deleteContentForward" &&
      event.inputType !== "deleteByCut"
    ) {
      return;
    }

    blockLockedImageEdit(event);
  };

  ensureImageActionButtons(root);
  observer.observe(root, { childList: true, subtree: true });
  root.addEventListener("pointerdown", onPointerDown, { capture: true });
  root.addEventListener("click", onClick, { capture: true });
  root.addEventListener("dragstart", onDragStart, { capture: true });
  root.addEventListener("cut", onCut, { capture: true });
  document.addEventListener("keydown", onKeyDown, { capture: true });
  root.addEventListener("beforeinput", onBeforeInput, { capture: true });

  imageDeleteControlsCleanup = () => {
    observer.disconnect();
    imageActionRefreshScheduled = false;
    root.removeEventListener("pointerdown", onPointerDown, { capture: true });
    root.removeEventListener("click", onClick, { capture: true });
    root.removeEventListener("dragstart", onDragStart, { capture: true });
    root.removeEventListener("cut", onCut, { capture: true });
    document.removeEventListener("keydown", onKeyDown, { capture: true });
    root.removeEventListener("beforeinput", onBeforeInput, { capture: true });
  };
}

function isLightboxOpen(): boolean {
  return lightboxElement?.classList.contains("active") ?? false;
}

function clampLightboxScale(value: number): number {
  return Math.min(
    LIGHTBOX_MAX_SCALE,
    Math.max(LIGHTBOX_MIN_SCALE, Number(value.toFixed(2))),
  );
}

function setLightboxScale(scale: number): void {
  lightboxScale = clampLightboxScale(scale);
  if (lightboxImg) {
    lightboxImg.style.transform = `scale(${lightboxScale})`;
  }
}

function clearLightboxEditorSelection(): void {
  if (!savedSelection || !editor) return;

  try {
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;
      const position = Math.max(
        0,
        Math.min(savedSelection?.from ?? 0, state.doc.content.size),
      );
      const selection = TextSelection.near(state.doc.resolve(position), -1);
      view.dispatch(state.tr.setSelection(selection));
      view.dom.blur();
    });
  } catch {
    // Best effort only: the selection may no longer map after edits.
  }
}

function openImageLightbox(src: string, label: string): void {
  if (!lightboxElement || !lightboxImg) return;

  if (editor) {
    try {
      editor.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        savedSelection = {
          from: view.state.selection.from,
          to: view.state.selection.to,
        };
      });
    } catch {
      savedSelection = null;
    }
  }

  lightboxImg.src = src;
  lightboxImg.alt = label;
  lightboxElement.style.display = "flex";
  setLightboxScale(1);
  requestAnimationFrame(() => lightboxElement?.classList.add("active"));
}

function closeLightbox(): void {
  clearLightboxEditorSelection();
  savedSelection = null;

  lightboxElement?.classList.remove("active");
  window.setTimeout(() => {
    if (!lightboxElement || lightboxElement.classList.contains("active")) {
      return;
    }

    lightboxElement.style.display = "none";
    if (lightboxImg) {
      lightboxImg.src = "";
      lightboxImg.alt = "Preview";
      setLightboxScale(1);
    }
  }, 200);
}

function installImageLightbox(_root: HTMLElement): void {
  imageLightboxCleanup?.();

  lightboxElement = document.createElement("div");
  lightboxElement.className = "md-editor-lightbox";
  lightboxElement.style.display = "none";
  lightboxElement.innerHTML = `
    <button class="md-editor-lightbox-close" aria-label="Close">&times;</button>
    <img src="" alt="Preview" />
  `;
  document.body.appendChild(lightboxElement);

  lightboxImg = lightboxElement.querySelector<HTMLImageElement>("img")!;
  const closeButton = lightboxElement.querySelector<HTMLButtonElement>(
    ".md-editor-lightbox-close",
  )!;
  const onCloseButtonClick = (e: MouseEvent) => {
    e.stopPropagation();
    closeLightbox();
  };
  const onLightboxClick = (e: MouseEvent) => {
    if (e.target === lightboxElement) {
      closeLightbox();
      return;
    }

    if (e.target === lightboxImg) {
      e.preventDefault();
      e.stopPropagation();
      setLightboxScale(1);
    }
  };
  const onLightboxContextMenu = (e: MouseEvent) => {
    if (!isLightboxOpen()) return;
    e.preventDefault();
    closeLightbox();
  };
  const onLightboxWheel = (e: WheelEvent) => {
    if (!isLightboxOpen()) return;
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    setLightboxScale(lightboxScale + direction * LIGHTBOX_SCALE_STEP);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!isLightboxOpen()) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    }
  };

  closeButton.addEventListener("click", onCloseButtonClick);
  lightboxElement.addEventListener("click", onLightboxClick);
  lightboxElement.addEventListener("contextmenu", onLightboxContextMenu);
  lightboxElement.addEventListener("wheel", onLightboxWheel, { passive: false });
  document.addEventListener("keydown", onKeyDown, { capture: true });

  imageLightboxCleanup = () => {
    closeButton.removeEventListener("click", onCloseButtonClick);
    lightboxElement?.removeEventListener("click", onLightboxClick);
    lightboxElement?.removeEventListener("contextmenu", onLightboxContextMenu);
    lightboxElement?.removeEventListener("wheel", onLightboxWheel);
    document.removeEventListener("keydown", onKeyDown, { capture: true });
    lightboxElement?.remove();
    lightboxElement = null;
    lightboxImg = null;
    savedSelection = null;
  };
}

async function updateEditor(markdown: string): Promise<void> {
  if (!editor) return;

  const current = editor.getMarkdown();
  if (current === markdown) return;

  applyingExternalUpdate = true;
  try {
    await mountEditor(markdown);
  } finally {
    applyingExternalUpdate = false;
  }
}
