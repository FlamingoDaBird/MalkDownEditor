<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/logo-dark.png" />
    <img src="media/logo-light.png" alt="MalkDown Editor logo" width="520" />
  </picture>
</p>

# MalkDown Editor - VS Code/VSCodium Extension

MalkDown Editor is a WYSIWYG Markdown editor for VS Code and VSCodium. It uses [Milkdown](https://milkdown.dev/) and the [Milkdown Crepe editor](https://milkdown.dev/docs/guide/using-crepe) to edit Markdown files in a rich editor while keeping the source file as Markdown on disk.

The compatibility target is CommonMark-style Markdown plus GitHub Flavored Markdown tables. See [CommonMark Compatibility](docs/COMMONMARK.md) for the current policy and limits.

## Quick Start

```bash
npm install
npm run build
```

For development with rebuilds:

```bash
npm run watch
```

Then press `F5` in VS Code to launch the Extension Development Host. Open a `.md` file and click `MalkDown Editor` in the editor title bar.

## Main Features

- WYSIWYG Markdown editing through Milkdown Crepe
- Dark, light, and high-contrast theme support
- Local attachment saving with configurable folders and filenames
- Attachment cleanup dialog with `Cancel`, `Remove from Page`, `Move to Trash`, and `Delete Everywhere`
- Recoverable attachment trash folder with optional index
- Table insertion and table editing controls
- Date and time snippets from commands, slash menu actions, and inline shortcuts
- Code block language and Copy button visibility settings
- Session-local read-only mode
- Drag/drop insertion line for moved blocks
- Custom MalkDown logo and editor-title icon

## Documentation

- [User Guide](docs/USER_GUIDE.md): how to use the editor and main workflows.
- [Settings Reference](docs/SETTINGS.md): all `mdEditor.*` settings grouped by topic.
- [Settings Standards](docs/SETTINGS_STANDARDS.md): how future settings should be named, documented, categorized, and tested.
- [CommonMark Compatibility](docs/COMMONMARK.md): Markdown compatibility policy and test expectations.
- [Security And Privacy](docs/SECURITY.md): pre-commit sweep, automated guardrails, and active risk tracker.
- [Showcase Document](docs/SHOWCASE.md): source-of-truth smoke document mirrored into `tests/fixtures/test.md`.
- [Feature Roadmap](docs/FEATURES.md): current feature checklist and future work.
- [Bug Tracker](docs/BUGS.md): active and resolved bugs.

## Commands

```bash
npm run build
npm run watch
npm run typecheck
npm test
npm run test:security
npm run verify
npm run package:vsix
```

- `npm test` runs the fast unit/regression suite and security/privacy sweep.
- `npm run test:security` runs repository guardrails for obvious secrets and private information.
- `npm run verify` runs typecheck, production build, unit tests, and security/privacy checks.
- `npm run package:vsix` writes a packaged extension into `artifacts/`.

## Packaging And Releases

The installable extension file is a `.vsix` file.

```bash
npm run verify
npm run package:vsix
```

The latest packaged preview release is:

- [v0.1.3 release](https://github.com/FlamingoDaBird/MalkDownEditor/releases/tag/v0.1.3)
- Installable asset: `md-editor-0.1.3.vsix`

To test a packaged build locally:

```bash
code --install-extension artifacts/md-editor-0.1.3.vsix
```

## AI Assistance

AI tools, including OpenAI Codex, have been used as development assistants in this project for implementation support, documentation updates, code review-style reasoning, and release preparation. Project direction, testing decisions, and release publishing are maintained by the project owner.

## Project Structure

```text
VS-CODE-Plugin-MD-Editor/
├── src/                 # Extension host, attachment logic, webview, shared protocol
├── docs/                # User docs, roadmap, bugs, showcase, session notes
├── tests/               # Unit tests, fixtures, and manual verification
├── media/               # Logo, icon, and marketplace assets
├── dist/                # Generated build output, ignored by git
├── artifacts/           # Generated VSIX packages, ignored by git
├── package.json         # VS Code extension manifest
├── esbuild.mjs          # Extension and webview build script
└── AGENTS.md            # Agent/project working instructions
```

## License

Apache License 2.0. See [LICENSE](LICENSE).
