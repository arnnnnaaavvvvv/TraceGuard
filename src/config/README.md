# Config Module (`src/config`)

## What It Does
Loads, merges, and strictly validates TraceGuard configuration from defaults, config files (`traceguard.config.json`, `.traceguardrc.yaml`), and CLI flags before any network calls or spec processing take place.

## Who Calls It
- `src/cli`: passes parsed CLI options into `loadConfig()`.
- `src/index.ts`: SDK functions accept partial configuration and validate it against this module.
