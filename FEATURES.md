# MD Editor Feature List & Roadmap

---

## ✅ Core (MVP - Minimal Viable Product)

### Custom Editor Provider

- [x] **Register custom view type** — Registered `mdeditor.markdownEditor` for `.md` files
- [x] **Webview panel creation** — `createWebviewPanel` integration
- [x] **View switching** — "MD Editor" button in title bar toggles between WYSIWYG and raw Markdown
- [x] **Priority handling** — Set to `"option"` for user choice

### Milkdown Crepe Integration

- [x] **Editor mount** — Basic editor initialized in webview
- [x] **Markdown rendering** — Live HTML rendering from Markdown
- [x] **Edit propagation** — Webview edits → Host file sync
- [x] **Theme support** — Dark/Light/High-contrast via CSS variables
- [x] **Math/LaTeX rendering stability** — ProseMirror DOM spec sanitizer handles Milkdown KaTeX DOM nodes

### Bidirectional Sync

- [x] **Host → Webview initial load** — File content loads into editor
- [x] **Host → Webview external changes** — Detects external file modifications
- [x] **Webview → Host edits** — Edits saved back to file system
- [x] **Version conflict handling** — Graceful handling of simultaneous edits

### Build System

- [x] **esbuild dual-target** — Single script builds both extension & webview
- [x] **Font asset handling** — woff/woff2/ttf fonts bundled correctly
- [x] **TypeScript validation** — No compile errors in extension or webview

---

## 🚧 Post-MVP Features

### Editor Enhancements

- [x] **Keyboard shortcuts**
  - [x] Ctrl+S / Cmd+S — Save with visual notification
  - [x] Ctrl+Z / Cmd+Z — Undo via Milkdown/ProseMirror
  - [x] Tab / Shift+Tab — Cycle slash menu categories with wraparound
  - [x] Command palette Date & Time insertion actions
  - [ ] Ctrl+Shift+S / Cmd+Shift+S — Toggle fullscreen
  - [ ] Custom keybinding configuration

- [x] **Table editing UI**
  - [x] Add/delete rows/columns from a floating table toolbar
  - [x] Add/delete rows/columns from a table right-click action menu
  - [x] Table-cell slash menu for add/delete table work
  - [x] Settings for floating toolbar, right-click menu, Milkdown controls, and table-cell slash menu
  - [x] Configurable Insert Table default rows and columns
  - [x] Insert Table behavior setting: use default size or ask every time
  - [x] Insert Custom Table row/column picker with plus/minus steppers
  - [x] Hide unsupported Quote toolbar action while editing inside table cells
  - [x] Hover labels for table handles, add buttons, align buttons, and delete buttons
  - [x] More visible add-row/add-column handle buttons when table handles are active
  - [x] Destructive row/column delete actions styled red
  - [x] Destructive table toolbar and context-menu actions styled red
  - [ ] Merge cells
  - [ ] Table styling options

- [x] **Selection toolbar polish**
  - [x] Hover labels for toolbar symbols
  - [x] Quote action for selected block text
  - [x] Code Block action for selected block text
  - [x] Destructive link remove action styled red

- [x] **Code block polish**
  - [x] Setting to always show the selected language label
  - [x] Setting to always show the Copy button

- [x] **Settings access**
  - [x] `MD Editor: Open Settings` command
  - [x] Editor title gear action beside the MD Editor toggle, scoped to the active custom MD Editor
  - [x] Editor title context-menu entry for Markdown files

- [x] **Read-only mode**
  - [x] `MD Editor: Toggle Read-Only Mode` command
  - [x] Editor title open-lock/closed-lock action beside the MD Editor/settings actions, scoped to the active custom MD Editor
  - [x] Session-local Milkdown/Crepe read-only toggle
  - [x] Fixed visible `READ ONLY` badge that remains visible while scrolling
  - [x] Hide editing popups/toolbars while read-only mode is active
  - [x] Block MD Editor edit actions while read-only mode is active

- [x] **Date & Time Tools**
  - [x] Insert today's date
  - [x] Insert current time
  - [x] Insert date and time
  - [x] Insert Last Updated text from a configurable template
  - [x] Update the current Last Updated text block when the cursor is on it
  - [x] Insert history entry text from a configurable template
  - [x] Insert custom timestamp text from a configurable template
  - [x] Slash menu Date & Time category
  - [x] Date/time command palette actions
  - [x] Configurable date and time format tokens
  - [x] Slash query cleanup before timestamp insertion, e.g. `/date` becomes `2026-05-18`
  - [x] Inline shortcuts accepted with `Tab` or `Enter`: `/date`, `/time`, `/datetime`, `/updated`, `/history`
  - [x] Inline shortcuts ignored inside words, URLs, and filesystem paths
  - [x] `mdEditor.dateTime.inlineSlashShortcuts` setting

