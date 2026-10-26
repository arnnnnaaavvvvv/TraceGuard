# Diff Module (`src/diff`)

## What It Does
Compares two OpenAPI specifications (Base vs Head) to detect breaking contract modifications. It enforces directional compatibility rules across endpoints, HTTP methods, request parameters, request bodies, response status codes, media types, authentication schemes, and response data schemas.

## Who Calls It
- `src/cli`: routes the `diff` command to `compareOperations()`.
- `src/index.ts`: SDK function `compareContracts()` invokes this module.
