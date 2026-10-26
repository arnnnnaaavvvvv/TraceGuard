# TraceGuard Implementation Progress

Tracking progress across milestones M1 to M5 according to `docs/PLAN.md`.

## Status Key
- [x] Done
- [/] In Progress
- [ ] Todo
- [>] Deferred (document in roadmap only)

---

## Milestone 1: Foundation (M1)
- [x] Initialize Git repository
- [x] Create `package.json` (ESM, bin `traceguard`, Node >= 20.18.0)
- [x] Create `tsconfig.json` (strict TypeScript, ES2022)
- [x] Create `eslint.config.js` (flat ESLint config)
- [x] Create `vitest.config.ts`
- [x] Create `tsup.config.ts` (build CJS/ESM + `.d.ts` and CLI binary)
- [x] Create `.gitignore` and `LICENSE` (MIT)
- [x] Implement typed error classes with codes and remediation hints (`src/types/errors.ts`)
- [x] Implement core domain types (`src/types/core.ts`, `src/types/rules.ts`)
- [x] Add `src/types/README.md`
- [x] Implement Config schema and loader (`src/config/schema.ts`, `src/config/loader.ts`, `src/config/defaults.ts`)
- [x] Add `src/config/README.md`
- [x] Implement Spec loader (JSON/YAML, size limits, local `$ref` resolution, 3.0 vs 3.1 detection, explicit unsupported feature errors) (`src/parser/loader.ts`, `src/parser/references.ts`)
- [x] Implement Operation extractor (`src/parser/operations.ts`)
- [x] Add `src/parser/README.md`
- [x] Implement CLI shell with Commander (`src/cli/args.ts`, `src/cli/index.ts`) with zero network on `--help`/`--version`
- [x] Add `src/cli/README.md`
- [x] Unit tests for M1 (config, parser, errors, CLI args)
- [x] Verification: typecheck, lint, test, build

## Milestone 2: Runtime Check (M2)
- [x] Request builder for parameters and headers (`src/checker/builder.ts`)
- [x] Native fetch HTTP client with timeout, AbortSignal, size cap, concurrency limit (`src/checker/client.ts`)
- [x] Ajv schema validation for OpenAPI 3.0 (nullable) and OpenAPI 3.1 (Draft 2020-12) (`src/checker/validate.ts`)
- [x] Runtime validation rules (status, content-type, headers, schema, 204 bodyless, malformed JSON) (`src/checker/rules.ts`)
- [x] Runtime checker orchestration (`src/checker/executor.ts`)
- [x] Safe-methods-only enforcement (refuse mutating methods in v0.1.0)
- [x] Add `src/checker/README.md`
- [x] Integration tests with local mock HTTP server covering all 11 scenarios
- [x] Verification: typecheck, lint, test, build

## Milestone 3: Diff + Baseline (M3)
- [x] Specification normalizer (`src/diff/normalizer.ts`)
- [x] Directional comparator (response vs request rules) (`src/diff/comparator.ts`)
- [x] Compat rule family evaluators with 3-line comment headers (`src/diff/rules-*.ts`)
  - [x] Endpoint and method rules (added/removed)
  - [x] Parameter and request body rules (required field added/removed)
  - [x] Response schema rules (required field removed, type changed)
  - [x] Enum rules (widened vs narrowed directional logic)
  - [x] Nullable rules
  - [x] Auth & Media type rules
  - [x] Polymorphic schema handling (`UNKNOWN` fallback)
- [x] Add `src/diff/README.md`
- [x] Baseline snapshot storage and fingerprinting (`src/baseline/store.ts`, `src/baseline/filter.ts`)
- [x] Add `src/baseline/README.md`
- [x] Direct unit tests for all compatibility rules and baseline operations
- [x] Verification: typecheck, lint, test, build

## Milestone 4: Policy, Exit Codes, Reports & Public SDK (M4)
- [x] Policy evaluator (`src/policy/evaluator.ts`)
- [x] Process exit codes mapping (0, 1, 2, 3) (`src/policy/exit-codes.ts`)
- [x] Add `src/policy/README.md`
- [x] Terminal table reporter (`src/report/terminal.ts`)
- [x] JSON reporter with schemaVersion (`src/report/json.ts`)
- [x] Markdown PR summary reporter (`src/report/markdown.ts`)
- [x] Add `src/report/README.md`
- [x] Public TypeScript SDK (`src/index.ts` exporting `createTraceGuard`, `compareContracts`, types, errors)
- [x] GitHub Actions workflow (`.github/workflows/ci.yml`) and example (`examples/github-action.yml`)
- [x] Demo API in `examples/` with deliberate contract bug, valid spec, and breaking v1/v2 specs
- [x] Verification: typecheck, lint, test, build

## Milestone 5: Hardening & Docs (M5)
- [x] Secret redaction utility for all output paths (`src/report/redaction.ts`)
- [x] Hardening tests (timeouts, payload caps, oversized specs, malformed specs, abort signals, token leaks)
- [x] Documentation:
  - [x] Master `README.md`
  - [x] `docs/architecture.md`
  - [x] `docs/configuration.md`
  - [x] `docs/cli-reference.md`
  - [x] `docs/compatibility-rules.md`
  - [x] `docs/report-schema.md`
  - [x] `docs/troubleshooting.md`
- [x] Packaging dry run: `npm pack --dry-run` and clean install smoke test in temporary directory
- [x] Push to GitHub repository `https://github.com/arnnnnaaavvvvv/TraceGuard`

---

## Conservative Design Decisions
1. **Node.js Engine Minimum:** Node.js `>= 20.18.0` is chosen as the minimum LTS release because it provides native `fetch`, `AbortSignal.timeout`, and `structuredClone` without external dependencies.
2. **Mutating HTTP Requests:** Completely disabled by default in v0.1.0 to guarantee zero destructive writes against live APIs.
3. **Local References Only:** Only local `$ref` (`#/components/...`) pointers are resolved to protect against SSRF and ensure offline determinism.
4. **Baseline Overwrite Protection:** Saving to an existing baseline requires an explicit `--force` flag to prevent accidental loss of historical suppressions.
