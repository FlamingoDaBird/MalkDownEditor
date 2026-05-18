# Milestone Checkpoints for VS Code MD Editor

## What Constitutes a Milestone?

### Core Editor Features
- [x] Basic editor setup (MVP done)
- [x] Keyboard shortcuts (Ctrl+S, undo/redo, Ctrl+Z)
- [ ] Split view / Live preview toggle
- [x] Table editing enhancements
- [ ] Image handling (paste, embed)
- [ ] PDF export
- [ ] HTML export

### Polish & Edge Cases
- [x] Code block toolbar/visibility polish
- [ ] Headings outline
- [ ] Search & replace
- [x] Version conflict handling

## When to Save

After completing each milestone, or if you notice either of us:

1. **Summarizing the same thing twice** (you're asking "what were we doing?")
2. **I'm being vague about what's done** (vague = forgotten)
3. **Conversation feels long** (you/your model say "getting long")
4. **Before stepping away** (coffee, break, whatever)

## Quick Checkpoint Format

```markdown
### Milestone: Keyboard Shortcuts [Completed]
- Ctrl+S: Save to host file
- Ctrl+Z/Ctrl+Y: Undo/redo via Milkdown
- Esc: Exit edit mode
- Status: Working in test, needs CI

### Current Focus
Fixing Ctrl+S race condition when saving + typing.

### Next
Test Ctrl+Z, then add Ctrl+Y for redo.

### Files to Watch
src/webview/keyboard.ts, src/provider.ts
```

---

**Usage:** Ask "should we checkpoint?" or I'll ask when a milestone is done. Just attach `SESSION_SUMMARY.md` in next session.
