# TraceGuard Troubleshooting & FAQ

## 1. Diagnostic Codes & Common Errors

### `ERR_CONFIG` (Exit Code 2)
- **Symptom:** `Configuration error: Field 'baseUrl' must be a valid HTTP or HTTPS URL.`
- **Remediation:** Ensure your base URL includes the protocol prefix (e.g., `http://localhost:8080` instead of `localhost:8080`).
- **Symptom:** `Baseline file already exists at '<path>'. Use --force to overwrite.`
- **Remediation:** TraceGuard prevents accidental baseline overwrites. Pass `--force` when updating baseline snapshots.

### `ERR_SPEC` (Exit Code 2)
- **Symptom:** `OpenAPI specification error: Missing required 'paths' object.`
- **Remediation:** Verify that your OpenAPI document contains a top-level `paths:` dictionary.
- **Symptom:** `Unsupported external reference 'https://...'.`
- **Remediation:** TraceGuard only dereferences local references (`#/components/...`) to ensure offline determinism and prevent SSRF. Move external schemas into local component definitions.

### `ERR_UNRESOLVED_REF` (Exit Code 2)
- **Symptom:** `Unresolved local reference '#/components/schemas/Pet' at #/paths/~1pets/get/...`
- **Remediation:** Check spelling and path in `#/components/schemas/`. Ensure the referenced component is defined in the specification.

### `ERR_NETWORK` & `ERR_TIMEOUT` (Exit Code 3)
- **Symptom:** `Network failure when contacting 'http://127.0.0.1:8080/api/users': fetch failed (ECONNREFUSED).`
- **Remediation:** Ensure your API service is running and listening on the specified port before starting `traceguard check`. Use tools like `wait-on` in CI scripts.
- **Symptom:** `Request to '...' timed out after 5000ms.`
- **Remediation:** Increase `timeoutMs` in configuration or inspect API latency for slow database queries.

---

## 2. Frequently Asked Questions

### Why did TraceGuard exit with code 1 instead of code 3 on HTTP 500?
HTTP `500 Internal Server Error` is an **observed HTTP response from the server**, not an infrastructure failure. If HTTP 500 is not documented in your OpenAPI contract, TraceGuard reports `TG-CONTRACT-STATUS-MISMATCH`. This represents a contract policy failure (**Exit Code 1**). Exit code 3 is reserved exclusively for infrastructure failures where the HTTP connection could not be established or timed out.

### Can I run mutating requests (`POST`, `PUT`, `DELETE`)?
By default in v0.1.0, TraceGuard restricts runtime checking to safe, idempotent methods (`GET`, `HEAD`, `OPTIONS`). Mutating methods are skipped to prevent destructive database modifications in live test environments.

### How do I suppress known legacy contract errors in CI?
Capture a baseline snapshot before running CI checks:
```bash
npx traceguard baseline save ./traceguard-baseline.json --spec ./openapi.yaml --base-url http://localhost:8080
```
Then pass `--baseline ./traceguard-baseline.json` in your CI pipeline. Any findings matching the baseline are marked as `suppressed` and will not trigger exit code 1.
