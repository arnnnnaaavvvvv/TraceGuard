import type { Operation, HttpMethod } from '../types/core.js';
import type { TraceGuardConfig } from '../config/schema.js';

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
  if (config.safeMethodsOnly && !SAFE_METHODS.includes(operation.method)) {
    return {
      canBuild: false,
      skipReason: `Method ${operation.method} is a mutating HTTP verb. Mutating methods are disabled for safety in v0.1.0.`,
      url: '',
      method: operation.method,
      headers: {},
    };
  }

  const baseUrl = (config.baseUrl || 'http://localhost:8080').replace(/\/$/, '');
  let resolvedPath = operation.pathTemplate;
  const queryParams = new URLSearchParams();
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json, */*',
    ...(config.headers || {}),
  };

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
      requestHeaders[param.name] = String(val);
    }
  }

  const queryString = queryParams.toString();
  const fullUrl = `${baseUrl}${resolvedPath}${queryString ? `?${queryString}` : ''}`;

  return {
    canBuild: true,
    url: fullUrl,
    method: operation.method,
    headers: requestHeaders,
  };
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
