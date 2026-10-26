# TraceGuard Interactive Examples

This folder contains a runnable demonstration of TraceGuard contract checking and breaking change diffing.

## Scenario
- **`spec-v1.yaml`**: The original contract requiring `{ id: string, name: string, email: string }`.
- **`demo-api.js`**: An API implementation returning `{ id: 101, name: "Arnav" }` (id type changed to number, email missing).
- **`spec-v2.yaml`**: An updated specification reflecting these modifications (id changed to integer, email removed from required).
- **`spec-good.yaml`**: A contract accurately describing the current demo API implementation.

## 1. Run Live Contract Check (Catches Runtime Mismatches)

Start the demo API:
```bash
node examples/demo-api.js
```

In a separate terminal, validate the running server against `spec-v1.yaml`:
```bash
npx traceguard check --spec examples/spec-v1.yaml --base-url http://127.0.0.1:8080
```
Expected output:
- `TG-CONTRACT-TYPE-MISMATCH`: `id` expected `string`, received `number`.
- `TG-CONTRACT-REQUIRED-MISSING`: `email` missing from response body.

Validate against `spec-good.yaml`:
```bash
npx traceguard check --spec examples/spec-good.yaml --base-url http://127.0.0.1:8080
```
Expected output:
- `[PASS]` All contract requirements satisfied.

## 2. Run Compatibility Diff (Catches Breaking Changes)

Compare `spec-v1.yaml` against `spec-v2.yaml`:
```bash
npx traceguard diff examples/spec-v1.yaml examples/spec-v2.yaml
```
Expected output:
- `TG-COMPAT-REQUIRED-RESPONSE-FIELD-REMOVED` (`BREAKING`): Property `email` removed or made optional.
- `TG-COMPAT-RESPONSE-TYPE-CHANGED` (`BREAKING`): Property `id` type changed from `string` to `integer`.
