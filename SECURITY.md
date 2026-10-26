# Security Policy

TraceGuard is designed to inspect and validate untrusted OpenAPI specifications, execute HTTP validation requests against target endpoints, and produce deterministic diff and compatibility reports. Because TraceGuard operates on potentially hostile specifications and target server responses, security is treated as a first-class engineering requirement.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability or exploit within TraceGuard, please do not file a public issue on GitHub. Instead, report it through one of the following private channels:

1. **GitHub Private Vulnerability Reporting**: Submit an advisory via the **Security** tab of the [TraceGuard Repository](https://github.com/arnnnnaaavvvvv/TraceGuard/security/advisories/new).
2. **Email**: Contact the security maintainers directly at `security@traceguard.dev`.

### Response SLA
- **Initial Acknowledgment**: Within 48 hours of receipt.
- **Triage & Assessment**: Within 5 business days.
- **Fix & Disclosure**: Coordinated disclosure within 30 to 90 days depending on severity.

---

## Security Architecture & Threat Model

TraceGuard operates under an adversarial threat model where specs, baseline files, config files, target responses, environment variables, and CLI arguments are treated as hostile.

### 1. Specification Parsing Defenses
- **Local-Only References (`$ref`)**: TraceGuard strictly resolves local intra-document references (`#/components/...`). External file paths, symlinks, Windows paths, `file://` URIs, and remote `http(s)://` URLs are rejected with `SpecError` (Exit code 2).
- **Prototype Pollution Prevention**: Object keys named `__proto__`, `constructor`, and `prototype` are rejected or stripped across JSON, YAML, schemas, and baselines. `Object.prototype` integrity is continuously verified.
- **Catastrophic Backtracking (ReDoS) Guard**: Schema regexes compile through Ajv under strict inspection: nested quantifiers (`(a+)+$`, `(a|b+)+$`) and patterns exceeding 256 characters are rejected upfront.
- **Resource Limits**: Strict bounds on input size (10MB max), reference depth (50 levels max), schema node count (50,000 nodes max), and operations count (1,000 operations max).

### 2. Request Construction Defenses
- **Safe Methods Only in v0.1.0**: Only `GET`, `HEAD`, and `OPTIONS` requests can be built. Mutating HTTP verbs (`POST`, `PUT`, `PATCH`, `DELETE`) are unconditionally blocked.
- **Header Injection & Override Protection**: Header names are constrained to alphanumeric characters and hyphens; header values containing CRLF or control characters are rejected. Verb smuggling headers (`X-HTTP-Method-Override`) are stripped.
- **Origin & Path Pinning**: URL path templates and path parameters are strictly percent-encoded and pinned to the user-configured `baseUrl` origin. Protocol-relative URLs (`//attacker.com`) cannot redirect requests.

### 3. HTTP Execution & Target Handling
- **Manual Redirects (SSRF Prevention)**: HTTP redirects (`301`, `302`, `307`, `308`) are handled manually with `redirect: 'manual'`. TraceGuard never follows redirects to external origins, private IP ranges (e.g. `169.254.169.254`), or localhost.
- **Streaming Response Caps**: Target responses are metered at the byte-stream level (`readBodyWithLimit`), terminating immediately if payload exceeds the configured cap (default 2MB, max 50MB) before buffering.
- **Comprehensive Timeouts**: Network calls are guarded by an `AbortController` timer covering DNS, connect, TLS handshake, header receipt, and slow-streaming (Slowloris) responses.

### 4. Secret Redaction & Output Safety
- **Canary Redaction**: Automatic masking of sensitive headers (`Authorization`, `Cookie`, `X-*-Token`, etc.), URL userinfo credentials (`http://user:pass@host`), JWTs, Bearer tokens, Basic auth tokens, and sensitive query parameters (`token`, `apiKey`, `password`, `secret`).
- **Terminal Injection Sanitization**: Stripping of ANSI escape sequences (`\x1b[...]`) and unprintable control characters to prevent terminal hijacking.
- **Markdown & HTML Sanitization**: HTML tags and Markdown formatting elements are escaped to prevent Cross-Site Scripting (XSS) and broken tables in CI PR comments.

### 5. File System & Local State
- **Safe Path Validation**: Output reports (`--output`) and baselines (`--baseline`) validate target paths, prohibiting directory traversal outside allowed boundaries.
- **Restrictive Permissions**: Baseline and output files are created with mode `0o600` (readable and writable only by the owning user).
- **No Dynamic Code Execution**: Config files are parsed strictly as static JSON or YAML. Dynamic `eval()`, `Function()`, or `require()` of JavaScript configs is strictly prohibited.
