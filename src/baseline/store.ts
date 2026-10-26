import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigError } from '../types/errors.js';
import type { Finding, BaselineFile, BaselineEntry } from '../types/core.js';

export function saveBaseline(
  filePath: string,
  findings: readonly Finding[],
  options?: { force?: boolean }
): BaselineFile {
  const resolved = resolve(filePath);

  if (existsSync(resolved) && !options?.force) {
    throw new ConfigError(
      `Baseline file already exists at '${filePath}'. Use --force to overwrite an existing baseline snapshot.`,
      'Pass --force to overwrite or specify a different baseline path.'
    );
  }

  const entries: BaselineEntry[] = findings.map((f) => ({
    fingerprint: f.id,
    ruleId: f.ruleId,
    method: f.method,
    endpoint: f.endpoint,
    location: f.location,
    recordedAt: new Date().toISOString(),
  }));

  const baselineData: BaselineFile = {
    version: '1',
    createdAt: new Date().toISOString(),
    entries,
  };

  writeFileSync(resolved, JSON.stringify(baselineData, null, 2), 'utf-8');
  return baselineData;
}

export function loadBaseline(filePath: string): BaselineFile {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new ConfigError(`Baseline file not found at '${filePath}'.`);
  }

  try {
    const raw = readFileSync(resolved, 'utf-8');
    const parsed = JSON.parse(raw) as BaselineFile;
    if (parsed.version !== '1' || !Array.isArray(parsed.entries)) {
      throw new ConfigError(`Invalid baseline file format in '${filePath}'. Expected schema version 1.`);
    }
    return parsed;
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConfigError(`Failed to read baseline file at '${filePath}': ${msg}`);
  }
}

export function clearBaseline(filePath: string): void {
  const resolved = resolve(filePath);
  if (existsSync(resolved)) {
    unlinkSync(resolved);
  }
}
