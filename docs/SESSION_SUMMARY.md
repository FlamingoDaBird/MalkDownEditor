# Session Summary: VS Code Markdown WYSIWYG Editor

## Status: 🟢 MVP editor working

**Last Modified**: 2026-05-24
**Current Focus**: Settings information architecture, documentation split, and terminology/test consistency

**Latest Verification**:

- `npm run verify`
- `npm run package:vsix`

---

## ✅ Recently Resolved

### Settings And Documentation Inventory

- Kept `README.md` as a concise landing page and moved detailed user documentation into `docs/USER_GUIDE.md`, `docs/SETTINGS.md`, `docs/SETTINGS_STANDARDS.md`, and `docs/COMMONMARK.md`.
- Added `docs/SETTINGS_TAXONOMY.json` as the canonical machine-readable inventory for every contributed `mdEditor.*` setting.
- Split `package.json` settings into ordered VS Code Settings UI categories: Appearance, Attachments, Tables, Code Blocks, and Date & Time.
- Added explicit setting `order` values, dropdown labels/descriptions, setting links, and multiline presentation for date/time template settings.
- Replaced stale image-reference wording in attachment setting descriptions with attachment terminology.
- Added `tests/unit/settings-taxonomy.test.mjs` so new settings must include taxonomy metadata, package ordering, docs coverage, and related UI labels.
- Added `tests/unit/commonmark-compliance.test.mjs` and improved the lightweight Markdown parser so headings inside fenced code blocks are ignored.
- Updated `tests/README.md` with settings taxonomy and CommonMark coverage rules plus the remaining full round-trip compliance gap.
- Added future roadmap entries for `MalkDown Editor: Open User Guide`, `MalkDown Editor: Open Settings Reference`, and `MalkDown Editor: Open CommonMark Compatibility` commands.
- Extended taxonomy tests so every contributed setting must be traceable to source-side reads/defaults, and the user guide must mention contributed command titles plus settings categories.
- Expanded fast CommonMark/GFM tests to cover matching fenced code markers, portable relative image links, GFM table alignment, and plain Markdown timestamp defaults.
- Added a future Attachment Maintenance / Orphan Scanner roadmap item: scan workspace attachment folders for unreferenced files, configurable extensions, safe trash-based cleanup, no required external Python dependency, and possible future `.malkdown/` workspace metadata.

### Provisional MalkDown Editor Branding

- Adopted `MalkDown Editor` as the visible product name for now.
- Kept stable extension IDs, command IDs, and `mdEditor.*` settings keys intact.
- Added original logo/icon assets in `media/` and wired `media/icon.png` into `package.json`.
- Added compact light/dark SVG icons for the editor-title `MalkDown Editor` action.
- Added calmer light/dark README logo variants to avoid the bright first-pass logo on dark backgrounds.
- Added a discrete `Now with Vitamin R` tagline to the large README logo variants.
- Refreshed the logo and icons into an original red-white 3D carton style.
- Revised the large logo toward a deeper perspective carton and changed the VS Code editor-title icon to a flat red/white mark for tiny-size readability.
- Completed the interrupted package-art retry: kept the editor-title icons unchanged, then updated the large logo/marketplace icon to use separated M-arrow-down marks, a white cap, large red body, and an in-bounds Vitamin R cloud.
- Rebuilt the shipped large logo and marketplace icon from the red-front `milk-carton-preview.svg` direction. The editor-title icons remain unchanged, and the large logo now includes `Now with vitamin R` and `CommonMark compliant`.
- Enlarged the editor-title icons after comparing icon bounds: they now use the full 16px canvas, have a roughly 2px white top strip, no red top dots, and a larger M-arrow mark.

### Block Drag/Drop Insertion Indicator

- Re-enabled Milkdown's cursor/drop-indicator feature with the virtual text cursor disabled, so block/node moves show the editor-computed insertion line while dragging.
- Restyled `.crepe-drop-cursor` into a high-visibility horizontal/vertical insertion rule using VS Code cursor colors.

### Blank Webview / `renderSpec` Crash

The editor previously failed with:

```text
RangeError: Invalid array passed to renderSpec
```

Root cause: Milkdown's LaTeX feature can return real DOM nodes from `toDOM`, while the bundled ProseMirror serializer expected array DOM specs. The webview now patches `DOMSerializer.renderSpec` to accept DOM nodes and sanitize malformed specs.

Verified with:

- `npm run typecheck`
- `npm run build`
- bundled webview smoke test against `tests/fixtures/test.md`, including inline and block math

### MD Editor Button / View Toggle

The `MD Editor` title-bar command now toggles:

