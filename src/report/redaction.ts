const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'cookie',
  'set-cookie',
  'x-auth-token',
]);

const SENSITIVE_QUERY_PARAMS = /([?&]?(?:access_token|refresh_token|id_token|token|apiKey|api_key|key|secret|password|passwd|auth|sig)=)([^&\s]+)/gi;
const BEARER_TOKEN_REGEX = /(Bearer\s+)[A-Za-z0-9\-_.~+/]+=*/gi;
const BASIC_AUTH_REGEX = /(Basic\s+)[A-Za-z0-9+/=]+/gi;
const SENSITIVE_JSON_KEYS = /("?(?:password|passwd|secret|client_secret|apiKey|api_key|token|access_token|refresh_token)"?\s*:\s*)"(?:\\"|[^"])*"/gi;

export function redactText(text: string): string {
  if (!text) return text;
  return text
    .replace(BEARER_TOKEN_REGEX, '$1[REDACTED]')
    .replace(BASIC_AUTH_REGEX, '$1[REDACTED]')
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
