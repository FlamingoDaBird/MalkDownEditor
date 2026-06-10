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

test("image actions include above-image toolbar and distinct copy buttons", async () => {
  const source = await readWebviewSource();
  const css = await readFile(
    path.join(repoRoot, "src", "webview", "styles", "milkdown", "image-block.css"),
    "utf8",
  );

  assert.match(source, /md-image-copy-attachment-button/);
  assert.match(source, /Copy attachment/);
  assert.match(source, /md-image-copy-file-path-button/);
  assert.match(source, /Copy file path/);
  assert.match(source, /function copyAttachmentImage/);
  assert.match(source, /new ClipboardItem/);
  assert.match(source, /function applyImageControlLabels/);
  assert.match(source, /Edit image description/);
  assert.match(source, /function focusImageCaptionInput/);
  assert.match(source, /imageBlock\.removeAttribute\("title"\)/);
  assert.match(source, /imageBlock\.setAttribute\("aria-label", title\)/);
  assert.doesNotMatch(source, /imageBlock\.setAttribute\("title", title\)/);
  assert.match(css, /left: 50%/);
  assert.match(css, /bottom: calc\(100% - 1px\)/);
  assert.match(css, /transform: translateX\(-50%\)/);
  assert.match(css, /var\(--vscode-panel-background/);
  assert.match(css, /operation:focus-within/);
});

test("image resize uses toolbar controls instead of the drag handle", async () => {
  const source = await readWebviewSource();
  const css = await readFile(
    path.join(repoRoot, "src", "webview", "styles", "milkdown", "image-block.css"),
    "utf8",
  );

  for (const className of [
    "md-image-resize-smaller-button",
    "md-image-resize-larger-button",
    "md-image-resize-reset-button",
  ]) {
    assert.match(source, new RegExp(className));
    assert.match(css, new RegExp(className));
  }

  assert.match(source, /setNodeAttribute\(position, "ratio", nextRatio\)/);
  assert.match(source, /function resetImageResizeRatio/);
  assert.match(source, /setImageResizeRatio\(imageBlock, 1\)/);
  assert.match(css, /\.image-resize-handle \{\s+display: none;/);
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

test("mermaid preview uses the official renderer with strict security and fenced-code detection", async () => {
  const source = await readWebviewSource();
  const css = await readFile(
    path.join(repoRoot, "src", "webview", "styles", "milkdown", "mermaid.css"),
    "utf8",
  );

  assert.match(source, /import mermaid from "mermaid"/);
  assert.match(source, /LanguageDescription\.of\(\{/);
  assert.match(source, /name: "Mermaid"/);
  assert.match(source, /const codeBlockLanguages = \[/);
  assert.match(source, /renderPreview: \(language, content, applyPreview\) => \{/);
  assert.match(source, /language\.trim\(\)\.toLowerCase\(\) !== "mermaid"/);
  assert.match(source, /mermaid\.initialize\(\{/);
  assert.match(source, /securityLevel: "strict"/);
  assert.match(source, /suppressErrorRendering: true/);
  assert.match(source, /deterministicIds: true/);
  assert.match(source, /htmlLabels: false/);
  assert.match(source, /useMaxWidth: true/);
  assert.match(source, /mode: mermaid\.render/);
  assert.match(source, /MERMAID_RENDER_DEBOUNCE_MS = 650/);
  assert.match(source, /MERMAID_RENDER_TIMEOUT_MS = 5000/);
  assert.match(source, /MERMAID_SVG_CACHE_LIMIT = 30/);
  assert.match(source, /const mermaidSvgCache = new Map<string, string>\(\)/);
  assert.match(source, /const mermaidPreviewSessions = new WeakMap/);
  assert.match(source, /function getMermaidPreviewSession/);
  assert.match(source, /Waiting for typing to pause before rendering Mermaid diagram\.\.\./);
  assert.match(source, /window\.clearTimeout\(session\.pendingTimer\)/);
  assert.match(source, /window\.setTimeout\(\(\) => \{/);
  assert.match(source, /Number\(renderToken\) !== session\.latestRenderToken/);
  assert.match(source, /rememberMermaidSvg\(cacheKey, svg\)/);
  assert.match(source, /mermaid\.render\(renderId, normalizedCode, sandbox\)/);
  assert.match(source, /Mermaid render timed out\./);
  assert.match(source, /parseMermaidSvg\(svg\)/);
  assert.match(source, /Rendering Mermaid diagram\.\.\./);
  assert.match(source, /Mermaid could not render this fenced code block\./);
  assert.match(source, /Mermaid debug/);
  assert.match(source, /svg chars:/);
  assert.match(source, /foreignObject nodes:/);
  assert.match(source, /bbox:/);
  assert.doesNotMatch(source, /removeAttribute\("height"\)/);
  assert.match(source, /svgElement\.style\.setProperty\("height", "auto"\)/);
  assert.match(css, /\.md-mermaid-preview/);
  assert.match(css, /\.md-mermaid-preview__surface/);
  assert.match(css, /\.md-mermaid-preview__error/);
  assert.match(css, /\.md-mermaid-preview__debug/);
  assert.match(css, /user-select: text/);
});
