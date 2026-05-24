import assert from "node:assert/strict";
import test from "node:test";
import { importTypeScriptModule } from "./helpers/build-module.mjs";

async function loadTrashHelpers() {
  return importTypeScriptModule("src/utils/attachment-trash.ts");
}

test("attachment trash settings matrix has no contradictory offer/index states", async () => {
  const {
    shouldOfferAttachmentTrash,
    shouldWriteAttachmentTrashIndex,
  } = await loadTrashHelpers();

  const booleans = [false, true];
  const fileSchemes = ["file", "https", "vscode-resource"];

  for (const enabled of booleans) {
    for (const preserveOriginalPath of booleans) {
      for (const writeIndex of booleans) {
        for (const fileScheme of fileSchemes) {
          const settings = {
            enabled,
            folderName: ".attachments-trash",
            preserveOriginalPath,
            writeIndex,
          };

          assert.equal(
            shouldOfferAttachmentTrash(settings, fileScheme),
            enabled && fileScheme === "file",
            JSON.stringify({ settings, fileScheme }),
          );
          assert.equal(
            shouldWriteAttachmentTrashIndex(settings),
            enabled && writeIndex,
            JSON.stringify({ settings, fileScheme }),
          );
        }
      }
    }
  }
});

test("attachment trash folder setting stays workspace-relative and falls back safely", async () => {
  const {
    DEFAULT_ATTACHMENT_TRASH_FOLDER,
    normalizeTrashRootPath,
  } = await loadTrashHelpers();

  assert.equal(normalizeTrashRootPath(".attachments-trash"), ".attachments-trash");
  assert.equal(normalizeTrashRootPath("nested/trash"), "nested/trash");
  assert.equal(normalizeTrashRootPath("/absolute-looking"), "absolute-looking");
  assert.equal(normalizeTrashRootPath("../outside"), DEFAULT_ATTACHMENT_TRASH_FOLDER);
  assert.equal(normalizeTrashRootPath(""), DEFAULT_ATTACHMENT_TRASH_FOLDER);
});

test("attachment trash path preservation setting controls destination shape", async () => {
  const { buildTrashRelativePath } = await loadTrashHelpers();

  const base = {
    enabled: true,
    folderName: ".attachments-trash",
    writeIndex: true,
  };

  assert.equal(
    buildTrashRelativePath({
      settings: { ...base, preserveOriginalPath: true },
      workspaceRelativePath: "docs/.attachments/showcase.png",
      documentBaseName: "test.md",
      filename: "showcase.png",
    }),
    "docs/.attachments/showcase.png",
  );
  assert.equal(
    buildTrashRelativePath({
      settings: { ...base, preserveOriginalPath: false },
      workspaceRelativePath: "docs/.attachments/showcase.png",
      documentBaseName: "test.md",
      filename: "showcase.png",
    }),
    "showcase.png",
  );
  assert.equal(
    buildTrashRelativePath({
      settings: { ...base, preserveOriginalPath: true },
      documentBaseName: "My Journal.md",
      filename: "image.png",
    }),
    "my-journal/image.png",
  );
});

test("attachment trash sanitizes unsafe relative paths and increments collisions", async () => {
  const {
    sanitizeTrashRelativePath,
    uniqueTrashFilename,
  } = await loadTrashHelpers();

  assert.equal(
    sanitizeTrashRelativePath("../bad/<name>.png", "fallback.png"),
    "bad/-name-.png",
  );
  assert.equal(
    sanitizeTrashRelativePath("folder/white   space.png", "fallback.png"),
    "folder/white space.png",
  );

  const existing = new Set(["image.png", "image-1.png", "image-2.png"]);
  assert.equal(
    await uniqueTrashFilename("image.png", async (candidate) => existing.has(candidate)),
    "image-3.png",
  );
  assert.equal(
    await uniqueTrashFilename("fresh.png", async (candidate) => existing.has(candidate)),
    "fresh.png",
  );
});
