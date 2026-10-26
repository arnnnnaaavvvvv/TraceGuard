import type {
  HttpMethod,
  Operation,
  ParameterDefinition,
  ResponseDefinition,
} from '../types/core.js';

const SUPPORTED_METHODS: readonly HttpMethod[] = [
  'GET',
  'HEAD',
  'OPTIONS',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

export function extractOperations(document: Record<string, unknown>): readonly Operation[] {
  const paths = document['paths'];
  if (typeof paths !== 'object' || paths === null) {
    return [];
  }

  const operations: Operation[] = [];

  for (const [pathTemplate, pathItemRaw] of Object.entries(paths)) {
    if (typeof pathItemRaw !== 'object' || pathItemRaw === null) continue;
    const pathItem = pathItemRaw as Record<string, unknown>;
    const pathParams = parseParameters(pathItem['parameters']);

    for (const method of SUPPORTED_METHODS) {
      const opRaw = pathItem[method.toLowerCase()];
      if (typeof opRaw !== 'object' || opRaw === null) continue;

      const op = opRaw as Record<string, unknown>;
      const opParams = parseParameters(op['parameters']);
      const mergedParams = mergeParameters(pathParams, opParams);

      operations.push({
        operationId: typeof op['operationId'] === 'string' ? op['operationId'] : undefined,
        method,
        pathTemplate,
        parameters: mergedParams,
        requestBody: parseRequestBody(op['requestBody']),
        responses: parseResponses(op['responses']),
        security: parseSecurity(op['security'] ?? document['security']),
      });
    }
  }

  return operations;
}

function parseParameters(raw: unknown): readonly ParameterDefinition[] {
  if (!Array.isArray(raw)) return [];
  const result: ParameterDefinition[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const p = item as Record<string, unknown>;
    const name = typeof p['name'] === 'string' ? p['name'] : '';
    const location = p['in'];
    if (!name || (location !== 'path' && location !== 'query' && location !== 'header')) {
      continue;
    }

    result.push({
      name,
      in: location,
      required: location === 'path' ? true : p['required'] === true,
      schema: typeof p['schema'] === 'object' && p['schema'] !== null ? (p['schema'] as Record<string, unknown>) : undefined,
      example: p['example'],
    });
  }

  return result;
}

function mergeParameters(
  pathParams: readonly ParameterDefinition[],
  opParams: readonly ParameterDefinition[]
): readonly ParameterDefinition[] {
  const map = new Map<string, ParameterDefinition>();
  for (const p of pathParams) map.set(`${p.in}:${p.name}`, p);
  for (const p of opParams) map.set(`${p.in}:${p.name}`, p);
  return Array.from(map.values());
}

function parseRequestBody(raw: unknown): Operation['requestBody'] {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const rb = raw as Record<string, unknown>;
  const content = parseContent(rb['content']);
  return {
    required: rb['required'] === true,
    content,
  };
}

function parseResponses(raw: unknown): Record<string, ResponseDefinition> {
  if (typeof raw !== 'object' || raw === null) return {};
  const responses: Record<string, ResponseDefinition> = {};

  for (const [code, resRaw] of Object.entries(raw)) {
    if (typeof resRaw !== 'object' || resRaw === null) continue;
    const res = resRaw as Record<string, unknown>;
    responses[code] = {
      statusCode: code,
      description: typeof res['description'] === 'string' ? res['description'] : '',
      headers: parseHeaders(res['headers']),
      content: parseContent(res['content']),
    };
  }

  return responses;
}

function parseHeaders(raw: unknown): ResponseDefinition['headers'] {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const headers: Record<string, { required?: boolean; schema?: Record<string, unknown> }> = {};

  for (const [name, hRaw] of Object.entries(raw)) {
    if (typeof hRaw !== 'object' || hRaw === null) continue;
    const h = hRaw as Record<string, unknown>;
    headers[name] = {
      required: h['required'] === true,
      schema: typeof h['schema'] === 'object' && h['schema'] !== null ? (h['schema'] as Record<string, unknown>) : undefined,
    };
  }

  return headers;
}

function parseContent(raw: unknown): Record<string, { schema?: Record<string, unknown> }> {
  if (typeof raw !== 'object' || raw === null) return {};
  const content: Record<string, { schema?: Record<string, unknown> }> = {};

  for (const [mediaType, mediaRaw] of Object.entries(raw)) {
    if (typeof mediaRaw !== 'object' || mediaRaw === null) continue;
    const m = mediaRaw as Record<string, unknown>;
    content[mediaType] = {
      schema: typeof m['schema'] === 'object' && m['schema'] !== null ? (m['schema'] as Record<string, unknown>) : undefined,
    };
  }

  return content;
}

function parseSecurity(raw: unknown): Operation['security'] {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((item) => typeof item === 'object' && item !== null) as Record<string, string[]>[];
}
