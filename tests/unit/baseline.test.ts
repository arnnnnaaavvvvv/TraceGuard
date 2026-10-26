import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { saveBaseline, loadBaseline, clearBaseline } from '../../src/baseline/store.js';
import { filterFindingsWithBaseline } from '../../src/baseline/filter.js';
import { ConfigError } from '../../src/types/errors.js';
import type { Finding } from '../../src/types/core.js';

describe('Baseline Store & Filter', () => {
  const testBaselinePath = resolve('tests/unit/temp-baseline.json');

  afterEach(() => {
    if (existsSync(testBaselinePath)) {
      unlinkSync(testBaselinePath);
    }
  });

  const sampleFinding: Finding = {
    id: 'test-fingerprint-1',
    ruleId: 'TG-CONTRACT-TYPE-MISMATCH',
    severity: 'critical',
    compatibility: 'BREAKING',
    method: 'GET',
    endpoint: '/api/users/{id}',
    location: '#/paths/~1api~1users~1{id}/get/responses/200/content/application~1json/schema/properties/id',
    expected: 'string',
    actual: 'number',
    message: 'Type mismatch',
    suggestion: 'Fix type',
  };

  it('saves and loads baseline file successfully', () => {
    const saved = saveBaseline(testBaselinePath, [sampleFinding]);
    expect(saved.version).toBe('1');
    expect(saved.entries.length).toBe(1);
    expect(saved.entries[0]?.fingerprint).toBe('test-fingerprint-1');

    const loaded = loadBaseline(testBaselinePath);
    expect(loaded.version).toBe('1');
    expect(loaded.entries[0]?.fingerprint).toBe('test-fingerprint-1');
  });

  it('throws ConfigError on overwrite attempt without --force', () => {
    saveBaseline(testBaselinePath, [sampleFinding]);
    expect(() => saveBaseline(testBaselinePath, [sampleFinding])).toThrow(ConfigError);
  });

  it('allows overwrite when force is true', () => {
    saveBaseline(testBaselinePath, [sampleFinding]);
    expect(() => saveBaseline(testBaselinePath, [sampleFinding], { force: true })).not.toThrow();
  });

  it('filters and marks baseline matches as suppressed', () => {
    const baseline = saveBaseline(testBaselinePath, [sampleFinding]);
    const filtered = filterFindingsWithBaseline([sampleFinding], baseline);

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.suppressed).toBe(true);
  });

  it('clearBaseline removes file cleanly', () => {
    saveBaseline(testBaselinePath, [sampleFinding]);
    expect(existsSync(testBaselinePath)).toBe(true);
    clearBaseline(testBaselinePath);
    expect(existsSync(testBaselinePath)).toBe(false);
  });
});
