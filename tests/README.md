# MalkDown Editor Tests

This folder contains automated checks for MalkDown Editor.

## Commands

```bash
npm test
npm run test:unit
npm run test:security
npm run test:watch
npm run verify
npm run test:ci
```

- `npm test` runs the fast unit/regression suite and the security/privacy sweep.
- `npm run test:unit` runs the same suite directly with Node's built-in test runner.
- `npm run test:security` runs repository guardrails for obvious secrets, tracked environment files, private-key blocks, and non-allowlisted email addresses.
- `npm run test:watch` reruns unit tests while files change.
- `npm run verify` runs TypeScript validation, production build, the unit suite, and the security/privacy sweep.
- `npm run test:ci` is an alias for `npm run verify`.

The test runner uses the `spec` reporter so each checked behavior is printed in the terminal.

## Current Coverage

- `tests/unit/markdown-parser.test.mjs` verifies lightweight Markdown structure parsing.
- `tests/unit/showcase-fixture.test.mjs` verifies the smoke Markdown fixture and local image references.
- `tests/unit/webview-regression.test.mjs` guards the image-control startup regression where a mutation observer could self-trigger forever.
- `tests/unit/protocol-regression.test.mjs` verifies that host/webview protocol messages stay represented in the shared protocol and their source-side handlers.
- `tests/unit/attachment-dialog.test.mjs` verifies the attachment cleanup dialog labels, safe default action, collapsed details copy, full-path disclosure, and attachment trash source guards.
- `tests/unit/attachment-trash-settings.test.mjs` runs sandboxed matrix tests for attachment trash settings, path preservation, safe folder fallback, sanitization, and collision naming.
- `tests/unit/attachment-trash-filesystem.test.mjs` uses `tests/.tmp/attachment-trash/` to simulate real trash moves, collision-safe renames, and `index.json` writes without launching VS Code.
- `tests/unit/settings-taxonomy.test.mjs` verifies every contributed `mdEditor.*` setting has taxonomy metadata, package ordering, Settings UI help text, and documentation coverage.
- `tests/unit/commonmark-compliance.test.mjs` guards the CommonMark/GFM compatibility policy, fenced-code heading behavior, portable local image links, GFM table structure, and plain Markdown timestamp defaults.
- `tests/unit/package-manifest.test.mjs` verifies command and custom-editor manifest consistency.
- `tests/unit/project-process.test.mjs` verifies that the testing procedure remains visible to agents.
- `tests/security/security-privacy-sweep.test.mjs` verifies that tracked files do not contain obvious private emails, tracked `.env` files, private-key blocks, or common secret assignments.

## When To Run Tests

- Run `npm test` after focused test, fixture, helper, manifest, and regression-guard changes.
- Run `npm run test:security` before committing or pushing to GitHub, and after changes to webview HTML/CSP, message protocol, attachment handling, packaging, docs, fixtures, or repository metadata.
- Run `npm run verify` before handing off any source, protocol, package, attachment, or webview behavior change.
- Run `npm run verify` before packaging or sharing a build.

## When To Add Or Update Tests

- Add a regression test for every fixed bug when the behavior can be checked automatically.
- Add or update feature tests when adding commands, settings, message protocol fields, attachment behavior, fixture content, or webview controls.
- Add or update settings taxonomy metadata whenever a `mdEditor.*` setting is added, renamed, moved, or given new user-facing meaning.
- Add CommonMark or fixture coverage when a feature creates Markdown syntax, managed comments, raw HTML blocks, generated tables, or attachment references.
- Update fixture tests when `tests/fixtures/test.md` is changed intentionally.
- Add process tests when project procedures change, so agents keep seeing the right instructions.
- Add security/privacy tests when a security policy becomes machine-checkable, for example CSP presence, message validation, attachment upload limits, package exclusions, or secret-pattern detection.
- If a feature can only be verified in VS Code manually for now, document the manual steps here or in `docs/BUGS.md` and note the gap in the final response.

## Test Layers

- Unit/regression tests live in `tests/unit/` and should stay fast and deterministic.
- Fixture tests protect `tests/fixtures/test.md` and required local attachments.
- Manifest/process tests protect package metadata and agent-facing procedures.
- Security/privacy tests protect repository hygiene and release guardrails.
- Settings taxonomy tests protect Settings UI categories, ordering, help text, and terminology consistency.
- CommonMark policy tests protect the current Markdown compatibility rules and parser assumptions.
- Future VS Code integration tests should live in a separate folder, for example `tests/integration/`, because they launch an Extension Development Host.

## Coverage Gaps

These are important behaviors that are not fully covered by the current fast unit suite:

- Extension Development Host lifecycle: opening a Markdown file, switching to MalkDown Editor, restoring a custom editor tab, and verifying `editorMounted` from the real VS Code webview.
- Native VS Code fallback prompts: attachment cleanup fallback behavior when the webview is unavailable, dismiss/cancel behavior, and file deletion timing.
- Webview modal runtime behavior: actual focus order, collapsed `More details`, Escape handling, and button styling inside a real VS Code webview.
- Full Extension Development Host filesystem workflows through `vscode.workspace.fs`: paste/upload, undo upload, and end-to-end custom editor interaction.
- Real attachment trash restore workflow: the first version writes an index and preserves paths, but restore/empty-trash commands still need VS Code integration coverage when added.
- Webview pointer workflows: image hover buttons, lock toggle, copy path, delete, direct drag blocking, middle-click selection, and right-click/lightbox behavior.
- Lightbox interaction details: wheel zoom, max zoom, left-click reset, right-click close, Escape close, and blocking Delete/Backspace while zoomed.
- Visual polish: horizontal button alignment, hover hit areas, red destructive styling, and screenshot-level layout checks across themes and viewport sizes.
- Clipboard integration: image `Copy Attachment` and `Copy File Path` actions writing the expected values to the VS Code clipboard.
- VS Code context menu limitations: empty-editor context menu behavior and whether VS Code allows overriding cut/copy/paste for image-specific actions.
- Full Markdown round-trip compliance through Milkdown/Crepe: the current fast tests protect policy and lightweight parser behavior, but full CommonMark example coverage needs a future integration or parser-level suite.

## Manual Verification

Manual checks live in `tests/manual/README.md`. Use them when a behavior depends on VS Code UI, native dialogs, clipboard state, pointer input, or visual alignment and is not covered by automated tests yet.

## Next Layer

Full VS Code custom-editor tests are possible with `@vscode/test-electron`. That layer can launch an Extension Development Host, open `tests/fixtures/test.md`, switch to MalkDown Editor, and verify webview logs such as `editorMounted`, `dom-snapshot-raf`, and attachment resolution. It is heavier than the current tests, so it should live separately from the fast unit suite.
