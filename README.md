<p align="center">
  <img src="assets/traceguard-banner.svg" alt="TraceGuard Banner" width="900" />
</p>

# TraceGuard

> **Tagline:** Catch breaking API changes before they reach production.

TraceGuard is a lightweight, zero-dependency-runtime CLI and TypeScript SDK that:
1. **Validates a running API** against its OpenAPI 3.0.x / 3.1.x contract (`traceguard check`).
2. **Diffs two OpenAPI specifications** to detect breaking changes for downstream consumers (`traceguard diff`).
3. **Manages baseline snapshots** to prevent legacy discrepancies from failing CI (`traceguard baseline`).

TraceGuard operates **100% offline and deterministically** with no AI, no account, no telemetry, and no hosted cloud service.

---

## The Problem

- **Contract Drift:** Backend engineers modify an endpoint or response field without updating the OpenAPI specification. Client SDKs or frontend applications break silently in production.
- **Breaking API Changes:** A new required query parameter is introduced, an existing response property is renamed, or an enum is narrowed. Existing client applications immediately fail with HTTP 400 Bad Request or null pointer crashes.
- **Flaky & Opaque Tooling:** Many API linters require heavy hosted platforms, cloud accounts, or non-deterministic heuristics. TraceGuard provides fast, verifiable, zero-network-infrastructure contract enforcement.

---

## Central Example

Given a contract declaring `GET /api/users/{id}`:
```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          type: object
          required: [id, name, email]
          properties:
            id: { type: string }
            name: { type: string }
            email: { type: string }
```

When the running service returns:
```json
{
  "id": 101,
  "name": "Arnav"
}
```

TraceGuard reports:
1. `TG-CONTRACT-TYPE-MISMATCH`: `id` expected `string`, received `number` (`101`).
2. `TG-CONTRACT-REQUIRED-MISSING`: `email` missing from response body.

When diffing two versions of the contract where `email` is removed and `id` changed to `integer`:
1. `TG-COMPAT-REQUIRED-RESPONSE-FIELD-REMOVED` (`BREAKING`): Property `email` removed from responses.
2. `TG-COMPAT-RESPONSE-TYPE-CHANGED` (`BREAKING`): Property `id` type changed from `string` to `integer`.

---

## Installation

```bash
# As a local project dependency
npm install --save-dev traceguard

# Or execute directly via npx
npx traceguard --help
```

*Requires Node.js `>= 20.18.0` (LTS).*

---

## Quick Start (CLI)

### 1. Validate a Running API Service (`check`)
```bash
npx traceguard check \
  --spec ./openapi.yaml \
  --base-url http://localhost:8080 \
  --ci
```

### 2. Detect Breaking Changes Between Specs (`diff`)
```bash
npx traceguard diff \
  ./openapi.base.yaml \
  ./openapi.head.yaml \
  --format markdown \
  --output diff-summary.md
```

### 3. Manage Baseline Snapshots (`baseline`)
```bash
# Capture current findings into a baseline
npx traceguard baseline save ./traceguard-baseline.json --spec ./openapi.yaml --base-url http://localhost:8080

# View baseline entries
npx traceguard baseline show ./traceguard-baseline.json

# Check using baseline to suppress legacy errors
npx traceguard check --spec ./openapi.yaml --base-url http://localhost:8080 --baseline ./traceguard-baseline.json
```

---

## TypeScript SDK

TraceGuard provides a typed, promise-based SDK for integration into test runners, custom scripts, and CI runners:

```typescript
import { createTraceGuard, compareContracts } from 'traceguard';

// 1. Validate running API
const guard = createTraceGuard({
  spec: './openapi.yaml',
  baseUrl: 'http://localhost:8080',
  policy: {
    failOnBreaking: true,
    failOnPotentiallyBreaking: false,
    maxCriticalFindings: 0,
    maxMajorFindings: 0,
    ignoredRules: [],
  },
});

const report = await guard.check();
if (!report.policyResult.passed) {
  console.error('API failed contract verification:', report.policyResult.failureReasons);
}

// 2. Diff two OpenAPI specs
const diffReport = await compareContracts({
  baseSpecPath: './openapi.v1.yaml',
  headSpecPath: './openapi.v2.yaml',
});

for (const change of diffReport.changes || []) {
  console.log(`[${change.compatibility}] ${change.ruleId}: ${change.description}`);
}
```

---

## Exit Codes

TraceGuard process exit codes are strictly deterministic:

| Exit Code | Classification | Meaning |
| :---: | :--- | :--- |
| **`0`** | **Pass** | All operations validated; zero policy violations; no infrastructure errors. |
| **`1`** | **Policy Failed** | Findings detected that violate configured severity or breaking change thresholds. |
| **`2`** | **Bad Config / Usage** | Malformed CLI arguments, invalid configuration file, or unparseable OpenAPI spec. |
| **`3`** | **Infrastructure Failure** | Target API server unreachable, connection refused, or request timed out. |

> **Important:** Network errors never masquerade as test passes. HTTP `500 Internal Server Error` is an observed response evaluated against the OpenAPI contract, not an infrastructure network failure.

---

## Rule Catalog

