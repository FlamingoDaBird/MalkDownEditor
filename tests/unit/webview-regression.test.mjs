import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers/build-module.mjs";

async function readWebviewSource() {
  return readFile(path.join(repoRoot, "src", "webview", "index.ts"), "utf8");
}

test("image lock icon refresh is idempotent", async () => {
  const source = await readWebviewSource();

  assert.match(source, /nextLockState/);
  assert.match(source, /lockButton\.dataset\.lockState/);
  assert.match(
    source,
    /if \(lockButton\.dataset\.lockState !== nextLockState\) \{/,
  );
});

test("image hover mutation refresh is debounced", async () => {
  const source = await readWebviewSource();

  assert.match(source, /imageActionRefreshScheduled/);
  assert.match(source, /scheduleImageActionRefresh/);
  assert.match(source, /new MutationObserver\(\(\) => \{\s+scheduleImageActionRefresh\(\);/);
});

test("webview html does not ship a static loading placeholder", async () => {
  const html = await readFile(
    path.join(repoRoot, "src", "webview", "index.html"),
    "utf8",
  );

  assert.match(html, /<div id="editor" aria-label="MalkDown Editor"><\/div>/);
  assert.doesNotMatch(html, />Loading editor\.\.\.</);
});

test("block drag and drop shows an explicit insertion line", async () => {
  const source = await readWebviewSource();
  const cursorCss = await readFile(
    path.join(repoRoot, "src", "webview", "styles", "milkdown", "cursor.css"),
    "utf8",
  );

  assert.match(source, /\[CrepeFeature\.Cursor\]: true/);
  assert.match(source, /\[CrepeFeature\.Cursor\]: \{\s+width: 4,/);
  assert.match(source, /virtual: false/);
  assert.doesNotMatch(source, /\[CrepeFeature\.Cursor\]: false/);
  assert.match(cursorCss, /\.milkdown \.crepe-drop-cursor/);
  assert.match(cursorCss, /box-shadow:/);
  assert.match(cursorCss, /z-index: 1003/);
});

test("webview has a reusable accessible editor dialog", async () => {
  const source = await readWebviewSource();
  const css = await readFile(
    path.join(repoRoot, "src", "webview", "styles", "editor.css"),
    "utf8",
  );

  assert.match(source, /function showEditorDialog/);
  assert.match(source, /role", "dialog"/);
  assert.match(source, /aria-modal", "true"/);
  assert.match(source, /focusableDialogElements/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /message\.detailsSections/);
  assert.match(source, /type: "dialogResult"/);
  assert.match(css, /\.md-editor-dialog-backdrop/);
  assert.match(css, /\.md-editor-dialog__details/);
  assert.match(css, /\.md-editor-dialog__detail-label/);
  assert.match(css, /\.md-editor-dialog__detail-text--monospace/);
  assert.match(css, /\.md-editor-dialog__detail-text--destructive/);
  assert.match(css, /\.md-editor-dialog__button--destructive/);
});
