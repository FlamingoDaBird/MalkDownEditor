import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers/build-module.mjs";

async function readProjectFile(...parts) {
  return readFile(path.join(repoRoot, ...parts), "utf8");
}

test("AGENTS.md points agents at the automated test procedure", async () => {
  const agents = await readProjectFile("AGENTS.md");

  assert.match(agents, /tests\/README\.md/);
  assert.match(agents, /npm test/);
  assert.match(agents, /npm run verify/);
  assert.match(agents, /Test Procedure for Agents/);
  assert.match(agents, /Add or update tests/);
});

test("tests README documents when to run and expand tests", async () => {
  const readme = await readProjectFile("tests", "README.md");

  assert.match(readme, /When To Run Tests/);
  assert.match(readme, /When To Add Or Update Tests/);
  assert.match(readme, /Test Layers/);
  assert.match(readme, /Coverage Gaps/);
  assert.match(readme, /Manual Verification/);
  assert.match(readme, /VS Code custom-editor tests/);
});

test("docs README tracks moved project documentation", async () => {
  const readme = await readProjectFile("docs", "README.md");

  for (const filename of [
    "BUGS.md",
    "FEATURES.md",
    "PROJECT_CHECKPOINT_GUIDE.md",
    "SESSION_SUMMARY.md",
    "SHOWCASE.md",
  ]) {
    assert.match(readme, new RegExp(filename.replace(".", "\\.")));
  }
});

test("manual checklist documents VS Code-only verification gaps", async () => {
  const manual = await readProjectFile("tests", "manual", "README.md");

  for (const heading of [
    "Startup",
    "Image Hover Controls",
    "Image Lightbox",
    "Attachment Delete And Undo",
    "Image Delete From Editor",
    "Drag And Clipboard",
    "Raw Markdown Integrity",
  ]) {
    assert.match(manual, new RegExp(`## ${heading}`));
  }
});

test("bug tracker records the image-control startup regression", async () => {
  const bugs = await readProjectFile("docs", "BUGS.md");

  assert.match(bugs, /BUG-008: Editor appears stuck after successful webview mount/);
  assert.match(bugs, /MutationObserver/);
  assert.match(bugs, /Lock-icon updates are now idempotent/);
});