### Runtime Contract Rules (`check`)
| Rule ID | Severity | Compatibility | Trigger |
| :--- | :--- | :--- | :--- |
| `TG-CONTRACT-STATUS-MISMATCH` | `critical` | `BREAKING` | Observed HTTP status is not documented for the operation. |
| `TG-CONTRACT-TYPE-MISMATCH` | `critical` | `BREAKING` | Response body property type does not match schema type. |
| `TG-CONTRACT-REQUIRED-MISSING` | `critical` | `BREAKING` | Required response schema property is missing from body. |
| `TG-CONTRACT-CONTENT-TYPE-MISMATCH` | `major` | `POTENTIALLY_BREAKING` | Response Content-Type does not match documented media types. |
| `TG-CONTRACT-HEADER-MISSING` | `major` | `BREAKING` | Declared required response header was not returned. |
| `TG-CONTRACT-INVALID-JSON` | `critical` | `BREAKING` | Response Content-Type is JSON but body contains malformed syntax. |
| `TG-CONTRACT-ENUM-MISMATCH` | `major` | `BREAKING` | Response property value is not contained in contract enum. |

### Compatibility Diff Rules (`diff`)
| Rule ID | Severity | Compatibility | Trigger |
| :--- | :--- | :--- | :--- |
| `TG-COMPAT-ENDPOINT-REMOVED` | `critical` | `BREAKING` | Entire path template removed from revised spec. |
| `TG-COMPAT-METHOD-REMOVED` | `critical` | `BREAKING` | HTTP method under path template removed. |
| `TG-COMPAT-STATUS-REMOVED` | `major` | `BREAKING` | Documented status code removed from responses. |
| `TG-COMPAT-REQUIRED-REQUEST-FIELD-ADDED` | `critical` | `BREAKING` | New required request parameter or body property added. |
| `TG-COMPAT-REQUIRED-RESPONSE-FIELD-REMOVED` | `critical` | `BREAKING` | Property removed from response required array. |
| `TG-COMPAT-RESPONSE-TYPE-CHANGED` | `critical` | `BREAKING` | Response property type altered incompatibly. |
| `TG-COMPAT-ENUM-NARROWED` | `major` | `BREAKING` | Request enum narrowed, or response enum widened. |
| `TG-COMPAT-NULLABLE-CHANGED` | `major` | `POTENTIALLY_BREAKING` | Nullable property altered to non-nullable. |
| `TG-COMPAT-AUTH-CHANGED` | `critical` | `BREAKING` | Security requirements added or tightened. |
| `TG-COMPAT-MEDIA-TYPE-REMOVED` | `major` | `BREAKING` | Accepted request or response media type removed. |

---

## Request vs Response Compatibility Logic

- **For Responses (Old Client $\leftarrow$ New Server):**
  - Adding optional or extra properties is **NON_BREAKING** (clients ignore unknown keys).
  - Removing promised properties is **BREAKING** (causes `undefined` or null pointer crashes).
  - Expanding enum domains is **BREAKING** (strict switch/case or exhaustive enums crash).
- **For Requests (Old Client $\rightarrow$ New Server):**
  - Adding a REQUIRED request parameter or body property is **BREAKING** (old clients do not send it $\rightarrow$ 400 Bad Request).
  - Adding an OPTIONAL request parameter is **NON_BREAKING** (server defaults apply).
  - Removing a required parameter or making it optional is **NON_BREAKING**.
  - Narrowing an accepted request enum is **BREAKING** (server rejects values old clients send).

---

## Security Model

- **Safe Spec Parsing:** Specifications are parsed as static data structures (`yaml` / `JSON.parse`). No `eval()`, `new Function()`, or dynamic imports.
- **Local References Only:** TraceGuard resolves only local `$ref` pointers (`#/components/...`). External URLs and remote file paths are blocked to eliminate SSRF and credential leaks.
- **Automatic Redaction:** Tokens, cookies, and sensitive headers (`Authorization`, `X-API-Key`, `Cookie`, `Set-Cookie`, `apiKey`) are masked as `[REDACTED]` across terminal logs, JSON artifacts, and Markdown summaries.
- **Safe-Methods-Only Default:** Only idempotent, safe HTTP verbs (`GET`, `HEAD`, `OPTIONS`) are executed in v0.1.0 to protect against unintended database modifications.
- **Resource Protections:** Requests are bounded by strict timeouts (default 5000ms), maximum response body size limits (default 2MB), and concurrency caps.

---

## Known Limitations

1. **Local Specs Only:** Spec paths must reside on the local filesystem.
2. **Safe Methods Default:** In v0.1.0, mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) are skipped for safety.
3. **Polymorphic Uncertainty:** Complex overlapping compositions (`allOf`, `oneOf`, `anyOf`, `not`) that cannot be mathematically proven equivalent return `UNKNOWN` compatibility.

---

## Roadmap (Planned Future Features — NOT Implemented in v0.1.0)

- [ ] Stateful mutating-request testing (`POST`, `PUT`, `DELETE`) with rollback transactions.
- [ ] Remote OpenAPI URL fetching with SSRF network validation layers.
- [ ] Built-in mock HTTP server generation.
- [ ] Dynamic OAuth2 PKCE / OpenID Connect authentication handshakes.
- [ ] Native GitHub/GitLab PR comment bot integration.
- [ ] Automatic retry policies with exponential backoff.
- [ ] AI / LLM natural language remediation explanations.

---

## Documentation Links

- [Architecture & Design](docs/architecture.md)
- [Configuration Reference](docs/configuration.md)
- [CLI Reference](docs/cli-reference.md)
- [Compatibility Rules Catalog](docs/compatibility-rules.md)
- [Report Schema Specification](docs/report-schema.md)
- [Troubleshooting & FAQ](docs/troubleshooting.md)

---

## License

MIT © 2026 Arnav
