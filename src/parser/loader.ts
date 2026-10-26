import { existsSync, statSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { SpecError } from '../types/errors.js';
import { dereferenceSchema } from './references.js';

export type OpenApiVersion = '3.0' | '3.1';

export interface LoadedSpec {
  readonly path: string;
  readonly version: OpenApiVersion;
  readonly raw: Record<string, unknown>;
  readonly document: Record<string, unknown>;
}

const MAX_SPEC_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function loadSpec(specPath: string): LoadedSpec {
  const resolvedPath = resolve(specPath);

  if (!existsSync(resolvedPath)) {
    throw new SpecError(`File not found at '${specPath}'.`, specPath, undefined, 'Check the file path in your config or CLI arguments.');
  }

  const stat = statSync(resolvedPath);
  if (stat.size > MAX_SPEC_SIZE_BYTES) {
    throw new SpecError(
      `File size (${(stat.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 10MB.`,
      specPath,
      undefined,
      'Split the specification or remove large embedded payloads.'
    );
  }

  const content = readFileSync(resolvedPath, 'utf-8');
  let raw: unknown;
  try {
    if (resolvedPath.endsWith('.json')) {
      raw = JSON.parse(content);
    } else {
      raw = YAML.parse(content, { maxAliasCount: 100 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SpecError(`Failed to parse specification file: ${msg}`, specPath);
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new SpecError('Specification root must be a valid JSON/YAML object.', specPath);
  }

  const doc = raw as Record<string, unknown>;
  const version = detectVersion(doc, specPath);

  if (!doc['paths'] || typeof doc['paths'] !== 'object') {
    throw new SpecError("Specification missing required 'paths' object.", specPath, '#/paths');
  }

  const dereferenced = dereferenceSchema(doc, doc) as Record<string, unknown>;

  return {
    path: resolvedPath,
    version,
    raw: doc,
    document: dereferenced,
  };
}

function detectVersion(doc: Record<string, unknown>, specPath: string): OpenApiVersion {
  const openapi = doc['openapi'];
  if (typeof openapi !== 'string') {
    if (doc['swagger'] === '2.0') {
      throw new SpecError(
        'Swagger 2.0 is not supported. TraceGuard requires OpenAPI 3.0.x or 3.1.x.',
        specPath,
        '#/swagger',
        'Upgrade your specification to OpenAPI 3.0 or 3.1.'
      );
    }
    throw new SpecError(
      "Missing required 'openapi' version string (e.g., '3.0.3' or '3.1.0').",
      specPath,
      '#/openapi'
    );
  }

  if (openapi.startsWith('3.0.')) return '3.0';
  if (openapi.startsWith('3.1.')) return '3.1';

  throw new SpecError(
    `Unsupported OpenAPI version '${openapi}'. TraceGuard supports 3.0.x and 3.1.x.`,
    specPath,
    '#/openapi'
  );
}
