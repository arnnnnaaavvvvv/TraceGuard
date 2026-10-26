import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSpec } from '../../src/parser/loader.js';
import { extractOperations } from '../../src/parser/operations.js';
import { compareOperations } from '../../src/diff/comparator.js';
import { COMPAT_RULES } from '../../src/types/rules.js';

describe('Specification Diff Engine', () => {
  it('diffs Central Example: flags removed required email and id type change as BREAKING', () => {
    const v1Path = resolve('fixtures/central-example/spec-v1.yaml');
    const v2Path = resolve('fixtures/central-example/spec-v2.yaml');

    const v1 = loadSpec(v1Path);
    const v2 = loadSpec(v2Path);

    const baseOps = extractOperations(v1.document);
    const headOps = extractOperations(v2.document);

    const result = compareOperations(baseOps, headOps);

    expect(result.changes.length).toBe(2);
    expect(result.summary.breakingChangesCount).toBe(2);

    const emailRemoved = result.changes.find(
      (c) => c.ruleId === COMPAT_RULES.REQUIRED_RESPONSE_FIELD_REMOVED
    );
    expect(emailRemoved).toBeDefined();
    expect(emailRemoved?.compatibility).toBe('BREAKING');
    expect(emailRemoved?.severity).toBe('critical');
    expect(emailRemoved?.description).toContain("'email' was removed or made optional");

    const idTypeChanged = result.changes.find(
      (c) => c.ruleId === COMPAT_RULES.RESPONSE_TYPE_CHANGED
    );
    expect(idTypeChanged).toBeDefined();
    expect(idTypeChanged?.compatibility).toBe('BREAKING');
    expect(idTypeChanged?.severity).toBe('critical');
    expect(idTypeChanged?.before).toContain('string');
    expect(idTypeChanged?.after).toContain('integer');
  });

  it('reports zero breaking changes when comparing identical specifications', () => {
    const v1Path = resolve('fixtures/central-example/spec-v1.yaml');
    const v1 = loadSpec(v1Path);
    const ops = extractOperations(v1.document);

    const result = compareOperations(ops, ops);
    expect(result.changes.length).toBe(0);
    expect(result.summary.breakingChangesCount).toBe(0);
  });

  it('detects removed endpoint as BREAKING (TG-COMPAT-ENDPOINT-REMOVED)', () => {
    const v1Path = resolve('fixtures/central-example/spec-v1.yaml');
    const v1 = loadSpec(v1Path);
    const baseOps = extractOperations(v1.document);
    const headOps: typeof baseOps = [];

    const result = compareOperations(baseOps, headOps);
    const endpointRemoved = result.changes.find((c) => c.ruleId === COMPAT_RULES.ENDPOINT_REMOVED);
    expect(endpointRemoved).toBeDefined();
    expect(endpointRemoved?.compatibility).toBe('BREAKING');
  });

  it('detects newly added required query parameter as BREAKING (TG-COMPAT-REQUIRED-REQUEST-FIELD-ADDED)', () => {
    const baseOp = {
      method: 'GET' as const,
      pathTemplate: '/items',
      parameters: [],
      responses: { '200': { statusCode: '200', description: 'OK' } },
    };

    const headOp = {
      ...baseOp,
      parameters: [
        { name: 'apiKey', in: 'query' as const, required: true },
      ],
    };

    const result = compareOperations([baseOp], [headOp]);
    const reqFieldAdded = result.changes.find((c) => c.ruleId === COMPAT_RULES.REQUIRED_REQUEST_FIELD_ADDED);
    expect(reqFieldAdded).toBeDefined();
    expect(reqFieldAdded?.compatibility).toBe('BREAKING');
  });

  it('detects narrowed request enum as BREAKING', () => {
    const baseOp = {
      method: 'GET' as const,
      pathTemplate: '/filter',
      parameters: [
        { name: 'status', in: 'query' as const, required: false, schema: { enum: ['open', 'closed', 'pending'] } },
      ],
      responses: { '200': { statusCode: '200', description: 'OK' } },
    };

    const headOp = {
      ...baseOp,
      parameters: [
        { name: 'status', in: 'query' as const, required: false, schema: { enum: ['open', 'closed'] } },
      ],
    };

    const result = compareOperations([baseOp], [headOp]);
    const enumNarrowed = result.changes.find((c) => c.ruleId === COMPAT_RULES.ENUM_NARROWED);
    expect(enumNarrowed).toBeDefined();
    expect(enumNarrowed?.compatibility).toBe('BREAKING');
  });

  it('returns UNKNOWN compatibility for ambiguous polymorphic changes', () => {
    const baseOp = {
      method: 'GET' as const,
      pathTemplate: '/poly',
      parameters: [],
      responses: {
        '200': {
          statusCode: '200',
          description: 'OK',
          content: {
            'application/json': {
              schema: { oneOf: [{ type: 'string' }, { type: 'number' }] },
            },
          },
        },
      },
    };

    const headOp = {
      ...baseOp,
      responses: {
        '200': {
          statusCode: '200',
          description: 'OK',
          content: {
            'application/json': {
              schema: { anyOf: [{ type: 'string' }, { type: 'boolean' }] },
            },
          },
        },
      },
    };

    const result = compareOperations([baseOp], [headOp]);
    const polyChange = result.changes.find((c) => c.compatibility === 'UNKNOWN');
    expect(polyChange).toBeDefined();
    expect(polyChange?.severity).toBe('major');
  });
});
