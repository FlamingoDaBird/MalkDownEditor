import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers/build-module.mjs";

const fixturePath = path.join(repoRoot, "tests", "fixtures", "test.md");
const showcasePath = path.join(repoRoot, "docs", "SHOWCASE.md");
const fixtureDir = path.dirname(fixturePath);
const showcaseDir = path.dirname(showcasePath);

async function readFixture() {
  return readFile(fixturePath, "utf8");
}

function localImageSources(markdown) {
  const sources = [];
  const imagePattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const match of markdown.matchAll(imagePattern)) {
    const source = match[1];
    if (/^(?:https?:|data:|vscode-resource:|file:)/i.test(source)) continue;
    sources.push(source);
  }

  return sources;
}

test("showcase fixture keeps the full smoke-test sections", async () => {
  const markdown = await readFixture();

  for (const section of [
    "## 1. WYSIWYG Editing",
    "## 7. Tables",
    "## 8. Math and LaTeX",
    "## 9. Code Blocks",
    "## 10. Attachments",
    "## 11. Image Lightbox",
  ]) {
    assert.match(markdown, new RegExp(section.replaceAll(".", "\\.")));
  }
});

test("showcase fixture local image references point at files on disk", async () => {
  const markdown = await readFixture();
  const sources = localImageSources(markdown);

  assert.ok(sources.length > 0, "expected at least one local image fixture");

  for (const source of sources) {
    const imagePath = path.resolve(fixtureDir, source);
    await access(imagePath);
  }
});

test("showcase source local image references point at files on disk", async () => {
  const markdown = await readFile(showcasePath, "utf8");
  const sources = localImageSources(markdown);

  assert.ok(sources.length > 0, "expected at least one local image fixture");

  for (const source of sources) {
    const imagePath = path.resolve(showcaseDir, source);
    await access(imagePath);
  }
});

test("showcase fixture includes the image block that exercises hover controls", async () => {
  const markdown = await readFixture();

  assert.match(
    markdown,
    /!\[Flamingo loves shrimp]\(\.attachments\/showcase-000000001\.jpg\)/,
  );
});

test("showcase source and smoke fixture stay synchronized", async () => {
  const showcase = await readFile(showcasePath, "utf8");
  const fixture = await readFixture();

  assert.equal(fixture, showcase);
});
