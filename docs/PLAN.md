# TraceGuard Architectural & Implementation Plan

> **Tagline:** Catch breaking API changes before they reach production.  
> **Package:** `traceguard` (CLI + TypeScript SDK)  
> **Target Version:** `v0.1.0`  
> **Output Specification:** Deterministic, local-only OpenAPI contract validation and compatibility diffing.

---

## 1. Executive Summary & Central Example

TraceGuard is a lightweight, zero-dependency-runtime CLI and TypeScript SDK that:
1. Validates a running HTTP service against its OpenAPI 3.0.x / 3.1.x specification (`traceguard check`).
2. Diffs two OpenAPI specifications to detect breaking changes for API consumers (`traceguard diff`).
3. Manages baseline snapshots to prevent known legacy discrepancies from failing CI (`traceguard baseline`).

TraceGuard operates entirely offline without hosted services, accounts, telemetry, or AI heuristics. All validation and compatibility judgments are deterministic, reproducible, and verifiable.

### Central Example Walkthrough

#### Scenario Setup
An API contract specifies:
```yaml
openapi: 3.1.0
info:
  title: User Service
  version: 1.0.0
paths:
  /api/users/{id}:
    get:
      summary: Retrieve user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                required: [id, name, email]
                properties:
                  id:
                    type: string
                  name:
                    type: string
                  email:
                    type: string
```

#### Runtime Check Execution (`traceguard check`)
The running API responds to `GET /api/users/101` with status `200 OK` and payload:
```json
{
  "id": 101,
  "name": "Arnav"
}
```

TraceGuard generates two distinct findings:
1. **Type Mismatch on `id`:**
   - Rule: `TG-CONTRACT-TYPE-MISMATCH`
   - Location: `#/paths/~1api~1users~1{id}/get/responses/200/content/application~1json/schema/properties/id`
   - Expected: `string`
   - Actual: `number` (value `101`)
   - Severity: `critical`
2. **Missing Required Field `email`:**
   - Rule: `TG-CONTRACT-REQUIRED-MISSING`
   - Location: `#/paths/~1api~1users~1{id}/get/responses/200/content/application~1json/schema/required/2`
   - Expected: `email` present in response object
   - Actual: `undefined`
   - Severity: `critical`

#### Spec Diff Execution (`traceguard diff v1.yaml v2.yaml`)
If the specification is updated to reflect this new schema (changing `id` to `integer` and removing `email` from `required`), TraceGuard's diff engine reports:
1. **Breaking Response Change (Field Removed):**
   - Rule: `TG-COMPAT-REQUIRED-RESPONSE-FIELD-REMOVED`
   - Compatibility: `BREAKING`
   - Severity: `critical`
   - Message: `Required response property 'email' was removed from '200' response in GET /api/users/{id}. Existing clients accessing user.email will encounter runtime errors.`
2. **Breaking Response Change (Type Narrowed/Changed):**
   - Rule: `TG-COMPAT-RESPONSE-TYPE-CHANGED`
   - Compatibility: `BREAKING`
   - Severity: `critical`
   - Message: `Response property 'id' type changed from 'string' to 'integer' in '200' response in GET /api/users/{id}. Existing clients expecting string methods will crash.`

---

## 2. Requirements Analysis

### 2.1 Functional Requirements

1. **Spec Loading & Validation:**
   - Parse OpenAPI documents formatted as JSON or YAML.
   - Support OpenAPI specifications `3.0.0` through `3.0.4` and `3.1.0` through `3.1.1`.
   - Validate document structure against official OpenAPI schemas.
   - Resolve local `$ref` pointers (e.g., `#/components/schemas/User`).
   - Detect and report unresolvable local references with precise file locations.
   - Reject or warn on unsupported OpenAPI features (e.g., external URL `$ref` references, callbacks) with explicit diagnostic messages rather than silent omissions.

2. **Operation Extraction:**
   - Extract discrete operations indexing: HTTP method, path template, path parameters, query parameters, header parameters, request body schemas, response schemas keyed by HTTP status code, response headers, content types, and security requirements.
   - Support parameterized paths matching RFC 6570 URI templates.

3. **Runtime Contract Checker (`traceguard check`):**
   - Send requests against a running HTTP server for documented operations.
   - Restrict requests to safe HTTP methods by default: `GET`, `HEAD`, `OPTIONS`.
   - Validate HTTP status codes: any explicitly documented status code (e.g., `200`, `401`, `404`) is considered valid when observed under test. Undocumented status codes trigger violations.
   - Validate response `Content-Type` headers with charset tolerance (e.g., `application/json; charset=utf-8` matches `application/json`).
   - Validate required response headers declared in the specification.
   - Validate response body payloads against compiled JSON schemas.
   - Support bodyless responses (such as `204 No Content` or `304 Not Modified`) ensuring no body content is returned.
   - Detect and report malformed JSON responses with diagnostic parsing errors.

4. **Compatibility Diff Engine (`traceguard diff`):**
   - Compare two OpenAPI specifications (Base vs Revision).
   - Apply asymmetric directional rules for Request schemas versus Response schemas.
   - Categorize all detected changes by compatibility status (`BREAKING`, `POTENTIALLY_BREAKING`, `NON_BREAKING`, `UNKNOWN`) and severity (`critical`, `major`, `minor`, `info`).
   - Evaluate complex polymorphic schemas (`allOf`, `oneOf`, `anyOf`, `not`) safely, assigning `UNKNOWN` compatibility when deterministic equivalence cannot be proven.

5. **Baseline Management (`traceguard baseline`):**
   - Save current runtime or diff findings to a baseline file at a designated path (`--save <path>`). Never overwrite files without explicit flags.
   - Display active baseline entries (`--show <path>`).
   - Clear or suppress baseline entries (`--clear <path>`).
   - Filter subsequent test runs against the baseline: findings matching baseline signatures are flagged as suppressed and do not trigger failure exit codes.

6. **CI Policy & Exit Codes:**
   - Enforce policy thresholds (e.g., fail on any `critical` finding, fail on `BREAKING` changes).
   - Return deterministic process exit codes:
     - `0`: Pass (no policy violations, no infrastructure failures).
     - `1`: Policy Failed (findings violate configured rule/severity thresholds).
     - `2`: Bad Configuration / Bad Spec / CLI Usage Error.
     - `3`: Infrastructure Failure (target service unreachable, connection refused, DNS error, timeout). Network failures must never return code `0` or `1`. Note: HTTP `500 Internal Server Error` is an observed HTTP response, not an infrastructure failure.

