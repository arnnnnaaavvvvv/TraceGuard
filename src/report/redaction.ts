const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'cookie',
  'set-cookie',
  'x-auth-token',
]);

const SENSITIVE_QUERY_PARAMS = /(token|key|secret|password|auth|apiKey)=([^&\s]+)/gi;
const BEARER_TOKEN_REGEX = /(Bearer\s+)[A-Za-z0-9\-_.~+/]+=*/gi;

export function redactText(text: string): string {
  if (!text) return text;
  return text
    .replace(BEARER_TOKEN_REGEX, '$1[REDACTED]')
    .replace(SENSITIVE_QUERY_PARAMS, '$1=[REDACTED]');
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
