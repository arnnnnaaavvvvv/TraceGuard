# TraceGuard CLI Command Reference

The `traceguard` command-line executable provides three primary commands: `check`, `diff`, and `baseline`.

---

## Global Options

- `-v, --version`: Print current TraceGuard version. Zero network calls.
- `-h, --help`: Display command usage information. Zero network calls.

---

## 1. `traceguard check`

Validate a running HTTP service against an OpenAPI specification.

```bash
traceguard check [options]
```

### Options
- `-s, --spec <path>`: Path to local OpenAPI specification file (YAML or JSON).
- `-u, --base-url <url>`: Running service base URL (e.g. `http://localhost:8080`).
- `-c, --config <path>`: Path to custom TraceGuard configuration file.
- `-f, --format <format>`: Report format: `terminal` (default), `json`, or `markdown`.
- `-o, --output <path>`: Save report artifact to destination file.
- `--ci`: Enforce strict policy (equivalent to `maxCriticalFindings: 0`, `failOnBreaking: true`).
- `--timeout <ms>`: Request timeout in milliseconds.
- `--concurrency <n>`: Maximum concurrent requests.
- `-b, --baseline <path>`: Baseline snapshot file to suppress known legacy findings.

---

## 2. `traceguard diff`

Detect breaking changes between two OpenAPI specification files.

```bash
traceguard diff <base> <head> [options]
```

### Arguments
- `<base>`: Path to base OpenAPI specification (e.g., `main` branch contract).
- `<head>`: Path to revised OpenAPI specification (e.g., feature branch contract).

### Options
- `-c, --config <path>`: Path to custom TraceGuard configuration file.
- `-f, --format <format>`: Report format: `terminal`, `json`, or `markdown`.
- `-o, --output <path>`: Save report artifact to destination file.
- `--ci`: Enforce strict policy failure on any breaking change.
- `-b, --baseline <path>`: Baseline snapshot file to suppress known changes.

---

## 3. `traceguard baseline`

Capture, inspect, and remove baseline finding snapshots.

### Subcommands

#### `traceguard baseline save <path> [options]`
Capture active findings from a check or diff run and save them into a baseline snapshot file.
- `-s, --spec <path>`: Specification path.
- `-u, --base-url <url>`: Target service URL.
- `--diff <head>`: Spec path to diff against to capture baseline diff findings.
- `--force`: Overwrite existing baseline file.

#### `traceguard baseline show <path>`
Display all entries and fingerprints contained in an existing baseline snapshot.

#### `traceguard baseline clear <path>`
Safely remove an existing baseline snapshot file from the filesystem.
