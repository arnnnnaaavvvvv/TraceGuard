# TraceGuard Report Schema Specification

TraceGuard outputs structured reports conforming to a versioned schema (`schemaVersion: 1.0.0`).

---

## JSON Report Structure

```typescript
export interface Report {
  readonly schemaVersion: '1.0.0';
  readonly toolVersion: string;
  readonly timestamp: string; // ISO 8601 string
  readonly mode: 'check' | 'diff';
  readonly summary: ReportSummary;
  readonly findings: readonly Finding[];
  readonly changes?: readonly CompatChange[];
  readonly policyResult: {
    readonly passed: boolean;
    readonly failureReasons: readonly string[];
  };
}

export interface ReportSummary {
  readonly totalOperations: number;
  readonly checkedOperations: number;
  readonly skippedOperations: number;
  readonly totalFindings: number;
  readonly criticalCount: number;
  readonly majorCount: number;
  readonly minorCount: number;
  readonly infoCount: number;
  readonly suppressedCount: number;
  readonly breakingChangesCount: number;
}

export interface Finding {
  readonly id: string;              // Deterministic SHA-256 fingerprint (16 chars)
  readonly ruleId: string;          // Standard rule identifier
  readonly severity: 'critical' | 'major' | 'minor' | 'info';
  readonly compatibility: 'BREAKING' | 'POTENTIALLY_BREAKING' | 'NON_BREAKING' | 'UNKNOWN';
  readonly method: string;          // HTTP verb
  readonly endpoint: string;        // URI path template
  readonly location: string;        // RFC 6901 JSON Pointer
  readonly expected: string;        // Expected contract value (redacted)
  readonly actual: string;          // Observed actual value (redacted)
  readonly message: string;         // Diagnostic message (redacted)
  readonly suggestion: string;      // Actionable remediation suggestion
  readonly suppressed?: boolean;    // Present and true if suppressed by baseline
}
```

---

## Example Serialized JSON Report

```json
{
  "schemaVersion": "1.0.0",
  "toolVersion": "0.1.0",
  "timestamp": "2026-10-26T20:30:00.000Z",
  "mode": "check",
  "summary": {
    "totalOperations": 1,
    "checkedOperations": 1,
    "skippedOperations": 0,
    "totalFindings": 2,
    "criticalCount": 2,
    "majorCount": 0,
    "minorCount": 0,
    "infoCount": 0,
    "suppressedCount": 0,
    "breakingChangesCount": 2
  },
  "findings": [
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
      "message": "Response body schema violation at '#/id': must be string.",
      "suggestion": "Ensure the server returns data conforming to schema '#/properties/id/type'."
    }
  ],
  "policyResult": {
    "passed": false,
    "failureReasons": [
      "Detected 2 breaking change(s) or critical contract mismatch(es).",
      "Critical findings (2) exceeded threshold of 0."
    ]
  }
}
```
