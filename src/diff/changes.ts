import { createHash } from 'node:crypto';
import type { CompatChange, Finding, HttpMethod } from '../types/core.js';
import type { CompatibilityType, Severity } from '../types/rules.js';

export function createCompatChange(params: {
  ruleId: string;
  compatibility: CompatibilityType;
  severity: Severity;
  method?: HttpMethod;
  endpoint?: string;
  location: string;
  description: string;
  before?: string;
  after?: string;
}): CompatChange {
  return {
    ...params,
  };
}

export function compatChangeToFinding(change: CompatChange): Finding {
  const method = change.method ?? 'GET';
  const endpoint = change.endpoint ?? '/';
  const hash = createHash('sha256')
    .update(`${change.ruleId}:${method}:${endpoint}:${change.location}`)
    .digest('hex')
    .slice(0, 16);

  return {
    id: hash,
    ruleId: change.ruleId,
    severity: change.severity,
    compatibility: change.compatibility,
    method,
    endpoint,
    location: change.location,
    expected: change.before ?? 'base contract specification',
    actual: change.after ?? 'head contract revision',
    message: change.description,
    suggestion: getRemediationSuggestion(change),
  };
}

function getRemediationSuggestion(change: CompatChange): string {
  if (change.ruleId.includes('REMOVED')) {
    return 'Restore the removed endpoint, method, or field, or publish a new major API version.';
  }
  if (change.ruleId.includes('REQUIRED-REQUEST-FIELD-ADDED')) {
    return 'Make the newly added request parameter or field optional, or supply a default value.';
  }
  if (change.ruleId.includes('TYPE-CHANGED')) {
    return 'Preserve the original data type or support a union type for backwards compatibility.';
  }
  if (change.ruleId.includes('AUTH')) {
    return 'Ensure new authentication schemes remain optional or maintain backwards-compatible fallback schemes.';
  }
  return 'Review the API change with downstream consumers before merging.';
}