- raw Markdown text editor → Milkdown WYSIWYG editor
- Milkdown WYSIWYG editor → raw Markdown text editor

Implementation notes:

- `package.json` contributes `mdeditor.open` to `editor/title`
- `src/extension.ts` detects active `TabInputCustom` for `mdeditor.markdownEditor`
- the status bar item also runs `mdeditor.open`

### Console Noise

Temporary startup debug logs were removed from the extension host and webview. Remaining MD Editor console output should be real warnings/errors only.

### Editor Interaction Polish

- Link remove/trash action in the URL preview tooltip is styled red.
- Table row/column delete actions are styled red.
- Slash/block insert menu supports `Tab` / `Shift+Tab` category navigation.
- Slash/block insert menu category navigation wraps from last to first and first to last.
- Floating selection toolbar now adds hover labels/ARIA labels for its symbols.
- Floating selection toolbar now includes a Quote button that wraps selected block text in a Markdown blockquote.
- Floating selection toolbar now includes a Code Block button that toggles selected block text between paragraph and fenced code block.
- The sigma/sum toolbar symbol is the inline math/LaTeX toggle.
- Code blocks now have `mdEditor.codeBlocks.alwaysShowLanguage` and `mdEditor.codeBlocks.alwaysShowCopyButton` settings, both defaulting to hover-only (`false`).
- Inline code now renders as a framed grey inline pill instead of only orange text. The orange came from Milkdown Crepe's inline-code theme variable, and the fix targets both `.ProseMirror code` and `.prose code`.
- Crepe's `+` block handle and slash menu are forced to fixed viewport positioning because VS Code webviews scroll inside `#editor`; otherwise the menu can open off-screen after scrolling.
- Fixed a runtime slash/block menu crash caused by chaining `addGroup` after `addItem`; Milkdown's group builder returns the current group from `addItem`, not the root builder. Custom Tables and Date & Time menu groups are now built as separate group variables.

### Image Lightbox Fix: Deselection on Close
- **Status:** RESOLVED
- **Issue:** Closing the Image Lightbox left the image node selected in the editor.
- **Fix:** On lightbox close, dispatch a ProseMirror selection change using `Selection.near(resolved, 1)` to move the cursor to the position right after the image node, effectively deselecting it.
- **Files modified:** `src/webview/index.ts`

### Attachment Deletion: Undo (Ctrl+Z) Support
- **Status:** RESOLVED
- **Issue:** When deleting an image and confirming file deletion, Ctrl+Z would restore the image reference but the file was already deleted from disk → broken image.
- **Fix:** Changed `promptForDeletedAttachments` to track deleted files as "pending deletions" instead of deleting immediately. Added `flushPendingDeletions()` called on every document change. If a pending file is now referenced again (undo), the pending deletion is cleared. Only files that remain unreferenced after a new edit are actually deleted.
- **Files modified:** `src/attachments.ts`, `src/provider.ts`

2026-05-19 checkpoint notes:

- The floating toolbar is the small popup shown when selecting text.
- The floating toolbar now has both Quote and Code Block block-level actions.
- Code Block toggles selected/current block text between a normal paragraph and a fenced code block.
- Code block language label and Copy button visibility are controlled by live `mdEditor.codeBlocks.*` settings and default to hover-only.
- Read-only title action now uses an open padlock while editable and a closed padlock while read-only.

### Read-Only Mode

Implementation trail for retry/debug:

1. Added `MD Editor: Toggle Read-Only Mode` command and state-aware editor-title open-lock/closed-lock actions.
2. Added host/webview protocol message `setReadOnly`.
3. The provider stores read-only state per document URI for the current extension session.
4. The webview calls Milkdown Crepe `setReadonly(true | false)` to disable/enable editing.
5. A fixed `READ ONLY` badge is rendered in the webview and remains visible while scrolling.
6. Editing popups, table controls, table slash menus, and table insert dialogs are hidden while read-only mode is active.
7. Date/time insertion, table actions, attachment upload, and outgoing edit messages are blocked while read-only mode is active.
8. The block-handle `+` control is hidden while read-only mode is active, and pressing `/` shows a read-only toast instead of silently failing.
9. The extension sets the `mdeditor.readOnly` context key from the active MD Editor document so the title action shows an open padlock while editable and a closed padlock while locked.

### Table Editing Polish

Standards note:

- MD Editor aims to stay close to portable Markdown: CommonMark-style Markdown plus GitHub Flavored Markdown-style tables.
- Milkdown's current GFM table schema uses paragraph content inside cells, so inline formatting is supported in cells, but headings, blockquotes, lists, nested tables, text color, and cell background color are not added as custom Markdown syntax.

