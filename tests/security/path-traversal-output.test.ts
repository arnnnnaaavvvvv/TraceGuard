import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSafeWritePath, saveBaseline } from '../../src/baseline/store.js';
import { ConfigError } from '../../src/types/errors.js';

describe('Security: Path Traversal Defenses for Output & Baseline (VULN-07)', () => {
  const testFilesToClean: string[] = [];

  afterEach(() => {
    for (const f of testFilesToClean) {
      if (existsSync(f)) {
        try {
          unlinkSync(f);
        } catch {
          // ignore cleanup errors
        }
      }
    }
    testFilesToClean.length = 0;
  });

  it('rejects output paths that attempt path traversal outside the working directory', () => {
    expect(() => validateSafeWritePath('../../evil-output.txt')).toThrow(ConfigError);
    expect(() => validateSafeWritePath('../../../../etc/passwd')).toThrow(ConfigError);
    expect(() => validateSafeWritePath('..')).toThrow(ConfigError);
  });

  it('rejects baseline save targeting paths outside working directory', () => {
    expect(() =>
      saveBaseline('../../../evil-baseline.json', [])
    ).toThrow(ConfigError);
  });

  it('allows safe relative paths residing inside the current working directory', () => {
    const localTarget = './fixtures/temp-safe-target.json';
    const safeResolved = validateSafeWritePath(localTarget);
    expect(safeResolved).toBe(resolve(localTarget));

    testFilesToClean.push(safeResolved);
    saveBaseline(localTarget, [], { force: true });
    expect(existsSync(safeResolved)).toBe(true);
  });
});
