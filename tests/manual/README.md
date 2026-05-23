# Manual Verification Checklist

Use this checklist for behavior that currently depends on real VS Code UI, native dialogs, pointer input, clipboard state, or visual inspection.

Before starting:

```bash
npm run verify
npm run watch
```

Then launch the Extension Development Host with `F5` and open `tests/fixtures/test.md`.

## Startup

- Open `tests/fixtures/test.md` as raw Markdown.
- Click the `MD Editor` title action.
- Confirm the editor renders the full showcase document.
- In `Output -> MD Editor`, confirm `editorMounted`, `render-nudge`, and `dom-snapshot-raf` appear.
- Confirm there is no repeated `Retrying init` log.

## Image Hover Controls

- Hover the showcase image.
- Confirm zoom, copy-path, lock, and delete buttons are horizontally aligned.
- Confirm the destructive delete button uses red styling.
- Confirm hovering the image shows the relative source path or filename.
- Click the lock button and confirm delete is disabled while locked.
- Unlock the image and confirm delete is enabled again.

## Image Lightbox

- Click the zoom button and confirm the lightbox opens.
- Scroll up to zoom in and scroll down to zoom back toward original size.
- Left-click the zoomed image and confirm it resets to normal size.
- Right-click or press `Escape` and confirm the lightbox closes.
- Press `Delete` or `Backspace` while the lightbox is open and confirm the image is not removed.
- Close the lightbox and confirm no text or neighboring image is selected.

## Attachment Delete And Undo

- Paste or upload an image into the MD Editor.
- Press `Ctrl+Z` / `Cmd+Z` to undo the insertion.
- Confirm the prompt asks whether to remove the saved file from disk.
- Choose the safe/undo option and confirm the Markdown reference and file remain.
- Repeat and choose delete, then confirm the file is removed from `.attachments` after the grace period.

## Image Delete From Editor

- Use the hover delete button on an unlocked image.
- Confirm the Markdown image reference is removed.
- Confirm the delete-from-disk prompt appears.
- Choose keep and confirm the file stays on disk.
- Repeat and choose delete, then confirm the file is removed from disk.
- Undo quickly and confirm no broken image remains.

## Drag And Clipboard

- Drag directly on an image and confirm it does not duplicate or create a new attachment file.
- Move the block using the block handle instead and confirm the image block moves.
- Use copy-path and confirm the clipboard receives the full attachment path.

## Raw Markdown Integrity

- Switch back to raw Markdown.
- Confirm image references are relative paths under `.attachments`.
- Confirm no duplicate attachment references were created.
- Confirm VS Code's built-in Markdown preview still renders the document.

Record any failed manual step in `docs/BUGS.md` with exact steps, expected behavior, observed behavior, and relevant `Output -> MD Editor` lines.
