import * as path from "path";

export interface AttachmentTrashSettings {
  enabled: boolean;
  folderName: string;
  preserveOriginalPath: boolean;
  writeIndex: boolean;
}

export interface AttachmentTrashEntry {
  trashedAt: string;
  documentPath: string;
  originalPath: string;
  trashPath: string;
  documentUri: string;
  originalUri: string;
  trashUri: string;
}

export interface AttachmentTrashIndex {
  version: 1;
  entries: AttachmentTrashEntry[];
}

export interface AttachmentTrashFileSystem<TPath> {
  basename(path: TPath): string;
  dirname(path: TPath): TPath;
  join(base: TPath, relativePath: string): TPath;
  exists(path: TPath): Promise<boolean>;
  createDirectory(path: TPath): Promise<void>;
  rename(source: TPath, target: TPath): Promise<void>;
  readFile(path: TPath): Promise<string | undefined>;
  writeFile(path: TPath, contents: string): Promise<void>;
  toDisplayPath(path: TPath): string;
  toKey(path: TPath): string;
}

export interface ExecuteAttachmentTrashMoveOptions<TPath> {
  document: TPath;
  source: TPath;
  trashRoot: TPath;
  trashRelativePath: string;
  writeIndex: boolean;
  now?: () => Date;
  fs: AttachmentTrashFileSystem<TPath>;
}

export const DEFAULT_ATTACHMENT_TRASH_ENABLED = true;
export const DEFAULT_ATTACHMENT_TRASH_FOLDER = ".attachments-trash";
export const DEFAULT_ATTACHMENT_TRASH_PRESERVE_ORIGINAL_PATH = true;
export const DEFAULT_ATTACHMENT_TRASH_WRITE_INDEX = true;
export const ATTACHMENT_TRASH_INDEX_FILE = "index.json";

export function normalizeRelativePath(
  value: string,
  errorMessage = "Attachment path must stay inside the workspace.",
): string {
  const raw = value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!raw) return "";

  const normalized = path.posix.normalize(raw);
  if (normalized === ".") return "";
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(errorMessage);
  }

  return normalized;
}

export function normalizeTrashRootPath(
  value: string,
  fallback = DEFAULT_ATTACHMENT_TRASH_FOLDER,
): string {
  try {
    return normalizeRelativePath(value || fallback) || fallback;
  } catch {
    return fallback;
  }
}

export function shouldOfferAttachmentTrash(
  settings: AttachmentTrashSettings,
  fileScheme: string,
): boolean {
  return settings.enabled && fileScheme === "file";
}

export function shouldWriteAttachmentTrashIndex(
  settings: AttachmentTrashSettings,
): boolean {
  return settings.enabled && settings.writeIndex;
}

export function buildTrashRelativePath(options: {
  settings: AttachmentTrashSettings;
  workspaceRelativePath?: string;
  documentBaseName: string;
  filename: string;
}): string {
  const fallbackPath = `${slugify(options.documentBaseName, "document")}/${options.filename}`;
  const candidate = options.settings.preserveOriginalPath
    ? options.workspaceRelativePath || fallbackPath
    : options.filename;

  return sanitizeTrashRelativePath(candidate, options.filename);
}

export function sanitizeTrashRelativePath(value: string, fallback: string): string {
  const segments = value
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map((segment) => (
      segment
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .replace(/\s+/g, " ")
        .trim() || "_"
    ));

  return segments.join("/") || fallback;
}

export async function uniqueTrashFilename(
  filename: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(filename))) return filename;

  const parsed = path.posix.parse(filename);
  let index = 1;

  while (true) {
    const candidate = `${parsed.name}-${index}${parsed.ext}`;
    if (!(await exists(candidate))) return candidate;
    index += 1;
  }
}

export async function executeAttachmentTrashMove<TPath>(
  options: ExecuteAttachmentTrashMoveOptions<TPath>,
): Promise<{ trashPath: TPath }> {
  const desiredTrashPath = options.fs.join(
    options.trashRoot,
    options.trashRelativePath,
  );
  const trashDirectory = options.fs.dirname(desiredTrashPath);
  const trashFilename = await uniqueTrashFilename(
    options.fs.basename(desiredTrashPath),
    (candidate) => options.fs.exists(options.fs.join(trashDirectory, candidate)),
  );
  const trashPath = options.fs.join(trashDirectory, trashFilename);

  await options.fs.createDirectory(trashDirectory);
  await options.fs.rename(options.source, trashPath);

  if (options.writeIndex) {
    await appendAttachmentTrashIndex({
      ...options,
      trashPath,
    });
  }

  return { trashPath };
}

async function appendAttachmentTrashIndex<TPath>(
  options: ExecuteAttachmentTrashMoveOptions<TPath> & { trashPath: TPath },
): Promise<void> {
  await options.fs.createDirectory(options.trashRoot);

  const indexPath = options.fs.join(
    options.trashRoot,
    ATTACHMENT_TRASH_INDEX_FILE,
  );
  const index = await readAttachmentTrashIndex(options.fs, indexPath);
  index.entries.push({
    trashedAt: (options.now ?? (() => new Date()))().toISOString(),
    documentPath: options.fs.toDisplayPath(options.document),
    originalPath: options.fs.toDisplayPath(options.source),
    trashPath: options.fs.toDisplayPath(options.trashPath),
    documentUri: options.fs.toKey(options.document),
    originalUri: options.fs.toKey(options.source),
    trashUri: options.fs.toKey(options.trashPath),
  });

  await options.fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

async function readAttachmentTrashIndex<TPath>(
  fs: AttachmentTrashFileSystem<TPath>,
  indexPath: TPath,
): Promise<AttachmentTrashIndex> {
  try {
    const contents = await fs.readFile(indexPath);
    if (!contents) return { version: 1, entries: [] };

    const parsed = JSON.parse(contents) as Partial<AttachmentTrashIndex>;
    if (parsed.version === 1 && Array.isArray(parsed.entries)) {
      return {
        version: 1,
        entries: parsed.entries.filter((entry): entry is AttachmentTrashEntry => (
          !!entry &&
          typeof entry === "object" &&
          typeof (entry as AttachmentTrashEntry).trashUri === "string" &&
          typeof (entry as AttachmentTrashEntry).originalUri === "string"
        )),
      };
    }
  } catch {
    // Missing or invalid index files are recreated on the next trash move.
  }

  return { version: 1, entries: [] };
}

function slugify(value: string, fallback: string): string {
  return value
    .replace(/\.[mM][dD]$/, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}
