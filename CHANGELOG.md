# Changelog

## 0.1.3 - 2026-05-26

Image toolbar, security hygiene, and release guardrail update.

- Added `docs/SECURITY.md` as the security/privacy tracker and pre-commit sweep checklist.
- Added `npm run test:security` and included it in `npm test` and `npm run verify`.
- Added automated security/privacy checks for tracked environment files, private-key blocks, common secret assignments, and non-allowlisted email addresses.
- Moved image hover actions above images on a centered, solid editor-themed toolbar so icons remain readable.
- Split image actions into `Copy Attachment` and `Copy File Path`.
- Added image-data clipboard copy for `Copy Attachment`, with `Copy File Path` retained for filesystem workflows.
- Added tooltip/label coverage for the generated image description button.
- Clicking the image description button now focuses the caption input immediately.
- Replaced the finicky bottom drag resize handle with toolbar controls for smaller, larger, and reset size.
- Persisted toolbar resize changes through Milkdown's image `ratio` attribute so reset can restore the original rendered size baseline.
- Added roadmap follow-up to review image resizing UX, preset sizes, drag mode, and ratio-preserving/freeform resize modes.

## 0.1.2 - 2026-05-24

Settings, documentation, attachment safety, and branding release.

- Added original MalkDown Editor logo assets, marketplace icon, README logo variants, and compact editor-title icons.
- Added `Now with vitamin R` and `CommonMark compliant` notes to the large logo variants.
- Updated visible extension branding from MD Editor to MalkDown Editor while keeping stable extension IDs and `mdEditor.*` setting keys.
- Added a visible block drag/drop insertion line so moved nodes show exactly where they will land.
- Added a reusable in-editor modal dialog system with collapsed details, safe default focus, keyboard focus trapping, and destructive button styling.
- Replaced the native attachment cleanup prompt with a clearer in-editor `Remove attachment?` dialog using `Cancel`, `Remove from Page`, `Move to Trash`, and `Delete Everywhere`.
- Added recoverable attachment trash backed by a workspace-root `.attachments-trash` folder, preserved original paths, collision-safe filenames, and optional `index.json`.
- Fixed a fallback leak where leaving the in-editor attachment cleanup dialog open for about five minutes could also open a native VS Code prompt.
- Clarified attachment trash settings as workspace-root relative and documented the one-master-trash-folder behavior.
- Reorganized VS Code settings into ordered categories: Appearance, Attachments, Tables, Code Blocks, and Date & Time.
- Added user-facing docs for the user guide, settings reference, settings standards, and CommonMark compatibility while keeping the root README concise.
- Included user-facing docs in packaged VSIX builds so README links resolve after installation.
- Added a machine-readable settings taxonomy and tests that require every contributed setting to have metadata, documentation coverage, and source-side usage.
- Added fast CommonMark/GFM checks for fenced-code headings, relative image links, table structure, and plain Markdown timestamp defaults.
- Improved lightweight Markdown heading parsing so headings inside fenced code blocks are ignored.
- Added roadmap entries for packaged-doc opening commands and an attachment orphan scanner.
- Expanded automated coverage to 64 fast unit/regression tests.

## 0.1.1 - 2026-05-23

Stability, image handling, and project quality release.

- Fixed image lightbox selection persistence after close.
- Made attachment deletion undo-safe by delaying file removal and clearing pending deletions when image references are restored.
- Prompt for cleanup when a newly pasted/uploaded image is undone before it remains referenced in Markdown.
- Fixed image deletion after zoom/lightbox so confirmed deletion flushes even when no later edit happens.
- Blocked direct image dragging to avoid accidental duplicate attachment files; image blocks should be moved with the block handle.
- Added image hover controls for zoom, copy path, lock/unlock, and delete.
- Added lightbox zoom controls: wheel zoom, left-click reset, right-click/Escape close, and Delete/Backspace blocking while zoomed.
- Fixed an image-control `MutationObserver` loop that could mount the editor but prevent the webview from painting.
- Added MD Editor output-channel startup diagnostics and fatal startup reporting.
- Made MD Editor opt-in for Markdown files instead of the default editor.
- Added automated tests with `npm test`, `npm run verify`, unit/regression coverage, fixture integrity checks, and manual verification docs.
- Moved working docs into `docs/` and generated VSIX packages into ignored `artifacts/`.

## 0.1.0 - 2026-05-19

First packaged preview release.

- WYSIWYG Markdown editing with Milkdown Crepe.
- VS Code custom editor for `.md` files.
- Bidirectional Markdown sync between the document and webview.
- Theme support for dark, light, and high-contrast VS Code themes.
- Local attachment save, naming, preview, and cleanup prompts.
- Date/time insertion tools, configurable templates, and inline slash shortcuts.
- Enhanced table insertion and editing controls.
- Selection toolbar hover labels, quote action, and code block action.
- Code block language/copy visibility settings.
- Session-local read-only mode with title-bar lock toggle.
- GitHub pre-release with installable VSIX asset.
- Project documentation includes an AI assistance disclosure.
