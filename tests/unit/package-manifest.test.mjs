import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers/build-module.mjs";

async function readPackageJson() {
  const text = await readFile(path.join(repoRoot, "package.json"), "utf8");
  return JSON.parse(text);
}

test("package exposes automated test and verification scripts", async () => {
  const manifest = await readPackageJson();

  for (const script of [
    "test",
    "test:unit",
    "test:watch",
    "verify",
    "test:ci",
    "package:vsix",
  ]) {
    assert.equal(
      typeof manifest.scripts?.[script],
      "string",
      `missing npm script: ${script}`,
    );
  }

  assert.match(manifest.scripts.verify, /typecheck/);
  assert.match(manifest.scripts.verify, /build/);
  assert.match(manifest.scripts.verify, /test:unit/);
  assert.match(manifest.scripts["package:vsix"], /artifacts/);
});

test("command activation events match contributed commands", async () => {
  const manifest = await readPackageJson();
  const contributedCommands = new Set(
    manifest.contributes.commands.map((command) => command.command),
  );
  const activatedCommands = manifest.activationEvents
    .filter((event) => event.startsWith("onCommand:"))
    .map((event) => event.slice("onCommand:".length));

  for (const command of activatedCommands) {
    assert.ok(
      contributedCommands.has(command),
      `activation event has no contributed command: ${command}`,
    );
  }
});

test("MD Editor custom editor remains opt-in for markdown files", async () => {
  const manifest = await readPackageJson();
  const customEditor = manifest.contributes.customEditors.find(
    (editor) => editor.viewType === "mdeditor.markdownEditor",
  );

  assert.ok(customEditor, "missing mdeditor.markdownEditor contribution");
  assert.equal(customEditor.priority, "option");
  assert.deepEqual(customEditor.selector, [{ filenamePattern: "*.md" }]);
});
