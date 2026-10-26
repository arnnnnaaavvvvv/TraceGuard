import { describe, it, expect, afterEach } from 'vitest';
import { resolveLocalRef, dereferenceSchema } from '../../src/parser/references.js';
import { compareOperations } from '../../src/diff/comparator.js';
import { SpecError } from '../../src/types/errors.js';
import type { Operation } from '../../src/types/core.js';

describe('Security: Prototype Pollution Defenses (VULN-01)', () => {
  const originalProtoKeys = Object.getOwnPropertyNames(Object.prototype);

  afterEach(() => {
    // Assert Object.prototype is pristine
    const currentProtoKeys = Object.getOwnPropertyNames(Object.prototype);
    for (const key of currentProtoKeys) {
      if (!originalProtoKeys.includes(key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (Object.prototype as any)[key];
        throw new Error(`CRITICAL: Prototype pollution detected on key '${key}'!`);
      }
    }
  });

  it('rejects $ref targeting constructor and prototype chains', () => {
    const doc = {
      components: {
        schemas: {
          User: { type: 'object' },
        },
      },
    };

    expect(() => resolveLocalRef(doc, '#/constructor/prototype')).toThrow(SpecError);
    expect(() => resolveLocalRef(doc, '#/constructor')).toThrow(SpecError);
    expect(() => resolveLocalRef(doc, '#/__proto__')).toThrow(SpecError);
    expect(() => resolveLocalRef(doc, '#/components/__proto__')).toThrow(SpecError);
  });

  it('strips __proto__ and constructor keys during schema dereferencing', () => {
    const maliciousDoc: Record<string, unknown> = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    // Force a hostile key
    Object.defineProperty(maliciousDoc, '__proto__', {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
    });

    const result = dereferenceSchema(maliciousDoc, maliciousDoc) as Record<string, unknown>;
    expect(result).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(({} as any).polluted).toBeUndefined();
  });

  it('ensures diffing operations with hostile properties leaves Object.prototype clean', () => {
    const baseOp: Operation = {
      method: 'GET',
      pathTemplate: '/users',
      parameters: [],
      responses: {
        '200': {
          statusCode: '200',
          description: 'OK',
          content: {
            'application/json': {
              schema: JSON.parse('{"type": "object", "properties": {"id": {"type": "string"}}}'),
            },
          },
        },
      },
    };

    const headOp: Operation = {
      ...baseOp,
      responses: {
        '200': {
          statusCode: '200',
          description: 'OK',
          content: {
            'application/json': {
              schema: JSON.parse('{"type": "object", "__proto__": {"pollutedDiff": true}, "properties": {"id": {"type": "integer"}}}'),
            },
          },
        },
      },
    };

    compareOperations([baseOp], [headOp]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(({} as any).pollutedDiff).toBeUndefined();
  });
});
