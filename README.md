# MD Editor - VS Code/VS Codium Extension

A WYSIWYG Markdown editor for VS Code built on [Milkdown](https://milkdown.dev/) and its batteries-included [Crepe editor](https://milkdown.dev/docs/guide/using-crepe).

## AI Assistance

AI tools, including OpenAI Codex, have been used as development assistants in this project for implementation support, documentation updates, code review-style reasoning, and release preparation. Project direction, testing decisions, and release publishing are maintained by the project owner.

## Editor Engine

This extension uses [Milkdown](https://milkdown.dev/), a ProseMirror-based WYSIWYG Markdown editor framework. The rich editor surface is powered by [Milkdown Crepe](https://milkdown.dev/docs/api/crepe), which provides the toolbar, slash menu, tables, image blocks, link tooling, and other editing UI pieces used here.

MD Editor aims to stay close to portable Markdown. The baseline is CommonMark-style Markdown plus GitHub Flavored Markdown-style tables. Table cells are kept to paragraph/inline content, so bold, italic, inline code, links, and inline math are appropriate inside cells; blockquotes, headings, lists, nested tables, cell colors, and text colors are not added as custom Markdown syntax.

Useful upstream links:

- [Milkdown documentation](https://milkdown.dev/)
- [Using Crepe](https://milkdown.dev/docs/guide/using-crepe)
- [Crepe API](https://milkdown.dev/docs/api/crepe)
- [Milkdown GitHub repository](https://github.com/Milkdown/milkdown)

## Quick Start

### 1. Build the Extension
```bash
npm run build
```

Or for development with hot reload:
```bash
npm run watch
```

### 2. Open in VS Code Development Host
```bash
code .
```

### 3. Run the Extension
1. Press `F5` in VS Code
2. This opens the Extension Development Host

### 4. Test the Extension
1. Open or create a `.md` file
2. Click "MD Editor" button in the title bar OR press `Ctrl+Shift+P` and type "Open With...", then select "MD Editor"
3. You should see the Milkdown Crepe editor

The source-of-truth smoke document is `SHOWCASE.md`. A copy lives at `tests/fixtures/test.md`.

## Features

### Keyboard Shortcuts (v0.2)
- **Ctrl+S / Cmd+S**: Save file with visual notification
- **Ctrl+Z / Ctrl+Y**: Undo/Redo (native Milkdown support)
- **Ctrl+Shift+Z**: Redo (alternative)
- **Ctrl+C/V/X**: Copy/Paste/Cut (native Milkdown support)
- **Tab / Shift+Tab**: Cycle slash menu categories when the insert menu is open

### Date & Time Tools
- Slash menu `Date & Time` category for date, time, date/time, Last Updated, Update Last Updated, history entry, and custom timestamp snippets
- Command palette actions for the same timestamp tools
- Configurable date format, time format, and text templates
- `Update Last Updated Line` replaces the current `Last updated: ...` line when the cursor is on it
- Inline shortcuts such as `/date`, `/time`, `/datetime`, `/updated`, and `/history` can be replaced with `Tab` or `Enter`
- Inline shortcuts are ignored inside words, URLs, and paths

### Table Editing
- Insert Table uses configurable default rows/columns, or can ask for rows/columns every time
- Insert Custom Table always opens a compact rows/columns picker
- Clicking inside a table shows a floating table toolbar for row/column insertion and deletion
- Right-clicking inside a table opens a table action menu
- Typing `/` as the first character in a table cell opens a table-cell action menu for add/delete row/column/table actions
- Existing table handles include hover labels for add, align, select/drag, and delete controls
- Destructive row, column, table, and link remove actions use red visual treatment

### Visual Feedback
- Save notification toast appears after Ctrl+S
- Attachment upload success/error toasts appear in the editor
- Read-only mode shows a fixed `READ ONLY` badge that remains visible while scrolling
- Toasts auto-dismiss after a short delay
- Destructive remove/delete actions use red icon treatment

### Editor Features
- Full WYSIWYG Markdown editing
- Session-local read-only mode with title-bar lock toggle
- Math support (KaTeX fonts included)
- Selection toolbar includes hover labels, Quote, and Code Block actions
- Code blocks can keep the language label and Copy button visible without hover
- Table toolbar, table context menu, and table slash actions for faster row/column editing
- Date/time snippets for journaling, changelogs, and last-updated lines
- Responsive design
- Theme support (dark/light/high-contrast)
- Local attachment persistence with configurable save paths
- Single attachment save prompt with folder, original name, and generated name controls
- Attachment upload success/error toasts
- Optional prompt to delete local attachment files when removed from the editor

## Using the Extension

### Opening MD Editor
There are two ways to open the MD Editor:

1. **Click the button**: When viewing a `.md` file, click "MD Editor" in the editor title bar
2. **Command Palette**: Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac), type "MD Editor", press Enter

When the custom MD Editor is active, use the gear icon beside the `MD Editor` editor-title action to jump to MD Editor settings. The Markdown editor tab context menu also includes `MD Editor: Open Settings`.

Use the padlock icon beside the MD Editor title actions to toggle read-only mode for the current MD Editor session. The icon is open while editing is enabled and closed while read-only mode is active. Read-only mode disables editing and shows a fixed `READ ONLY` badge in the editor.

### Switching Back
Click the "MD Editor" button again to toggle back to the raw Markdown editor.

## Packaging and Releases

The installable VS Code extension file is a `.vsix` file.

The first packaged preview release is published as a GitHub pre-release:

- [v0.1.0 release](https://github.com/FlamingoDaBird/MalkDownEditor/releases/tag/v0.1.0)
- Installable asset: `md-editor-0.1.0.vsix`

```bash
npm run typecheck
npm run package:vsix
```

That creates a versioned package such as `md-editor-0.1.0.vsix` in the repository root.

To test the packaged extension locally:

```bash
code --install-extension md-editor-0.1.0.vsix
```

For a GitHub release:

1. Create and push a version tag, for example `git tag v0.1.0 && git push origin v0.1.0`.
2. In GitHub, open Releases, draft a new release from that tag, and upload the `.vsix` file as a release asset.
3. Use `CHANGELOG.md` as the release notes source.

If the GitHub CLI is installed and authenticated, the release can also be created with:

```bash
gh release create v0.1.0 md-editor-0.1.0.vsix --title "MD Editor 0.1.0" --notes-file CHANGELOG.md
```

## Settings

MD Editor settings are grouped under `mdEditor.*`.

### Attachments

- `mdEditor.attachments.locationMode`
  Controls where uploaded attachments are saved.
- `mdEditor.attachments.folderName`
  Folder name created beside the current Markdown file. Only used when `locationMode` is `markdown-folder-attachments`.
- `mdEditor.attachments.path`
  Workspace-relative folder for attachments. Only used when `locationMode` is `workspace-relative-path`.
- `mdEditor.attachments.alwaysUseOriginalFilename`
  Preserve uploaded filenames when possible.
- `mdEditor.attachments.alwaysConfirmNameAndPath`
  Ask before each attachment is saved.
- `mdEditor.attachments.askBeforeDeletingFiles`
  Ask before deleting a local attachment file when its image is removed from the editor.
- `mdEditor.attachments.generatedNameDigits`
  Number of digits in generated filenames, for example `features-000000001.png`.

### Date & Time

- `mdEditor.dateTime.dateFormat`
  Date format for timestamp tools. Default: `yyyy-MM-dd`.
- `mdEditor.dateTime.timeFormat`
  Time format for timestamp tools. Default: `HH:mm`.
- `mdEditor.dateTime.lastUpdatedTemplate`
  Template for Last Updated actions. Default: `Last updated: {date} {time}`.
- `mdEditor.dateTime.historyEntryTemplate`
  Template for history entries. Default: `- {date} {time} - `.
- `mdEditor.dateTime.customTemplate`
  Template for custom timestamp snippets. Default: `{date} {time}`.
- `mdEditor.dateTime.inlineSlashShortcuts`
  Enables inline date/time slash shortcuts accepted with `Tab` or `Enter`. Default: `true`.

Supported template placeholders: `{date}`, `{time}`, `{datetime}`.

Supported format tokens include `yyyy`, `yy`, `MM`, `M`, `dd`, `d`, `HH`, `H`, `hh`, `h`, `mm`, `ss`, and `a`.

### Tables

- `mdEditor.tables.floatingToolbar`
  Shows MD Editor's floating table toolbar when the cursor is inside a table. Default: `true`.
- `mdEditor.tables.contextMenu`
  Enables the right-click table action menu. Default: `true`.
- `mdEditor.tables.milkdownControls`
  Shows Milkdown Crepe's default table handles and grid-line add controls. Default: `true`.
- `mdEditor.tables.slashMenu`
  Enables the table-cell slash menu. Type `/` as the first character in a table cell. Default: `true`.
- `mdEditor.tables.defaultRows`
  Default rows used by Insert Table. Default: `3`.
- `mdEditor.tables.defaultColumns`
  Default columns used by Insert Table. Default: `3`.
- `mdEditor.tables.insertBehavior`
  Controls whether Insert Table uses default rows/columns immediately or asks every time. Default: `useDefaultSize`.

### Code Blocks

- `mdEditor.codeBlocks.alwaysShowLanguage`
  Always shows the selected code block language label. Default: `true`.
- `mdEditor.codeBlocks.alwaysShowCopyButton`
  Always shows the code block Copy button. Default: `true`.

## Current Status
- ✅ Custom Editor Provider registered for `.md` files
- ✅ Milkdown Crepe editor integrated
- ✅ Bidirectional sync possible via "Open With"
- ✅ Theme support
- ✅ Keyboard shortcuts (save, undo, redo)
- ✅ Save notification with toast
- ✅ "MD Editor" button in title bar
- ✅ Local attachment save/preview/delete flow
- ✅ Rich attachment save/rename prompt with generated naming
- ✅ Slash menu Tab category carousel
- ✅ Slash menu Date & Time actions remove the typed slash query before inserting
- ✅ Selection toolbar hover labels, Quote action, and Code Block action
- ✅ Code block language label and Copy button visibility settings
- ✅ Configurable table insertion, table picker, toolbar, context menu, hover labels, settings, and table-cell slash menu actions
- ✅ Date & Time Tools with configurable templates
- ✅ `SHOWCASE.md` source-of-truth smoke document mirrored to `tests/fixtures/test.md`
- ✅ Editor title gear and context-menu shortcuts to MD Editor settings
- ✅ Editor title read-only toggle with open/closed padlock state and fixed `READ ONLY` badge
- ✅ VSIX packaging script and first `0.1.0` changelog
- ✅ GitHub pre-release `v0.1.0` published with installable VSIX asset
- ✅ AI assistance disclosure added to project documentation

## Troubleshooting

### "Document not found in AST tracker" Errors
These errors come from other extensions (like Intelephense or TypeScript helpers), not from MD Editor. Safe to ignore.

### Editor Not Loading
1. Make sure you ran `npm run build`
2. Press F5 to restart the Extension Development Host
3. Check the Output panel (View > Output) for "MD Editor" logs

### Command Not Found
Make sure the extension is built and loaded. Press F5 to restart.

## Development

### Run in Watch Mode
```bash
npm run watch
```
This starts a development server that automatically rebuilds on changes.

### Debugging
1. Set breakpoints in `src/extension.ts` or `src/webview/index.ts`
2. Press F5
3. Debug the Extension Development Host

## Project Structure

`README.md` is the best place for the stable, high-level folder overview. `SESSION_SUMMARY.md` is kept as the active working checkpoint for development sessions.

```
VS-CODE-Plugin-MD-Editor/
├── .github/
│   └── copilot-instructions.md     # Points compatible agents to AGENTS.md
├── .vscode/
│   ├── launch.json                 # Extension Development Host launch config
│   └── tasks.json                  # Build task used before launch
├── src/
│   ├── extension.ts                # Extension entry point and command registration
│   ├── provider.ts                 # Custom Markdown editor provider
│   ├── attachments.ts              # Attachment save, path, naming, and cleanup logic
│   ├── shared/
│   │   └── protocol.ts             # Host/webview message types
│   ├── utils/
│   │   └── markdown-parser.ts      # Lightweight heading extraction
│   └── webview/
│       ├── index.html              # Webview shell
│       ├── index.ts                # Milkdown Crepe setup
│       ├── bridge.ts               # VS Code webview message bridge
│       └── styles/                 # Editor and Milkdown CSS
├── tests/
│   └── fixtures/
│       └── test.md                 # Copy of SHOWCASE.md for manual smoke testing
├── dist/                           # Generated build output, ignored by git
├── node_modules/                   # Installed dependencies, ignored by git
├── AGENTS.md                       # Agent/project working instructions
├── FEATURES.md                     # Feature checklist and roadmap
├── PROJECT_CHECKPOINT_GUIDE.md     # Session checkpoint guidance
├── SESSION_SUMMARY.md              # Current working state
├── SHOWCASE.md                     # Source-of-truth feature showcase / smoke document
├── CHANGELOG.md                    # Release notes
├── esbuild.mjs                     # Extension and webview build script
├── package.json                    # VS Code extension manifest
├── package-lock.json               # Locked npm dependency graph
├── LICENSE                         # Apache License 2.0
├── tsconfig.json                   # Extension host TypeScript config
└── tsconfig.webview.json           # Webview TypeScript config
```

## License
Apache License 2.0. See [LICENSE](LICENSE).
