# Types Module (`src/types`)

## What It Does
Defines all shared TypeScript types, interfaces, error classes, and rule constants used throughout the TraceGuard CLI and SDK.

## Who Calls It
- `src/config`: imports configuration schemas and error types.
- `src/parser`: imports `Operation`, `ParameterDefinition`, and `SpecError`.
- `src/checker`: imports `Operation`, `Finding`, `NetworkError`, and `TimeoutError`.
- `src/diff`: imports `CompatChange`, `CompatibilityType`, and rule definitions.
- `src/policy`: imports `Policy`, `Report`, and exit code constants.
- `src/report`: imports `Finding`, `Report`, and `ReportSummary`.
- `src/index.ts`: re-exports public types for SDK consumers.