7. **Reporting:**
   - Terminal reporter: ANSI-colored, categorized tables with concise remediation suggestions.
   - JSON reporter: Machine-readable output conforming to a versioned JSON schema (`v1`).
   - Markdown reporter: Formatted summaries suitable for CI job summaries (e.g., `$GITHUB_STEP_SUMMARY`) or PR comments.

8. **Security & Guardrails:**
   - Redact all authorization headers, tokens, passwords, and sensitive cookies across terminal logs, JSON artifacts, and Markdown summaries.
   - Enforce strict timeouts (default: 5000ms per request).
   - Enforce maximum response body size limits (default: 2MB) to prevent denial of service from unbounded payload streaming.
   - Enforce request concurrency limits (default: 5 concurrent requests).

### 2.2 Non-Functional Requirements

- **Determinism:** Given identical inputs (spec, config, API responses), TraceGuard must generate identical output byte-for-byte.
- **Zero Runtime Infrastructure:** No external network requests to SaaS endpoints, zero telemetry, zero model invocations.
- **Performance:** Parse and validate a 5,000-line OpenAPI spec in under 200ms; execute runtime checks with minimal memory overhead (< 100MB RSS).
- **TypeScript Strictness:** Written with `strict: true`, `noImplicitAny: true`, and zero unchecked type assertions.

### 2.3 Scope Boundaries

#### In-Scope (v0.1.0)
- Local OpenAPI 3.0.x and 3.1.x JSON and YAML files.
- Local `$ref` dereferencing.
- Safe HTTP methods runtime checking (`GET`, `HEAD`, `OPTIONS`).
- Comprehensive status code, header, content-type, and body schema validation.
- OpenAPI diff engine with directional request/response rules.
- Baseline file creation and filtering.
- Terminal, JSON, and Markdown formatters.
- Exit codes `0`, `1`, `2`, `3`.
- Sensitive token redaction, timeout control, response size caps, concurrency throttling.

#### Deferred Roadmap (Out of Scope for v0.1.0)
- Mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) requiring stateful fixture setup or rollback.
- Remote specification fetching over HTTP(S) with SSRF validation layers.
- Automatic mock generation or mock HTTP server hosting.
- Complex authentication handshakes (OAuth2 PKCE, OpenID Connect discovery flows) beyond static Bearer tokens and API key headers.
- GitHub/GitLab PR comment bots and webhook receivers.
- Automated retry policies with exponential backoff.
- LLM/AI-driven natural language explanations or patch generators.

### 2.4 Assumptions

1. Target APIs are reachable over local network or localhost via standard HTTP/HTTPS protocols.
2. The running API is in a testable state where `GET`/`HEAD`/`OPTIONS` endpoints do not trigger destructive state modifications.
3. Path parameters for runtime checks can be provided via configuration or default dummy values (e.g., `1`, `test`).
4. Specifications reside on the local filesystem and are readable by the executing process.

---

## 3. Dependency Choices & Environment

### 3.1 Node.js Runtime Verification

TraceGuard targets modern Long-Term Support (LTS) releases of Node.js.
- **Active LTS:** Node.js 22 (`v22.x`, Codename Jod).
- **Maintenance LTS:** Node.js 20 (`v20.x`, Codename Iron).
- **Minimum Supported Engine:** `node >= 20.18.0`.
- **Justification:** Node 20.18+ provides native global `fetch`, standard `crypto.subtle`, stable `structuredClone`, and high-performance ESM/CJS interop without external polyfills.

### 3.2 Dependency Table

| Package | Version Range | One-Line Justification |
| :--- | :--- | :--- |
| `commander` | `^13.1.0` | Zero-dependency, industry-standard CLI argument parser with native support for subcommands and custom exit codes. |
| `yaml` | `^2.7.0` | Robust, spec-compliant YAML 1.2 parser preserving AST position data for line-level error reporting. |
| `@scalar/openapi-parser` | `^0.12.0` | Modern TypeScript OpenAPI parser supporting both 3.0.x and 3.1.x with built-in schema validation and local `$ref` dereferencing. |
| `ajv` | `^8.17.1` | Fastest JSON Schema validator supporting Draft-07 and Draft 2020-12 with comprehensive error reporting. |
| `ajv-formats` | `^3.0.1` | Official format validator plugin for Ajv covering `date-time`, `email`, `uri`, `uuid`, and `ipv4`/`ipv6`. |
| `vitest` | `^3.0.0` | Ultra-fast, ESM-native test runner with out-of-the-box TypeScript execution, mock timers, and native coverage reporting. |
| `tsup` | `^8.4.0` | Zero-config, esbuild-powered TypeScript bundler generating dual ESM/CJS builds and `.d.ts` declaration bundles. |
| `eslint` | `^9.20.0` | Standard code quality linter running flat config with `@typescript-eslint` to enforce strict formatting and typing rules. |

### 3.3 Ajv Dual-Engine Architecture: OpenAPI 3.0 vs 3.1

OpenAPI 3.0 and OpenAPI 3.1 handle JSON Schema differently:
- **OpenAPI 3.0.x:** Based on JSON Schema Draft-04/07 with custom extensions: `nullable: true` indicates that `null` is an allowed value alongside the declared `type`.
- **OpenAPI 3.1.x:** 100% aligned with JSON Schema Draft 2020-12: `nullable` is prohibited; nullable values use union type arrays (e.g., `type: ["string", "null"]`).

#### TraceGuard Validation Strategy
To avoid schema compilation errors and incorrect rejections, TraceGuard uses two distinct validator instances:

```
                      ┌────────────────────────────┐
                      │    OpenAPI Specification   │
                      └──────────────┬─────────────┘
                                     │
                     Detect spec.openapi version
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       OpenAPI 3.0.x (Draft-07)                OpenAPI 3.1.x (2020-12)
                 │                                       │
     Ajv Standard Instance (Draft-07)         Ajv2020 Instance (Draft 2020-12)
     + Custom keyword: `nullable`             + Native `type: [T, "null"]`
     + `coerceTypes: false`                   + `coerceTypes: false`
     + `allErrors: true`                      + `allErrors: true`
     + `strict: false`                        + `strict: false`
     + `ajv-formats`                          + `ajv-formats`
```

