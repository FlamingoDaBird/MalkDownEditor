export interface MarkdownSnapshot {
  markdown: string;
  version: number;
}

export interface EditorTheme {
  name: string;
}

export type DateTimeAction =
  | "insertDate"
  | "insertTime"
  | "insertDateTime"
  | "insertLastUpdated"
  | "updateLastUpdated"
  | "insertHistoryEntry"
  | "insertCustom";

export interface DateTimeSettings {
  dateFormat: string;
  timeFormat: string;
  lastUpdatedTemplate: string;
  historyEntryTemplate: string;
  customTemplate: string;
  inlineSlashShortcuts: boolean;
}

export interface TableSettings {
  floatingToolbar: boolean;
  contextMenu: boolean;
  milkdownControls: boolean;
  slashMenu: boolean;
  defaultRows: number;
  defaultColumns: number;
  insertBehavior: "useDefaultSize" | "askEveryTime";
}

export interface CodeBlockSettings {
  alwaysShowLanguage: boolean;
  alwaysShowCopyButton: boolean;
}

export interface InitMessage extends MarkdownSnapshot {
  type: "init";
  editable: boolean;
  readOnly: boolean;
  theme?: EditorTheme;
  themeClass?: string;
  headers?: string[];
  dateTime: DateTimeSettings;
  tables: TableSettings;
  codeBlocks: CodeBlockSettings;
}

export interface ExternalUpdateMessage extends MarkdownSnapshot {
  type: "externalUpdate";
  headers?: string[];
}

export interface UploadAttachmentMessage {
  type: "uploadAttachment";
  requestId: string;
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface AttachmentUploadedMessage {
  type: "attachmentUploaded";
  requestId: string;
  ok: boolean;
  src?: string;
  message?: string;
}

export interface ResolveAttachmentSrcMessage {
  type: "resolveAttachmentSrc";
  requestId: string;
  src: string;
}

export interface AttachmentSrcResolvedMessage {
  type: "attachmentSrcResolved";
  requestId: string;
  ok: boolean;
  src?: string;
  message?: string;
}

export interface RunDateTimeActionMessage {
  type: "runDateTimeAction";
  action: DateTimeAction;
}

export interface SettingsUpdatedMessage {
  type: "settingsUpdated";
  dateTime: DateTimeSettings;
  tables: TableSettings;
  codeBlocks: CodeBlockSettings;
}

export interface SetReadOnlyMessage {
  type: "setReadOnly";
  readOnly: boolean;
}

export type EditMessage = MarkdownSnapshot & { type: "edit" };
export type ReadyMessage = { type: "ready" };
export type SaveMessage = { type: "save" };
export type ErrorMessage = { type: "error"; message: string; stack?: string };

export type HostToWebviewMessage =
  | InitMessage
  | ExternalUpdateMessage
  | AttachmentUploadedMessage
  | AttachmentSrcResolvedMessage
  | RunDateTimeActionMessage
  | SettingsUpdatedMessage
  | SetReadOnlyMessage;
export type WebviewToHostMessage =
  | EditMessage
  | ReadyMessage
  | SaveMessage
  | ErrorMessage
  | UploadAttachmentMessage
  | ResolveAttachmentSrcMessage;
