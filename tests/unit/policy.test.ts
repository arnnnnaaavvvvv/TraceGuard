import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../../src/policy/evaluator.js';
import type { Finding, Policy } from '../../src/types/core.js';

describe('Policy Evaluator', () => {
  const sampleFinding: Finding = {
    id: 'f-1',
    ruleId: 'TG-CONTRACT-TYPE-MISMATCH',
    severity: 'critical',
    compatibility: 'BREAKING',
    method: 'GET',
    endpoint: '/api/users/{id}',
    location: '#/location',
    expected: 'string',
    actual: 'number',
    message: 'Type mismatch',
    suggestion: 'Fix it',
  };

  const defaultPolicy: Policy = {
    failOnBreaking: true,
    failOnPotentiallyBreaking: false,
    maxCriticalFindings: 0,
    maxMajorFindings: 0,
    ignoredRules: [],
  };

  it('fails policy when breaking finding exists and failOnBreaking is true', () => {
    const result = evaluatePolicy([sampleFinding], defaultPolicy);
    expect(result.passed).toBe(false);
    expect(result.failureReasons.length).toBeGreaterThan(0);
  });

  it('passes policy when findings match ignoredRules', () => {
    const policy: Policy = {
      ...defaultPolicy,
      ignoredRules: ['TG-CONTRACT-TYPE-MISMATCH'],
    };
    const result = evaluatePolicy([sampleFinding], policy);
    expect(result.passed).toBe(true);
    expect(result.failureReasons.length).toBe(0);
  });

  it('passes policy when finding is suppressed by baseline', () => {
    const suppressedFinding = { ...sampleFinding, suppressed: true };
    const result = evaluatePolicy([suppressedFinding], defaultPolicy);
    expect(result.passed).toBe(true);
  });

  it('triggers failure when critical count exceeds maxCriticalFindings threshold', () => {
    const minorBreakingFinding = {
      ...sampleFinding,
      severity: 'minor' as const,
      compatibility: 'NON_BREAKING' as const,
    };
    const policy: Policy = {
      ...defaultPolicy,
      failOnBreaking: false,
      maxCriticalFindings: 0,
    };
    // 0 critical findings with minor finding
    expect(evaluatePolicy([minorBreakingFinding], policy).passed).toBe(true);

    // 1 critical finding with maxCriticalFindings: 0
    expect(evaluatePolicy([sampleFinding], policy).passed).toBe(false);
  });
});
