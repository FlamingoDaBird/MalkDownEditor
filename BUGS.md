# Bug Tracker

This file tracks known bugs and issues for the MD Editor VS Code extension.

## Active Bugs

### BUG-001: Image Lightbox selection persistence
- **Status:** RESOLVED (2026-05-23)
- **Severity:** Minor
- **Description:** Closing the Image Lightbox left the image node selected in the editor, making it impossible to click the image again without first clicking elsewhere.
- **Fix:** On lightbox close, dispatch a ProseMirror selection change using `Selection.near(resolved, 1)` to move the cursor to the position right after the image node, effectively deselecting it.
- **Files modified:** `src/webview/index.ts`

### BUG-002: Attachment deletion not undoable (Ctrl+Z)
- **Status:** RESOLVED (2026-05-23)
- **Severity:** Major
- **Description:** When a user deleted an image from the editor and confirmed file deletion, pressing Ctrl+Z to undo the edit would restore the image reference in the markdown but the file was already deleted from disk, resulting in a broken image link.
- **Fix:** Changed `promptForDeletedAttachments` to track deleted files as "pending deletions" instead of deleting them immediately. Added `flushPendingDeletions()` method that is called on every document change. If a pending file is now referenced again (undo case), the pending deletion is cleared and the file is kept. Only files that remain unreferenced after a new edit are actually deleted.
- **Files modified:** `src/attachments.ts`, `src/provider.ts`

## Resolved Bugs

### BUG-003: (Historical) Image Lightbox not implemented
- **Status:** RESOLVED (2026-05-19)
- **Description:** Block images in the editor had no click-to-preview functionality.
- **Fix:** Implemented Image Lightbox feature with darkened overlay, responsive image scaling, fade transitions, and multiple close handlers (Escape, × button, overlay click).
