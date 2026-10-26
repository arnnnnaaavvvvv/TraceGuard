import { ConfigError } from '../types/errors.js';
import type { Policy } from '../types/core.js';

export interface TraceGuardConfig {
  readonly $schema?: string;
  readonly spec: string;
  readonly baseUrl?: string;
  readonly timeoutMs: number;
  readonly maxBodySizeBytes: number;
  readonly concurrency: number;
  readonly headers?: Record<string, string>;
  readonly safeMethodsOnly: boolean;
  readonly baselinePath?: string;
  readonly policy: Policy;
  readonly pathParameters?: Record<string, Record<string, string | number>>;
}

export function validateConfig(config: unknown): asserts config is TraceGuardConfig {
  if (typeof config !== 'object' || config === null) {
    throw new ConfigError('Config must be a valid JSON/YAML object.');
  }

  const raw = config as Partial<TraceGuardConfig>;

  if (typeof raw.spec !== 'string' || raw.spec.trim().length === 0) {
    throw new ConfigError("Field 'spec' must be a non-empty string referencing an OpenAPI file.");
  }

  if (raw.baseUrl !== undefined) {
    if (typeof raw.baseUrl !== 'string' || !/^https?:\/\//i.test(raw.baseUrl)) {
      throw new ConfigError("Field 'baseUrl' must be a valid HTTP or HTTPS URL (e.g., http://localhost:8080).");
    }
  }

  if (typeof raw.timeoutMs !== 'number' || raw.timeoutMs < 100 || raw.timeoutMs > 60000) {
    throw new ConfigError("Field 'timeoutMs' must be a number between 100 and 60000 (ms).");
  }

  if (typeof raw.maxBodySizeBytes !== 'number' || raw.maxBodySizeBytes < 1024 || raw.maxBodySizeBytes > 52428800) {
    throw new ConfigError("Field 'maxBodySizeBytes' must be a number between 1024 (1KB) and 52428800 (50MB).");
  }

  if (typeof raw.concurrency !== 'number' || raw.concurrency < 1 || raw.concurrency > 50) {
    throw new ConfigError("Field 'concurrency' must be an integer between 1 and 50.");
  }

  if (raw.policy !== undefined) {
    validatePolicy(raw.policy);
  }
}

function validatePolicy(policy: unknown): void {
  if (typeof policy !== 'object' || policy === null) {
    throw new ConfigError("Field 'policy' must be an object.");
  }

  const p = policy as Partial<Policy>;
  if (p.maxCriticalFindings !== undefined && (typeof p.maxCriticalFindings !== 'number' || p.maxCriticalFindings < 0)) {
    throw new ConfigError("Policy 'maxCriticalFindings' must be a non-negative integer.");
  }

  if (p.maxMajorFindings !== undefined && (typeof p.maxMajorFindings !== 'number' || p.maxMajorFindings < 0)) {
    throw new ConfigError("Policy 'maxMajorFindings' must be a non-negative integer.");
  }

  if (p.ignoredRules !== undefined && !Array.isArray(p.ignoredRules)) {
    throw new ConfigError("Policy 'ignoredRules' must be an array of rule strings.");
  }
}
