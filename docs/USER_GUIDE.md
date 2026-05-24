# MalkDown Editor User Guide

MalkDown Editor opens Markdown files in a WYSIWYG editing surface while keeping the document stored as Markdown on disk.

## Open The Editor

Use either path:

- Click `MalkDown Editor` in the editor title bar when a `.md` file is open.
- Run `MalkDown Editor: MalkDown Editor` from the Command Palette.

Click the same editor-title action again to switch back to the raw Markdown editor.

## Editor Title Actions

- `MalkDown Editor` opens the WYSIWYG editor for the current Markdown file.
- The gear icon opens MalkDown Editor settings.
- The padlock icon toggles session-local read-only mode.

Read-only mode disables editing controls and shows a fixed `READ ONLY` badge in the editor.

## Command Palette And Menus

Command Palette actions:

- `MalkDown Editor`
- `Open Settings`
- `Toggle Read-Only Mode`
- `Enable Read-Only Mode`
- `Disable Read-Only Mode`
- `Insert Today's Date`
- `Insert Current Time`
- `Insert Date and Time`
- `Insert Last Updated`
- `Update Last Updated Line`
- `Insert History Entry`
- `Insert Custom Date/Time Snippet`

Editor-title menu actions:

- `MalkDown Editor`
- `Open Settings`
- `Enable Read-Only Mode`
- `Disable Read-Only Mode`

The same settings are grouped in VS Code Settings under:

- `MalkDown Editor: Appearance`
- `MalkDown Editor: Attachments`
- `MalkDown Editor: Tables`
- `MalkDown Editor: Code Blocks`
- `MalkDown Editor: Date & Time`

## Attachments

Paste or upload an image to save it as a local attachment. MalkDown Editor writes a relative Markdown link so the file stays portable with the Markdown document.

When a local attachment reference is removed, the cleanup dialog uses these actions:

- `Cancel`: restore the attachment reference in the Markdown document.
- `Remove from Page`: remove the Markdown reference and leave the file on disk.
- `Move to Trash`: remove the Markdown reference and move the file into the workspace-root attachment trash folder.
- `Delete Everywhere`: remove the Markdown reference and delete the file from disk.

The safe default action is `Cancel`.

## Tables

Use the slash menu or Command Palette table actions to insert tables. Table editing includes:

- `Insert Table`
- `Insert Custom Table`
- Floating table toolbar
- Right-click table action menu
- Table-cell slash menu when `/` is typed as the first character in a table cell

MalkDown Editor keeps table output close to GitHub Flavored Markdown tables. Table cells are intended for paragraph and inline formatting.

## Code Blocks

Code blocks support language labels and a Copy button. The related settings can keep both controls visible without requiring hover.

## Date & Time Tools

Date and time tools are available from the Command Palette and the slash menu `Date & Time` category:

- `Insert Today's Date`
- `Insert Current Time`
- `Insert Date and Time`
- `Insert Last Updated`
- `Update Last Updated Line`
- `Insert History Entry`
- `Insert Custom Date/Time Snippet`

Inline shortcuts are also available when enabled:

- `/date`
- `/time`
- `/datetime`
- `/updated`
- `/history`

Accept an inline shortcut with `Tab` or `Enter`.

## More Documentation

- [Settings Reference](SETTINGS.md)
- [CommonMark Compatibility](COMMONMARK.md)
- [Feature Roadmap](FEATURES.md)
- [Bug Tracker](BUGS.md)
- [Manual Test Checklist](../tests/manual/README.md)