1. **For OpenAPI 3.0 Documents:**
   TraceGuard initializes standard `Ajv` with a custom keyword definition for `nullable`:
   ```typescript
   ajv30.addKeyword({
     keyword: "nullable",
     schemaType: "boolean",
     compile: (nullable: boolean) => (data: unknown) => {
       if (nullable && data === null) return true;
       return true; // Delegate non-null type validation to standard type keyword
     }
   });
   ```
   Before running property validation, if `data === null` and `schema.nullable === true`, validation succeeds immediately without triggering `type` mismatch errors.

2. **For OpenAPI 3.1 Documents:**
   TraceGuard initializes `Ajv2020` directly from `ajv/dist/2020.js`, which adheres strictly to JSON Schema Draft 2020-12 semantics.

---

## 4. Human-Readable Guidelines & Project Structure

### 4.1 Engineering Principles

- **Flat & Obvious:** Maximum 2 folder levels under `src/`. No deep nested directory hierarchies.
- **One Responsibility Per File:** Files are capped at ~200 lines. Functions are capped at ~40 lines with a maximum of 3 positional parameters (use an options object for 4+ parameters).
- **Plain Data & Functions:** Classes are restricted exclusively to custom `TraceGuardError` exception hierarchies. All core business logic is implemented via pure, testable functions and plain typed objects. No dependency injection frameworks, decorators, or unreadable generic metaprogramming.
- **Descriptive Names:** Explicit, readable naming conventions (e.g., `findMissingRequiredFields`, `compareResponseSchemas`) rather than abbreviated or overloaded terms (`handle`, `process`, `data`).
- **Code Comments Explain WHY:** Comments never restate syntax. Every rule file begins with a mandatory 3-line comment header:
  ```typescript
  // DETECTS: What specific condition or delta this rule identifies.
  // WHY:     Why this causes real-world failures for API consumers or clients.
  // LIMITS:  What this rule cannot verify (e.g., dynamic conditional dependencies).
  ```
- **Folder Documentation:** Every directory under `src/` contains a dedicated `README.md` documenting its single purpose and calling dependencies.
- **Thin CLI Layer:** The CLI entry point parses command-line arguments and delegates directly to core SDK functions. The CLI contains zero business logic, schema parsing, or diff calculations.

### 4.2 Folder Structure

```
traceguard/
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI workflow
├── docs/
│   └── PLAN.md                        # Master architectural plan (this document)
├── fixtures/
│   ├── central-example/
│   │   ├── spec-v1.yaml               # Central example: base spec
│   │   ├── spec-v2.yaml               # Central example: breaking spec
│   │   └── api-response.json          # Central example: mismatching response
│   ├── specs-3.0/
│   │   ├── valid-petstore.yaml
│   │   └── invalid-refs.yaml
│   ├── specs-3.1/
│   │   ├── valid-users.json
│   │   └── polymorphic.yaml
│   └── baselines/
│       └── sample-baseline.json
├── src/
│   ├── baseline/
│   │   ├── README.md                  # Baseline storage and filtering overview
│   │   ├── filter.ts                  # Suppress findings matching baseline
│   │   └── store.ts                   # Read, write, and verify baseline files
│   ├── checker/
│   │   ├── README.md                  # Runtime verification overview
│   │   ├── client.ts                  # Safe HTTP client with timeouts & size limits
│   │   ├── executor.ts                # Orchestrates requests for operations
│   │   ├── rules.ts                   # Runtime rule validation handlers
│   │   └── validate.ts                # Ajv schema validation wrapper
│   ├── cli/
│   │   ├── README.md                  # CLI command handlers overview
│   │   ├── args.ts                    # Commander program and flag definitions
│   │   └── index.ts                   # CLI entry point (bin)
│   ├── config/
│   │   ├── README.md                  # Config loader and validation overview
│   │   ├── defaults.ts                # Fallback configuration constants
│   │   ├── loader.ts                  # Read config from file or CLI options
│   │   └── schema.ts                  # Config schema validation
│   ├── diff/
│   │   ├── README.md                  # Specification diffing engine overview
│   │   ├── changes.ts                 # Change record factory and formatters
│   │   ├── comparator.ts              # Tree traversal comparing old vs new spec
│   │   └── rules.ts                   # Compatibility rule evaluators
│   ├── parser/
│   │   ├── README.md                  # Spec loader and operations extractor
│   │   ├── loader.ts                  # Load YAML/JSON and resolve local $ref
│   │   ├── operations.ts              # Extract operations into normalized model
│   │   └── references.ts              # Local reference validation and lookup
│   ├── policy/
│   │   ├── README.md                  # CI policy evaluator overview
│   │   ├── evaluator.ts               # Assess findings against failure rules
│   │   └── exit-codes.ts              # Compute process exit codes (0, 1, 2, 3)
│   ├── report/
│   │   ├── README.md                  # Output formatters overview
│   │   ├── json.ts                    # Versioned JSON report generator
│   │   ├── markdown.ts                # Markdown summary generator
│   │   ├── redaction.ts               # Sensitive token and header mask utility
│   │   └── terminal.ts                # ANSI terminal table formatter
│   ├── types/
│   │   ├── README.md                  # Core TypeScript types overview
│   │   ├── core.ts                    # Operation, Finding, Report, Policy types
│   │   ├── errors.ts                  # TraceGuardError hierarchy
│   │   └── rules.ts                   # Rule definitions and compatibility enums
│   └── index.ts                       # Public TypeScript SDK exports
├── tests/
│   ├── integration/
│   │   ├── check.test.ts              # Runtime check against mock HTTP server
│   │   ├── diff.test.ts               # Spec diff integration tests
│   │   ├── mock-server.ts             # Local HTTP server covering all edge cases
│   │   └── security.test.ts           # Token redaction and resource limit tests
│   └── unit/
│       ├── baseline.test.ts           # Baseline store and filter unit tests
│       ├── config.test.ts             # Config schema validation unit tests
│       ├── parser.test.ts             # Spec loading and $ref dereferencing tests
│       ├── policy.test.ts             # Policy evaluation and exit code tests
│       └── rules.test.ts              # Isolated test cases for each rule ID
├── eslint.config.js
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## 5. Core Types & Domain Model

All core domain definitions are placed in `src/types/`.

### 5.1 Domain Types (`src/types/core.ts`)

```typescript
export type HttpMethod = 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Severity = 'critical' | 'major' | 'minor' | 'info';

export type CompatibilityType =
  | 'BREAKING'
  | 'POTENTIALLY_BREAKING'
  | 'NON_BREAKING'
  | 'UNKNOWN';

