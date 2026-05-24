import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers/build-module.mjs";

async function readJson(...parts) {
  const text = await readFile(path.join(repoRoot, ...parts), "utf8");
  return JSON.parse(text);
}

async function readText(...parts) {
  return readFile(path.join(repoRoot, ...parts), "utf8");
}

async function readFilesRecursive(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return readFilesRecursive(fullPath);
      }
      return [fullPath];
    }),
  );

  return files.flat();
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

function getConfigurationSectionBySetting(manifest) {
  const bySetting = new Map();

  for (const section of getConfigurationSections(manifest)) {
    for (const settingId of Object.keys(section.properties ?? {})) {
      bySetting.set(settingId, section);
    }
  }

  return bySetting;
}

test("settings taxonomy covers every contributed mdEditor setting", async () => {
  const manifest = await readJson("package.json");
  const taxonomy = await readJson("docs", "SETTINGS_TAXONOMY.json");
  const properties = getConfigurationProperties(manifest);
  const contributedSettings = Object.keys(properties).sort();
  const taxonomySettings = Object.keys(taxonomy.settings).sort();

  assert.deepEqual(taxonomySettings, contributedSettings);
});

test("settings taxonomy entries are complete and match package defaults", async () => {
  const manifest = await readJson("package.json");
  const taxonomy = await readJson("docs", "SETTINGS_TAXONOMY.json");
  const properties = getConfigurationProperties(manifest);
  const sectionsBySetting = getConfigurationSectionBySetting(manifest);
  const allowedCategories = new Set(taxonomy.allowedCategories);

  for (const [settingId, metadata] of Object.entries(taxonomy.settings)) {
    const schema = properties[settingId];
    const section = sectionsBySetting.get(settingId);

    assert.ok(allowedCategories.has(metadata.category), `${settingId} has unknown category`);
    assert.equal(section.title, `MalkDown Editor: ${metadata.category}`);
    assert.equal(schema.order, metadata.order, `${settingId} order mismatch`);
    assert.deepEqual(schema.default, metadata.default, `${settingId} default mismatch`);

    for (const field of [
      "subgroup",
      "label",
      "shortDescription",
      "helpText",
      "scope",
      "testCoverage",
      "compatibilityNotes",
    ]) {
      assert.equal(typeof metadata[field], "string", `${settingId} missing ${field}`);
      assert.ok(metadata[field].trim().length > 0, `${settingId} has empty ${field}`);
    }

    assert.ok(Array.isArray(metadata.relatedUiLabels), `${settingId} missing relatedUiLabels`);
    assert.ok(metadata.relatedUiLabels.length > 0, `${settingId} has no related UI labels`);
    assert.equal(
      typeof schema.markdownDescription,
      "string",
      `${settingId} missing markdownDescription`,
    );
    assert.doesNotMatch(
      schema.markdownDescription,
      /image reference/i,
      `${settingId} should use attachment wording unless image-specific`,
    );
  }
});

test("settings documentation and root README link to the detailed docs", async () => {
  const manifest = await readJson("package.json");
  const properties = getConfigurationProperties(manifest);
  const settingsDoc = await readText("docs", "SETTINGS.md");
  const standardsDoc = await readText("docs", "SETTINGS_STANDARDS.md");
  const userGuide = await readText("docs", "USER_GUIDE.md");
  const readme = await readText("README.md");

  for (const settingId of Object.keys(properties)) {
    assert.match(settingsDoc, new RegExp(settingId.replaceAll(".", "\\.")));
  }

  for (const required of [
    "docs/USER_GUIDE.md",
    "docs/SETTINGS.md",
    "docs/SETTINGS_STANDARDS.md",
    "docs/COMMONMARK.md",
  ]) {
    assert.match(readme, new RegExp(required.replaceAll(".", "\\.")));
  }

  assert.match(standardsDoc, /Every `mdEditor\.\*` setting/);
  assert.match(standardsDoc, /Use the same words in settings, commands, dialogs, menus, docs, and tests/);
  assert.match(userGuide, /Cancel/);
  assert.match(userGuide, /Remove from Page/);
  assert.match(userGuide, /Move to Trash/);
  assert.match(userGuide, /Delete Everywhere/);
});

test("date/time command labels are represented in settings taxonomy UI labels", async () => {
  const manifest = await readJson("package.json");
  const taxonomy = await readJson("docs", "SETTINGS_TAXONOMY.json");
  const dateTimeLabels = new Set(
    Object.values(taxonomy.settings)
      .filter((entry) => entry.category === "Date & Time")
      .flatMap((entry) => entry.relatedUiLabels),
  );

  for (const commandTitle of [
    "Insert Today's Date",
    "Insert Current Time",
    "Insert Last Updated",
    "Update Last Updated Line",
    "Insert History Entry",
    "Insert Custom Date/Time Snippet",
  ]) {
    assert.ok(dateTimeLabels.has(commandTitle), `missing taxonomy label: ${commandTitle}`);
    assert.ok(
      manifest.contributes.commands.some((command) => command.title === commandTitle),
      `missing command label: ${commandTitle}`,
    );
  }
});

test("every setting is read by source code or routed through shared defaults", async () => {
  const manifest = await readJson("package.json");
  const properties = getConfigurationProperties(manifest);
  const sourceFiles = await readFilesRecursive(path.join(repoRoot, "src"));
  const sourceText = (
    await Promise.all(
      sourceFiles
        .filter((file) => file.endsWith(".ts"))
        .map((file) => readFile(file, "utf8")),
    )
  ).join("\n");

  for (const settingId of Object.keys(properties)) {
    const lookupKey = settingId.replace(/^mdEditor\./, "");
    const simpleKey = lookupKey.split(".").at(-1);

    assert.ok(
      sourceText.includes(`"${lookupKey}"`) ||
        sourceText.includes(`'${lookupKey}'`) ||
        sourceText.includes(`"${simpleKey}"`) ||
        sourceText.includes(`'${simpleKey}'`),
      `${settingId} is contributed but no matching source-side read/default was found`,
    );
  }
});

test("user guide reflects contributed command titles and settings categories", async () => {
  const manifest = await readJson("package.json");
  const userGuide = await readText("docs", "USER_GUIDE.md");
  const configurationSections = getConfigurationSections(manifest);

  for (const command of manifest.contributes.commands) {
    assert.match(
      userGuide,
      new RegExp(command.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `USER_GUIDE.md should mention command title: ${command.title}`,
    );
  }

  for (const section of configurationSections) {
    assert.match(
      userGuide,
      new RegExp(section.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `USER_GUIDE.md should mention settings category: ${section.title}`,
    );
  }
});

test("attachment trash folder wording describes one workspace-root trash folder", async () => {
  const manifest = await readJson("package.json");
  const taxonomy = await readJson("docs", "SETTINGS_TAXONOMY.json");
  const settingsDoc = await readText("docs", "SETTINGS.md");
  const properties = getConfigurationProperties(manifest);
  const schema = properties["mdEditor.attachments.trash.folderName"];
  const metadata = taxonomy.settings["mdEditor.attachments.trash.folderName"];

  assert.equal(metadata.label, "Workspace Trash Folder");
  assert.match(schema.markdownDescription, /Workspace-root relative folder/);
  assert.match(schema.markdownDescription, /one master trash folder/);
  assert.match(settingsDoc, /workspace-root relative attachment trash folder/);
  assert.match(settingsDoc, /one master trash folder/);
  assert.match(settingsDoc, /Absolute paths and paths outside the workspace are not supported/);
});
