import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { importTypeScriptModule, repoRoot } from "./helpers/build-module.mjs";

const COVERED_SETTINGS = [
  "mdEditor.theme",
  "mdEditor.attachments.locationMode",
  "mdEditor.attachments.folderName",
  "mdEditor.attachments.path",
  "mdEditor.attachments.alwaysUseOriginalFilename",
  "mdEditor.attachments.alwaysConfirmNameAndPath",
  "mdEditor.attachments.askBeforeDeletingFiles",
  "mdEditor.attachments.generatedNameDigits",
  "mdEditor.attachments.trash.enabled",
  "mdEditor.attachments.trash.folderName",
  "mdEditor.attachments.trash.preserveOriginalPath",
  "mdEditor.attachments.trash.writeIndex",
  "mdEditor.tables.floatingToolbar",
  "mdEditor.tables.contextMenu",
  "mdEditor.tables.milkdownControls",
  "mdEditor.tables.slashMenu",
  "mdEditor.tables.defaultRows",
  "mdEditor.tables.defaultColumns",
  "mdEditor.tables.insertBehavior",
  "mdEditor.codeBlocks.alwaysShowLanguage",
  "mdEditor.codeBlocks.alwaysShowCopyButton",
  "mdEditor.dateTime.dateFormat",
  "mdEditor.dateTime.timeFormat",
  "mdEditor.dateTime.lastUpdatedTemplate",
  "mdEditor.dateTime.historyEntryTemplate",
  "mdEditor.dateTime.customTemplate",
  "mdEditor.dateTime.inlineSlashShortcuts",
];

async function readManifest() {
  return JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
}

function getConfigurationProperties(manifest) {
  const configuration = manifest.contributes.configuration;
  const sections = Array.isArray(configuration) ? configuration : [configuration];

  return Object.assign(
    {},
    ...sections.map((section) => section.properties ?? {}),
  );
}

async function loadEditorSettingsHelpers() {
  return importTypeScriptModule("src/utils/editor-settings.ts");
}

async function loadTrashHelpers() {
  return importTypeScriptModule("src/utils/attachment-trash.ts");
}

test("all contributed settings are included in compatibility coverage", async () => {
  const manifest = await readManifest();
  const keys = Object.keys(getConfigurationProperties(manifest)).sort();

  assert.deepEqual(keys, [...COVERED_SETTINGS].sort());
});

test("all setting defaults are schema-valid", async () => {
  const manifest = await readManifest();
  const properties = getConfigurationProperties(manifest);

  for (const [key, schema] of Object.entries(properties)) {
    assert.ok("default" in schema, `${key} is missing a default`);
    assert.equal(
      typeof schema.markdownDescription,
      "string",
      `${key} is missing markdownDescription`,
    );
    assert.notEqual(schema.markdownDescription.trim(), "", `${key} has an empty description`);

    if (schema.type === "boolean") {
      assert.equal(typeof schema.default, "boolean", `${key} default must be boolean`);
    } else if (schema.type === "number") {
      assert.equal(typeof schema.default, "number", `${key} default must be number`);
      if (typeof schema.minimum === "number") {
        assert.ok(schema.default >= schema.minimum, `${key} default below minimum`);
      }
      if (typeof schema.maximum === "number") {
        assert.ok(schema.default <= schema.maximum, `${key} default above maximum`);
      }
    } else if (schema.type === "string") {
      assert.equal(typeof schema.default, "string", `${key} default must be string`);
      if (schema.enum) {
        assert.ok(schema.enum.includes(schema.default), `${key} default not in enum`);
        if (schema.enumDescriptions || schema.markdownEnumDescriptions) {
          const descriptions = schema.enumDescriptions ?? schema.markdownEnumDescriptions;
          assert.equal(
            descriptions.length,
            schema.enum.length,
            `${key} enum descriptions length must match enum length`,
          );
        }
        if (schema.enumItemLabels) {
          assert.equal(
            schema.enumItemLabels.length,
            schema.enum.length,
            `${key} enumItemLabels length must match enum length`,
          );
        }
      }
    } else {
      assert.fail(`${key} has untested setting type: ${schema.type}`);
    }
  }
});

