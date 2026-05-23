import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers/build-module.mjs";

async function readSource(...parts) {
  return readFile(path.join(repoRoot, ...parts), "utf8");
}

test("shared protocol includes attachment and boot diagnostic messages", async () => {
  const protocol = await readSource("src", "shared", "protocol.ts");

  for (const messageType of [
    "uploadAttachment",
    "attachmentUploaded",
    "resolveAttachmentSrc",
    "attachmentSrcResolved",
    "copyAttachmentPath",
    "attachmentPathCopied",
    "fatalError",
    "webviewBootLog",
    "editorMounted",
  ]) {
    assert.match(protocol, new RegExp(`type: "${messageType}"`));
  }
});

test("host provider handles webview attachment and diagnostic messages", async () => {
  const provider = await readSource("src", "provider.ts");

  for (const caseLabel of [
    'case "webviewBootLog"',
    'case "editorMounted"',
    'case "uploadAttachment"',
    'case "resolveAttachmentSrc"',
    'case "copyAttachmentPath"',
  ]) {
    assert.match(provider, new RegExp(caseLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("webview posts mounted, attachment, and copy-path messages", async () => {
  const webview = await readSource("src", "webview", "index.ts");

  for (const messageType of [
    "editorMounted",
    "uploadAttachment",
    "resolveAttachmentSrc",
    "copyAttachmentPath",
  ]) {
    assert.match(webview, new RegExp(`type: "${messageType}"`));
  }
});

test("webview bridge reuses the inline acquired VS Code API", async () => {
  const bridge = await readSource("src", "webview", "bridge.ts");

  assert.match(bridge, /window\.__mdEditorVsCodeApi \?\? acquireVsCodeApi\(\)/);
  assert.match(bridge, /window\.__mdEditorVsCodeApi = this\._vscode/);
  assert.match(bridge, /module-bridge/);
});
