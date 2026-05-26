# Security And Privacy Tracker

This file is the project memory for security and privacy review. Read it before committing or pushing changes to GitHub, and update it whenever a new risk is found, accepted, or fixed.

## Pre-Commit Sweep

Before committing or pushing to GitHub:

- Run `npm test` for the fast unit, regression, process, and security/privacy checks.
- Run `npm run verify` before handoff, packaging, source changes, protocol changes, attachment changes, or webview behavior changes.
- Review changed files for names, private emails, local absolute paths, tokens, API keys, `.env` content, screenshots, and generated artifacts.
- Check Markdown/docs/fixtures for personal notes or session-only details that should not be public.
- Update this file if a new security concern is discovered or an existing one is fixed.

## Current Privacy Findings

- No private email addresses, API keys, `.env` files, private keys, or obvious secrets were found in the tracked project files during the May 26, 2026 sweep.
- The repo intentionally contains public identity/handle metadata:
  - `package.json` has publisher `flamingo`.
  - `package.json`, `README.md`, and release notes reference `FlamingoDaBird/MalkDownEditor`.
  - Git history uses the GitHub noreply author `FlamingoDaBird@users.noreply.github.com`.
- `docs/SESSION_SUMMARY.md` contains release/checkpoint notes and GitHub remote details. It is tracked in git for development continuity but excluded from VSIX packaging by `.vscodeignore`.
- `docs/SHOWCASE.md` and `tests/fixtures/test.md` contain the demo alt text `Flamingo loves shrimp`; keep or replace before public release if a more neutral sample is desired.

## Current Security Findings

Open items to track:

- High: The webview enables scripts but does not yet use a Content Security Policy. Add a strict CSP with nonces and move inline boot scripts out of `src/webview/index.html`.
- Medium: Host and webview message handling relies on TypeScript casts. Add runtime validation for message `type`, request IDs, string fields, base64 payload size, and attachment inputs.
- Medium: Attachment upload accepts webview-provided base64/name/MIME values. Restrict uploads to supported image MIME/extensions and add a maximum file size.
- Medium/Low: `localResourceRoots` currently includes all workspace folders for Markdown image compatibility. Consider narrowing this to extension assets, the Markdown file folder, and known attachment folders.
- Low: The internal debug command `mdeditor.css` displays a generated webview CSS URI. Remove it before public release if it is not needed.

## Automated Checks

- `npm run test:security` runs a lightweight repository sweep for obvious secrets, private-key blocks, tracked environment files, and non-allowlisted email addresses.
- `npm test` runs `test:unit` and `test:security`.
- `npm run verify` runs typecheck, build, unit tests, and security/privacy checks.

These checks are guardrails, not a replacement for manual review. They intentionally do not fail on documented public project identity strings such as the GitHub repo path and marketplace publisher.
