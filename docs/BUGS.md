# Bug Tracker

This file tracks known bugs and issues for the MalkDown Editor VS Code extension.

## Active Bugs

### BUG-010: Mermaid preview still needs final interaction polish
- **Status:** ACTIVE
- **Severity:** Minor
- **Description:** Mermaid SVG rendering now works, but the feature is not fully finished. The user has seen intermittent cases where Mermaid preview stops rendering again during editing, and the current Mermaid preview controls still need UX polish.
- **Follow-up reminders for next resume:**
  - Re-test for intermittent "no rendering again" / stuck Mermaid preview behavior.
  - Move Mermaid preview controls to the top-right corner.
  - Replace text labels with icons.
  - Show Mermaid preview controls only on hover.

Resolved bugs are kept below for recent context. We can move older resolved entries to an archive file later if this tracker becomes hard to scan.

## Resolved Bugs

### BUG-009: Native VS Code attachment prompt appears while MalkDown dialog is open
- **Status:** RESOLVED (2026-05-24)
- **Severity:** Major
- **Description:** When an attachment was removed and the custom MalkDown `Remove attachment?` dialog was left open for about five minutes, a second native VS Code modal appeared with the same attachment cleanup question. This created two competing prompts for one deletion decision.
- **Root cause:** The host-side webview dialog request used a five-minute timeout. When the timeout expired, the attachment cleanup flow interpreted the unresolved webview dialog as "webview unavailable" and invoked the native VS Code fallback prompt, even though the webview dialog was still visible and waiting for the user.
- **Fix:** Removed the host-side timeout for posted webview dialogs. Native VS Code fallback is now reserved for immediate post failures before the custom dialog is shown. Disposing the webview resolves pending dialogs as `Cancel` instead of opening the fallback prompt.
- **Files modified:** `src/provider.ts`, `docs/BUGS.md`, `tests/unit/attachment-dialog.test.mjs`

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

### BUG-003: (Historical) Image Lightbox not implemented
- **Status:** RESOLVED (2026-05-19)
- **Severity:** Minor
- **Description:** Block images in the editor had no click-to-preview functionality.
- **Fix:** Implemented Image Lightbox feature with darkened overlay, responsive image scaling, fade transitions, and multiple close handlers (Escape, × button, overlay click).

### BUG-004: Undoing a newly uploaded image skips attachment cleanup prompt
- **Status:** RESOLVED (2026-05-23)
- **Severity:** Major
- **Description:** When a pasted/uploaded image created a local attachment and Ctrl+Z removed that newly inserted image, MalkDown Editor could leave the saved attachment file on disk without asking whether to delete it.
- **Fix:** Freshly saved uploads are tracked until the Markdown document references them. If a later edit or the delayed upload check shows the upload was abandoned or undone, MalkDown Editor now shows the same delete-from-disk prompt and uses the undo-safe pending deletion flow. Confirmed deletions also flush after a short grace period when there is no next edit.
- **Files modified:** `src/attachments.ts`

### BUG-005: Image deletion after lightbox/selection can leave attachment pending
- **Status:** RESOLVED (2026-05-23)
- **Severity:** Major
- **Description:** Deleting a selected image after opening the lightbox could show the delete-from-disk prompt but leave the attachment file on disk until another edit happened. The lightbox also allowed `Delete`/`Backspace` keypresses to reach the editor behind the overlay.
- **Fix:** Confirmed attachment deletions now flush after a short undo grace period even if no later edit occurs. Dismissing the prompt restores the image reference when the user cancels the removal flow. The lightbox blocks `Delete`/`Backspace`, closes on right-click, supports wheel zoom, and image blocks now show aligned hover buttons for zoom and delete.
- **Files modified:** `src/attachments.ts`, `src/webview/index.ts`, `src/webview/styles/editor.css`, `src/webview/styles/milkdown/image-block.css`

### BUG-006: Direct image dragging can duplicate attachments
- **Status:** RESOLVED (2026-05-23)
- **Severity:** Major
- **Description:** Dragging an image block image directly and dropping it could be interpreted as a fresh upload, creating duplicate attachment files and sometimes broken references.
- **Fix:** Direct image dragging is blocked with guidance to use the block handle for moving the image block. Image hover controls now include session-local lock/unlock and copy-path actions.
- **Files modified:** `src/webview/index.ts`, `src/webview/styles/milkdown/image-block.css`, `src/shared/protocol.ts`, `src/provider.ts`

### BUG-007: Image controls can block editor startup
- **Status:** RESOLVED (2026-05-23)
- **Severity:** Major
- **Description:** The editor could remain on `Loading editor...` if the image hover/lightbox setup threw while wiring image block controls after Milkdown started.
- **Fix:** Image lightbox and hover action setup now fail softly after the core editor is mounted. Image block position lookup also guards stale or detached DOM mappings so malformed image DOM state cannot prevent startup. The webview also has visible boot stages, DOM snapshots, a startup watchdog, and host-side fatal init messages so startup failures are visible. Markdown files now open in the normal text editor by default; MalkDown Editor is an optional editor opened via its title action/Open With.
- **Files modified:** `package.json`, `src/webview/bridge.ts`, `src/webview/index.html`, `src/webview/index.ts`, `src/provider.ts`, `src/shared/protocol.ts`

### BUG-008: Editor appears stuck after successful webview mount
- **Status:** RESOLVED (2026-05-23)
- **Severity:** Major
- **Description:** User still sees `Loading editor...` even though MalkDown Editor output shows `editor.create()` resolved, `loadingCount:0`, and visible `.milkdown`/`.ProseMirror` DOM nodes. This suggests a stale build, inactive/hidden webview, or visual overlay/tab-state mismatch rather than Milkdown startup itself.
- **Fix:** The image hover-control `MutationObserver` could self-trigger forever because the lock button icon was rewritten with `innerHTML` on every refresh. With an image block present, the editor mounted synchronously but the webview event loop never reached paint, `requestAnimationFrame`, or delayed timeout logs. Lock-icon updates are now idempotent and mutation refreshes are debounced.
- **Files modified:** `src/provider.ts`, `src/webview/index.ts`, `src/shared/protocol.ts`
