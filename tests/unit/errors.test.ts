import { describe, it, expect } from 'vitest';
import {
  ConfigError,
  SpecError,
  UnresolvedRefError,
  NetworkError,
  TimeoutError,
  PolicyViolationError,
} from '../../src/types/errors.js';

describe('TraceGuard Typed Errors', () => {
  it('ConfigError has code ERR_CONFIG, exit code 2, and hint', () => {
    const err = new ConfigError('Invalid timeout value', 'Set timeout between 100 and 60000ms.');
    expect(err.code).toBe('ERR_CONFIG');
    expect(err.exitCode).toBe(2);
    expect(err.message).toContain('Invalid timeout value');
    expect(err.hint).toContain('Set timeout');
  });

  it('SpecError formats path and location with exit code 2', () => {
    const err = new SpecError('Missing paths', 'spec.yaml', '#/paths');
    expect(err.code).toBe('ERR_SPEC');
    expect(err.exitCode).toBe(2);
    expect(err.specPath).toBe('spec.yaml');
    expect(err.location).toBe('#/paths');
    expect(err.message).toContain("in 'spec.yaml' at [#/paths]");
  });

  it('UnresolvedRefError stores ref and location with exit code 2', () => {
    const err = new UnresolvedRefError('#/components/schemas/Unknown', '#/paths/users');
    expect(err.code).toBe('ERR_UNRESOLVED_REF');
    expect(err.exitCode).toBe(2);
    expect(err.ref).toBe('#/components/schemas/Unknown');
    expect(err.location).toBe('#/paths/users');
  });

  it('NetworkError has exit code 3 and targetUrl', () => {
    const err = new NetworkError('ECONNREFUSED', 'http://localhost:9999');
    expect(err.code).toBe('ERR_NETWORK');
    expect(err.exitCode).toBe(3);
    expect(err.targetUrl).toBe('http://localhost:9999');
  });

  it('TimeoutError has exit code 3 and timeoutMs', () => {
    const err = new TimeoutError('http://localhost:8080/slow', 3000);
    expect(err.code).toBe('ERR_TIMEOUT');
    expect(err.exitCode).toBe(3);
    expect(err.timeoutMs).toBe(3000);
  });

  it('PolicyViolationError has exit code 1 and failureReasons', () => {
    const reasons = ['TG-CONTRACT-TYPE-MISMATCH on GET /api/users'];
    const err = new PolicyViolationError(reasons);
    expect(err.code).toBe('ERR_POLICY');
    expect(err.exitCode).toBe(1);
    expect(err.failureReasons).toEqual(reasons);
  });
});
