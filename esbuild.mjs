import * as esbuild from "esbuild";
import * as fs from "fs/promises";

const watch = process.argv.includes("--watch");

/** @type {import('esbuild').Plugin} */
const copyWebviewHtmlPlugin = {
  name: "copy-webview-html",
  setup(build) {
    build.onEnd(async () => {
      await fs.mkdir("dist/webview", { recursive: true });
      await fs.copyFile("src/webview/index.html", "dist/webview/index.html");
    });
  },
};

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  outfile: "dist/extension.js",
  external: ["vscode"],
  sourcemap: true,
  logLevel: "info",
};

/** @type {import('esbuild').BuildOptions} */
const webviewConfig = {
  entryPoints: ["src/webview/index.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome114",
  outdir: "dist/webview",
  entryNames: "index",
  sourcemap: true,
  minify: !watch,
  logLevel: "info",
  loader: {
    ".css": "css",
    ".woff": "file",
    ".woff2": "file",
    ".ttf": "file",
  },
  plugins: [copyWebviewHtmlPlugin],
};

async function build() {
  if (watch) {
    const extensionCtx = await esbuild.context(extensionConfig);
    const webviewCtx = await esbuild.context(webviewConfig);
    await Promise.all([
      extensionCtx.watch(),
      webviewCtx.watch(),
    ]);
    return;
  }

  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(webviewConfig),
  ]);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
