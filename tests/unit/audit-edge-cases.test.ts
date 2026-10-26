import { describe, it, expect } from 'vitest';
import { validateSchema } from '../../src/checker/validate.js';
import { dereferenceSchema } from '../../src/parser/references.js';
import { buildRequest } from '../../src/checker/builder.js';
import { evaluateRuntimeRules } from '../../src/checker/rules.js';
import { compareOperations } from '../../src/diff/comparator.js';
import { validateConfig } from '../../src/config/schema.js';
import { extractOperations } from '../../src/parser/operations.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import { SpecError, ConfigError } from '../../src/types/errors.js';
import type { Operation } from '../../src/types/core.js';
import type { HttpResponse } from '../../src/checker/client.js';

describe('Audit Edge Cases Suite', () => {
  describe('1. Empty arrays & Nested arrays of objects', () => {
    it('validates empty arrays when no minItems specified, and flags when minItems violated', () => {
      const schema = { type: 'array', items: { type: 'string' } };
      const emptyErrors = validateSchema(schema, [], '3.0');
      expect(emptyErrors).toHaveLength(0);

      const minSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
      const minErrors = validateSchema(minSchema, [], '3.0');
      expect(minErrors).toHaveLength(1);
      expect(minErrors[0]?.keyword).toBe('minItems');
    });

    it('validates nested arrays of objects and catches deep type mismatches', () => {
      const schema = {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'tags'],
          properties: {
            id: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      };

      const validPayload = [
        { id: 'item-1', tags: ['fast', 'secure'] },
        { id: 'item-2', tags: [] },
      ];
      expect(validateSchema(schema, validPayload, '3.1')).toHaveLength(0);

      const invalidPayload = [
        { id: 999, tags: ['fast', 42] },
      ];
      const errors = validateSchema(schema, invalidPayload, '3.1');
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. additionalProperties', () => {
    it('flags unexpected properties when additionalProperties is false', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
        additionalProperties: false,
      };

      const valid = validateSchema(schema, { name: 'TraceGuard' }, '3.0');
      expect(valid).toHaveLength(0);

      const invalid = validateSchema(schema, { name: 'TraceGuard', secretKey: 'leaked' }, '3.0');
      expect(invalid).toHaveLength(1);
      expect(invalid[0]?.keyword).toBe('additionalProperties');
    });

    it('enforces schema when additionalProperties defines a type constraint', () => {
      const schema = {
        type: 'object',
        additionalProperties: { type: 'number' },
      };

      expect(validateSchema(schema, { count: 10, total: 20 }, '3.1')).toHaveLength(0);
      const errors = validateSchema(schema, { count: 10, label: 'not-a-number' }, '3.1');
      expect(errors).toHaveLength(1);
    });
  });

  describe('3. Nullable fields & OpenAPI 3.0 exclusiveMinimum boolean', () => {
    it('handles OpenAPI 3.0 nullable fields correctly', () => {
      const schema30 = {
        type: 'object',
        properties: {
          bio: { type: 'string', nullable: true },
        },
      };

      expect(validateSchema(schema30, { bio: 'Engineer' }, '3.0')).toHaveLength(0);
      expect(validateSchema(schema30, { bio: null }, '3.0')).toHaveLength(0);
      expect(validateSchema(schema30, { bio: 123 }, '3.0')).toHaveLength(1);
    });

    it('handles OpenAPI 3.1 type unions with null correctly', () => {
      const schema31 = {
        type: 'object',
        properties: {
          bio: { type: ['string', 'null'] },
        },
      };

      expect(validateSchema(schema31, { bio: 'Engineer' }, '3.1')).toHaveLength(0);
      expect(validateSchema(schema31, { bio: null }, '3.1')).toHaveLength(0);
      expect(validateSchema(schema31, { bio: false }, '3.1')).toHaveLength(1);
    });

    it('handles OpenAPI 3.0 exclusiveMinimum boolean without crashing Ajv', () => {
      const schema30 = {
        type: 'object',
        properties: {
          rating: { type: 'number', minimum: 5, exclusiveMinimum: true },
        },
      };

      // Rating must be > 5, so 5 is invalid, 6 is valid
      const err5 = validateSchema(schema30, { rating: 5 }, '3.0');
      expect(err5).toHaveLength(1);

      const ok6 = validateSchema(schema30, { rating: 6 }, '3.0');
      expect(ok6).toHaveLength(0);
    });
  });

  describe('4. Recursive schemas & Max depth limits', () => {
    it('safely dereferences circular schemas without infinite loop', () => {
      const nodeSchema: Record<string, unknown> = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/Node' },
          },
        },
      };

      const rootDoc = {
        components: {
          schemas: {
            Node: nodeSchema,
          },
        },
      };

      const result = dereferenceSchema(rootDoc, nodeSchema) as Record<string, unknown>;
      expect(result).toBeDefined();
      expect(result['type']).toBe('object');
    });

    it('throws SpecError when reference chain exceeds maximum depth of 50', () => {
      const rootDoc: Record<string, unknown> = { components: { schemas: {} } };
      const schemas = rootDoc['components'] as { schemas: Record<string, unknown> };

      // Build chain Level0 -> Level1 -> ... -> Level55
      for (let i = 0; i <= 55; i++) {
        schemas.schemas[`Level${i}`] = {
          $ref: `#/components/schemas/Level${i + 1}`,
        };
      }
      schemas.schemas['Level56'] = { type: 'string' };

      expect(() =>
        dereferenceSchema(rootDoc, schemas.schemas['Level0'])
      ).toThrow(SpecError);
    });
  });

  describe('5. Large numbers & Unicode', () => {
    it('validates large safe integers up to MAX_SAFE_INTEGER', () => {
      const schema = {
        type: 'object',
        properties: {
          bigId: { type: 'integer' },
        },
      };

      const errors = validateSchema(schema, { bigId: Number.MAX_SAFE_INTEGER }, '3.1');
      expect(errors).toHaveLength(0);
    });

    it('encodes unicode characters in path parameters properly', () => {
      const op: Operation = {
        method: 'GET',
        pathTemplate: '/api/tags/{tagName}',
        parameters: [{ name: 'tagName', in: 'path', required: true }],
        responses: {},
      };

      const built = buildRequest(op, {
        ...DEFAULT_CONFIG,
        pathParameters: {
          '/api/tags/{tagName}': { tagName: 'üñîçødé_🚀' },
        },
      });

      expect(built.url).toContain('/api/tags/%C3%BC%C3%B1%C3%AE%C3%A7%C3%B8d%C3%A9_%F0%9F%9A%80');
    });

    it('validates response bodies containing multibyte unicode strings', () => {
      const schema = {
        type: 'object',
        properties: {
          greeting: { type: 'string' },
        },
      };

      const errors = validateSchema(schema, { greeting: '你好世界 🌍 مرحبا' }, '3.1');
      expect(errors).toHaveLength(0);
    });
  });

  describe('6. Empty bodies & HTTP 204 handling', () => {
    it('accepts status 204 with empty body without findings', () => {
      const op: Operation = {
        method: 'GET',
        pathTemplate: '/health',
        parameters: [],
        responses: {
          '204': { statusCode: '204', description: 'Healthy' },
        },
      };

      const res: HttpResponse = {
        status: 204,
        statusText: 'No Content',
        headers: {},
        bodyText: '',
        isJson: false,
        malformedJson: false,
      };

      const findings = evaluateRuntimeRules(op, res, '3.0');
      expect(findings).toHaveLength(0);
    });

    it('flags HTTP 204 with non-empty body as breaking status mismatch', () => {
      const op: Operation = {
        method: 'GET',
        pathTemplate: '/health',
        parameters: [],
        responses: {
          '204': { statusCode: '204', description: 'Healthy' },
        },
      };

      const res: HttpResponse = {
        status: 204,
        statusText: 'No Content',
        headers: {},
        bodyText: '{"unexpected": true}',
        isJson: true,
        malformedJson: false,
      };

      const findings = evaluateRuntimeRules(op, res, '3.0');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain('returned status 204 No Content but included a non-empty response body');
    });
  });

  describe('7. Duplicate headers & Case tolerance', () => {
    it('matches response headers case-insensitively and tolerates duplicates in commas', () => {
      const op: Operation = {
        method: 'GET',
        pathTemplate: '/api/resource',
        parameters: [],
        responses: {
          '200': {
            statusCode: '200',
            description: 'Success',
            headers: {
              'X-Custom-Trace': { required: true },
            },
          },
        },
      };

      const res: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'x-custom-trace': 'trace-1, trace-2',
        },
        bodyText: '',
        isJson: false,
        malformedJson: false,
      };

      const findings = evaluateRuntimeRules(op, res, '3.0');
      expect(findings).toHaveLength(0);
    });
  });

  describe('8. Malformed config validation', () => {
    it('throws ConfigError on invalid timeout, concurrency, or non-object config', () => {
      expect(() => validateConfig(null)).toThrow(ConfigError);
      expect(() => validateConfig({ spec: '' })).toThrow(ConfigError);
      expect(() => validateConfig({ spec: 'api.yaml', timeoutMs: 50 })).toThrow(ConfigError);
      expect(() => validateConfig({ spec: 'api.yaml', timeoutMs: 5000, concurrency: 0 })).toThrow(ConfigError);
      expect(() => validateConfig({ spec: 'api.yaml', timeoutMs: 5000, concurrency: 100 })).toThrow(ConfigError);
    });
  });

  describe('9. Spec with zero paths & operations with no responses', () => {
    it('safely extracts 0 operations from spec with empty paths', () => {
      const emptyDoc = {
        openapi: '3.0.3',
        info: { title: 'Empty', version: '1.0' },
        paths: {},
      };

      const ops = extractOperations(emptyDoc);
      expect(ops).toHaveLength(0);
    });

    it('safely extracts operations with no declared responses', () => {
      const doc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0' },
        paths: {
          '/ping': {
            get: {
              summary: 'Ping without responses',
            },
          },
        },
      };

      const ops = extractOperations(doc);
      expect(ops).toHaveLength(1);
      expect(ops[0]?.responses).toEqual({});
    });
  });

  describe('10. Identical base and head specs in diff', () => {
    it('returns 0 changes and 0 findings when comparing identical operations', () => {
      const ops: Operation[] = [
        {
          method: 'GET',
          pathTemplate: '/users',
          parameters: [{ name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }],
          responses: {
            '200': {
              statusCode: '200',
              description: 'List',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      ];

      const diffResult = compareOperations(ops, ops);
      expect(diffResult.changes).toHaveLength(0);
      expect(diffResult.findings).toHaveLength(0);
      expect(diffResult.summary.breakingChangesCount).toBe(0);
      expect(diffResult.summary.criticalCount).toBe(0);
    });
  });
});
