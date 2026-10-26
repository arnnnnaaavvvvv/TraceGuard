// DETECTS: Contract discrepancies between live HTTP responses and OpenAPI specifications.
// WHY:     Undeclared status codes, missing fields, and type mismatches crash API client SDKs.
// LIMITS:  Cannot evaluate runtime state or business logic correctness outside documented schema.

import { createHash } from 'node:crypto';
import type { Operation, Finding, HttpMethod } from '../types/core.js';
import { RUNTIME_RULES, type Severity, type CompatibilityType } from '../types/rules.js';
import type { HttpResponse } from './client.js';
import { validateSchema } from './validate.js';

export function evaluateRuntimeRules(
  operation: Operation,
  response: HttpResponse,
  specVersion: '3.0' | '3.1'
): readonly Finding[] {
  const findings: Finding[] = [];
  const statusStr = String(response.status);

  // 1. Status Code Validation
  const documentedResponse = findDocumentedResponse(operation.responses, response.status);
  if (!documentedResponse) {
    findings.push(
      createFinding({
        ruleId: RUNTIME_RULES.STATUS_MISMATCH,
        severity: 'critical',
        compatibility: 'BREAKING',
        method: operation.method,
        endpoint: operation.pathTemplate,
        location: `#/paths/~1${escapePointer(operation.pathTemplate)}/${operation.method.toLowerCase()}/responses/${statusStr}`,
        expected: `one of [${Object.keys(operation.responses).join(', ')}]`,
        actual: `status ${statusStr}`,
        message: `HTTP status ${statusStr} is not documented in the contract for ${operation.method} ${operation.pathTemplate}.`,
        suggestion: `Document status ${statusStr} in the OpenAPI specification or correct the API implementation.`,
      })
    );
    return findings; // Cannot validate headers/body against undocumented status
  }

  // 2. Bodyless response validation (e.g. 204 No Content)
  if (response.status === 204 && response.bodyText.trim().length > 0) {
    findings.push(
      createFinding({
        ruleId: RUNTIME_RULES.STATUS_MISMATCH,
        severity: 'major',
        compatibility: 'BREAKING',
        method: operation.method,
        endpoint: operation.pathTemplate,
        location: `#/paths/~1${escapePointer(operation.pathTemplate)}/${operation.method.toLowerCase()}/responses/204`,
        expected: 'empty body for 204 No Content',
        actual: `non-empty body (${response.bodyText.length} bytes)`,
        message: `Response returned status 204 No Content but included a non-empty response body.`,
        suggestion: `Ensure the server produces an empty response body when returning HTTP 204.`,
      })
    );
  }

  // 3. Required Headers Validation
  if (documentedResponse.headers) {
    for (const [headerName, headerDef] of Object.entries(documentedResponse.headers)) {
      const h = headerDef as { required?: boolean } | undefined;
      if (h?.required && !(headerName.toLowerCase() in response.headers)) {
        findings.push(
          createFinding({
            ruleId: RUNTIME_RULES.HEADER_MISSING,
            severity: 'major',
            compatibility: 'BREAKING',
            method: operation.method,
            endpoint: operation.pathTemplate,
            location: `#/paths/~1${escapePointer(operation.pathTemplate)}/${operation.method.toLowerCase()}/responses/${documentedResponse.statusCode}/headers/${headerName}`,
            expected: `header '${headerName}' present`,
            actual: 'missing from response headers',
            message: `Required response header '${headerName}' was not returned.`,
            suggestion: `Ensure the server includes '${headerName}' in response headers.`,
          })
        );
      }
    }
  }

  // 4. Content-Type and Malformed JSON
  if (response.malformedJson) {
    findings.push(
      createFinding({
        ruleId: RUNTIME_RULES.INVALID_JSON,
        severity: 'critical',
        compatibility: 'BREAKING',
        method: operation.method,
        endpoint: operation.pathTemplate,
        location: `#/paths/~1${escapePointer(operation.pathTemplate)}/${operation.method.toLowerCase()}/responses/${documentedResponse.statusCode}/content/application~1json`,
        expected: 'valid JSON syntax',
        actual: 'malformed JSON text',
        message: `Response Content-Type indicates JSON, but the body could not be parsed.`,
        suggestion: `Verify serialization logic on the server to prevent truncated or invalid JSON output.`,
      })
    );
    return findings;
  }

  // 5. Media Type & Schema Validation
  if (documentedResponse.content && Object.keys(documentedResponse.content).length > 0) {
    const matchedContentType = matchContentType(response.contentType, Object.keys(documentedResponse.content));

    if (!matchedContentType && response.contentType) {
      findings.push(
        createFinding({
          ruleId: RUNTIME_RULES.CONTENT_TYPE_MISMATCH,
          severity: 'major',
          compatibility: 'POTENTIALLY_BREAKING',
          method: operation.method,
          endpoint: operation.pathTemplate,
          location: `#/paths/~1${escapePointer(operation.pathTemplate)}/${operation.method.toLowerCase()}/responses/${documentedResponse.statusCode}/content`,
          expected: `one of [${Object.keys(documentedResponse.content).join(', ')}]`,
          actual: response.contentType,
          message: `Response Content-Type '${response.contentType}' does not match documented media types.`,
          suggestion: `Update the server to produce a documented media type or add '${response.contentType}' to the specification.`,
        })
      );
    }

    const schemaDef = matchedContentType ? documentedResponse.content[matchedContentType]?.schema : undefined;
    if (schemaDef && response.bodyJson !== undefined) {
      const validationErrors = validateSchema(schemaDef, response.bodyJson, specVersion);
      for (const err of validationErrors) {
        findings.push(mapValidationErrorToFinding(err, operation, documentedResponse.statusCode));
      }
    }
  }

  return findings;
}

