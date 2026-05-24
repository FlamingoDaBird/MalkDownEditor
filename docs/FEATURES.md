# MalkDown Editor Feature List & Roadmap

---

## ✅ Core (MVP - Minimal Viable Product)

### Custom Editor Provider

- [x] **Register custom view type** — Registered `mdeditor.markdownEditor` for `.md` files
- [x] **Webview panel creation** — `createWebviewPanel` integration
- [x] **View switching** — "MalkDown Editor" button in title bar toggles between WYSIWYG and raw Markdown
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

- [x] **Reusable in-editor modal dialogs**
  - [x] Add a shared host → webview `showDialog` and webview → host `dialogResult` protocol
  - [x] Render dialogs in the webview so MalkDown can control layout, focus, safe defaults, details disclosure, and destructive styling
  - [x] Support a centered title, short body text, collapsed `More details` section, formatted detail labels, left/right button groups, default focus, Escape cancel, and keyboard focus trapping
  - [x] Fall back to native VS Code modal prompts when the webview is unavailable
  - [x] Reuse the dialog system for attachment cleanup first, then future confirmations/settings workflows

- [x] **Block drag/drop insertion indicator**
  - [x] Show a visible insertion line while dragging blocks/nodes so the drop location is clear before release
  - [ ] Add visual breathing room around the insertion line while dragging blocks, images, or attachment nodes so the line is not hidden against the moved object
  - [ ] Test drop-cursor spacing for images, tables, headings, paragraphs, and adjacent block moves in light/dark/high-contrast themes

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

- [ ] **Link interaction safety**
  - [ ] Make normal link hover/cursor behavior clear in editable mode, not only in read-only mode
  - [ ] Avoid accidental web launches while editing; investigate requiring `Ctrl`/`Cmd` + click to open links in editable mode
  - [ ] Consider a small link popover/menu with actions such as Open Link, Copy Link, Edit Link, and Remove Link
  - [ ] Preserve simpler direct left-click open behavior in read-only mode if it feels natural there
  - [ ] Add tests or manual checklist coverage for cursor state, modifier-click behavior, and URL launch prevention

- [x] **Code block polish**
  - [x] Setting to always show the selected language label
  - [x] Setting to always show the Copy button

- [x] **Settings access**
  - [x] `MalkDown Editor: Open Settings` command
  - [x] Editor title gear action beside the MalkDown Editor toggle, scoped to the active custom MalkDown Editor
  - [x] Editor title context-menu entry for Markdown files
  - [ ] Add documentation commands that open packaged docs in Markdown preview:
    - [ ] `MalkDown Editor: Open User Guide`
    - [ ] `MalkDown Editor: Open Settings Reference`
    - [ ] `MalkDown Editor: Open CommonMark Compatibility`
  - [ ] Add documentation commands to the Command Palette and consider a small Help submenu once there are more than three docs

- [x] **Read-only mode**
  - [x] `MalkDown Editor: Toggle Read-Only Mode` command
  - [x] Editor title open-lock/closed-lock action beside the MalkDown Editor/settings actions, scoped to the active custom MalkDown Editor
  - [x] Session-local Milkdown/Crepe read-only toggle
  - [x] Fixed visible `READ ONLY` badge that remains visible while scrolling
  - [x] Hide editing popups/toolbars while read-only mode is active
  - [x] Block MalkDown Editor edit actions while read-only mode is active

