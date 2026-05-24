# Settings Standards

This document is the checklist for adding or changing MalkDown Editor settings.

## Required Metadata

Every `mdEditor.*` setting must have an entry in `docs/SETTINGS_TAXONOMY.json` with:

- category
- subgroup
- order
- label
- short description
- help text
- default
- scope
- related UI labels
- test coverage
- compatibility notes

Allowed top-level categories:

- Appearance
- Attachments
- Tables
- Code Blocks
- Date & Time
- Editor Behavior
- Advanced

## User Language

Use the same words in settings, commands, dialogs, menus, docs, and tests.

Examples:

- Use `attachment` when the behavior applies to any local file reference.
- Use `image` only when the behavior is image-specific.
- Use `Remove from Page` for removing only the Markdown reference.
- Use `Delete Everywhere` for deleting both the Markdown reference and the disk file.
- Use `Move to Trash` for recoverable attachment removal.

## Settings UI Rules

- Keep related settings in the same category.
- Use explicit `order` values on categories and settings.
- Use `markdownDescription` for short help text.
- Use `enumItemLabels` and `markdownEnumDescriptions` for dropdown values.
- Link dependent settings with setting links such as `#mdEditor.attachments.locationMode#`.
- Use multiline text presentation only for template-style settings.
- Keep setting IDs stable unless a migration is deliberately planned.

## Documentation Rules

When a setting is added or changed, update:

- `docs/SETTINGS_TAXONOMY.json`
- `docs/SETTINGS.md`
- `docs/USER_GUIDE.md` if the setting changes user workflow
- `tests/README.md` if coverage or gaps change
- `docs/FEATURES.md` if it completes or creates roadmap work

The root `README.md` should stay short and link to the detailed docs.

## Test Rules

Add or update tests in the same change as a setting addition.

Minimum expected coverage:

- Taxonomy test confirms the setting has metadata.
- Package manifest test confirms the setting is contributed in the right category and order.
- Feature-specific tests confirm the setting is used by the implementation when practical.
- Manual verification notes document anything that still requires VS Code UI testing.