export interface ParameterDefinition {
  readonly name: string;
  readonly in: 'path' | 'query' | 'header';
  readonly required: boolean;
  readonly schema?: Record<string, unknown>;
}

export interface ResponseDefinition {
  readonly statusCode: string; // e.g., '200', '404', 'default'
  readonly description: string;
  readonly headers?: Record<string, { required?: boolean; schema?: Record<string, unknown> }>;
  readonly content?: Record<string, { schema: Record<string, unknown> }>;
}

export interface Operation {
  readonly operationId?: string;
  readonly method: HttpMethod;
  readonly pathTemplate: string;
  readonly parameters: readonly ParameterDefinition[];
  readonly requestBody?: {
    readonly required: boolean;
    readonly content: Record<string, { schema: Record<string, unknown> }>;
  };
  readonly responses: Record<string, ResponseDefinition>;
  readonly security?: readonly Record<string, readonly string[]>[];
}

export interface Finding {
  readonly id: string; // Deterministic hash of ruleId + method + endpoint + location
  readonly ruleId: string;
  readonly severity: Severity;
  readonly compatibility: CompatibilityType;
  readonly method: HttpMethod;
  readonly endpoint: string;
  readonly location: string; // RFC 6901 JSON Pointer
  readonly expected: string;
  readonly actual: string;
  readonly message: string;
  readonly suggestion: string;
  readonly suppressed?: boolean; // Set true when matching an active baseline
}

export interface CompatChange {
  readonly ruleId: string;
  readonly compatibility: CompatibilityType;
  readonly severity: Severity;
  readonly method?: HttpMethod;
  readonly endpoint?: string;
  readonly location: string;
  readonly description: string;
  readonly before?: string;
  readonly after?: string;
}

export interface BaselineEntry {
  readonly fingerprint: string;
  readonly ruleId: string;
  readonly method: string;
  readonly endpoint: string;
  readonly location: string;
  readonly recordedAt: string;
}

export interface BaselineFile {
  readonly version: '1';
  readonly createdAt: string;
  readonly entries: readonly BaselineEntry[];
}

export interface Policy {
  readonly failOnBreaking: boolean;
  readonly failOnPotentiallyBreaking: boolean;
  readonly maxCriticalFindings: number;
  readonly maxMajorFindings: number;
  readonly ignoredRules: readonly string[];
}

export interface ReportSummary {
  readonly totalOperations: number;
  readonly checkedOperations: number;
  readonly totalFindings: number;
  readonly criticalCount: number;
  readonly majorCount: number;
  readonly minorCount: number;
  readonly infoCount: number;
  readonly suppressedCount: number;
  readonly breakingChangesCount: number;
}

export interface Report {
  readonly schemaVersion: '1.0.0';
  readonly toolVersion: string;
  readonly timestamp: string;
  readonly mode: 'check' | 'diff';
  readonly summary: ReportSummary;
  readonly findings: readonly Finding[];
  readonly changes?: readonly CompatChange[];
  readonly policyResult: {
    readonly passed: boolean;
    readonly failureReasons: readonly string[];
  };
}
```

### 5.2 Error Hierarchy (`src/types/errors.ts`)

TraceGuard standardizes error handling through specific error classes inheriting from `TraceGuardError`. The CLI converts these errors into designated exit codes.

```typescript
export class TraceGuardError extends Error {
  public readonly exitCode: number;
  constructor(message: string, exitCode: number = 2) {
    super(message);
    this.name = 'TraceGuardError';
    this.exitCode = exitCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Exit Code 2: Bad spec, syntax error, or unresolvable reference
export class SpecLoadError extends TraceGuardError {
  public readonly specPath: string;
  public readonly pointer?: string;
  constructor(message: string, specPath: string, pointer?: string) {
    super(`Failed to load OpenAPI spec at '${specPath}': ${message}`, 2);
    this.name = 'SpecLoadError';
    this.specPath = specPath;
    this.pointer = pointer;
  }
}

// Exit Code 2: Invalid CLI configuration or flags
export class ConfigError extends TraceGuardError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 2);
    this.name = 'ConfigError';
  }
}

// Exit Code 3: Network unreachable, connection refused, DNS error, or timeout
export class NetworkError extends TraceGuardError {
  public readonly targetUrl: string;
  public readonly causeError?: Error;
  constructor(message: string, targetUrl: string, causeError?: Error) {
    super(`Network failure when contacting '${targetUrl}': ${message}`, 3);
    this.name = 'NetworkError';
    this.targetUrl = targetUrl;
    this.causeError = causeError;
  }
}

