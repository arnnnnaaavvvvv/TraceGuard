import type { TraceGuardConfig } from './schema.js';

export const DEFAULT_CONFIG: TraceGuardConfig = {
  spec: './openapi.yaml',
  timeoutMs: 5000,
  maxBodySizeBytes: 2 * 1024 * 1024, // 2MB
  concurrency: 5,
  safeMethodsOnly: true,
  policy: {
    failOnBreaking: true,
    failOnPotentiallyBreaking: false,
    maxCriticalFindings: 0,
    maxMajorFindings: 0,
    ignoredRules: [],
  },
};
