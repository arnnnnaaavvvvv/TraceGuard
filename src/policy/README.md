# Policy Module (`src/policy`)

## What It Does
Evaluates contract findings against user-configured policy rules (failure thresholds for breaking changes, critical/major severity caps, ignored rules) and determines process exit codes (`0`, `1`, `2`, `3`).

## Who Calls It
- `src/cli`: evaluates results and sets the process exit code.
- `src/index.ts`: SDK functions include the policy evaluation in the final `Report`.