test("finite setting combinations do not contradict attachment trash behavior", async () => {
  const manifest = await readManifest();
  const properties = getConfigurationProperties(manifest);
  const {
    normalizeTrashRootPath,
    shouldOfferAttachmentTrash,
    shouldWriteAttachmentTrashIndex,
  } = await loadTrashHelpers();

  const booleanKeys = Object.entries(properties)
    .filter(([, schema]) => schema.type === "boolean")
    .map(([key]) => key);
  const enumKeys = Object.entries(properties)
    .filter(([, schema]) => Array.isArray(schema.enum))
    .map(([key]) => key);
  const finiteKeys = [...enumKeys, ...booleanKeys];
  const finiteValues = Object.fromEntries(
    finiteKeys.map((key) => [
      key,
      properties[key].enum ?? [false, true],
    ]),
  );

  let checked = 0;
  for (const combo of cartesian(finiteKeys, finiteValues)) {
    checked += 1;
    const trashSettings = {
      enabled: combo["mdEditor.attachments.trash.enabled"],
      folderName: ".attachments-trash",
      preserveOriginalPath:
        combo["mdEditor.attachments.trash.preserveOriginalPath"],
      writeIndex: combo["mdEditor.attachments.trash.writeIndex"],
    };

    assert.equal(
      normalizeTrashRootPath(trashSettings.folderName),
      ".attachments-trash",
    );
    assert.equal(
      shouldOfferAttachmentTrash(trashSettings, "file"),
      trashSettings.enabled,
      JSON.stringify(combo),
    );
    assert.equal(
      shouldOfferAttachmentTrash(trashSettings, "https"),
      false,
      JSON.stringify(combo),
    );
    assert.equal(
      shouldWriteAttachmentTrashIndex(trashSettings),
      trashSettings.enabled && trashSettings.writeIndex,
      JSON.stringify(combo),
    );
  }

  assert.equal(checked, 262144);
});

test("editor setting normalizers handle boundary values and invalid combinations", async () => {
  const {
    DEFAULT_CODE_BLOCK_SETTINGS,
    DEFAULT_DATE_TIME_SETTINGS,
    DEFAULT_TABLE_SETTINGS,
    normalizeCodeBlockSettings,
    normalizeDateTimeSettings,
    normalizeTableSettings,
    themeClassForSetting,
  } = await loadEditorSettingsHelpers();

  assert.equal(themeClassForSetting("vscode-light"), "theme-light");
  assert.equal(themeClassForSetting("vscode-high-contrast"), "theme-high-contrast");
  assert.equal(themeClassForSetting("default"), "theme-dark");
  assert.equal(themeClassForSetting("surprise"), "theme-dark");

  assert.deepEqual(normalizeDateTimeSettings({}), DEFAULT_DATE_TIME_SETTINGS);
  assert.equal(
    normalizeDateTimeSettings({ dateFormat: "dd/MM/yyyy" }).dateFormat,
    "dd/MM/yyyy",
  );

  assert.deepEqual(normalizeCodeBlockSettings({}), DEFAULT_CODE_BLOCK_SETTINGS);
  assert.equal(
    normalizeCodeBlockSettings({ alwaysShowCopyButton: false }).alwaysShowCopyButton,
    false,
  );

  assert.deepEqual(normalizeTableSettings({}), DEFAULT_TABLE_SETTINGS);
  assert.equal(normalizeTableSettings({ defaultRows: -10 }).defaultRows, 1);
  assert.equal(normalizeTableSettings({ defaultRows: 999 }).defaultRows, 50);
  assert.equal(normalizeTableSettings({ defaultRows: 3.9 }).defaultRows, 3);
  assert.equal(normalizeTableSettings({ defaultRows: Number.NaN }).defaultRows, 1);
  assert.equal(normalizeTableSettings({ defaultColumns: -10 }).defaultColumns, 1);
  assert.equal(normalizeTableSettings({ defaultColumns: 999 }).defaultColumns, 20);
  assert.equal(
    normalizeTableSettings({ insertBehavior: "askEveryTime" }).insertBehavior,
    "askEveryTime",
  );
  assert.equal(
    normalizeTableSettings({ insertBehavior: "invalid" }).insertBehavior,
    "useDefaultSize",
  );
});

function* cartesian(keys, finiteValues, index = 0, current = {}) {
  if (index >= keys.length) {
    yield current;
    return;
  }

  const key = keys[index];
  for (const value of finiteValues[key]) {
    yield* cartesian(keys, finiteValues, index + 1, {
      ...current,
      [key]: value,
    });
  }
}
