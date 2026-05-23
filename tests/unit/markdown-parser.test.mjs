import assert from "node:assert/strict";
import test from "node:test";
import { importTypeScriptModule } from "./helpers/build-module.mjs";

test("parseMarkdownToStructure returns the original markdown", async () => {
  const { parseMarkdownToStructure } = await importTypeScriptModule(
    "src/utils/markdown-parser.ts",
  );
  const markdown = "# Title\n\nBody text\n\n## Next";

  const result = await parseMarkdownToStructure(markdown);

  assert.equal(result.markdown, markdown);
});

test("parseMarkdownToStructure extracts ATX headings from levels 1 through 6", async () => {
  const { parseMarkdownToStructure } = await importTypeScriptModule(
    "src/utils/markdown-parser.ts",
  );
  const markdown = [
    "# H1",
    "## H2",
    "### H3",
    "#### H4",
    "##### H5",
    "###### H6",
  ].join("\n");

  const result = await parseMarkdownToStructure(markdown);

  assert.deepEqual(result.headers, ["H1", "H2", "H3", "H4", "H5", "H6"]);
});

test("parseMarkdownToStructure ignores hash-prefixed text without heading spacing", async () => {
  const { parseMarkdownToStructure } = await importTypeScriptModule(
    "src/utils/markdown-parser.ts",
  );
  const markdown = [
    "# Real heading",
    "###Not a heading",
    "plain # text",
  ].join("\n");

  const result = await parseMarkdownToStructure(markdown);

  assert.deepEqual(result.headers, ["Real heading"]);
});