- [ ] **Block and block-range locking**
  - [ ] Lock a single block from the block handle/menu
  - [ ] Lock multiple selected blocks as one locked range
  - [ ] Support both individual node/block locks and multi-block range locks
  - [ ] Indicate locked ranges with one subtle left rail plus a single hover/selection padlock badge, not one padlock on every block
  - [ ] Prevent edit, delete, cut, drag, and paste-over actions inside locked ranges
  - [ ] Allow copy from locked ranges
  - [ ] Show a small toast such as `Block is locked` when a blocked edit is attempted
  - [ ] Add unlock action from the locked-range badge and block menu
  - [ ] Persist locks using portable Markdown comments, for example `<!-- malkdown-lock:start -->` and `<!-- malkdown-lock:end -->`
  - [ ] Preserve lock comments during WYSIWYG/raw Markdown round trips
  - [ ] Document that raw Markdown mode can still edit lock comments because VS Code's plain text editor is outside the WYSIWYG guardrail

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
  - [x] Clear attachment cleanup prompt with `Cancel`, `Remove from Page`, `Move to Trash`, red `Delete Everywhere`, collapsed formatted action details, safe default focus, and full file path
  - [x] Recoverable attachment trash setting with default `.attachments-trash` workspace folder
  - [x] Preserve original workspace-relative attachment paths inside the trash folder
  - [x] Collision-safe trash filenames, e.g. `image.png`, `image-1.png`
  - [x] Optional `.attachments-trash/index.json` log for future restore tooling
  - [x] Single rich attachment popup with a Generate Name button
  - [x] Attachment save success/error feedback
  - [ ] Image upload to remote storage (future)
  - [x] **Image zoom/preview dialog** — click any block image to open a full-screen lightbox overlay; close with overlay click, Escape, or × button

- [ ] **Node/image click and context actions**
  - [ ] Investigate left-click, right-click, and middle-click behaviors for images, attachments, and other selectable nodes
  - [ ] Consider a compact node action menu with Delete, Copy Path, Copy Markdown, Move to Trash, Lock/Unlock, and Open/Zoom actions
  - [ ] Avoid stealing common editor selection behavior unless the action is clearly intentional
  - [ ] Decide whether middle-click should select, open/zoom, or do nothing by default for accessibility and platform consistency
  - [ ] Add manual verification for mouse actions across Linux/Windows/macOS if behavior differs by platform

- [ ] **Attachment maintenance and orphan scanner**
  - [ ] Add `MalkDown Editor: Scan Orphaned Attachments` command
  - [ ] Scan the workspace for attachment folders, starting with `.attachments`, configured attachment folders, and optional user-defined folder names
  - [ ] Build a reference index from Markdown files by parsing image links, normal links, reference-style links, and common raw HTML `src`/`href` attributes
  - [ ] Support optional extra file formats to scan for references, for example `.md`, `.markdown`, `.mdx`, `.html`, `.txt`, or project-specific note formats
  - [ ] Treat local relative paths, workspace-relative paths, and URI-decoded paths as references to avoid false orphan reports
  - [ ] Report likely orphaned files, referenced files, missing files, duplicate filenames, and files already inside `.attachments-trash`
  - [ ] Provide safe actions: open report, copy report, move selected files to attachment trash, ignore selected files, or leave everything unchanged
  - [ ] Reuse the attachment trash path and `index.json` instead of permanently deleting scanner results
  - [ ] Keep the first implementation inside the TypeScript extension using VS Code APIs such as `workspace.findFiles` and `workspace.fs`; avoid Python or external tools as required dependencies
  - [ ] Consider an optional workspace metadata folder such as `.malkdown/` later for scan caches, ignore lists, reports, or attachment indexes
  - [ ] Add settings for scanner include folders, ignored folders, attachment file extensions, reference file extensions, and whether to scan only Markdown or broader text files
  - [ ] Add dry-run tests with a sandboxed fixture workspace containing referenced attachments, orphaned attachments, missing attachment references, trash contents, and custom extension lists

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

- [ ] **Table of contents**
  - [ ] Generate a table of contents from document headings
  - [ ] Insert/update a Markdown TOC block at the cursor
  - [ ] Support a managed TOC region with comments, for example `<!-- malkdown-toc:start -->` and `<!-- malkdown-toc:end -->`
  - [ ] Preserve manually written TOCs unless the user explicitly chooses an update action
  - [ ] Add a side-panel/outline-style TOC for navigation without modifying the Markdown
  - [ ] Support heading depth options, for example H2-H3 only or H1-H4
  - [ ] Keep generated links GitHub-compatible where possible

