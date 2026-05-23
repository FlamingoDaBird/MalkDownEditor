# Project Documentation

This folder keeps project working documents out of the repository root while leaving package-standard files (`README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`) where common tooling expects them.

## Files

- `BUGS.md` - active and resolved bug tracker.
- `FEATURES.md` - feature checklist and roadmap.
- `PROJECT_CHECKPOINT_GUIDE.md` - guidance for saving development checkpoints.
- `SESSION_SUMMARY.md` - current working state for session resumption.
- `SHOWCASE.md` - source-of-truth smoke Markdown document mirrored to `tests/fixtures/test.md`.
- `.attachments/` - small tracked assets required by `SHOWCASE.md`.

## Root Files Kept Intentionally

- `AGENTS.md` stays at the repository root so coding agents can discover project instructions.
- `README.md`, `CHANGELOG.md`, and `LICENSE` stay at the repository root for package, marketplace, and GitHub conventions.
- Build and TypeScript config files stay at the repository root because the scripts refer to them directly.
- Generated VSIX packages live in `artifacts/`, which is ignored by git.