// Exit Code 1: Policy validation failed due to breaking changes or contract violations
export class PolicyViolationError extends TraceGuardError {
  public readonly failureCount: number;
  constructor(message: string, failureCount: number) {
    super(`Policy violation: ${message}`, 1);
    this.name = 'PolicyViolationError';
    this.failureCount = failureCount;
  }
}
```

---

## 6. Rule Catalog

TraceGuard defines 7 Runtime Contract Rules and 10 Compatibility Diff Rules.

### 6.1 Rule Separation Principle
- **Compatibility:** Evaluates backwards compatibility from the perspective of an existing client application (`BREAKING`, `POTENTIALLY_BREAKING`, `NON_BREAKING`, `UNKNOWN`).
- **Severity:** Evaluates the engineering impact and urgency for CI failure thresholds (`critical`, `major`, `minor`, `info`).
- **Polymorphism Rule:** Any rule evaluation involving `allOf`, `oneOf`, `anyOf`, or `not` that cannot be proven mathematically identical defaults to `UNKNOWN` compatibility with `major` severity.

### 6.2 Catalog Table

| Rule ID | Mode | Trigger | Compatibility | Severity | Assumptions | Known Limits |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TG-CONTRACT-STATUS-MISMATCH` | Runtime | Observed HTTP status is not declared in OpenAPI `responses` object for this operation. | `BREAKING` | `critical` | Server returns valid HTTP response; status code is numerical. | Does not inspect whether an unhandled 500 contains diagnostic stack traces. |
| `TG-CONTRACT-TYPE-MISMATCH` | Runtime | Response body property type does not match schema type (e.g., number received when string declared). | `BREAKING` | `critical` | JSON payload parsed successfully; property path exists. | Cannot detect subtle string semantic variations (e.g. UUID vs arbitrary string) unless format is configured. |
| `TG-CONTRACT-REQUIRED-MISSING` | Runtime | A property marked as `required` in response schema is missing (`undefined`) from response object. | `BREAKING` | `critical` | Response payload is a JSON object. | Does not detect properties sent as `null` (handled by `TG-CONTRACT-TYPE-MISMATCH` unless `nullable: true`). |
| `TG-CONTRACT-CONTENT-TYPE-MISMATCH`| Runtime | Response `Content-Type` header media-type does not match any documented response content media-type. | `POTENTIALLY_BREAKING` | `major` | Match is charset-tolerant (ignores `; charset=utf-8`). | Does not evaluate custom vendor media type parameters beyond base mime. |
| `TG-CONTRACT-HEADER-MISSING` | Runtime | A response header declared with `required: true` is not present in HTTP response headers. | `BREAKING` | `major` | Headers compared case-insensitively. | Cannot evaluate headers generated conditionally by edge reverse proxies. |
| `TG-CONTRACT-INVALID-JSON` | Runtime | Response `Content-Type` declares JSON media type, but body cannot be parsed by JSON parser. | `BREAKING` | `critical` | Target responded with body length > 0. | Truncated responses caused by network timeouts are categorized as NetworkError (exit code 3). |
| `TG-CONTRACT-ENUM-MISMATCH` | Runtime | Response property value is not contained within the declared `enum` array in contract schema. | `BREAKING` | `major` | Field is present and non-null. | Does not validate open-ended dynamic enums not documented in schema. |
| `TG-COMPAT-ENDPOINT-REMOVED` | Diff | An entire path template present in base spec is missing from revised spec. | `BREAKING` | `critical` | Path matching accounts for equivalent templating (e.g. `{id}` vs `{userId}`). | Cannot detect if path was renamed and handled via 301 Permanent Redirect. |
| `TG-COMPAT-METHOD-REMOVED` | Diff | An HTTP method under an existing path template was removed in revised spec. | `BREAKING` | `critical` | Method was declared in base spec. | Does not evaluate alternative endpoints offering duplicate capabilities. |
| `TG-COMPAT-STATUS-REMOVED` | Diff | A documented success or error status code was removed from operation's responses. | `BREAKING` | `major` | Status code was explicitly listed in base. | Does not flag removal of catch-all `default` response if specific codes remain. |
| `TG-COMPAT-REQUIRED-REQUEST-FIELD-ADDED` | Diff | A new required field is added to request body, query parameter, or header. | `BREAKING` | `critical` | Base spec did not declare this field, or declared it as optional. | Default server fallbacks cannot be inferred from OpenAPI schema alone. |
| `TG-COMPAT-REQUIRED-RESPONSE-FIELD-REMOVED` | Diff | A property in `required` array of a response schema was removed from revised spec. | `BREAKING` | `critical` | Base response marked property as required. | Cannot verify if client application actually consumes the removed property. |
| `TG-COMPAT-RESPONSE-TYPE-CHANGED` | Diff | Property type changed incompatibly (e.g., `string` to `integer`, or union narrowed). | `BREAKING` | `critical` | Schemas at matching JSON pointers compared. | Complex union conversions (`string` -> `string \| number`) return `NON_BREAKING`. |
| `TG-COMPAT-ENUM-NARROWED` | Diff | Enum values in request parameter removed, or enum values in response added. | `BREAKING` | `major` | Enum arrays present in both specs. | Directionality applied: narrowing request enums breaks clients; expanding response enums breaks strict clients. |
| `TG-COMPAT-NULLABLE-CHANGED` | Diff | A response property changed from `nullable: true` (or `type: [T, null]`) to non-nullable, or request changed to non-nullable. | `POTENTIALLY_BREAKING` | `major` | OpenAPI 3.0 `nullable` and OpenAPI 3.1 type unions normalized before comparison. | Client-side null safety settings cannot be verified from spec alone. |
| `TG-COMPAT-AUTH-CHANGED` | Diff | Security requirement added, tightened, or required scopes expanded. | `BREAKING` | `critical` | Security requirement applied at operation or root level. | Does not evaluate whether existing API tokens have been grandfathered in. |
| `TG-COMPAT-MEDIA-TYPE-REMOVED` | Diff | An accepted request or response content-type media-type was removed. | `BREAKING` | `major` | Content map keys compared. | Wildcard media-types (`*/*`) require special fallback handling. |

---

## 7. Finding Data Structure

Every detected contract discrepancy or compatibility violation produces a standardized `Finding` object.

### 7.1 Finding Schema & RFC 6901 JSON Pointer

The `location` field contains an RFC 6901 compliant JSON Pointer referencing the precise schema node within the OpenAPI specification. Characters `/` and `~` are escaped as `~1` and `~0` respectively.

### 7.2 Central Example Finding (Serialized JSON)

```json
{
  "id": "e8a932b1f80d52b9",
  "ruleId": "TG-CONTRACT-TYPE-MISMATCH",
  "severity": "critical",
  "compatibility": "BREAKING",
  "method": "GET",
  "endpoint": "/api/users/{id}",
  "location": "#/paths/~1api~1users~1{id}/get/responses/200/content/application~1json/schema/properties/id/type",
  "expected": "string",
  "actual": "number (value: 101)",
  "message": "Response property 'id' has type 'number', but the contract requires 'string'.",
  "suggestion": "Update the API service to return a string for 'id', or update the OpenAPI contract if this is an intended schema modification.",
  "suppressed": false
}
```

```json
{
  "id": "73c914bf6a2088ea",
  "ruleId": "TG-CONTRACT-REQUIRED-MISSING",
  "severity": "critical",
  "compatibility": "BREAKING",
  "method": "GET",
  "endpoint": "/api/users/{id}",
  "location": "#/paths/~1api~1users~1{id}/get/responses/200/content/application~1json/schema/required/2",
  "expected": "property 'email' present",
  "actual": "missing (undefined)",
  "message": "Response body is missing required property 'email'.",
  "suggestion": "Ensure the API implementation includes 'email' in the response object or remove it from the 'required' list in the OpenAPI spec.",
  "suppressed": false
}
```

---

## 8. Request vs Response Compatibility Logic (Plain English)

API compatibility is fundamentally **asymmetric**. The direction of data flow dictates whether a change breaks existing consumers.

### 8.1 The Perspective of the Client