- [ ] **Collapsible details / dropdown sections**
  - [ ] Prefer portable raw HTML `<details><summary>Title</summary>...</details>` for the first version
  - [ ] Add insert action for a collapsible section with editable summary/title
  - [ ] Allow a collapsible section to encapsulate arbitrary supported content, including paragraphs, headings, lists, tables, images, math, and code blocks where Markdown/HTML round-trip behavior allows it
  - [ ] Preserve nested collapsible sections when round-tripping Markdown
  - [ ] Add expand/collapse controls in WYSIWYG mode
  - [ ] Add an option to expand all/collapse all sections in the current document
  - [ ] Evaluate a richer Milkdown custom node only if raw HTML cannot preserve the desired editing behavior safely
  - [ ] Add fixture coverage for nested sections and mixed content inside collapsible regions

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
  - [x] Add `docs/SHOWCASE.md` as the source-of-truth feature showcase
  - [x] Mirror `docs/SHOWCASE.md` content into `tests/fixtures/test.md`

- [ ] **Settings information architecture and terminology consistency**
  - [x] Inventory every contributed `mdEditor.*` setting, command title, menu label, popup label, toolbar label, slash-menu label, and README/manual reference
  - [x] Define top-level settings categories for current and future settings: Appearance, Attachments, Tables, Code Blocks, Date & Time, Editor Behavior, and Advanced
  - [x] Split `contributes.configuration` into multiple VS Code Settings UI categories where useful, using clear category titles and `order`
  - [x] Add explicit `order` values so linked settings stay near each other instead of relying on alphabetical sorting
  - [x] Keep related subgroups together, for example Attachment Save Location, Attachment File Naming, Attachment Cleanup, and Attachment Trash
  - [x] Rename setting display text and descriptions into short average-user language while keeping stable setting IDs unless a rename is truly necessary
  - [x] Use `markdownDescription` for concise help text, `markdownEnumDescriptions` and `enumItemLabels` for dropdown values, and setting links such as `#mdEditor.attachments.locationMode#` when one setting depends on another
  - [x] Use multiline setting presentation only for template-style text settings where a larger editor improves clarity
  - [x] Create a settings taxonomy document that future settings must fill in: category, subgroup, user-facing label, short description, longer help text, related UI labels, default, scope, tests, and compatibility notes
  - [x] Add tests that fail when a new setting is added without a declared category/subgroup/order/help-text entry
  - [x] Add terminology consistency tests comparing settings text, command titles, menus, slash-menu labels, popups, README, and manual test wording
  - [x] Compare every setting against its actual use in MalkDown Editor so names match the feature users see in the editor
  - [x] Add initial CommonMark compliance tests for documented policy and lightweight Markdown parser behavior
  - [x] Add fast CommonMark/GFM checks for fenced code headings, portable local image links, table structure, and generated timestamp defaults
  - [ ] Add full Milkdown/Crepe Markdown round-trip compliance tests; prefer official CommonMark examples or a pinned compliance fixture set
  - [x] Document any settings/UI term mismatch or CommonMark gap in `docs/BUGS.md` or `tests/README.md` when it cannot be fixed immediately

- [ ] **Toolbar enhancements**
  - [ ] Customizable toolbar
  - [ ] More formatting options
  - [ ] Context-aware menus

- [ ] **Extension naming decision**
  - [x] Adopt `MalkDown Editor` as the provisional visible product name.
  - [x] Add original logo/icon assets for the provisional brand.
  - [x] Add a custom editor-title icon for the `MalkDown Editor` action.
  - [x] Add calmer light/dark logo variants for README and theme contexts.
  - [ ] Revisit the final name before marketplace packaging.
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
