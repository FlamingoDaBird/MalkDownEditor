import assert from "node:assert/strict";
import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { importTypeScriptModule, repoRoot } from "./helpers/build-module.mjs";

async function loadTrashHelpers() {
  return importTypeScriptModule("src/utils/attachment-trash.ts");
}

function sandboxPath(...parts) {
  return path.join(repoRoot, "tests", ".tmp", "attachment-trash", ...parts);
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function sandboxFileSystem(root) {
  return {
    basename: (filePath) => path.basename(filePath),
    dirname: (filePath) => path.dirname(filePath),
    join: (base, relativePath) => path.join(base, ...relativePath.split("/")),
    exists,
    createDirectory: (directory) => mkdir(directory, { recursive: true }),
    rename,
    readFile: async (filePath) => {
      try {
        return await readFile(filePath, "utf8");
      } catch {
        return undefined;
      }
    },
    writeFile: async (filePath, contents) => {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, contents, "utf8");
    },
    toDisplayPath: (filePath) =>
      path.relative(root, filePath).split(path.sep).join("/"),
    toKey: (filePath) => filePath,
  };
}

test("attachment trash move is sandboxed, collision-safe, and indexed", async () => {
  const { executeAttachmentTrashMove } = await loadTrashHelpers();
  const root = sandboxPath("move-index");
  await rm(root, { recursive: true, force: true });

  const document = path.join(root, "docs", "test.md");
  const source = path.join(root, "docs", ".attachments", "image.png");
  const existingTrash = path.join(
    root,
    ".attachments-trash",
    "docs",
    ".attachments",
    "image.png",
  );
  await mkdir(path.dirname(source), { recursive: true });
  await mkdir(path.dirname(existingTrash), { recursive: true });
  await writeFile(source, "new-image", "utf8");
  await writeFile(existingTrash, "old-image", "utf8");

  const result = await executeAttachmentTrashMove({
    document,
    source,
    trashRoot: path.join(root, ".attachments-trash"),
    trashRelativePath: "docs/.attachments/image.png",
    writeIndex: true,
    now: () => new Date("2026-05-24T12:00:00.000Z"),
    fs: sandboxFileSystem(root),
  });

  const movedTrash = path.join(
    root,
    ".attachments-trash",
    "docs",
    ".attachments",
    "image-1.png",
  );
  assert.equal(result.trashPath, movedTrash);
  assert.equal(await exists(source), false);
  assert.equal(await readFile(existingTrash, "utf8"), "old-image");
  assert.equal(await readFile(movedTrash, "utf8"), "new-image");

  const index = JSON.parse(
    await readFile(path.join(root, ".attachments-trash", "index.json"), "utf8"),
  );
  assert.equal(index.version, 1);
  assert.equal(index.entries.length, 1);
  assert.deepEqual(index.entries[0], {
    trashedAt: "2026-05-24T12:00:00.000Z",
    documentPath: "docs/test.md",
    originalPath: "docs/.attachments/image.png",
    trashPath: ".attachments-trash/docs/.attachments/image-1.png",
    documentUri: document,
    originalUri: source,
    trashUri: movedTrash,
  });
});

test("attachment trash move can skip index writes", async () => {
  const { executeAttachmentTrashMove } = await loadTrashHelpers();
  const root = sandboxPath("move-no-index");
  await rm(root, { recursive: true, force: true });

  const document = path.join(root, "docs", "test.md");
  const source = path.join(root, "docs", ".attachments", "image.png");
  const trashRoot = path.join(root, ".attachments-trash");
  await mkdir(path.dirname(source), { recursive: true });
  await writeFile(source, "new-image", "utf8");

  await executeAttachmentTrashMove({
    document,
    source,
    trashRoot,
    trashRelativePath: "docs/.attachments/image.png",
    writeIndex: false,
    fs: sandboxFileSystem(root),
  });

  assert.equal(await exists(path.join(trashRoot, "index.json")), false);
  assert.equal(
    await readFile(
      path.join(trashRoot, "docs", ".attachments", "image.png"),
      "utf8",
    ),
    "new-image",
  );
});
