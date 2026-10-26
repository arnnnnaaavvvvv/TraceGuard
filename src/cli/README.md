# CLI Module (`src/cli`)

## What It Does
Provides the command-line interface for TraceGuard using Commander. It parses command line options, formats flags, and routes commands (`check`, `diff`, `baseline`) to core library functions. It contains zero business logic or validation code.

## Who Calls It
- Executed by the user via `npx traceguard` or global npm binary installation.
