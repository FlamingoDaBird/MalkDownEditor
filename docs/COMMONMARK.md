# CommonMark Compatibility

MalkDown Editor aims to keep documents portable. The baseline is CommonMark-style Markdown, with GitHub Flavored Markdown tables where table editing is involved.

## Current Policy

- Prefer standard Markdown syntax over custom syntax.
- Use GitHub Flavored Markdown table syntax for tables.
- Keep table cells to paragraph and inline content.
- Keep generated timestamps as plain Markdown text.
- Keep attachments as Markdown links or images with relative paths.
- Use HTML comments only for future managed regions when portable Markdown has no native block syntax.

## Supported Markdown Shapes

The smoke fixture should keep covering:

- ATX headings
- paragraphs
- emphasis and strong text
- inline code
- fenced code blocks
- blockquotes
- links
- local images
- GitHub Flavored Markdown tables
- inline math and block math where Milkdown supports it

## Known Boundaries

- CommonMark does not define tables; table behavior follows GitHub Flavored Markdown expectations.
- Nested tables, table cell colors, arbitrary block content inside table cells, and custom cell styling are intentionally outside the first table scope.
- Collapsible sections will likely use portable raw HTML `<details>` blocks first, because CommonMark does not define native collapsible blocks.
- Raw Markdown mode can always edit any generated comments or managed regions because VS Code's plain text editor is outside the WYSIWYG guardrails.

## Test Expectations

- `tests/unit/commonmark-compliance.test.mjs` protects the initial compatibility policy and lightweight parser behavior.
- Fixture tests keep `docs/SHOWCASE.md` and `tests/fixtures/test.md` representative.
- Future Markdown generation features should add round-trip tests before they are marked complete.
