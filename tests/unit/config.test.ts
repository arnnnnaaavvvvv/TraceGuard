import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/config/schema.js';
import { loadConfig } from '../../src/config/loader.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import { ConfigError } from '../../src/types/errors.js';

describe('Config Schema & Loader', () => {
  it('validates default config successfully', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  it('rejects empty or non-string spec path', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, spec: '' })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, spec: 123 as unknown as string })).toThrow(ConfigError);
  });

  it('rejects invalid baseUrl protocol', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, baseUrl: 'ftp://localhost' })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, baseUrl: 'not-a-url' })).toThrow(ConfigError);
  });

  it('accepts valid http and https baseUrl', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, baseUrl: 'http://localhost:3000' })).not.toThrow();
    expect(() => validateConfig({ ...DEFAULT_CONFIG, baseUrl: 'https://api.example.com' })).not.toThrow();
  });

  it('rejects out-of-range timeout and concurrency', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, timeoutMs: 50 })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, timeoutMs: 70000 })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, concurrency: 0 })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, concurrency: 100 })).toThrow(ConfigError);
  });

  it('merges CLI overrides into configuration', () => {
    const config = loadConfig({
      spec: 'fixtures/central-example/spec-v1.yaml',
      baseUrl: 'http://localhost:8080',
      ci: true,
      concurrency: 10,
    });

    expect(config.spec).toBe('fixtures/central-example/spec-v1.yaml');
    expect(config.baseUrl).toBe('http://localhost:8080');
    expect(config.concurrency).toBe(10);
    expect(config.policy.failOnBreaking).toBe(true);
    expect(config.policy.failOnPotentiallyBreaking).toBe(true);
  });
});