In an established API ecosystem:
- **Clients are Old:** Deployed client applications, mobile apps, third-party integrations, and frontend SPAs cannot be upgraded synchronously with the server.
- **Server is New:** The newly deployed server implementation must maintain backwards compatibility with existing clients.

### 8.2 Plain English Principles

#### Principle 1: Responses (What the Server Sends to Old Clients)
- **Adding a field is NON_BREAKING:** Old clients reading responses ignore unexpected or extra fields under standard JSON processing.
- **Removing a field is BREAKING:** Old clients expect the field to exist. If the field is removed, client code accessing `response.data.field` encounters `undefined` or throws null pointer exceptions.
- **Removing or narrowing an enum value is NON_BREAKING:** If the server previously could return `["active", "pending", "archived"]` and now only returns `["active", "archived"]`, old clients handle the returned values safely.
- **Expanding an enum value is BREAKING:** If the server returns a new enum value (e.g., `"suspended"`) that old clients do not recognize, clients with exhaustive `switch` statements or strict validation will crash.
- **Changing types is BREAKING:** If an old client expects a `string` (e.g., calling `.toLowerCase()`) and receives a `number`, client runtime execution fails.

#### Principle 2: Requests (What Old Clients Send to the New Server)
- **Adding a REQUIRED field is BREAKING:** Old clients do not know this new field exists. They will not send it. The new server will reject their requests with `400 Bad Request`.
- **Adding an OPTIONAL field is NON_BREAKING:** Old clients do not send it; the server supplies a default value.
- **Removing a required field or making it optional is NON_BREAKING:** Old clients continue sending the field as before. The new server simply ignores or accepts it.
- **Narrowing an accepted enum is BREAKING:** If the old contract accepted `["light", "dark", "auto"]` and the new contract only accepts `["light", "dark"]`, old clients sending `"auto"` will be rejected with `400 Bad Request`.
- **Expanding an accepted enum is NON_BREAKING:** The server now accepts more values than old clients send. All old client payloads remain valid.

### 8.3 Summary Table: Request vs Response Rules

| Schema Delta | Request Context | Response Context |
| :--- | :--- | :--- |
| **Field Added (Required)** | **BREAKING** (Old clients omit it $\rightarrow$ 400 error) | **NON_BREAKING** (Old clients ignore extra fields) |
| **Field Added (Optional)** | **NON_BREAKING** | **NON_BREAKING** |
| **Field Removed** | **NON_BREAKING** (Server ignores legacy fields) | **BREAKING** (Old client expects field $\rightarrow$ crash) |
| **Type Changed / Narrowed** | **BREAKING** (Server rejects client's old type) | **BREAKING** (Client parser fails on new type) |
| **Enum Value Added** | **NON_BREAKING** (Server accepts wider domain) | **BREAKING** (Old client cannot parse new value) |
| **Enum Value Removed** | **BREAKING** (Server rejects previously valid value) | **NON_BREAKING** (Server produces subset of expected) |
| **Nullable: True $\rightarrow$ False** | **BREAKING** (Server rejects null from old client) | **POTENTIALLY_BREAKING** (Client may rely on null checks) |
| **Nullable: False $\rightarrow$ True** | **NON_BREAKING** | **BREAKING** (Client unexpected null $\rightarrow$ crash) |

---

## 9. Configuration Schema

TraceGuard configuration is read from `traceguard.config.json`, `.traceguardrc.yaml`, or specified via the `--config` CLI option. The configuration is validated against this schema **before** any network call or spec parsing is performed.

### 9.1 TypeScript Definition (`src/config/schema.ts`)

```typescript
export interface TraceGuardConfig {
  readonly $schema?: string;
  readonly spec: string;                        // Path to target OpenAPI spec (YAML or JSON)
  readonly baseUrl?: string;                    // Base URL for runtime checking (e.g. http://localhost:8080)
  readonly timeoutMs: number;                   // Request timeout in milliseconds (default: 5000)
  readonly maxBodySizeBytes: number;            // Maximum response body size in bytes (default: 2097152 = 2MB)
  readonly concurrency: number;                 // Maximum concurrent requests (default: 5)
  readonly headers?: Record<string, string>;    // Custom request headers (e.g. Authorization, X-API-Key)
  readonly safeMethodsOnly: boolean;            // Allow only GET, HEAD, OPTIONS (default: true)
  readonly baselinePath?: string;               // Path to baseline JSON snapshot file
  readonly policy: {
    readonly failOnBreaking: boolean;           // Exit 1 if any BREAKING change detected (default: true)
    readonly failOnPotentiallyBreaking: boolean;// Exit 1 if POTENTIALLY_BREAKING detected (default: false)
    readonly maxCriticalFindings: number;       // Maximum allowed critical findings before exit 1 (default: 0)
    readonly maxMajorFindings: number;          // Maximum allowed major findings before exit 1 (default: 0)
    readonly ignoredRules: readonly string[];   // Rule IDs to suppress globally
  };
  readonly pathParameters?: Record<string, Record<string, string | number>>; // Dummy values for path templates
}
```

### 9.2 Validation Rules (Pre-Flight Checks)
Before initiating any network request or loading specs:
1. `spec` must be a non-empty string referencing an existing local file.
2. `baseUrl` (if provided for `check` mode) must be a syntactically valid URL with protocol `http:` or `https:`.
3. `timeoutMs` must be an integer between `100` and `60000`.
4. `maxBodySizeBytes` must be an integer between `1024` (1KB) and `52428800` (50MB).
5. `concurrency` must be an integer between `1` and `50`.
6. `safeMethodsOnly` must be a boolean; if false, a warning is logged alerting the user that mutating requests are disabled in v0.1.0.

### 9.3 Default Configuration (`src/config/defaults.ts`)

```typescript
export const DEFAULT_CONFIG: TraceGuardConfig = {
  spec: './openapi.yaml',
  timeoutMs: 5000,
  maxBodySizeBytes: 2 * 1024 * 1024, // 2MB
  concurrency: 5,
  safeMethodsOnly: true,
  policy: {
    failOnBreaking: true,
    failOnPotentiallyBreaking: false,
    maxCriticalFindings: 0,
    maxMajorFindings: 0,
    ignoredRules: [],
  },
};
```

---

## 10. Security Model

TraceGuard enforces zero-trust security invariants across all execution paths.

### 10.1 Safe Spec Parsing & Execution Prevention
- **No Evaluation:** OpenAPI specifications are parsed purely as static data using `yaml` and `JSON.parse`. TraceGuard never uses `eval()`, `new Function()`, or dynamic module imports.
- **Local Resolution Only:** Reference resolution is strictly limited to local pointers (`#/components/...`). External network `$ref` URLs (`https://...` or `file://...`) are not fetched, eliminating Server-Side Request Forgery (SSRF) and local file inclusion vulnerabilities during spec parsing.

### 10.2 Secret Redaction
Sensitive information must never appear in terminal outputs, debug logs, JSON artifacts, or Markdown reports:
- **Header Masking:** Any request or response header matching the following case-insensitive list is redacted to `[REDACTED]`:
  - `authorization`
  - `proxy-authorization`
  - `x-api-key`
  - `api-key`
  - `cookie`
  - `set-cookie`
  - `x-auth-token`
- **Bearer Token Masking:** Any string matching the regex `/(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*/gi` is replaced with `$1[REDACTED]`.
- **Query Parameter Masking:** URL query parameters matching `token`, `key`, `secret`, `password`, or `auth` have their values masked.

### 10.3 Resource Protection & DoS Prevention
- **Request Timeouts:** All HTTP requests use `AbortController` bounded by `timeoutMs` (default 5000ms). Unresponsive endpoints abort promptly with exit code `3`.
- **Response Size Caps:** HTTP response bodies are consumed via a streaming reader that counts bytes. If the incoming payload exceeds `maxBodySizeBytes` (default 2MB), the connection is closed immediately, and a `TG-CONTRACT-INVALID-JSON` or resource error is triggered. Memory is protected against unbounded memory allocations.
- **Concurrency Throttling:** Network calls run through a worker pool with a maximum concurrency limit (default 5) to prevent overwhelming target test environments.

### 10.4 Safe-Methods-Only Enforcement
- In `v0.1.0`, TraceGuard defaults to executing only idempotent, safe HTTP methods: `GET`, `HEAD`, and `OPTIONS`.
- Mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) are skipped and logged as info-level entries, preventing inadvertent database writes or state corruption against running environments.

