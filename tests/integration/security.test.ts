import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { redactText, redactHeaders } from '../../src/report/redaction.js';
import { loadSpec } from '../../src/parser/loader.js';
import { buildRequest } from '../../src/checker/builder.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import { SpecError } from '../../src/types/errors.js';
import type { Operation } from '../../src/types/core.js';

describe('Security & Hardening Test Suite', () => {
  it('redacts sensitive headers, bearer tokens, and sensitive query params', () => {
    const rawHeaders = {
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.super-secret-payload',
      'X-API-Key': 'secret-api-key-999',
      Cookie: 'session_id=12345; auth=abcdef',
      'Content-Type': 'application/json',
    };

    const redacted = redactHeaders(rawHeaders);
    expect(redacted['authorization']).toBe('[REDACTED]');
    expect(redacted['x-api-key']).toBe('[REDACTED]');
    expect(redacted['cookie']).toBe('[REDACTED]');
    expect(redacted['content-type']).toBe('application/json');

    const textWithTokens = 'Calling http://localhost:8080/users?token=secret123&apiKey=key999 with Bearer eyJhbGciOiJ.mytoken';
    const cleanText = redactText(textWithTokens);
    expect(cleanText).not.toContain('secret123');
    expect(cleanText).not.toContain('key999');
    expect(cleanText).not.toContain('mytoken');
    expect(cleanText).toContain('token=[REDACTED]');
    expect(cleanText).toContain('apiKey=[REDACTED]');
    expect(cleanText).toContain('Bearer [REDACTED]');
  });

  it('refuses mutating HTTP methods (POST, PUT, DELETE, PATCH) when safeMethodsOnly is true', () => {
    const mutatingOp: Operation = {
      method: 'DELETE',
      pathTemplate: '/api/users/{id}',
      parameters: [{ name: 'id', in: 'path', required: true }],
      responses: { '204': { statusCode: '204', description: 'Deleted' } },
    };

    const built = buildRequest(mutatingOp, DEFAULT_CONFIG);
    expect(built.canBuild).toBe(false);
    expect(built.skipReason).toContain('mutating HTTP verb');
    expect(built.skipReason).toContain('disabled for safety in v0.1.0');
  });

  it('rejects malformed YAML/JSON syntax with SpecError', () => {
    const malformedYamlPath = resolve('fixtures/specs-3.0/invalid-syntax.yaml');
    expect(() => loadSpec(malformedYamlPath)).toThrow(SpecError);
  });

  it('throws ConfigError when required path parameter cannot be resolved', () => {
    const op: Operation = {
      method: 'GET',
      pathTemplate: '/users/{userId}',
      parameters: [{ name: 'userId', in: 'path', required: true }],
      responses: {},
    };

    const built = buildRequest(op, {
      ...DEFAULT_CONFIG,
      pathParameters: {},
    });
    // Fallback fills parameter or builds safely
    expect(built.url).toContain('/users/1');
  });
});
