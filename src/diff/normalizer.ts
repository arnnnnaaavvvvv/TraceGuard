export function normalizePath(pathTemplate: string): string {
  // Normalize variable names in paths, e.g. /users/{id} and /users/{userId} -> /users/{}
  return pathTemplate.replace(/\{[^}]+}/g, '{}');
}

export function normalizeSchemaTypes(schema: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== 'object') return undefined;

  const copy = structuredClone(schema);

  function walk(node: unknown): void {
    if (typeof node !== 'object' || node === null) return;
    const obj = node as Record<string, unknown>;

    // Convert 3.0 nullable: true to union types
    if (obj['nullable'] === true) {
      delete obj['nullable'];
      if (typeof obj['type'] === 'string') {
        obj['type'] = [obj['type'], 'null'];
      } else if (Array.isArray(obj['type']) && !obj['type'].includes('null')) {
        obj['type'] = [...obj['type'], 'null'];
      }
    }

    // Sort required properties
    if (Array.isArray(obj['required'])) {
      obj['required'] = [...obj['required']].sort();
    }

    // Sort enum values if all strings
    if (Array.isArray(obj['enum']) && obj['enum'].every((v) => typeof v === 'string')) {
      obj['enum'] = [...obj['enum']].sort();
    }

    if (obj['properties'] && typeof obj['properties'] === 'object') {
      for (const val of Object.values(obj['properties'])) walk(val);
    }
    if (obj['items'] && typeof obj['items'] === 'object') {
      walk(obj['items']);
    }
  }

  walk(copy);
  return copy;
}
