# Changelog

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
