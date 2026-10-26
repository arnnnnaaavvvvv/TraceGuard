import type { Operation, HttpMethod } from '../types/core.js';
import type { TraceGuardConfig } from '../config/schema.js';
import { ConfigError } from '../types/errors.js';

export interface BuiltRequest {
  readonly canBuild: boolean;
  readonly skipReason?: string;
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers: Record<string, string>;
}

const SAFE_METHODS: readonly HttpMethod[] = ['GET', 'HEAD', 'OPTIONS'];

export function buildRequest(
  operation: Operation,
  config: TraceGuardConfig
): BuiltRequest {
  if (!SAFE_METHODS.includes(operation.method)) {
    return {
      canBuild: false,
      skipReason: `Method ${operation.method} is a mutating HTTP verb. Mutating methods are strictly disabled for safety in v0.1.0.`,
      url: '',
      method: operation.method,
      headers: {},
    };
  }

  const baseUrl = (config.baseUrl || 'http://localhost:8080').replace(/\/$/, '');
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return {
      canBuild: false,
      skipReason: `Invalid baseUrl '${baseUrl}'.`,
      url: '',
      method: operation.method,
      headers: {},
    };
  }

  let resolvedPath = operation.pathTemplate;
  const queryParams = new URLSearchParams();
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json, */*',
  };

  // Process configured headers with security validation
  for (const [hName, hVal] of Object.entries(config.headers || {})) {
    validateHeader(hName, hVal);
    if (!isForbiddenHeader(hName)) {
      requestHeaders[hName] = hVal;
    }
  }

  const templateConfig = config.pathParameters?.[operation.pathTemplate];

  for (const param of operation.parameters) {
    const val = resolveParamValue(param.name, param.schema, param.example, templateConfig);

    if (param.in === 'path') {
      if (val === undefined && param.required) {
        return {
          canBuild: false,
          skipReason: `Missing required path parameter '${param.name}' for path '${operation.pathTemplate}'.`,
          url: '',
          method: operation.method,
          headers: {},
        };
      }
      resolvedPath = resolvedPath.replace(`{${param.name}}`, encodeURIComponent(String(val ?? '1')));
    } else if (param.in === 'query') {
      if (val !== undefined) {
        queryParams.set(param.name, String(val));
      } else if (param.required) {
        queryParams.set(param.name, 'test');
      }
    } else if (param.in === 'header' && val !== undefined) {
      const strVal = String(val);
      validateHeader(param.name, strVal);
      if (!isForbiddenHeader(param.name)) {
        requestHeaders[param.name] = strVal;
      }
    }
  }

  // Prevent protocol-relative URL injection (e.g. //attacker.com) and ensure path starts with '/'
  const normalizedPath = resolvedPath.startsWith('/') ? resolvedPath.replace(/^\/+/, '/') : `/${resolvedPath}`;
  const targetUrl = new URL(normalizedPath, base.origin);

  // Security check: Origin MUST NOT change under any circumstances
  if (targetUrl.origin !== base.origin) {
    return {
      canBuild: false,
      skipReason: `Path '${operation.pathTemplate}' resolves outside the configured base origin '${base.origin}'.`,
      url: '',
      method: operation.method,
      headers: {},
    };
  }

  for (const [k, v] of queryParams.entries()) {
    targetUrl.searchParams.set(k, v);
  }

  return {
    canBuild: true,
    url: targetUrl.toString(),
    method: operation.method,
    headers: requestHeaders,
  };
}

function validateHeader(name: string, value: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new ConfigError(`Invalid HTTP header name '${name}'. Header names must only contain alphanumeric characters, underscores, and hyphens.`);
  }
  if (/[\r\n\0]/.test(value)) {
    throw new ConfigError(`HTTP header '${name}' contains illegal CRLF or control characters.`);
  }
}

function isForbiddenHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === 'x-http-method-override' || lower === 'x-method-override' || lower === 'x-http-method';
}

function resolveParamValue(
  name: string,
  schema: Record<string, unknown> | undefined,
  example: unknown,
  configParams?: Record<string, string | number>
): unknown {
  if (configParams && configParams[name] !== undefined) {
    return configParams[name];
  }
  if (example !== undefined) return example;
  if (schema && schema['default'] !== undefined) return schema['default'];

  const type = schema?.['type'];
  if (type === 'integer' || type === 'number') return 1;
  if (type === 'boolean') return true;
  if (type === 'string') return '1';
  return '1';
}
