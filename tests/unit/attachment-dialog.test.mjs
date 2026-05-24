import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers/build-module.mjs";

async function readAttachmentSource() {
  return readFile(path.join(repoRoot, "src", "attachments.ts"), "utf8");
}

async function readProviderSource() {
  return readFile(path.join(repoRoot, "src", "provider.ts"), "utf8");
}

test("attachment deletion prompt has clear cancel, remove, and delete actions", async () => {
  const source = await readAttachmentSource();

  assert.match(source, /const cancel = "Cancel"/);
  assert.match(source, /const removeFromPage = "Remove from Page"/);
  assert.match(source, /const moveToTrash = "Move to Trash"/);
  assert.match(source, /const deleteEverywhere = "Delete Everywhere"/);
  assert.match(
    source,
    /id: "cancel",\s+label: cancel,\s+kind: "secondary",\s+placement: "left",\s+default: true,\s+cancel: true,/,
  );
  assert.match(
    source,
    /id: "removeFromPage",\s+label: removeFromPage,\s+kind: "secondary",\s+placement: "right",/,
  );
  assert.match(
    source,
    /id: "deleteEverywhere",\s+label: deleteEverywhere,\s+kind: "destructive",\s+placement: "right",/,
  );
  assert.match(source, /id: "moveToTrash"/);
  assert.match(source, /label: moveToTrash/);
  assert.match(source, /Remove attachment\?/);
  assert.match(source, /File name:/);
  assert.match(source, /More details/);
  assert.match(source, /detailsSections: detailSections/);
  assert.match(source, /label: "Status"/);
  assert.match(source, /label: "Full path"/);
  assert.match(source, /label: "Trash folder"/);
  assert.match(source, /monospace: true/);
  assert.match(source, /\$\{section\.label\}:\\n/);
  assert.match(source, /_absoluteDisplayUri\(fileUri\)/);
});

test("attachment deletion prompt explains every action in modal detail", async () => {
  const source = await readAttachmentSource();

  assert.match(
    source,
    /Put the attachment reference back into the Markdown document/,
  );
  assert.match(
    source,
    /The file on disk has not been deleted yet/,
  );
  assert.match(
    source,
    /Keep the Markdown change, but leave the file on disk/,
  );
  assert.match(
    source,
    /move the file into the attachment trash so it can be recovered later/,
  );
  assert.match(
    source,
    /Keep the Markdown change and delete the file from disk/,
  );
  assert.match(source, /kind: "destructive"/);
});

test("attachment trash moves files into a collision-safe indexed trash folder", async () => {
  const source = await readAttachmentSource();

  assert.match(source, /DEFAULT_ATTACHMENT_TRASH_FOLDER/);
  assert.match(source, /attachments\.trash\.enabled/);
  assert.match(source, /attachments\.trash\.folderName/);
  assert.match(source, /attachments\.trash\.preserveOriginalPath/);
  assert.match(source, /attachments\.trash\.writeIndex/);
  assert.match(source, /_moveAttachmentToTrash/);
  assert.match(source, /executeAttachmentTrashMove/);
  assert.match(source, /shouldWriteAttachmentTrashIndex/);
  assert.match(source, /vscode\.workspace\.fs\.rename\(source, target, \{ overwrite: false \}\)/);
});

test("posted webview attachment dialogs do not leak into native fallback after a timeout", async () => {
  const provider = await readProviderSource();

  assert.doesNotMatch(provider, /WEBVIEW_DIALOG_RESPONSE_TIMEOUT_MS/);
  assert.doesNotMatch(provider, /setTimeout\(\(\) => \{\s*this\._pendingEditorDialogs\.delete/);
  assert.match(
    provider,
    /this\._resolvePendingEditorDialogsForBridge\(bridge, "cancel"\)/,
  );
  assert.match(provider, /if \(posted\) return;/);
  assert.match(provider, /pending\.resolve\(undefined\);/);
});
