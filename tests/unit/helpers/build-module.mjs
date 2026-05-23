import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const repoRoot = path.resolve(
  new URL("../../..", import.meta.url).pathname,
);

export async function importTypeScriptModule(entryPath) {
  const entry = path.join(repoRoot, entryPath);
  const tmpDir = path.join(repoRoot, "tests", ".tmp");
  const outfile = path.join(
    tmpDir,
    `${path.basename(entryPath, ".ts")}-${process.pid}-${Date.now()}.mjs`,
  );

  await mkdir(tmpDir, { recursive: true });
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    external: ["vscode"],
    logLevel: "silent",
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}