Implementation trail for retry/debug:

1. Added shared table action handling in `src/webview/index.ts` using Milkdown/ProseMirror table commands.
2. Added a floating table toolbar that appears when the cursor/selection is inside a table.
3. Added toolbar actions for add row above/below, add column left/right, delete row, delete column, and delete table.
4. Added a custom right-click table action menu with the same actions.
5. Added a custom table-cell slash menu because Crepe's built-in slash menu does not reliably open from inside table cells.
6. Added hover labels/ARIA labels to generated Milkdown table handles, add buttons, align buttons, and delete buttons.
7. Updated `src/webview/styles/milkdown/table.css` so active add-row/add-column buttons are more visible.
8. Kept destructive table actions red across built-in handles, the floating toolbar, and the context menu.
9. Added `mdEditor.tables.*` settings for the floating toolbar, right-click menu, default Milkdown controls, and table-cell slash menu.
10. Table settings are sent on editor init and updated live when VS Code configuration changes.
11. Replaced Crepe's default 3x3 table insert menu item with MD Editor's configurable insert flow.
12. Added `mdEditor.tables.defaultRows`, `mdEditor.tables.defaultColumns`, and `mdEditor.tables.insertBehavior`.
13. Added `Insert Custom Table`, which opens a compact row/column picker with plus/minus controls.
14. Hid the Quote selection-toolbar action while the current selection is inside a table cell, because blockquotes are not supported cell content.

Table settings default to enabled:

- `mdEditor.tables.floatingToolbar`
- `mdEditor.tables.contextMenu`
- `mdEditor.tables.milkdownControls`
- `mdEditor.tables.slashMenu`
- `mdEditor.tables.defaultRows` (`3`)
- `mdEditor.tables.defaultColumns` (`3`)
- `mdEditor.tables.insertBehavior` (`useDefaultSize`)

The table-cell slash menu intentionally opens only when `/` is the first character in the current table cell text block. This avoids surprise menus when writing normal text, URLs, or filesystem paths.

Future task added: collapsible details / dropdown sections. The portable route is likely raw HTML `<details><summary>...</summary>...</details>` because nested dropdown sections are not native CommonMark block syntax; a richer Milkdown custom node would need careful round-trip behavior before implementation.

### README / Naming Notes

- `README.md` now explicitly credits Milkdown and Milkdown Crepe with upstream docs/API/GitHub links.
- Extension naming is tracked as a future task in `docs/FEATURES.md`.
- Candidate names include `MilkMark`, `Crepe Markdown`, `Markflow`, `Markdown Studio`, `MellowMark`, `MD Canvas`, `WysiMark`, `Fluent Markdown`, `MalkMark`, `MalkDown`, and `MilkDown`.

### Date & Time Tools

- Added slash menu `Date & Time` category.
- Added command palette actions:
  - `MD Editor: Insert Today's Date`
  - `MD Editor: Insert Current Time`
  - `MD Editor: Insert Date and Time`
  - `MD Editor: Insert Last Updated`
  - `MD Editor: Update Last Updated Line`
  - `MD Editor: Insert History Entry`
  - `MD Editor: Insert Custom Date/Time Snippet`
- Added settings:
  - `mdEditor.dateTime.dateFormat`
  - `mdEditor.dateTime.timeFormat`
  - `mdEditor.dateTime.lastUpdatedTemplate`
  - `mdEditor.dateTime.historyEntryTemplate`
  - `mdEditor.dateTime.customTemplate`
  - `mdEditor.dateTime.inlineSlashShortcuts`
- Supported template placeholders: `{date}`, `{time}`, `{datetime}`.
- Supported format tokens include `yyyy`, `yy`, `MM`, `M`, `dd`, `d`, `HH`, `H`, `hh`, `h`, `mm`, `ss`, and `a`.
- `Update Last Updated Line` updates the current text block when it looks like a Last Updated line; otherwise it inserts a fresh Last Updated snippet.
- Slash menu Date & Time actions delete only the active slash query token before inserting, so `/d`, `/da`, or `/date` do not remain in the document.
- Added lightweight inline shortcuts accepted with `Tab` or `Enter`: `/date`, `/time`, `/datetime`, `/updated`, and `/history`.
- Inline shortcuts are guarded so they do not trigger inside words, URLs, or filesystem-like paths.

### Settings Access

