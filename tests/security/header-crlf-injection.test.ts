import { describe, it, expect } from 'vitest';
import { buildRequest } from '../../src/checker/builder.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import type { Operation } from '../../src/types/core.js';
import { ConfigError } from '../../src/types/errors.js';

describe('Security: Request Construction & Injection Defenses (VULN-09)', () => {
  const baseOp: Operation = {
    method: 'GET',
    pathTemplate: '/api/v1/items/{itemId}',
    parameters: [
      {
        name: 'itemId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    responses: {},
  };

  it('rejects CRLF in configured header values', () => {
    expect(() => {
      buildRequest(baseOp, {
        ...DEFAULT_CONFIG,
        headers: {
          'X-Custom': 'clean-value\r\nInjected-Header: evil',
        },
      });
    }).toThrow(ConfigError);
  });

  it('rejects invalid characters in header names', () => {
    expect(() => {
      buildRequest(baseOp, {
        ...DEFAULT_CONFIG,
        headers: {
          'X-Custom Header!': 'value',
        },
      });
    }).toThrow(ConfigError);
  });

  it('strips X-HTTP-Method-Override headers to prevent verb smuggling', () => {
    const built = buildRequest(baseOp, {
      ...DEFAULT_CONFIG,
      headers: {
        'X-HTTP-Method-Override': 'DELETE',
        'X-Method-Override': 'POST',
        'X-Valid': 'true',
      },
    });

    expect(built.headers['X-HTTP-Method-Override']).toBeUndefined();
    expect(built.headers['X-Method-Override']).toBeUndefined();
    expect(built.headers['X-Valid']).toBe('true');
  });

  it('strictly blocks mutating methods (POST, PUT, PATCH, DELETE) even with benign-sounding operationIds', () => {
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

    for (const method of mutatingMethods) {
      const op: Operation = {
        method,
        operationId: 'safeDryRunSandboxCheck',
        pathTemplate: '/api/v1/sandbox/test',
        parameters: [],
        responses: {},
      };

      const built = buildRequest(op, DEFAULT_CONFIG);
      expect(built.canBuild).toBe(false);
      expect(built.url).toBe('');
      expect(built.skipReason).toContain('mutating HTTP verb');
    }
  });

  it('safely encodes path parameters containing traversal, queries, and fragments', () => {
    const maliciousOp: Operation = {
      ...baseOp,
      parameters: [
        {
          name: 'itemId',
          in: 'path',
          required: true,
          example: '../../etc/passwd?admin=1#exploit',
        },
      ],
    };

    const built = buildRequest(maliciousOp, {
      ...DEFAULT_CONFIG,
      baseUrl: 'http://localhost:8080/api',
    });

    expect(built.canBuild).toBe(true);
    // Traversal slashes and query delimiters must be percent-encoded
    expect(built.url).toContain('..%2F..%2Fetc%2Fpasswd%3Fadmin%3D1%23exploit');
    expect(built.url).not.toContain('/etc/passwd');
    expect(built.url.startsWith('http://localhost:8080/')).toBe(true);
  });

  it('prevents protocol-relative URL paths from redirecting to external origins', () => {
    const protocolRelativeOp: Operation = {
      method: 'GET',
      pathTemplate: '//attacker.com/evil',
      parameters: [],
      responses: {},
    };

    const built = buildRequest(protocolRelativeOp, {
      ...DEFAULT_CONFIG,
      baseUrl: 'http://localhost:8080',
    });

    expect(built.canBuild).toBe(true);
    // It must stay pinned to localhost:8080 as a path, never resolving to http://attacker.com
    expect(built.url).toBe('http://localhost:8080/attacker.com/evil');
    expect(built.url.startsWith('http://localhost:8080/')).toBe(true);
  });
});
