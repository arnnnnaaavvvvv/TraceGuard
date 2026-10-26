import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { createTraceGuard, compareContracts } from '../../src/index.js';
import { startMockServer, type MockServerInstance } from '../integration/mock-server.js';

describe('Public TypeScript SDK', () => {
  let mockServer: MockServerInstance;

  beforeAll(async () => {
    mockServer = await startMockServer();
  });

  afterAll(async () => {
    await mockServer.close();
  });

  it('createTraceGuard().check() runs contract validation and returns structured Report', async () => {
    const client = createTraceGuard({
      spec: resolve('fixtures/central-example/spec-v1.yaml'),
      baseUrl: mockServer.baseUrl,
      pathParameters: {
        '/api/users/{id}': { id: 'good' },
      },
    });

    const report = await client.check();
    expect(report.schemaVersion).toBe('1.0.0');
    expect(report.mode).toBe('check');
    expect(report.policyResult.passed).toBe(true);
    expect(report.findings.length).toBe(0);
  });

  it('compareContracts() diffs two specification files and returns structured Report', async () => {
    const report = await compareContracts({
      baseSpecPath: resolve('fixtures/central-example/spec-v1.yaml'),
      headSpecPath: resolve('fixtures/central-example/spec-v2.yaml'),
    });

    expect(report.schemaVersion).toBe('1.0.0');
    expect(report.mode).toBe('diff');
    expect(report.findings.length).toBe(2);
    expect(report.policyResult.passed).toBe(false);
  });
});
