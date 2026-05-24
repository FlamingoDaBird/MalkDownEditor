import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { importTypeScriptModule, repoRoot } from "./helpers/build-module.mjs";

async function readProjectFile(...parts) {
  return readFile(path.join(repoRoot, ...parts), "utf8");
}

function configurationProperties(manifest) {
  const configuration = manifest.contributes.configuration;
  const sections = Array.isArray(configuration) ? configuration : [configuration];

  return Object.assign(
    {},
    ...sections.map((section) => section.properties ?? {}),
  );
}

test("CommonMark policy document records portable Markdown boundaries", async () => {
  const commonmark = await readProjectFile("docs", "COMMONMARK.md");

  for (const phrase of [
    "CommonMark-style Markdown",
    "GitHub Flavored Markdown tables",
    "relative paths",
    "HTML comments",
    "round-trip tests",
  ]) {
    assert.match(commonmark, new RegExp(phrase));
  }
});

test("lightweight Markdown parser ignores headings inside fenced code blocks", async () => {
  const { parseMarkdownToStructure } = await importTypeScriptModule(
    "src/utils/markdown-parser.ts",
  );
  const markdown = [
    "# Visible",
    "",
    "```markdown",
    "# Not a heading",
    "```",
    "",
    "~~~",
    "## Also not a heading",
    "~~~",
    "",
    "## Visible Too ##",
  ].join("\n");

  const result = await parseMarkdownToStructure(markdown);

  assert.equal(result.markdown, markdown);
  assert.deepEqual(result.headers, ["Visible", "Visible Too"]);
});

test("lightweight Markdown parser follows CommonMark ATX heading spacing", async () => {
  const { parseMarkdownToStructure } = await importTypeScriptModule(
    "src/utils/markdown-parser.ts",
  );
  const markdown = [
    "   ### Leading spaces are allowed",
    "####No space means text",
    "#### Valid heading ####",
    "    # Indented code is not an ATX heading",
  ].join("\n");

  const result = await parseMarkdownToStructure(markdown);

  assert.deepEqual(result.headers, [
    "Leading spaces are allowed",
    "Valid heading",
  ]);
});

test("lightweight Markdown parser respects fenced code marker matching", async () => {
  const { parseMarkdownToStructure } = await importTypeScriptModule(
    "src/utils/markdown-parser.ts",
  );
  const markdown = [
    "# Start",
    "````",
    "```",
    "## Still code because the fence is shorter",
    "````",
    "~~~",
    "```",
    "### Still code because the marker differs",
    "~~~",
    "## End",
  ].join("\n");

  const result = await parseMarkdownToStructure(markdown);

  assert.deepEqual(result.headers, ["Start", "End"]);
});

test("showcase fixture uses portable local image links", async () => {
  const fixture = await readProjectFile("tests", "fixtures", "test.md");
  const imageLinks = [...fixture.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)].map(
    (match) => match[1],
  );

  assert.ok(imageLinks.length > 0, "expected at least one image link");

  for (const src of imageLinks) {
    assert.match(src, /^\.attachments\//, `${src} should be relative`);
    assert.doesNotMatch(src, /^\//, `${src} should not be absolute`);
    assert.doesNotMatch(src, /^file:/i, `${src} should not use file:`);
    assert.doesNotMatch(src, /\\/g, `${src} should use Markdown forward slashes`);
  }
});

test("showcase fixture keeps GFM table rows structurally aligned", async () => {
  const fixture = await readProjectFile("tests", "fixtures", "test.md");
  const lines = fixture.split("\n");
  const tableBlocks = [];
  let currentBlock = [];

  for (const line of lines) {
    if (/^\|.*\|$/.test(line.trim())) {
      currentBlock.push(line.trim());
    } else if (currentBlock.length > 0) {
      tableBlocks.push(currentBlock);
      currentBlock = [];
    }
  }

  if (currentBlock.length > 0) {
    tableBlocks.push(currentBlock);
  }

  assert.ok(tableBlocks.length > 0, "expected at least one GFM table");

  for (const block of tableBlocks) {
    assert.ok(block.length >= 2, `table block should include a separator: ${block.join("\\n")}`);
    assert.match(block[1], /^\|(?:\s*:?-{3,}:?\s*\|)+$/);

    const pipeCount = (block[0].match(/\|/g) ?? []).length;
    for (const row of block) {
      assert.equal(
        (row.match(/\|/g) ?? []).length,
        pipeCount,
        `table row has mismatched column count: ${row}`,
      );
    }
  }
});

test("default generated text settings stay plain Markdown", async () => {
  const manifest = JSON.parse(await readProjectFile("package.json"));
  const properties = configurationProperties(manifest);
  const generatedTextSettings = [
    "mdEditor.dateTime.lastUpdatedTemplate",
    "mdEditor.dateTime.historyEntryTemplate",
    "mdEditor.dateTime.customTemplate",
  ];

  for (const settingId of generatedTextSettings) {
    const value = properties[settingId].default;
    assert.equal(typeof value, "string");
    assert.doesNotMatch(value, /<\/?[a-z][\s\S]*>/i, `${settingId} should not default to HTML`);
    assert.doesNotMatch(value, /\r/, `${settingId} should not contain CR line endings`);
    assert.match(
      value,
      /\{date\}|\{time\}|\{datetime\}/,
      `${settingId} should include at least one supported placeholder`,
    );
  }
});
