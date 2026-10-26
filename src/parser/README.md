# Parser Module (`src/parser`)

## What It Does
Loads local OpenAPI 3.0.x and 3.1.x specifications from YAML or JSON, verifies structural constraints, dereferences local `$ref` pointers without remote network fetching, and extracts normalized `Operation` records.

## Who Calls It
- `src/cli`: invokes `loadSpec()` and `extractOperations()` for the target specification.
- `src/checker`: consumes normalized `Operation` records to generate HTTP verification requests.
- `src/diff`: parses Base and Head specs to feed into the AST comparator.
- `src/index.ts`: SDK functions accept file paths and parse them using this module.
