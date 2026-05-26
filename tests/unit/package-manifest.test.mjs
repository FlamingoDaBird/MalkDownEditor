import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers/build-module.mjs";

async function readPackageJson() {
  const text = await readFile(path.join(repoRoot, "package.json"), "utf8");
  return JSON.parse(text);
}

function getConfigurationSections(manifest) {
  const configuration = manifest.contributes.configuration;
  return Array.isArray(configuration) ? configuration : [configuration];
}

function getConfigurationProperties(manifest) {
  return Object.assign(
    {},
    ...getConfigurationSections(manifest).map((section) => section.properties ?? {}),
  );
}

test("package exposes automated test and verification scripts", async () => {
  const manifest = await readPackageJson();

  for (const script of [
    "test",
    "test:unit",
    "test:security",
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
  assert.match(manifest.scripts.verify, /test:security/);
  assert.match(manifest.scripts.test, /test:security/);
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

test("MalkDown Editor custom editor remains opt-in for markdown files", async () => {
  const manifest = await readPackageJson();
  const customEditor = manifest.contributes.customEditors.find(
    (editor) => editor.viewType === "mdeditor.markdownEditor",
  );

  assert.ok(customEditor, "missing mdeditor.markdownEditor contribution");
  assert.equal(customEditor.priority, "option");
  assert.deepEqual(customEditor.selector, [{ filenamePattern: "*.md" }]);
});

test("package exposes MalkDown Editor branding and marketplace icon", async () => {
  const manifest = await readPackageJson();

  assert.equal(manifest.name, "md-editor");
  assert.equal(manifest.displayName, "MalkDown Editor");
  assert.equal(manifest.icon, "media/icon.png");

  for (const asset of [
    "media/editor-title-icon-dark.svg",
    "media/editor-title-icon-light.svg",
    "media/icon.png",
    "media/icon.svg",
    "media/logo-dark.png",
    "media/logo-dark.svg",
    "media/logo-light.png",
    "media/logo-light.svg",
    "media/logo.png",
    "media/logo.svg",
  ]) {
    const contents = await readFile(path.join(repoRoot, asset));
    assert.ok(contents.length > 0, `missing or empty branding asset: ${asset}`);
  }
});

test("package exposes attachment trash settings", async () => {
  const manifest = await readPackageJson();
  const properties = getConfigurationProperties(manifest);

  assert.equal(properties["mdEditor.attachments.trash.enabled"].default, true);
  assert.equal(
    properties["mdEditor.attachments.trash.folderName"].default,
    ".attachments-trash",
  );
  assert.equal(
    properties["mdEditor.attachments.trash.preserveOriginalPath"].default,
    true,
  );
  assert.equal(properties["mdEditor.attachments.trash.writeIndex"].default, true);
});

test("package groups MalkDown settings into ordered Settings UI categories", async () => {
  const manifest = await readPackageJson();
  const sections = getConfigurationSections(manifest);
  const titles = sections.map((section) => section.title);

  assert.deepEqual(titles, [
    "MalkDown Editor: Appearance",
    "MalkDown Editor: Attachments",
    "MalkDown Editor: Tables",
    "MalkDown Editor: Code Blocks",
    "MalkDown Editor: Date & Time",
  ]);

  for (const [index, section] of sections.entries()) {
    assert.equal(section.order, (index + 1) * 10);
    for (const [settingId, schema] of Object.entries(section.properties ?? {})) {
      assert.match(settingId, /^mdEditor\./);
      assert.equal(typeof schema.order, "number", `${settingId} missing order`);
      assert.equal(
        typeof schema.markdownDescription,
        "string",
        `${settingId} missing markdownDescription`,
      );
    }
  }
});

test("editor title command uses the custom MalkDown icon", async () => {
  const manifest = await readPackageJson();
  const openCommand = manifest.contributes.commands.find(
    (command) => command.command === "mdeditor.open",
  );

  assert.deepEqual(openCommand.icon, {
    light: "media/editor-title-icon-dark.svg",
    dark: "media/editor-title-icon-light.svg",
  });
});

test("editor title icons fill the 16px canvas without tiny dot details", async () => {
  for (const asset of [
    "media/editor-title-icon-dark.svg",
    "media/editor-title-icon-light.svg",
  ]) {
    const source = await readFile(path.join(repoRoot, asset), "utf8");
    assert.match(source, /<rect width="16" height="16"/, `${asset} should fill the canvas`);
    assert.doesNotMatch(source, /<circle\b/, `${asset} should not include tiny top dots`);
  }
});

test("README logos include the discrete Vitamin R tagline", async () => {
  for (const asset of [
    "media/logo.svg",
    "media/logo-light.svg",
    "media/logo-dark.svg",
  ]) {
    const source = await readFile(path.join(repoRoot, asset), "utf8");
    assert.match(source, /Now with vitamin R/i, `${asset} is missing tagline`);
  }
});

test("README logos include the CommonMark compliance note", async () => {
  for (const asset of [
    "media/logo.svg",
    "media/logo-light.svg",
    "media/logo-dark.svg",
  ]) {
    const source = await readFile(path.join(repoRoot, asset), "utf8");
    assert.match(source, /CommonMark compliant/, `${asset} is missing CommonMark note`);
  }
});

test("carton logos use M-arrow marks instead of package MALK text", async () => {
  for (const asset of [
    "media/icon.svg",
    "media/logo.svg",
    "media/logo-light.svg",
    "media/logo-dark.svg",
  ]) {
    const source = await readFile(path.join(repoRoot, asset), "utf8");
    assert.doesNotMatch(source, />MALK</, `${asset} should not render MALK package text`);
  }
});

test("reference-only branding images stay out of packaged VSIX", async () => {
  const vscodeIgnore = await readFile(path.join(repoRoot, ".vscodeignore"), "utf8");

  assert.match(vscodeIgnore, /^media\/malk\.jpg$/m);
  assert.match(vscodeIgnore, /^media\/malk2\.png$/m);
  assert.match(vscodeIgnore, /^media\/milk-box\.jpg$/m);
  assert.match(vscodeIgnore, /^media\/milk-carton\*$/m);
});
