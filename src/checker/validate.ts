import AjvModule from 'ajv';
import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import type { ErrorObject } from 'ajv';

export interface ValidationErrorDetail {
  readonly path: string;
  readonly message: string;
  readonly keyword: string;
  readonly expected: string;
  readonly actual: string;
  readonly schemaPath: string;
}

// Interop for CJS/ESM bundling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass: any = (AjvModule as any).default || AjvModule;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv2020Class: any = (Ajv2020Module as any).default || Ajv2020Module;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats: any = (addFormatsModule as any).default || addFormatsModule;

const ajv30 = new AjvClass({
  allErrors: true,
  coerceTypes: false,
  strict: false,
  validateFormats: true,
});
addFormats(ajv30);

const ajv31 = new Ajv2020Class({
  allErrors: true,
  coerceTypes: false,
  strict: false,
  validateFormats: true,
});
addFormats(ajv31);

export function validateSchema(
  schema: Record<string, unknown>,
  data: unknown,
  version: '3.0' | '3.1'
): readonly ValidationErrorDetail[] {
  const preparedSchema = version === '3.0' ? normalize30Nullable(schema) : schema;
  const validator = version === '3.0' ? ajv30 : ajv31;

  try {
    const validate = validator.compile(preparedSchema);
    const valid = validate(data);
    if (valid) return [];

    const errors = (validate.errors as ErrorObject[]) || [];
    return errors.map((err: ErrorObject) => formatAjvError(err, data));
  } catch (err) {
    return [
      {
        path: '#',
        message: `Schema compilation failed: ${err instanceof Error ? err.message : String(err)}`,
        keyword: 'schema',
        expected: 'valid JSON schema',
        actual: 'invalid schema syntax',
        schemaPath: '#',
      },
    ];
  }
}

function normalize30Nullable(schema: Record<string, unknown>): Record<string, unknown> {
  const cloned = structuredClone(schema);

  function transform(node: unknown): void {
    if (typeof node !== 'object' || node === null) return;
    const obj = node as Record<string, unknown>;

    if (obj['nullable'] === true) {
      delete obj['nullable'];
      if (typeof obj['type'] === 'string') {
        obj['type'] = [obj['type'], 'null'];
      } else if (Array.isArray(obj['type']) && !obj['type'].includes('null')) {
        obj['type'] = [...obj['type'], 'null'];
      }
    }

    if (obj['properties'] && typeof obj['properties'] === 'object') {
      for (const val of Object.values(obj['properties'])) transform(val);
    }
    if (obj['items'] && typeof obj['items'] === 'object') {
      transform(obj['items']);
    }
  }

  transform(cloned);
  return cloned;
}

function formatAjvError(err: ErrorObject, data: unknown): ValidationErrorDetail {
  const propPath = err.instancePath ? `#${err.instancePath}` : '#';
  let expected = err.message || 'valid value';
  let actual = 'value provided';

  if (err.keyword === 'type') {
    const params = err.params as { type?: string };
    expected = params.type || 'expected type';
    const val = getPathValue(data, err.instancePath);
    actual = val === null ? 'null' : typeof val;
  } else if (err.keyword === 'required') {
    const params = err.params as { missingProperty?: string };
    expected = `property '${params.missingProperty}' present`;
    actual = 'undefined (missing)';
  } else if (err.keyword === 'enum') {
    const params = err.params as { allowedValues?: unknown[] };
    expected = `one of [${(params.allowedValues || []).join(', ')}]`;
    const val = getPathValue(data, err.instancePath);
    actual = JSON.stringify(val);
  }

  return {
    path: propPath,
    message: err.message || 'Validation error',
    keyword: err.keyword,
    expected,
    actual,
    schemaPath: err.schemaPath,
  };
}

function getPathValue(data: unknown, instancePath: string): unknown {
  if (!instancePath || instancePath === '/') return data;
  const parts = instancePath.split('/').filter(Boolean);
  let curr: unknown = data;
  for (const part of parts) {
    if (typeof curr === 'object' && curr !== null && part in curr) {
      curr = (curr as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return curr;
}
