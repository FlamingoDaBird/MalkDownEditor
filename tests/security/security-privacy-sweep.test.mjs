import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { repoRoot } from "../unit/helpers/build-module.mjs";

const execFileAsync = promisify(execFile);

const binaryExtensions = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpg",
  ".jpeg",
  ".pdf",
  ".png",
  ".webp",
]);

const allowedEmailAddresses = new Set([
  "git@github.com",
  "FlamingoDaBird@users.noreply.github.com",
]);

async function trackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files"], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024,
  });

  return stdout
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

function isTextFile(file) {
  return !binaryExtensions.has(path.extname(file).toLowerCase());
}

async function readTrackedTextFiles() {
  const files = await trackedFiles();
  const entries = [];

  for (const file of files) {
    if (!isTextFile(file)) continue;
    const text = await readFile(path.join(repoRoot, file), "utf8");
    entries.push({ file, text });
  }

  return entries;
}

test("no environment files are tracked", async () => {
  const files = await trackedFiles();
  const trackedEnvFiles = files.filter((file) => {
    const basename = path.basename(file);
    return basename === ".env" || basename.startsWith(".env.");
  });

  assert.deepEqual(trackedEnvFiles, []);
});

test("tracked text files do not contain private-key blocks", async () => {
  const entries = await readTrackedTextFiles();
  const matches = entries.filter(({ text }) =>
    /-----BEGIN (?:RSA |DSA |EC |OPENSSH |)PRIVATE KEY-----/.test(text),
  );

  assert.deepEqual(
    matches.map(({ file }) => file),
    [],
    "private-key material must never be committed",
  );
});

test("tracked text files do not contain common secret assignments", async () => {
  const entries = await readTrackedTextFiles();
  const secretAssignment =
    /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd|secret)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/i;
  const matches = entries
    .filter(({ text }) => secretAssignment.test(text))
    .map(({ file }) => file);

  assert.deepEqual(matches, []);
});

test("tracked text files do not contain non-allowlisted email addresses", async () => {
  const entries = await readTrackedTextFiles();
  const emailExpression = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const matches = [];

  for (const { file, text } of entries) {
    for (const match of text.matchAll(emailExpression)) {
      const email = match[0];
      if (allowedEmailAddresses.has(email)) continue;
      matches.push(`${file}: ${email}`);
    }
  }

  assert.deepEqual(matches, []);
});

test("security tracker records active webview and attachment hardening items", async () => {
  const security = await readFile(path.join(repoRoot, "docs", "SECURITY.md"), "utf8");

  assert.match(security, /Content Security Policy/);
  assert.match(security, /runtime validation/);
  assert.match(security, /Attachment upload/);
  assert.match(security, /localResourceRoots/);
  assert.match(security, /mdeditor\.css/);
});
