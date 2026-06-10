# MalkDown Editor Settings

All settings use the `mdEditor.*` prefix. Open them from the editor-title gear icon or run `MalkDown Editor: Open Settings`.

## Appearance

### `mdEditor.theme`

Chooses the editor webview theme.

Default: `vscode-dark`

Options:

- `vscode-dark`
- `vscode-light`
- `vscode-high-contrast`
- `default`

## Attachments

### Save Location

#### `mdEditor.attachments.locationMode`

Chooses where uploaded attachments are saved.

Default: `markdown-folder-attachments`

Options:

- `markdown-folder-attachments`: save into `.attachments` beside the Markdown file.
- `markdown-folder`: save directly beside the Markdown file.
- `workspace-relative-path`: save into a workspace-relative folder.
- `ask-each-time`: ask for a folder each time.

#### `mdEditor.attachments.folderName`

Names the folder created beside the current Markdown file.

Default: `.attachments`

Only used when `mdEditor.attachments.locationMode` is `markdown-folder-attachments`.

#### `mdEditor.attachments.path`

Sets the workspace-relative attachment folder.

Default: `attachments`

Only used when `mdEditor.attachments.locationMode` is `workspace-relative-path`.

### File Naming

#### `mdEditor.attachments.alwaysUseOriginalFilename`

Keeps uploaded filenames when possible.

Default: `false`

#### `mdEditor.attachments.alwaysConfirmNameAndPath`

Asks for folder and filename before every attachment is saved.

Default: `false`

#### `mdEditor.attachments.generatedNameDigits`

Sets the number padding for generated filenames.

Default: `9`

Example: `features-000000001.png`

### Removal Safety

#### `mdEditor.attachments.askBeforeDeletingFiles`

Confirms before a local attachment file can be deleted from disk.

Default: `true`

Cleanup dialog actions:

- `Cancel`: restore the attachment reference.
- `Remove from Page`: remove the Markdown reference only.
- `Move to Trash`: remove the Markdown reference and move the file to trash.
- `Delete Everywhere`: remove the Markdown reference and delete the file from disk.

### Attachment Trash

#### `mdEditor.attachments.trash.enabled`

Shows the recoverable `Move to Trash` action.

Default: `false`

#### `mdEditor.attachments.trash.folderName`

Sets the workspace-root relative attachment trash folder.

Default: `.attachments-trash`

This creates one master trash folder in the current workspace root, for example:

```text
<workspace>/.attachments-trash
```

Absolute paths and paths outside the workspace are not supported for safety.

#### `mdEditor.attachments.trash.preserveOriginalPath`

Keeps the original workspace-relative folder path inside the trash folder.

Default: `true`

#### `mdEditor.attachments.trash.writeIndex`

Writes `.attachments-trash/index.json` entries when attachments are moved to trash.

Default: `true`

## Tables

### Table Controls

#### `mdEditor.tables.floatingToolbar`

Shows the floating table toolbar when the cursor is inside a table.

Default: `true`

#### `mdEditor.tables.contextMenu`

Enables the right-click table action menu.

Default: `true`

#### `mdEditor.tables.milkdownControls`

Shows the built-in Milkdown table handles and grid-line add controls.

Default: `true`

#### `mdEditor.tables.slashMenu`

Enables the table-cell slash menu.

Default: `true`

### Insert Defaults

#### `mdEditor.tables.defaultRows`

Sets the default row count for `Insert Table`.

Default: `3`

#### `mdEditor.tables.defaultColumns`

Sets the default column count for `Insert Table`.

Default: `3`

#### `mdEditor.tables.insertBehavior`

Controls whether `Insert Table` uses the configured default size or asks for rows and columns each time.

Default: `useDefaultSize`

Options:

- `useDefaultSize`
- `askEveryTime`

## Code Blocks

#### `mdEditor.codeBlocks.alwaysShowLanguage`

Always shows the selected language label on code blocks.

Default: `true`

#### `mdEditor.codeBlocks.alwaysShowCopyButton`

Always shows the code block `Copy` button.

Default: `true`

## Date & Time

### Formats

#### `mdEditor.dateTime.dateFormat`

Sets the date format for timestamp tools.

Default: `yyyy-MM-dd`

Supported date tokens include `yyyy`, `yy`, `MM`, `M`, `dd`, and `d`.

#### `mdEditor.dateTime.timeFormat`

Sets the time format for timestamp tools.

Default: `HH:mm`

Supported time tokens include `HH`, `H`, `hh`, `h`, `mm`, `ss`, and `a`.

### Templates

Available placeholders: `{date}`, `{time}`, `{datetime}`.

#### `mdEditor.dateTime.lastUpdatedTemplate`

Template for `Insert Last Updated` and `Update Last Updated Line`.

Default: `Last updated: {date} {time}`

#### `mdEditor.dateTime.historyEntryTemplate`

Template for `Insert History Entry`.

Default: `- {date} {time} - `

#### `mdEditor.dateTime.customTemplate`

Template for `Insert Custom Date/Time Snippet`.

Default: `{date} {time}`

### Shortcuts

#### `mdEditor.dateTime.inlineSlashShortcuts`

Enables inline date/time shortcuts accepted with `Tab` or `Enter`.

Default: `true`

Current shortcuts: `/date`, `/time`, `/datetime`, `/updated`, `/history`.

## Future Categories

- **Editor Behavior**: planned home for block locks, image zoom behavior, selection behavior, drag behavior, and similar editor interaction settings.
- **Advanced**: planned home for rare compatibility and migration settings.
