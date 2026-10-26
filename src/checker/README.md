# Checker Module (`src/checker`)

## What It Does
Implements the live API runtime contract checker. It safely builds HTTP requests from OpenAPI operations, executes them via native `fetch` with strict timeout, size limit, and concurrency controls, compiles schemas using version-aware Ajv instances, and validates responses against the 7 runtime contract rules.

## Who Calls It
- `src/cli`: routes the `check` command to `executeContractChecks()`.
- `src/index.ts`: SDK `createTraceGuard().check()` method coordinates spec loading and executes this checker.