function findDocumentedResponse(
  responses: Record<string, { statusCode: string; description: string; headers?: Record<string, unknown>; content?: Record<string, { schema?: Record<string, unknown> }> }>,
  status: number
) {
  const exact = responses[String(status)];
  if (exact) return exact;

  const range = `${Math.floor(status / 100)}XX`;
  const rangeMatch = responses[range] || responses[range.toLowerCase()];
  if (rangeMatch) return rangeMatch;

  return responses['default'];
}

function matchContentType(actualContentType: string | undefined, documentedTypes: readonly string[]): string | null {
  if (!actualContentType) return null;
  const baseActual = actualContentType.split(';')[0]?.trim().toLowerCase();
  if (!baseActual) return null;

  for (const docType of documentedTypes) {
    const baseDoc = docType.split(';')[0]?.trim().toLowerCase();
    if (!baseDoc) continue;
    if (baseDoc === baseActual || baseDoc === '*/*' || (baseDoc.endsWith('/*') && baseActual.startsWith(baseDoc.slice(0, -1)))) {
      return docType;
    }
  }
  return null;
}

function mapValidationErrorToFinding(
  err: { path: string; message: string; keyword: string; expected: string; actual: string; schemaPath: string },
  op: Operation,
  statusCode: string
): Finding {
  let ruleId: string = RUNTIME_RULES.TYPE_MISMATCH;
  if (err.keyword === 'required') {
    ruleId = RUNTIME_RULES.REQUIRED_MISSING;
  } else if (err.keyword === 'enum') {
    ruleId = RUNTIME_RULES.ENUM_MISMATCH;
  }

  const pointer = `#/paths/~1${escapePointer(op.pathTemplate)}/${op.method.toLowerCase()}/responses/${statusCode}/content/application~1json/schema${err.path.slice(1)}`;

  return createFinding({
    ruleId,
    severity: 'critical',
    compatibility: 'BREAKING',
    method: op.method,
    endpoint: op.pathTemplate,
    location: pointer,
    expected: err.expected,
    actual: err.actual,
    message: `Response body schema violation at '${err.path}': ${err.message}.`,
    suggestion: `Ensure the server returns data conforming to schema '${err.schemaPath}'.`,
  });
}

function escapePointer(str: string): string {
  return str.replace(/^\//, '').replace(/~/g, '~0').replace(/\//g, '~1');
}

function createFinding(params: {
  ruleId: string;
  severity: Severity;
  compatibility: CompatibilityType;
  method: HttpMethod;
  endpoint: string;
  location: string;
  expected: string;
  actual: string;
  message: string;
  suggestion: string;
}): Finding {
  const hash = createHash('sha256')
    .update(`${params.ruleId}:${params.method}:${params.endpoint}:${params.location}`)
    .digest('hex')
    .slice(0, 16);

  return {
    id: hash,
    ...params,
  };
}
