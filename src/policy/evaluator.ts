import type { Finding, Policy } from '../types/core.js';

export interface PolicyEvaluationResult {
  readonly passed: boolean;
  readonly failureReasons: readonly string[];
  readonly effectiveFindings: readonly Finding[];
}

export function evaluatePolicy(
  findings: readonly Finding[],
  policy: Policy
): PolicyEvaluationResult {
  const failureReasons: string[] = [];

  // Filter out globally ignored rules and suppressed baseline items
  const activeFindings = findings.filter(
    (f) => !f.suppressed && !policy.ignoredRules.includes(f.ruleId)
  );

  let breakingCount = 0;
  let potentiallyBreakingCount = 0;
  let criticalCount = 0;
  let majorCount = 0;

  for (const f of activeFindings) {
    if (f.compatibility === 'BREAKING') breakingCount++;
    if (f.compatibility === 'POTENTIALLY_BREAKING') potentiallyBreakingCount++;
    if (f.severity === 'critical') criticalCount++;
    if (f.severity === 'major') majorCount++;
  }

  if (policy.failOnBreaking && breakingCount > 0) {
    failureReasons.push(`Detected ${breakingCount} breaking change(s) or critical contract mismatch(es).`);
  }

  if (policy.failOnPotentiallyBreaking && potentiallyBreakingCount > 0) {
    failureReasons.push(`Detected ${potentiallyBreakingCount} potentially breaking change(s).`);
  }

  if (criticalCount > policy.maxCriticalFindings) {
    failureReasons.push(
      `Critical findings (${criticalCount}) exceeded threshold of ${policy.maxCriticalFindings}.`
    );
  }

  if (majorCount > policy.maxMajorFindings) {
    failureReasons.push(
      `Major findings (${majorCount}) exceeded threshold of ${policy.maxMajorFindings}.`
    );
  }

  return {
    passed: failureReasons.length === 0,
    failureReasons,
    effectiveFindings: activeFindings,
  };
}
