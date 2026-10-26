import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { ConfigError } from '../types/errors.js';
import type { Finding, BaselineFile, BaselineEntry } from '../types/core.js';

export function validateSafeWritePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new ConfigError('File path must be a non-empty string.');
  }

  const resolved = resolve(filePath);
  const cwd = process.cwd();
  const rel = relative(cwd, resolved);

  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new ConfigError(
      `File path '${filePath}' resolves outside the current working directory. For security, files must reside within the workspace.`,
      'Specify a path within the current working directory.'
    );
  }

  return resolved;
}

export function saveBaseline(
  filePath: string,
  findings: readonly Finding[],
  options?: { force?: boolean }
): BaselineFile {
  const resolved = validateSafeWritePath(filePath);

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

  writeFileSync(resolved, JSON.stringify(baselineData, null, 2), { encoding: 'utf-8', mode: 0o600 });
  return baselineData;
}

export function loadBaseline(filePath: string): BaselineFile {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new ConfigError(`Baseline file not found at '${filePath}'.`);
  }

  const stat = statSync(resolved);
  if (stat.size > 10 * 1024 * 1024) {
    throw new ConfigError(`Baseline file at '${filePath}' exceeds maximum size limit of 10MB.`);
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
  const resolved = validateSafeWritePath(filePath);
  if (existsSync(resolved)) {
    unlinkSync(resolved);
  }
}