- Added `MD Editor: Open Settings`, which opens VS Code settings filtered to `mdEditor`.
- Added the settings command directly to the Markdown editor title action area, beside the MD Editor toggle icon, scoped to `activeCustomEditorId == 'mdeditor.markdownEditor'`.
- Added the settings command to the Markdown editor title context menu (`editor/title/context`) so it is available from the right-click menu around the editor title / MD Editor title icon area.

### Showcase Smoke Document

- Added `docs/SHOWCASE.md` as the source-of-truth feature showcase / manual smoke document.
- Mirrored `docs/SHOWCASE.md` into `tests/fixtures/test.md` so the existing fixture path still works.
- The showcase includes visible Date & Time examples for `2026-05-18 16:04`.
- The showcase documents the inline date/time slash shortcuts and the path/URL guard behavior.
- The showcase now documents the read-only padlock state and code block visibility settings.

---

## Current Image/Attachment State

Milkdown Crepe image upload support now routes through the extension host. Uploaded images are persisted to disk and Milkdown receives a Markdown-relative path.

Implemented behavior:

- uploaded images are written with `vscode.workspace.fs`
- saved Markdown uses relative paths
- local image preview uses a webview URI resolver
- existing files are not overwritten
- generated names scan the target attachment folder and increment the highest matching number
- first upload prompts when no attachment settings have been explicitly configured
- removing a local attachment image from the MD editor asks whether to delete the file from disk too
- attachment cleanup now uses the reusable in-editor dialog system: `Remove attachment?`, `File name: ...`, focused safe `Cancel`, `Remove from Page`, `Move to Trash`, `Delete Everywhere`, collapsed `More details`, and the full path
- attachment cleanup `More details` now renders separated sections with bold labels, a monospace full path, and red destructive text for `Delete Everywhere`
- attachment cleanup now includes a recoverable `Move to Trash` option when `mdEditor.attachments.trash.enabled` is true
- trashed attachments move into the workspace-relative `.attachments-trash` folder by default, preserve their original workspace-relative path, get collision-safe renamed when needed, and append an `index.json` entry for future restore tooling
- the reusable dialog protocol is host-driven (`showDialog`) and returns a webview `dialogResult`, so future confirmations can reuse the same centered modal, left/right button groups, details disclosure, safe default focus, Escape cancel, and destructive styling
- the first-upload prompt now uses a short title plus a multi-line detail section
- confirm/rename uploads now use one `Save Markdown Attachment` popup with buttons for folder selection, original filename, and generated filename
- `ask-each-time` uploads also use the richer save popup instead of a folder-only prompt
- successful and failed attachment saves show in-editor toast feedback

---

## Attachment Settings

### Current Defaults

On a fresh setup, the first attachment upload asks whether to open settings or persist the factory defaults. Choosing defaults writes the attachment settings so the prompt does not repeat.

- save attachments next to the current Markdown file
- use a sibling folder named `.attachments`
- write Markdown links as relative paths
- generate stable lower-case filenames using the Markdown filename plus a padded counter
- ask before deleting unreferenced local attachment files from disk

Example:

```text
FEATURES.md + png upload -> .attachments/features-000000001.png
```

### Available Settings

- `mdEditor.attachments.locationMode`
  - `markdown-folder-attachments`, `markdown-folder`, `workspace-relative-path`, or `ask-each-time`.
- `mdEditor.attachments.folderName`
  - Default: `.attachments`. Only used by `markdown-folder-attachments`.
- `mdEditor.attachments.path`
  - Workspace-relative path used by `workspace-relative-path` mode.
- `mdEditor.attachments.alwaysUseOriginalFilename`
  - Preserve the uploaded file's original filename when possible.
- `mdEditor.attachments.alwaysConfirmNameAndPath`
  - Prompt before saving and allow changing filename/path in one save popup.
- `mdEditor.attachments.askBeforeDeletingFiles`
  - Ask before deleting a local attachment file from disk when it is removed from the MD editor.
- `mdEditor.attachments.generatedNameDigits`
  - Default: `9`, producing `000000001`.
- `mdEditor.attachments.trash.enabled`
  - Default: `true`. Shows `Move to Trash` in attachment cleanup.
- `mdEditor.attachments.trash.folderName`
  - Default: `.attachments-trash`. Workspace-root relative master trash folder.
- `mdEditor.attachments.trash.preserveOriginalPath`
  - Default: `true`. Keeps original workspace-relative paths under the trash root.
- `mdEditor.attachments.trash.writeIndex`
  - Default: `true`. Writes `.attachments-trash/index.json` entries for moved files.

### Naming Rules

Generated filenames should:

- use the current Markdown basename
- remove `.md`
- convert to lower case
- normalize unsafe characters to `-`
- scan the selected attachment directory for matching files
- start at `000000001`
- increment the highest existing number by `1`
- preserve the uploaded file extension, lower-cased

