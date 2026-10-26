const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'apikey',
  'cookie',
  'set-cookie',
  'x-auth-token',
  'x-access-token',
  'x-csrf-token',
  'x-xsrf-token',
  'private-token',
]);

const SENSITIVE_QUERY_PARAMS = /([?&]?(?:access_token|refresh_token|id_token|token|apiKey|api_key|key|secret|password|passwd|auth|sig|signature)=)([^&\s]+)/gi;
const BEARER_TOKEN_REGEX = /(Bearer\s+)[A-Za-z0-9\-_.~+/]+=*/gi;
const BASIC_AUTH_REGEX = /(Basic\s+)[A-Za-z0-9+/=]+/gi;
const URL_USERINFO_REGEX = /(https?:\/\/)[^/@\s:]+:[^/@\s:]+@/gi;
const JWT_REGEX = /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g;
const SENSITIVE_JSON_KEYS = /("?(?:password|passwd|secret|client_secret|apiKey|api_key|token|access_token|refresh_token)"?\s*:\s*)"(?:\\"|[^"])*"/gi;

export function redactText(text: string): string {
  if (!text) return text;
  return text
    .replace(URL_USERINFO_REGEX, '$1[REDACTED]:[REDACTED]@')
    .replace(BEARER_TOKEN_REGEX, '$1[REDACTED]')
    .replace(BASIC_AUTH_REGEX, '$1[REDACTED]')
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(SENSITIVE_QUERY_PARAMS, '$1[REDACTED]')
    .replace(SENSITIVE_JSON_KEYS, '$1"[REDACTED]"');
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(lowerKey)) {
      redacted[lowerKey] = '[REDACTED]';
    } else {
      redacted[lowerKey] = redactText(val);
    }
  }
  return redacted;
}

export function redactReport(report: import('../types/core.js').Report): import('../types/core.js').Report {
  return {
    ...report,
    findings: report.findings.map((f) => ({
      ...f,
      endpoint: redactText(f.endpoint),
      location: redactText(f.location),
      expected: redactText(f.expected),
      actual: redactText(f.actual),
      message: redactText(f.message),
      suggestion: redactText(f.suggestion),
    })),
    changes: report.changes?.map((c) => ({
      ...c,
      endpoint: c.endpoint ? redactText(c.endpoint) : undefined,
      description: redactText(c.description),
      before: c.before ? redactText(c.before) : undefined,
      after: c.after ? redactText(c.after) : undefined,
    })),
    policyResult: {
      ...report.policyResult,
      failureReasons: report.policyResult.failureReasons.map((r) => redactText(r)),
    },
  };
}
