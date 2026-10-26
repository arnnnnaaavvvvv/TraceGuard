import { loadConfig, type CliConfigOverrides } from './config/loader.js';
import type { TraceGuardConfig } from './config/schema.js';
import { loadSpec } from './parser/loader.js';
import { extractOperations } from './parser/operations.js';
import { executeContractChecks } from './checker/executor.js';
import { compareOperations } from './diff/comparator.js';
import { loadBaseline } from './baseline/store.js';
import { filterFindingsWithBaseline } from './baseline/filter.js';
import { evaluatePolicy } from './policy/evaluator.js';
import type { Report, Finding } from './types/core.js';

export * from './types/core.js';
export * from './types/errors.js';
export * from './types/rules.js';
export * from './config/schema.js';
export * from './config/loader.js';
export * from './config/defaults.js';
export * from './parser/loader.js';
export * from './parser/references.js';
export * from './parser/operations.js';
export * from './checker/builder.js';
export * from './checker/client.js';
export * from './checker/validate.js';
export * from './checker/rules.js';
export * from './checker/executor.js';
export * from './diff/changes.js';
export * from './diff/normalizer.js';
export * from './diff/comparator.js';
export * from './baseline/store.js';
export * from './baseline/filter.js';
export * from './policy/evaluator.js';
export * from './policy/exit-codes.js';
export * from './report/redaction.js';
export * from './report/terminal.js';
export * from './report/json.js';
export * from './report/markdown.js';
export * from './report/html.js';

export interface TraceGuardClient {
  readonly config: TraceGuardConfig;
  check(options?: { specPath?: string; baseUrl?: string }): Promise<Report>;
}

export function createTraceGuard(initialConfig: CliConfigOverrides = {}): TraceGuardClient {
  const config = loadConfig(initialConfig);

  return {
    config,
    async check(options = {}): Promise<Report> {
      const targetSpec = options.specPath ?? config.spec;
      const targetBaseUrl = options.baseUrl ?? config.baseUrl;

      const loaded = loadSpec(targetSpec);
      const operations = extractOperations(loaded.document);

      const activeConfig: TraceGuardConfig = {
        ...config,
        baseUrl: targetBaseUrl,
      };

      const execution = await executeContractChecks(operations, activeConfig, loaded.version);

      let findings: readonly Finding[] = execution.findings;
      if (config.baselinePath) {
        const baseline = loadBaseline(config.baselinePath);
        findings = filterFindingsWithBaseline(findings, baseline);
      }

      const policyResult = evaluatePolicy(findings, config.policy);

      return {
        schemaVersion: '1.0.0',
        toolVersion: '0.1.0',
        timestamp: new Date().toISOString(),
        mode: 'check',
        summary: execution.summary,
        findings,
        policyResult: {
          passed: policyResult.passed,
          failureReasons: policyResult.failureReasons,
        },
      };
    },
  };
}

export async function compareContracts(options: {
  baseSpecPath: string;
  headSpecPath: string;
  config?: CliConfigOverrides;
}): Promise<Report> {
  const config = loadConfig(options.config ?? {});
  const baseSpec = loadSpec(options.baseSpecPath);
  const headSpec = loadSpec(options.headSpecPath);

  const baseOps = extractOperations(baseSpec.document);
  const headOps = extractOperations(headSpec.document);

  const diffResult = compareOperations(baseOps, headOps);

  let findings: readonly Finding[] = diffResult.findings;
  if (config.baselinePath) {
    const baseline = loadBaseline(config.baselinePath);
    findings = filterFindingsWithBaseline(findings, baseline);
  }

  const policyResult = evaluatePolicy(findings, config.policy);

  return {
    schemaVersion: '1.0.0',
    toolVersion: '0.1.0',
    timestamp: new Date().toISOString(),
    mode: 'diff',
    summary: diffResult.summary,
    findings,
    changes: diffResult.changes,
    policyResult: {
      passed: policyResult.passed,
      failureReasons: policyResult.failureReasons,
    },
  };
}
