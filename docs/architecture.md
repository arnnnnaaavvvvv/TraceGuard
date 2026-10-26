# TraceGuard System Architecture

## 1. Overview & High-Level Design

TraceGuard is designed around deterministic, pipeline-oriented execution. All data flows forward through pure functions and typed immutable structures:

```
                  ┌────────────────────────┐
                  │ OpenAPI Spec (YAML/JSON)│
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Spec Loader & $ref    │
                  │  Local Dereferencing   │
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Operation Normalizer  │
                  └───────────┬────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
  [Runtime Checker Mode]                  [Spec Diff Mode]
          │                                       │
  ┌───────┴───────────────┐               ┌───────┴───────────────┐
  │ HTTP Client (Safe)    │               │ AST Directional       │
  │ Concurrency / Limits  │               │ Comparator Engine     │
  └───────┬───────────────┘               └───────┬───────────────┘
          ▼                                       ▼
  ┌───────────────────────┐               ┌───────────────────────┐
  │ Ajv Schema Validator  │               │ Compatibility Rule    │
  │ 3.0 vs 3.1 Engines    │               │ Evaluation Matrix     │
  └───────┬───────────────┘               └───────┬───────────────┘
          │                                       │
          └───────────────────┬───────────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Baseline Filter       │
                  │  (Suppress Known Items)│
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Policy Engine         │
                  │  Threshold Evaluation  │
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Reporters             │
                  │  (Term, JSON, Markdown)│
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │ Exit Code (0, 1, 2, 3) │
                  └────────────────────────┘
```

## 2. Core Modules

### 2.1 Parser (`src/parser`)
- Loads YAML or JSON specifications from local files.
- Restricts reference resolution strictly to local pointers (`#/components/...`) to prevent SSRF vulnerabilities and ensure offline predictability.
- Detects OpenAPI 3.0.x vs 3.1.x versions and normalizes operations.

### 2.2 Checker (`src/checker`)
- Bounded HTTP execution engine built on Node.js native `fetch`.
- Employs streaming response body readers that terminate connections if payloads exceed `maxBodySizeBytes`.
- Employs `AbortController` timeouts for each request.
- Manages dual-engine Ajv instances: standard `Ajv` for OpenAPI 3.0 with `nullable` pre-transformations, and `Ajv2020` for OpenAPI 3.1 Draft 2020-12 schemas.

### 2.3 Diff Engine (`src/diff`)
- Evaluates directional backwards compatibility:
  - **Request side:** old clients calling new server.
  - **Response side:** old clients reading new server responses.
- Encapsulates 10 dedicated compatibility rules, returning `UNKNOWN` for non-deterministic polymorphic constructs (`allOf`, `oneOf`, `anyOf`, `not`).

### 2.4 Baseline Engine (`src/baseline`)
- Stores findings fingerprints as SHA-256 hashes (`ruleId:method:endpoint:location`).
- Never serializes response payloads or secrets.
- Requires explicit `--force` flags to prevent accidental overwrites.

### 2.5 Policy & Reporters (`src/policy`, `src/report`)
- Evaluates unsuppressed findings against user-configured severity and compatibility thresholds.
- Masks sensitive data (Bearer tokens, query keys, cookie headers) across all output formatters.
