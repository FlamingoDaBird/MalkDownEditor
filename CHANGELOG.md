# Changelog

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

## 0.1.1 - 2026-05-23

Bug fixes and improvements:

- **Image Lightbox: fixed image staying selected after closing** — closing the lightbox (Escape, ×, or overlay click) now restores the cursor position so the image is deselected and can be clicked again without first clicking elsewhere.
- **Attachment deletion now respects undo (Ctrl+Z)** — when you delete an image and confirm deletion, the file is tracked as "pending deletion" rather than deleted immediately. If you press Ctrl+Z to undo the edit, the pending deletion is cleared and the file is kept. The file is only actually deleted when you make another edit that still doesn't reference it.
