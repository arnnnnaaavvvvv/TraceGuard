# Report Module (`src/report`)

## What It Does
Formats validation results and compatibility diffs into clean, structured output formats: stark black-and-white ANSI terminal output, versioned JSON artifacts (`schemaVersion: 1.0.0`), GitHub Flavored Markdown for CI job summaries, and standalone HTML reports styled with Google Fonts `Bebas Neue` and stark monochrome design. It automatically redacts tokens, secrets, and authorization headers across all output formats.

## Who Calls It
- `src/cli`: prints formatted reports to `stdout` or writes to an output file.
- `src/index.ts`: SDK provides formatters for consumers.
