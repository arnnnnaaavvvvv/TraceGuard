# Changelog

All notable changes to TraceGuard are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-26

### Added
- **Runtime Contract Validation (`traceguard check`):**
  - Execute HTTP requests against live API endpoints derived from OpenAPI 3.0.x and 3.1.x contracts.
  - Validate HTTP status codes against documented responses (including support for `2XX`, `default`, and non-200 success/error responses).
  - Handle HTTP `204 No Content` bodyless assertions.
  - Tolerate Content-Type parameters such as `; charset=utf-8`.
  - Validate response headers against declared `required: true` header specifications.
  - Validate response bodies against JSON Schema using the appropriate Ajv dialect (OpenAPI 3.0 vs JSON Schema 2020-12 for OpenAPI 3.1).
- **Specification Diff & Breaking Change Detection (`traceguard diff`):**
  - Compare two OpenAPI specifications to detect breaking changes for downstream consumers.
  - Enforce directional compatibility rules:
    - *Responses:* Field removals and type alterations are `BREAKING`; enum widening is `BREAKING` for strict client parsers.
    - *Requests:* New required fields and narrowed enums are `BREAKING`; optional fields and expanded enums are safe (`NON_BREAKING`).
  - Report `UNKNOWN` compatibility instead of guessing for complex polymorphic schemas (`allOf`, `oneOf`, `anyOf`, `not`).
- **Baseline Snapshot Management (`traceguard baseline`):**
  - Save, inspect, and clear baseline snapshots (`save`, `show`, `clear`) to suppress legacy contract debt without failing CI.
  - Enforce safety with `--force` flag required to overwrite existing baselines.
  - Store zero secrets, auth headers, or raw response bodies in baseline snapshots.
- **Reporters & Output Formats:**
  - Stark ANSI terminal reporter with color coding by severity.
  - Versioned JSON reporter conforming to schema version `1.0.0`.
  - GitHub Flavored Markdown reporter designed for CI summary artifacts.
  - Standalone HTML report featuring Google Fonts `Bebas Neue` typography and high-contrast monochrome design.
- **Security & Reliability Protections:**
  - Block external/remote `$ref` pointers to eliminate SSRF and credential leaks.
  - Limit reference recursion depth to 50 levels and configure YAML parser `maxAliasCount` to block alias bomb attacks.
  - Enforce safe-methods-only default (`GET`, `HEAD`, `OPTIONS`) to prevent accidental state mutations.
  - Stream response bodies with a default 2MB cap to protect memory.
  - Automatic masking of Authorization headers, tokens, and credentials in all outputs.
  - Strict deterministic findings ordering across all executions.
- **TypeScript SDK:**
  - Promise-based SDK supporting ESM and CommonJS exports with full TypeScript type definitions.
  - Typed error hierarchy: `ConfigError`, `SpecError`, `UnresolvedRefError`, `NetworkError`, `TimeoutError`, `PolicyViolationError`.
