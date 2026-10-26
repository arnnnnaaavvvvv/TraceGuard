import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { ConfigError } from '../types/errors.js';
import { DEFAULT_CONFIG } from './defaults.js';
import { validateConfig, type TraceGuardConfig } from './schema.js';

export interface CliConfigOverrides {
  readonly configPath?: string;
  readonly spec?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly concurrency?: number;
  readonly baselinePath?: string;
  readonly ci?: boolean;
  readonly headers?: Record<string, string>;
  readonly pathParameters?: Record<string, Record<string, string | number>>;
}

const DEFAULT_CONFIG_FILES = [
  'traceguard.config.json',
  '.traceguardrc.yaml',
  '.traceguardrc.yml',
  '.traceguardrc.json',
];

export function loadConfig(overrides: CliConfigOverrides = {}): TraceGuardConfig {
  const filePath = findConfigFile(overrides.configPath);
  const fileConfig = filePath ? readFileConfig(filePath) : {};
  const merged = mergeConfigs(DEFAULT_CONFIG, fileConfig, overrides);
  validateConfig(merged);
  return merged;
}

function findConfigFile(explicitPath?: string): string | null {
  if (explicitPath) {
    const resolved = resolve(explicitPath);
    if (!existsSync(resolved)) {
      throw new ConfigError(`Config file not found at '${explicitPath}'.`);
    }
    return resolved;
  }

  for (const file of DEFAULT_CONFIG_FILES) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) return path;
  }
  return null;
}

function readFileConfig(filePath: string): Record<string, unknown> {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('.json')) {
      return JSON.parse(raw) as Record<string, unknown>;
    }
    return YAML.parse(raw) as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConfigError(`Failed to parse config file '${filePath}': ${msg}`);
  }
}

function mergeConfigs(
  defaults: TraceGuardConfig,
  fileConfig: Record<string, unknown>,
  cli: CliConfigOverrides
): TraceGuardConfig {
  const filePolicy = (fileConfig['policy'] as Record<string, unknown>) || {};
  const isCi = cli.ci === true;

  return {
    ...defaults,
    ...fileConfig,
    spec: cli.spec ?? (typeof fileConfig['spec'] === 'string' ? fileConfig['spec'] : defaults.spec),
    baseUrl: cli.baseUrl ?? (typeof fileConfig['baseUrl'] === 'string' ? fileConfig['baseUrl'] : defaults.baseUrl),
    timeoutMs: cli.timeoutMs ?? (typeof fileConfig['timeoutMs'] === 'number' ? fileConfig['timeoutMs'] : defaults.timeoutMs),
    concurrency: cli.concurrency ?? (typeof fileConfig['concurrency'] === 'number' ? fileConfig['concurrency'] : defaults.concurrency),
    baselinePath: cli.baselinePath ?? (typeof fileConfig['baselinePath'] === 'string' ? fileConfig['baselinePath'] : defaults.baselinePath),
    headers: {
      ...((fileConfig['headers'] as Record<string, string>) || {}),
      ...(cli.headers || {}),
    },
    pathParameters: cli.pathParameters ?? (fileConfig['pathParameters'] as Record<string, Record<string, string | number>> | undefined),
    policy: {
      failOnBreaking: isCi ? true : (typeof filePolicy['failOnBreaking'] === 'boolean' ? filePolicy['failOnBreaking'] : defaults.policy.failOnBreaking),
      failOnPotentiallyBreaking: isCi ? true : (typeof filePolicy['failOnPotentiallyBreaking'] === 'boolean' ? filePolicy['failOnPotentiallyBreaking'] : defaults.policy.failOnPotentiallyBreaking),
      maxCriticalFindings: isCi ? 0 : (typeof filePolicy['maxCriticalFindings'] === 'number' ? filePolicy['maxCriticalFindings'] : defaults.policy.maxCriticalFindings),
      maxMajorFindings: isCi ? 0 : (typeof filePolicy['maxMajorFindings'] === 'number' ? filePolicy['maxMajorFindings'] : defaults.policy.maxMajorFindings),
      ignoredRules: Array.isArray(filePolicy['ignoredRules']) ? (filePolicy['ignoredRules'] as string[]) : defaults.policy.ignoredRules,
    },
  };
}
