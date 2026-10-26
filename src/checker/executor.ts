import type { Operation, Finding, ReportSummary } from '../types/core.js';
import type { TraceGuardConfig } from '../config/schema.js';
import { buildRequest } from './builder.js';
import { executeRequest } from './client.js';
import { evaluateRuntimeRules } from './rules.js';

export interface CheckExecutionResult {
  readonly findings: readonly Finding[];
  readonly summary: ReportSummary;
}

export async function executeContractChecks(
  operations: readonly Operation[],
  config: TraceGuardConfig,
  specVersion: '3.0' | '3.1'
): Promise<CheckExecutionResult> {
  const allFindings: Finding[] = [];
  let checkedCount = 0;
  let skippedCount = 0;

  const concurrency = Math.max(1, Math.min(config.concurrency, 50));
  const queue = [...operations];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const op = queue.shift();
      if (!op) break;

      const req = buildRequest(op, config);
      if (!req.canBuild) {
        skippedCount++;
        continue;
      }

      checkedCount++;
      const res = await executeRequest(req.url, req.method, req.headers, {
        timeoutMs: config.timeoutMs,
        maxBodySizeBytes: config.maxBodySizeBytes,
      });

      const findings = evaluateRuntimeRules(op, res, specVersion);
      allFindings.push(...findings);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const summary = computeSummary(operations.length, checkedCount, skippedCount, allFindings);

  return {
    findings: allFindings,
    summary,
  };
}

function computeSummary(
  total: number,
  checked: number,
  skipped: number,
  findings: readonly Finding[]
): ReportSummary {
  let criticalCount = 0;
  let majorCount = 0;
  let minorCount = 0;
  let infoCount = 0;
  let suppressedCount = 0;
  let breakingChangesCount = 0;

  for (const f of findings) {
    if (f.suppressed) {
      suppressedCount++;
      continue;
    }
    if (f.severity === 'critical') criticalCount++;
    if (f.severity === 'major') majorCount++;
    if (f.severity === 'minor') minorCount++;
    if (f.severity === 'info') infoCount++;
    if (f.compatibility === 'BREAKING') breakingChangesCount++;
  }

  return {
    totalOperations: total,
    checkedOperations: checked,
    skippedOperations: skipped,
    totalFindings: findings.length,
    criticalCount,
    majorCount,
    minorCount,
    infoCount,
    suppressedCount,
    breakingChangesCount,
  };
}
