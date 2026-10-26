# Baseline Module (`src/baseline`)

## What It Does
Manages baseline snapshot files to suppress known legacy discrepancies from failing CI. It writes deterministic baseline files containing finding fingerprints (without saving sensitive payloads or response bodies), loads baseline snapshots, and marks matching runtime or diff findings as suppressed.

## Who Calls It
- `src/cli`: handles `baseline save/show/clear` subcommands.
- `src/checker`: applies baseline suppressions to runtime findings.
- `src/diff`: applies baseline suppressions to specification compatibility changes.
