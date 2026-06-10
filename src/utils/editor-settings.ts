import type {
  CodeBlockSettings,
  DateTimeSettings,
  TableSettings,
} from "../shared/protocol";

export type EditorThemeSetting =
  | "vscode-dark"
  | "vscode-light"
  | "vscode-high-contrast"
  | "default";

export const DEFAULT_EDITOR_THEME: EditorThemeSetting = "vscode-dark";

export const DEFAULT_DATE_TIME_SETTINGS: DateTimeSettings = {
  dateFormat: "yyyy-MM-dd",
  timeFormat: "HH:mm",
  lastUpdatedTemplate: "Last updated: {date} {time}",
  historyEntryTemplate: "- {date} {time} - ",
  customTemplate: "{date} {time}",
  inlineSlashShortcuts: true,
};

export const DEFAULT_TABLE_SETTINGS: TableSettings = {
  floatingToolbar: true,
  contextMenu: true,
  milkdownControls: true,
  slashMenu: true,
  defaultRows: 3,
  defaultColumns: 3,
  insertBehavior: "useDefaultSize",
};

export const DEFAULT_CODE_BLOCK_SETTINGS: CodeBlockSettings = {
  alwaysShowLanguage: false,
  alwaysShowCopyButton: false,
};

export function themeClassForSetting(theme: string | undefined): string {
  switch (theme) {
    case "vscode-light":
      return "theme-light";
    case "vscode-high-contrast":
      return "theme-high-contrast";
    default:
      return "theme-dark";
  }
}

export function normalizeDateTimeSettings(
  settings: Partial<DateTimeSettings>,
): DateTimeSettings {
  return {
    dateFormat: settings.dateFormat ?? DEFAULT_DATE_TIME_SETTINGS.dateFormat,
    timeFormat: settings.timeFormat ?? DEFAULT_DATE_TIME_SETTINGS.timeFormat,
    lastUpdatedTemplate:
      settings.lastUpdatedTemplate ?? DEFAULT_DATE_TIME_SETTINGS.lastUpdatedTemplate,
    historyEntryTemplate:
      settings.historyEntryTemplate ?? DEFAULT_DATE_TIME_SETTINGS.historyEntryTemplate,
    customTemplate: settings.customTemplate ?? DEFAULT_DATE_TIME_SETTINGS.customTemplate,
    inlineSlashShortcuts:
      settings.inlineSlashShortcuts ?? DEFAULT_DATE_TIME_SETTINGS.inlineSlashShortcuts,
  };
}

export function normalizeTableSettings(
  settings: Partial<TableSettings>,
): TableSettings {
  const defaultRows = settings.defaultRows ?? DEFAULT_TABLE_SETTINGS.defaultRows;
  const defaultColumns =
    settings.defaultColumns ?? DEFAULT_TABLE_SETTINGS.defaultColumns;

  return {
    floatingToolbar:
      settings.floatingToolbar ?? DEFAULT_TABLE_SETTINGS.floatingToolbar,
    contextMenu: settings.contextMenu ?? DEFAULT_TABLE_SETTINGS.contextMenu,
    milkdownControls:
      settings.milkdownControls ?? DEFAULT_TABLE_SETTINGS.milkdownControls,
    slashMenu: settings.slashMenu ?? DEFAULT_TABLE_SETTINGS.slashMenu,
    defaultRows: clampInteger(defaultRows, 1, 50),
    defaultColumns: clampInteger(defaultColumns, 1, 20),
    insertBehavior:
      settings.insertBehavior === "askEveryTime" ? "askEveryTime" : "useDefaultSize",
  };
}

export function normalizeCodeBlockSettings(
  settings: Partial<CodeBlockSettings>,
): CodeBlockSettings {
  return {
    alwaysShowLanguage:
      settings.alwaysShowLanguage ?? DEFAULT_CODE_BLOCK_SETTINGS.alwaysShowLanguage,
    alwaysShowCopyButton:
      settings.alwaysShowCopyButton ??
      DEFAULT_CODE_BLOCK_SETTINGS.alwaysShowCopyButton,
  };
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}