- [ ] **Image handling**
  - [ ] Drag & drop images
  - [ ] Copy-paste images
  - [x] Persist uploaded images as Markdown attachments
  - [x] Configurable attachment root/path
  - [x] Workspace-relative attachment paths
  - [x] Same folder as Markdown option
  - [x] Per-document `.attachments/` folder option
  - [x] First-upload setup prompt when attachment settings are not configured
  - [x] Original filename option
  - [x] Confirm/rename attachment prompt option
  - [x] Generated numbered filenames, e.g. `features-000000001.png`
  - [x] Prompt to delete local attachment files when removed from the MD editor
  - [x] Single rich attachment popup with a Generate Name button
  - [x] Attachment save success/error feedback
  - [ ] Image upload to remote storage (future)
  - [x] **Image zoom/preview dialog** — click any block image to open a full-screen lightbox overlay; close with overlay click, Escape, or × button

- [ ] **Live preview toggle**
  - [ ] Split view (editor + preview)
  - [ ] Side-by-side mode
  - [ ] Preview-only mode

### Export & Share

- [ ] **Export to formats**
  - [ ] PDF export
  - [ ] HTML export
  - [ ] Plain text export
  - [ ] EPUB export (future)

- [ ] **Share functionality**
  - [ ] Share markdown directly
  - [ ] Generate shareable links (cloud integration)

### Advanced Features

- [ ] **Frontmatter support**
  - [ ] YAML frontmatter parser
  - [ ] Frontmatter editor panel
  - [ ] Metadata highlighting

- [ ] **Collapsible details / dropdown sections**
  - [ ] Decide whether to support portable raw HTML `<details><summary>...</summary>...</details>` blocks or a Milkdown custom node
  - [ ] Preserve nested collapsible sections when round-tripping Markdown
  - [ ] Add a simple insert/edit UI if the syntax remains portable enough

- [ ] **Outline window**
  - [ ] Document tree view
  - [ ] Heading navigation
  - [ ] Code folding in outline

- [ ] **Search & Replace**
  - [ ] Ctrl+F / Cmd+F in webview
  - [ ] Search across headings
  - [ ] Replace across document

- [ ] **History management**
  - [ ] Undo/redo stack
  - [ ] File change history
  - [ ] Version snapshots

### UI/UX Improvements

- [x] **Showcase smoke document**
  - [x] Add `SHOWCASE.md` as the source-of-truth feature showcase
  - [x] Mirror `SHOWCASE.md` content into `tests/fixtures/test.md`

- [ ] **Toolbar enhancements**
  - [ ] Customizable toolbar
  - [ ] More formatting options
  - [ ] Context-aware menus

- [ ] **Extension naming decision**
  - [ ] Decide whether to keep `MD Editor` or rename before marketplace packaging.
  - [ ] Candidate names: `MilkMark`, `Crepe Markdown`, `Markflow`, `Markdown Studio`, `MellowMark`, `MD Canvas`, `WysiMark`, `Fluent Markdown`.
  - [ ] User candidate names: `MalkMark`, `MalkDown`, `MilkDown`.
  - [ ] Note: `Malk` is a playful Simpsons reference to the fake milk bottle gag; `MilkDown` may be too close to upstream `Milkdown`.

- [ ] **Extensions & Plugins**
  - [ ] LaTeX/math support
  - [ ] Further code block enhancements
  - [ ] Diagram rendering (Mermaid, PlantUML)

- [x] **Release packaging**
  - [x] Add GitHub repository metadata to `package.json`
  - [x] Add `npm run package:vsix` for repeatable VSIX creation
  - [x] Add first `CHANGELOG.md` entry for `0.1.0`
  - [x] Keep generated `.vsix` files out of git
  - [x] Create the first GitHub Release page and upload the `.vsix` asset
  - [x] Publish `v0.1.0` as a GitHub pre-release

- [x] **Project transparency**
  - [x] Add README note that AI assistance was used during project development

- [ ] **Performance**
  - [ ] Lazy loading for large files
  - [ ] Optimize rendering pipeline
  - [ ] Reduce memory footprint

---

## 🎯 Version Targets

### v0.2.0 — Editor Enhancements

- Split view mode
- Enhanced keyboard shortcuts
- Improved table editing

### v0.3.0 — Export & Share

- PDF/HTML export
- Image upload support
- Share functionality

### v0.4.0 — Advanced Features

- Frontmatter support
- Outline window
- Full search/replace

### v1.0.0 — Stable Release

- All planned features completed
- Comprehensive testing
- Marketplace ready

---

## 📝 Notes

- Features marked with ⭐ are high priority
- Features in `(future)` are for potential future versions
- MVP is complete and functional for basic editing
