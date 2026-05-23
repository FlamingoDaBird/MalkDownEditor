# MD Editor Tests

This folder contains automated checks for MD Editor.

## Commands

```bash
npm test
npm run test:unit
npm run test:watch
npm run verify
npm run test:ci
```

- `npm test` runs the fast unit and regression suite.
- `npm run test:unit` runs the same suite directly with Node's built-in test runner.
- `npm run test:watch` reruns unit tests while files change.
- `npm run verify` runs TypeScript validation, production build, and the test suite.
- `npm run test:ci` is an alias for `npm run verify`.

The test runner uses the `spec` reporter so each checked behavior is printed in the terminal.

## Current Coverage

- `tests/unit/markdown-parser.test.mjs` verifies lightweight Markdown structure parsing.
- `tests/unit/showcase-fixture.test.mjs` verifies the smoke Markdown fixture and local image references.
- `tests/unit/webview-regression.test.mjs` guards the image-control startup regression where a mutation observer could self-trigger forever.
- `tests/unit/protocol-regression.test.mjs` verifies that host/webview protocol messages stay represented in the shared protocol and their source-side handlers.
- `tests/unit/package-manifest.test.mjs` verifies command and custom-editor manifest consistency.
- `tests/unit/project-process.test.mjs` verifies that the testing procedure remains visible to agents.

## When To Run Tests

- Run `npm test` after focused test, fixture, helper, manifest, and regression-guard changes.
- Run `npm run verify` before handing off any source, protocol, package, attachment, or webview behavior change.
- Run `npm run verify` before packaging or sharing a build.

## When To Add Or Update Tests

- Add a regression test for every fixed bug when the behavior can be checked automatically.
- Add or update feature tests when adding commands, settings, message protocol fields, attachment behavior, fixture content, or webview controls.
- Update fixture tests when `tests/fixtures/test.md` is changed intentionally.
- Add process tests when project procedures change, so agents keep seeing the right instructions.
- If a feature can only be verified in VS Code manually for now, document the manual steps here or in `docs/BUGS.md` and note the gap in the final response.

## Test Layers

- Unit/regression tests live in `tests/unit/` and should stay fast and deterministic.
- Fixture tests protect `tests/fixtures/test.md` and required local attachments.
- Manifest/process tests protect package metadata and agent-facing procedures.
- Future VS Code integration tests should live in a separate folder, for example `tests/integration/`, because they launch an Extension Development Host.

## Coverage Gaps

These are important behaviors that are not fully covered by the current fast unit suite:

- Extension Development Host lifecycle: opening a Markdown file, switching to MD Editor, restoring a custom editor tab, and verifying `editorMounted` from the real VS Code webview.
- Native VS Code prompts: attachment delete/keep/undo prompts, dismiss/cancel behavior, and file deletion timing.
- Real filesystem attachment workflows through `vscode.workspace.fs`: paste/upload, undo upload, delete file from disk, and restore/keep behavior.
- Webview pointer workflows: image hover buttons, lock toggle, copy path, delete, direct drag blocking, middle-click selection, and right-click/lightbox behavior.
- Lightbox interaction details: wheel zoom, max zoom, left-click reset, right-click close, Escape close, and blocking Delete/Backspace while zoomed.
- Visual polish: horizontal button alignment, hover hit areas, red destructive styling, and screenshot-level layout checks across themes and viewport sizes.
- Clipboard integration: copy image path writing the expected full path to the VS Code clipboard.
- VS Code context menu limitations: empty-editor context menu behavior and whether VS Code allows overriding cut/copy/paste for image-specific actions.

## Manual Verification

Manual checks live in `tests/manual/README.md`. Use them when a behavior depends on VS Code UI, native dialogs, clipboard state, pointer input, or visual alignment and is not covered by automated tests yet.

## Next Layer

Full VS Code custom-editor tests are possible with `@vscode/test-electron`. That layer can launch an Extension Development Host, open `tests/fixtures/test.md`, switch to MD Editor, and verify webview logs such as `editorMounted`, `dom-snapshot-raf`, and attachment resolution. It is heavier than the current tests, so it should live separately from the fast unit suite.
