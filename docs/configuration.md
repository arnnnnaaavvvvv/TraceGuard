# TraceGuard Configuration Reference

TraceGuard loads configuration automatically from the current working directory, searching in the following order:
1. `traceguard.config.json`
2. `.traceguardrc.yaml`
3. `.traceguardrc.yml`
4. `.traceguardrc.json`
5. Custom path via `--config <path>`

CLI flags always take precedence over configuration file values.

---

## Configuration Schema

```json
{
  "$schema": "https://raw.githubusercontent.com/arnnnnaaavvvvv/TraceGuard/main/docs/schema/traceguard.config.schema.json",
  "spec": "./openapi.yaml",
  "baseUrl": "http://localhost:8080",
  "timeoutMs": 5000,
  "maxBodySizeBytes": 2097152,
  "concurrency": 5,
  "safeMethodsOnly": true,
  "baselinePath": "./traceguard-baseline.json",
  "headers": {
    "X-API-Key": "test-key-123"
  },
  "pathParameters": {
    "/api/users/{id}": {
      "id": "101"
    }
  },
  "policy": {
    "failOnBreaking": true,
    "failOnPotentiallyBreaking": false,
    "maxCriticalFindings": 0,
    "maxMajorFindings": 0,
    "ignoredRules": []
  }
}
```

---

## Field Specifications

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `spec` | `string` | `"./openapi.yaml"` | Path to the local OpenAPI specification file (YAML or JSON). |
| `baseUrl` | `string` | `undefined` | Target API service base URL (required for `traceguard check`). |
| `timeoutMs` | `number` | `5000` | HTTP request timeout in milliseconds (`100` to `60000`). |
| `maxBodySizeBytes` | `number` | `2097152` (2MB) | Maximum allowed response body size (`1024` to `52428800`). |
| `concurrency` | `number` | `5` | Maximum concurrent HTTP requests during check execution (`1` to `50`). |
| `safeMethodsOnly` | `boolean` | `true` | Restricts checking to `GET`, `HEAD`, and `OPTIONS`. Refuses mutating methods in v0.1.0. |
| `baselinePath` | `string` | `undefined` | Path to a baseline snapshot JSON file used to suppress known findings. |
| `headers` | `object` | `{}` | Key-value mapping of static headers injected into every request. |
| `pathParameters` | `object` | `{}` | Key-value mapping of parameter substitutions for URI templates. |
| `policy.failOnBreaking` | `boolean` | `true` | Return exit code 1 if any `BREAKING` compatibility finding is detected. |
| `policy.failOnPotentiallyBreaking` | `boolean` | `false` | Return exit code 1 if any `POTENTIALLY_BREAKING` finding is detected. |
| `policy.maxCriticalFindings` | `number` | `0` | Maximum allowable `critical` severity findings before exit code 1. |
| `policy.maxMajorFindings` | `number` | `0` | Maximum allowable `major` severity findings before exit code 1. |
| `policy.ignoredRules` | `string[]` | `[]` | List of rule IDs to suppress globally from policy failure evaluations. |