---

## 11. Test Strategy & Quality Plan

TraceGuard enforces a minimum **85% statement coverage** threshold across all packages, with direct isolated unit tests for every rule ID.

### 11.1 Mock HTTP Server (`tests/integration/mock-server.ts`)

An embedded, zero-dependency Node.js HTTP server (`node:http`) provides reproducible integration testing across 11 core scenarios:

1. **Valid Contract:** Returns status 200, matching headers, and full payload matching schema.
2. **Wrong Type:** Returns status 200 with `{ id: 101, name: "Arnav" }` where spec requires string `id` (Central Example Case 1).
3. **Missing Field:** Returns status 200 with `{ id: "101", name: "Arnav" }` omitting required `email` (Central Example Case 2).
4. **Undocumented Status:** Returns status 503 or 418 when spec only documents 200 and 404.
5. **Documented 404:** Returns status 404 with documented error schema (must PASS, demonstrating any documented status is acceptable).
6. **Bad Content-Type:** Returns status 200 with header `Content-Type: text/plain` when spec requires `application/json`.
7. **Bodyless 204:** Returns status 204 with empty body (passes), and returns status 204 with non-empty body (fails contract).
8. **Malformed JSON:** Returns status 200 with header `Content-Type: application/json` and body `{"unclosed_json: true`.
9. **Slow Response:** Artificial delay exceeding test timeout to trigger `NetworkError` and verify exit code `3`.
10. **Refused Connection:** Port where no server is listening, triggering `ECONNREFUSED` and verifying exit code `3`.
11. **Sensitive Values:** Responds with `Set-Cookie` and `Authorization` headers to verify redaction across all reports.

### 11.2 Unit Test Suites

- **`rules.test.ts`:** Tests each of the 7 runtime rules and 10 compat rules with minimal, isolated JSON payloads and schemas.
- **`parser.test.ts`:** Tests OpenAPI 3.0 vs 3.1 structure validation, circular `$ref` detection, and missing reference reporting.
- **`comparator.test.ts`:** Tests directional request vs response diff logic using AST comparisons.
- **`baseline.test.ts`:** Tests baseline saving, fingerprint generation, deterministic ordering, and finding suppression.
- **`policy.test.ts`:** Tests failure thresholds, severity weighting, and exit code calculation logic.
- **`redaction.test.ts`:** Tests regex and header masking across diverse token formats.

---

## 12. Milestones & Acceptance Criteria

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MILESTONE ROADMAP                               │
└────────────────────────────────────────────────────────────────────────┘
    M1: Foundation & Spec Loading
        ├── Project scaffolding, TypeScript, Vitest, tsup
        └── Load OpenAPI 3.0/3.1, local $ref dereferencing
    ▼
    M2: Runtime Contract Checker
        ├── Safe HTTP client with timeouts and size limits
        └── Validate status, content-type, headers, and Ajv body schemas
    ▼
    M3: Spec Diff & Baseline Store
        ├── Directional Request/Response comparator
        └── Baseline snapshot store, show, and suppress filtering
    ▼
    M4: Policy Engine, Exit Codes, Reporting & CI
        ├── Policy evaluation and exit codes (0, 1, 2, 3)
        └── Terminal, JSON, and Markdown formatters + GitHub Actions
    ▼
    M5: Hardening, Documentation & npm Dry-Run
        ├── 85%+ coverage enforcement, docs, npm pack validation
        └── End-to-end Central Example verification