---

## Project Structure Notes

The high-level project layout is documented in `README.md`.

Recent cleanup:

- removed empty placeholder folders from the project root
- moved the smoke-test document to `tests/fixtures/test.md`
- added `docs/SHOWCASE.md` as the source-of-truth smoke document and copied it to `tests/fixtures/test.md`
- removed unreferenced test attachment artifacts from the root `.attachments/` folder
- updated `.gitignore` and `.vscodeignore`
- consolidated the host/webview protocol into `src/shared/protocol.ts`
- changed the project license metadata and `LICENSE` file to Apache License 2.0

Release packaging checkpoint:

- GitHub remote: `git@github.com:FlamingoDaBird/MalkDownEditor.git`
- First pushed branch: `main`
- Initial commit on GitHub: `c5c22cc Initial MD Editor extension`
- Added package repository metadata for GitHub README/LICENSE links.
- Added `npm run package:vsix`.
- Added `CHANGELOG.md` with the `0.1.0` preview release notes.
- Added `*.vsix` to `.gitignore` so release artifacts stay out of normal commits.
- Tightened `.vscodeignore` so packaged VSIX files exclude development files and source maps.
- Created local VSIX package: `md-editor-0.1.0.vsix`.
- Published GitHub pre-release: `https://github.com/FlamingoDaBird/MalkDownEditor/releases/tag/v0.1.0`
- Uploaded the installable VSIX asset to the GitHub release.
- Added README disclosure that AI assistance was used during project development.

Remaining polish:

- Manually smoke-test Date & Time slash menu and command palette actions in the Extension Development Host.
- Decide on the final extension name before marketplace packaging.
- Manually smoke-test the selection toolbar Quote and Code Block buttons in the Extension Development Host.
- Manually smoke-test code block language label / Copy button visibility settings.
- Manually smoke-test the read-only title action open/closed padlock state.
- Manually smoke-test the slash menu and block `+` menu after the builder-chain fix.
- Add image zoom/preview dialog.
- Image zoom/preview dialog (lightbox)
  - Click any block image → darkened overlay with full-size image centered
  - Close via overlay click, Escape key, or × button
  - Smooth fade transitions, theme-aware (dark/light/high-contrast)
  - Zero extension host changes — pure webview-side

---

## Resume Point

When resuming after reboot, start here:

1. Read `docs/SESSION_SUMMARY.md`, `docs/FEATURES.md`, and `README.md`.
2. Smoke-test the interaction polish from the Extension Development Host:
   - open/closed read-only padlock state in the editor title
   - slash menu and block `+` menu open reliably
   - slash menu `Tab` / `Shift+Tab` carousel
   - selection toolbar hover labels, Quote action, and Code Block action
   - code block language label and Copy button visibility settings
   - red destructive remove/delete icons
   - Date & Time slash menu and command palette actions
3. Keep the existing attachment settings and defaults:
   - default folder: `.attachments` next to the current Markdown file
   - generated names: `<markdown-file>-000000001.<ext>`
   - setting namespace: `mdEditor.attachments.*`
4. Preserve the Apache License 2.0 metadata and `LICENSE` file.
5. Verify code changes with:
   - `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json ok')"` when `package.json` changes
   - `npm run typecheck`
   - `npm run build`
   - `npm run package:vsix` before creating a GitHub release
6. Keep `docs/SHOWCASE.md` and `tests/fixtures/test.md` synchronized. Use either for manual smoke testing in the Extension Development Host.
7. Latest docs/status checkpoint was saved on `2026-05-19` after publishing the first GitHub pre-release.

Current git note: `main` tracks `origin/main`. The initial code commit, release-prep commit, and final documentation/status checkpoint have been committed and pushed.

---

## Useful Commands

```bash
npm run typecheck
npm run build
npm run package:vsix
npm run watch
```

---

## Files Of Interest

```text
src/extension.ts              # Command registration and editor toggle
src/provider.ts               # Custom editor provider and host/webview messages
src/attachments.ts            # Attachment save, naming, preview, and cleanup logic
src/webview/index.ts          # Milkdown setup and serializer guard
src/shared/protocol.ts        # Extension ↔ webview message protocol
src/utils/markdown-parser.ts  # Lightweight heading extraction
tests/fixtures/test.md        # Manual smoke-test Markdown document
package.json                  # Contributions, commands, settings
CHANGELOG.md                  # Release notes
LICENSE                       # Apache License 2.0
docs/FEATURES.md              # Roadmap
```
