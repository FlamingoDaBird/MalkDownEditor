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
    "COMMONMARK.md",
    "FEATURES.md",
    "PROJECT_CHECKPOINT_GUIDE.md",
    "SECURITY.md",
    "SETTINGS.md",
    "SETTINGS_STANDARDS.md",
    "SETTINGS_TAXONOMY.json",
    "SESSION_SUMMARY.md",
    "SHOWCASE.md",
    "USER_GUIDE.md",
  ]) {
    assert.match(readme, new RegExp(filename.replace(".", "\\.")));
  }
});

test("root README stays a concise landing page and links detailed docs", async () => {
  const readme = await readProjectFile("README.md");
  const lineCount = readme.split("\n").length;

  assert.ok(lineCount < 140, `README should stay concise, found ${lineCount} lines`);
  assert.match(readme, /docs\/USER_GUIDE\.md/);
  assert.match(readme, /docs\/SETTINGS\.md/);
  assert.match(readme, /docs\/COMMONMARK\.md/);
  assert.match(readme, /docs\/SECURITY\.md/);
  assert.doesNotMatch(readme, /## Settings\n[\s\S]*mdEditor\.attachments\.locationMode/);
});

test("security tracker is visible to agents and test docs", async () => {
  const agents = await readProjectFile("AGENTS.md");
  const testsReadme = await readProjectFile("tests", "README.md");
  const security = await readProjectFile("docs", "SECURITY.md");

  assert.match(agents, /docs\/SECURITY\.md/);
  assert.match(agents, /before committing or pushing to GitHub/i);
  assert.match(agents, /npm run test:security/);
  assert.match(testsReadme, /npm run test:security/);
  assert.match(security, /Pre-Commit Sweep/);
  assert.match(security, /Current Security Findings/);
  assert.match(security, /Automated Checks/);
});

test("packaged extension keeps user-facing docs linked from README", async () => {
  const vscodeIgnore = await readProjectFile(".vscodeignore");

  assert.doesNotMatch(vscodeIgnore, /^docs$/m);
  assert.doesNotMatch(vscodeIgnore, /^docs\/\*\*$/m);
  assert.match(vscodeIgnore, /^docs\/PROJECT_CHECKPOINT_GUIDE\.md$/m);
  assert.match(vscodeIgnore, /^docs\/SESSION_SUMMARY\.md$/m);
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
