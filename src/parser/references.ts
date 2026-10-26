import { UnresolvedRefError, SpecError } from '../types/errors.js';

export function resolveLocalRef(
  root: Record<string, unknown>,
  ref: string,
  location?: string
): unknown {
  if (!ref.startsWith('#/')) {
    throw new SpecError(
      `Unsupported external reference '${ref}'. TraceGuard only resolves local references (e.g., '#/components/...'). Remote and file URL references are disabled for offline determinism and security.`,
      undefined,
      location,
      'Convert external references to inline local definitions in #/components/.'
    );
  }

  const parts = ref
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = root;
  for (const part of parts) {
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
      throw new SpecError(`Forbidden prototype property '${part}' in reference '${ref}'.`, undefined, location);
    }
    if (typeof current !== 'object' || current === null || !Object.prototype.hasOwnProperty.call(current, part)) {
      throw new UnresolvedRefError(ref, location);
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

const MAX_DEREF_DEPTH = 50;
const MAX_SCHEMA_NODES = 50000;

export function dereferenceSchema(
  root: Record<string, unknown>,
  schema: unknown,
  seen: Set<unknown> = new Set(),
  path: string = '#',
  depth: number = 0,
  nodeCounter = { count: 0 }
): unknown {
  nodeCounter.count++;
  if (nodeCounter.count > MAX_SCHEMA_NODES) {
    throw new SpecError(
      `Maximum schema node limit (${MAX_SCHEMA_NODES}) exceeded. Possible exponential expansion attack.`,
      undefined,
      path,
      'Split oversized schemas or reduce nested reference expansion.'
    );
  }

  if (depth > MAX_DEREF_DEPTH) {
    throw new SpecError(
      `Maximum reference recursion depth (${MAX_DEREF_DEPTH}) exceeded at '${path}'.`,
      undefined,
      path,
      'Split deeply nested schemas or reduce recursive $ref chains.'
    );
  }

  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  if (seen.has(schema)) {
    return schema; // Break circular recursion
  }
  seen.add(schema);

  if (Array.isArray(schema)) {
    return schema.map((item, index) => dereferenceSchema(root, item, seen, `${path}/${index}`, depth + 1, nodeCounter));
  }

  const obj = schema as Record<string, unknown>;
  if (typeof obj['$ref'] === 'string') {
    const resolved = resolveLocalRef(root, obj['$ref'], `${path}/$ref`);
    return dereferenceSchema(root, resolved, seen, obj['$ref'], depth + 1, nodeCounter);
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    result[key] = dereferenceSchema(root, val, seen, `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`, depth + 1, nodeCounter);
  }
  return result;
}