```

### Milestone 1: Foundation & Spec Loading
- **Objectives:** Initialize repository, build setup, schema loading, and local `$ref` resolution.
- **Deliverables:**
  - `package.json`, `tsconfig.json`, `tsup.config.ts`, `eslint.config.js`.
  - `src/types/` domain models and `TraceGuardError` classes.
  - `src/parser/loader.ts`, `src/parser/references.ts`, and `src/parser/operations.ts`.
- **Acceptance Criteria:**
  - Loads OpenAPI 3.0.x and 3.1.x YAML and JSON fixtures without error.
  - Resolves nested local `$ref` pointers correctly.
  - Throws `SpecLoadError` (exit code 2) with clear pointer and file location when an invalid local `$ref` is encountered.
  - Unsupported features (e.g. remote `$ref`) emit explicit diagnostic warnings.

### Milestone 2: Runtime Contract Checker
- **Objectives:** HTTP execution engine, schema compilation, and response verification.
- **Deliverables:**
  - `src/checker/client.ts` with streaming size limiter, `AbortController` timeout, and concurrency queue.
  - `src/checker/validate.ts` supporting dual Ajv (3.0 Draft-07 + `nullable`, 3.1 2020-12).
  - `src/checker/rules.ts` implementing all 7 runtime rules.
- **Acceptance Criteria:**
  - Executes Central Example: flags `id` type mismatch (`string` vs `number`) and missing `email` field.
  - Validates any documented status code (including 404 or 500 when documented in spec).
  - Flags undocumented status codes via `TG-CONTRACT-STATUS-MISMATCH`.
  - Aborts requests exceeding `timeoutMs` and returns `NetworkError` (exit code 3).
  - Validates `204 No Content` bodyless responses.

### Milestone 3: Spec Diff & Baseline Store
- **Objectives:** Semantic AST comparison and baseline snapshot management.
- **Deliverables:**
  - `src/diff/comparator.ts` and `src/diff/rules.ts` implementing all 10 compatibility rules.
  - `src/baseline/store.ts` and `src/baseline/filter.ts`.
- **Acceptance Criteria:**
  - Central Example diff correctly marks removed response field `email` as `BREAKING`.
  - Directional rules correctly treat adding required request field as `BREAKING` and adding response field as `NON_BREAKING`.
  - Baseline save creates deterministic JSON file; subsequent check/diff runs suppress matching findings.
  - `--save` fails with a descriptive error if target file exists and `--overwrite` is not passed.

### Milestone 4: Policy Engine, Exit Codes, Reporting & CI Pipeline
- **Objectives:** Configurable failure thresholds, multi-format reporting, and CI workflow integration.
- **Deliverables:**
  - `src/policy/evaluator.ts` and `src/policy/exit-codes.ts`.
  - `src/report/terminal.ts`, `src/report/json.ts`, `src/report/markdown.ts`, and `src/report/redaction.ts`.
  - `.github/workflows/ci.yml`.
- **Acceptance Criteria:**
  - Process exits with code `0` on clean pass.
  - Process exits with code `1` on policy failure (breaking changes or critical findings).
  - Process exits with code `2` on bad CLI arguments, invalid config, or malformed spec.
  - Process exits with code `3` on connection refused or timeout.
  - Redacts sensitive tokens and headers in all reporting formats.

#### GitHub Actions Workflow Example (`.github/workflows/ci.yml`)

```yaml
name: API Contract & Compatibility Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  validate-api:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Needed to diff against base branch

      - name: Setup Node.js LTS
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Verify Breaking Spec Changes Against Main
        run: |
          git show origin/main:openapi.yaml > openapi.base.yaml
          npx traceguard diff openapi.base.yaml openapi.yaml --format markdown > diff-report.md
        continue-on-error: true

      - name: Start API Service
        run: |
          npm run start:api &
          npx wait-on http://localhost:8080/health --timeout 30000

      - name: Run TraceGuard Contract Check
        run: |
          npx traceguard check \
            --spec openapi.yaml \
            --base-url http://localhost:8080 \
            --format markdown \
            --output contract-report.md

      - name: Publish Summary to Job Summary
        if: always()
        run: |
          if [ -f diff-report.md ]; then
            echo "### API Compatibility Diff" >> $GITHUB_STEP_SUMMARY
            cat diff-report.md >> $GITHUB_STEP_SUMMARY
          fi
          if [ -f contract-report.md ]; then
            echo "### API Runtime Contract Check" >> $GITHUB_STEP_SUMMARY
            cat contract-report.md >> $GITHUB_STEP_SUMMARY
          fi
```

### Milestone 5: Hardening, Documentation & npm Dry-Run
- **Objectives:** Final test coverage validation, end-to-end fixture execution, documentation, and packaging dry run.
- **Deliverables:**
  - Statement test coverage >= 85% verified via Vitest.
  - Complete `README.md` with usage examples for CLI and SDK.
  - Package build verified via `npm pack --dry-run` ensuring clean exports and typings without stray files.
- **Acceptance Criteria:**
  - Central Example verified end-to-end via CLI commands and SDK imports.
  - Clean `npm run lint` and `npm run build` with zero errors.

---

## 13. Architecture Decision Records (ADRs)

### ADR-1: OpenAPI 3.0 vs 3.1 Schema Engine Split
- **Context:** OpenAPI 3.0 uses `nullable: true` (Draft-07), whereas OpenAPI 3.1 aligns with JSON Schema Draft 2020-12 (`type: [T, "null"]`). Ajv 2020 fails when compiling schemas containing `nullable: true` without custom keyword extensions.
- **Decision:** Instantiate two isolated Ajv instances: standard `Ajv` with a custom `nullable` keyword handler for 3.0 documents, and `Ajv2020` for 3.1 documents.
- **Consequence:** Both spec versions validate correctly according to their respective specifications with zero schema conversion artifacts or false positives.

### ADR-2: Deterministic Baseline Fingerprinting
- **Context:** Baseline snapshots must reliably match findings across different test runs and environments while ignoring volatile metadata such as timestamps or execution durations.
- **Decision:** Generate baseline fingerprints using a SHA-256 hash of `ruleId + method + normalizedEndpoint + jsonPointerLocation`.
- **Consequence:** Findings match consistently across machines, operating systems, and executions regardless of local file path variations.

### ADR-3: Infrastructure Network Error vs HTTP 500 Distinction
- **Context:** CI systems must clearly distinguish between a target API failing internal business logic (e.g., HTTP 500) and an environment setup failure (e.g., test runner failed to reach service).
- **Decision:**
  - Network-level failures (connection refused, DNS resolution failure, socket timeout) throw `NetworkError` and return **Exit Code 3**.
  - HTTP 500 responses are treated as observed server responses. If HTTP 500 is not documented in the OpenAPI spec, it triggers `TG-CONTRACT-STATUS-MISMATCH` and evaluates against policy thresholds (**Exit Code 1** if violated).
- **Consequence:** Network outages never masquerade as test passes or ambiguous policy failures.

### ADR-4: Local-Only Reference Resolution
- **Context:** OpenAPI specs frequently use `$ref` to share schemas. Resolving remote URLs opens attack vectors including SSRF, credential leakage, and non-deterministic test results if remote servers are offline.
- **Decision:** Resolve only local JSON Pointers (`#/components/...`). External URLs or non-local file paths trigger explicit diagnostics and are rejected.
- **Consequence:** TraceGuard remains 100% deterministic, hermetic, and safe to execute in restricted network environments.
