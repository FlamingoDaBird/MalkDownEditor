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

  assert.match(html, /<div id="editor" aria-label="MD Editor"><\/div>/);
  assert.doesNotMatch(html, />Loading editor\.\.\.</);
});
