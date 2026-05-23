# AGENTS.md — Project Context

## Project Summary

A VS Code extension that provides a WYSIWYG Markdown editor using Milkdown Crepe (ProseMirror-based). Transforms standard markdown files into a rich editing experience with real-time rendering.

## Architecture

```
┌────────────────────────────────────────┐
│   VS Code Extension Host               │
│   - provider.ts                        │
│   - Custom editor provider             │
│   - Message handling                   │
└──────────────────┬─────────────────────┘
                   │ bidirectional sync
                   ▼
┌────────────────────────────────────────┐
│   Webview Panel                        │
│   - Milkdown Crepe editor              │
│   - Theme engine                       │
│   - Toolbar & UI components            │
└────────────────────────────────────────┘
```

## Tech Stack

| Component         | Technology              |
|-------------------|-------------------------|
| Language          | TypeScript              |
| Framework         | VS Code Extension API   |
| Editor Engine     | Milkdown Crepe 7.x      |
| Build             | esbuild (dual-target)   |
| Bundling          | esbuild (no webpack)    |

## Key Files

| Path                        | Purpose                              |
|----------------------------|--------------------------------------|
| `src/extension.ts`         | Extension entry point                |
| `src/provider.ts`          | Custom editor provider implementation |
| `src/attachments.ts`       | Attachment save, naming, and cleanup logic |
| `src/webview/index.ts`     | Webview Milkdown setup               |
| `src/shared/protocol.ts`   | Extension ↔ Webview message protocol  |
| `src/utils/`               | Helper utilities                     |
| `esbuild.mjs`              | Dual-target build script             |
| `docs/BUGS.md`             | Active and resolved bug tracker      |
| `docs/FEATURES.md`         | Feature checklist and roadmap        |
| `docs/SESSION_SUMMARY.md`  | Current development checkpoint       |
| `docs/SHOWCASE.md`         | Source-of-truth smoke Markdown document |
| `tests/README.md`          | Automated test strategy and procedure |
| `tests/unit/`              | Fast unit and regression tests        |
| `tests/fixtures/test.md`   | Manual smoke-test Markdown document  |

## Current State

### ✅ Completed (MVP)

- [x] Custom Editor Provider registered for `.md` files
- [x] Milkdown Crepe editor integrated in webview
- [x] Bidirectional sync (host ↔ webview)
- [x] Theme support (dark/light/high-contrast)
- [x] Local attachment persistence and cleanup prompts
- [x] esbuild dual-target build system
- [x] TypeScript validation

### 🔄 In Progress / Next

- Keyboard shortcuts
- Table editing enhancements
- Image handling polish
- Live preview toggle
- Export functionality (PDF/HTML)

## Build Commands

```bash
# Production build
npm run build

# Development with watch mode
npm run watch

# Type checking
npm run typecheck

# Fast automated tests
npm test

# Full local verification
npm run verify
```

## Development Workflow

1. Run `npm run watch` for auto-build
2. Press `F5` in VS Code to launch Extension Development Host
3. Open any `.md` file
4. Click "MD Editor" in the title bar to switch to WYSIWYG mode

## Testing

```bash
# Fast unit/regression tests with readable spec output
npm test

# TypeCheck
npm run typecheck

# Build
npm run build

# Full local verification: typecheck + build + tests
npm run verify

# Package for marketplace (future)
vsce package
```

See `tests/README.md` for the current test strategy, coverage map, and expansion rules.

### Test Procedure for Agents

- Run `npm test` after changes to pure helpers, fixtures, package metadata, docs that describe testing, or focused webview regressions covered by `tests/unit/`.
- Run `npm run verify` before handing off any source, protocol, package, attachment, or webview behavior change.
- Add or update tests in the same change when fixing a bug or adding a feature. Bug fixes should get a regression test that fails for the old behavior. Features should get the fastest useful unit/fixture/protocol test first, then a VS Code integration test when the behavior depends on the custom editor host.
- If a change cannot be tested automatically yet, document the gap in `tests/README.md` or `docs/BUGS.md`, and include the manual verification steps in the final response.
- Keep the smoke fixture `tests/fixtures/test.md` representative. If a feature needs a new Markdown construct or attachment to stay safe, add it there and update fixture tests.

## Notes for AI Agents

### ⚠️ Important Session Resumption Instructions

**Files you need to work effectively:**

| File | How to Get It | Why It's Needed |
|------|------|---|---|
| `docs/SESSION_SUMMARY.md` | Read from workspace; ask user only if missing | Current project state, progress, last checkpoint |
| `docs/PROJECT_CHECKPOINT_GUIDE.md` | Read from workspace if needed | Milestone tracking, when to save state |
| `AGENTS.md` | Auto-loaded by system (this file) | Project overview, tech stack, architecture |

### When Resuming a Session

1. **I will see** this AGENTS.md file (auto-loaded)
2. If the user says "resume" or "continue work", read `docs/SESSION_SUMMARY.md` from the workspace
3. If `docs/SESSION_SUMMARY.md` is missing or stale, ask the user for the latest session summary

### Why This Matters

Without `docs/SESSION_SUMMARY.md`, I **cannot reliably know**:
- Where we left off in the feature list
- What files were modified recently  
- Current focus (keyboard shortcuts? split view? etc.)

**Default assumption without `docs/SESSION_SUMMARY.md`**: Start from MVP state and inspect local files before making changes.

### File Relationship

```
AGENTS.md (auto-loaded)
    │
    └──→ Read docs/SESSION_SUMMARY.md from workspace
           │
           └──→ Current progress, next step, files to watch
```

---

### Core Work Notes

- **MVP is functional** - Basic editor works end-to-end
- **Milkdown Crepe** is the core editor - check their docs for available features
- **Message protocol** is defined in `src/shared/protocol.ts`
- **Themes** are handled via CSS variables from VS Code
- **State sync** must handle version conflicts gracefully
