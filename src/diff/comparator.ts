import type { Operation, CompatChange, Finding, ReportSummary } from '../types/core.js';
import { compareEndpointsAndMethods } from './rules-endpoints.js';
import { compareOperationMetadata } from './rules-operations.js';
import { compareRequestParameters } from './rules-parameters.js';
import { compareResponseSchemas } from './rules-schemas.js';
import { compatChangeToFinding } from './changes.js';

export interface DiffResult {
  readonly changes: readonly CompatChange[];
  readonly findings: readonly Finding[];
  readonly summary: ReportSummary;
}

export function compareOperations(
  baseOps: readonly Operation[],
  headOps: readonly Operation[]
): DiffResult {
  const allChanges: CompatChange[] = [];

  // 1. Endpoint and Method level comparison
  allChanges.push(...compareEndpointsAndMethods(baseOps, headOps));

  // 2. Operation-level comparison for matching operations
  const baseMap = new Map<string, Operation>();
  for (const op of baseOps) {
    baseMap.set(`${op.method}:${op.pathTemplate}`, op);
  }

  for (const headOp of headOps) {
    const key = `${headOp.method}:${headOp.pathTemplate}`;
    const baseOp = baseMap.get(key);
    if (!baseOp) continue; // New endpoint/method (handled in endpoints check)

    allChanges.push(...compareOperationMetadata(baseOp, headOp));
    allChanges.push(...compareRequestParameters(baseOp, headOp));
    allChanges.push(...compareResponseSchemas(baseOp, headOp));
  }

  const findings = allChanges.map(compatChangeToFinding);
  const summary = computeSummary(baseOps.length, headOps.length, allChanges, findings);

  return {
    changes: allChanges,
    findings,
    summary,
  };
}

function computeSummary(
  baseCount: number,
  headCount: number,
  changes: readonly CompatChange[],
  findings: readonly Finding[]
): ReportSummary {
  let criticalCount = 0;
  let majorCount = 0;
  let minorCount = 0;
  let infoCount = 0;
  let breakingChangesCount = 0;

  for (const c of changes) {
    if (c.compatibility === 'BREAKING') breakingChangesCount++;
    if (c.severity === 'critical') criticalCount++;
    if (c.severity === 'major') majorCount++;
    if (c.severity === 'minor') minorCount++;
    if (c.severity === 'info') infoCount++;
  }

  return {
    totalOperations: Math.max(baseCount, headCount),
    checkedOperations: Math.min(baseCount, headCount),
    skippedOperations: 0,
    totalFindings: findings.length,
    criticalCount,
    majorCount,
    minorCount,
    infoCount,
    suppressedCount: 0,
    breakingChangesCount,
  };
}
