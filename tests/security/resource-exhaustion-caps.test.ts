import { describe, it, expect } from 'vitest';
import { extractOperations } from '../../src/parser/operations.js';
import { dereferenceSchema } from '../../src/parser/references.js';
import { SpecError } from '../../src/types/errors.js';

describe('Security: Resource Exhaustion & Caps Defenses (VULN-10)', () => {
  it('throws SpecError with exit code 2 when operations count exceeds 1000', () => {
    const hugePaths: Record<string, unknown> = {};

    // Generate 1005 operations
    for (let i = 0; i < 1005; i++) {
      hugePaths[`/api/item/${i}`] = {
        get: {
          summary: `Item ${i}`,
          responses: {
            '200': { description: 'OK' },
          },
        },
      };
    }

    const hostileDoc = {
      openapi: '3.0.3',
      paths: hugePaths,
    };

    expect(() => {
      extractOperations(hostileDoc);
    }).toThrow(SpecError);

    try {
      extractOperations(hostileDoc);
    } catch (err) {
      expect(err).toBeInstanceOf(SpecError);
      expect((err as SpecError).exitCode).toBe(2);
      expect((err as SpecError).message).toContain('maximum limit of 1000 operations');
    }
  });

  it('throws SpecError when schema reference expansion exceeds 50,000 nodes', () => {
    const rootDoc: Record<string, unknown> = {
      type: 'object',
      properties: {},
    };

    const props = rootDoc.properties as Record<string, unknown>;
    for (let i = 0; i < 55000; i++) {
      props[`field_${i}`] = { type: 'string', description: `field ${i}` };
    }

    expect(() => {
      dereferenceSchema(rootDoc, rootDoc);
    }).toThrow(SpecError);

    try {
      dereferenceSchema(rootDoc, rootDoc);
    } catch (err) {
      expect(err).toBeInstanceOf(SpecError);
      expect((err as SpecError).exitCode).toBe(2);
      expect((err as SpecError).message).toContain('Maximum schema node limit');
    }
  });
});
