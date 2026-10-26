import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSpec } from '../../src/parser/loader.js';
import { extractOperations } from '../../src/parser/operations.js';
import { resolveLocalRef } from '../../src/parser/references.js';
import { SpecError, UnresolvedRefError } from '../../src/types/errors.js';

describe('Parser Module', () => {
  it('loads OpenAPI 3.1 YAML spec and extracts operations', () => {
    const fixturePath = resolve('fixtures/central-example/spec-v1.yaml');
    const loaded = loadSpec(fixturePath);

    expect(loaded.version).toBe('3.1');
    expect(loaded.document).toBeDefined();

    const ops = extractOperations(loaded.document);
    expect(ops.length).toBe(1);

    const op = ops[0];
    expect(op?.method).toBe('GET');
    expect(op?.pathTemplate).toBe('/api/users/{id}');
    expect(op?.parameters.length).toBe(1);
    expect(op?.parameters[0]?.name).toBe('id');
    expect(op?.responses['200']?.description).toBe('Successful user response');
  });

  it('loads OpenAPI 3.0 YAML spec and dereferences local $ref', () => {
    const fixturePath = resolve('fixtures/specs-3.0/valid-petstore.yaml');
    const loaded = loadSpec(fixturePath);

    expect(loaded.version).toBe('3.0');
    const ops = extractOperations(loaded.document);
    expect(ops.length).toBe(1);

    const schema = ops[0]?.responses['200']?.content?.['application/json']?.schema;
    expect(schema).toBeDefined();
    // Dereferenced Pet schema inside array items
    const items = (schema as { items?: { properties?: Record<string, unknown> } })?.items;
    expect(items?.properties?.['id']).toBeDefined();
    expect(items?.properties?.['tag']).toBeDefined();
  });

  it('throws UnresolvedRefError on missing local component', () => {
    const root = { components: { schemas: {} } };
    expect(() => resolveLocalRef(root, '#/components/schemas/NonExistent')).toThrow(UnresolvedRefError);
  });

  it('throws SpecError on external HTTP $ref', () => {
    const root = {};
    expect(() => resolveLocalRef(root, 'https://example.com/schema.json')).toThrow(SpecError);
  });

  it('throws SpecError on missing file', () => {
    expect(() => loadSpec('non-existent.yaml')).toThrow(SpecError);
  });
});
