import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { startMockServer, type MockServerInstance } from './mock-server.js';
import { loadSpec } from '../../src/parser/loader.js';
import { extractOperations } from '../../src/parser/operations.js';
import { executeContractChecks } from '../../src/checker/executor.js';
import { executeRequest } from '../../src/checker/client.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import { RUNTIME_RULES } from '../../src/types/rules.js';
import { TimeoutError, NetworkError } from '../../src/types/errors.js';

describe('Runtime Contract Checker Integration', () => {
  let mockServer: MockServerInstance;

  beforeAll(async () => {
    mockServer = await startMockServer();
  });

  afterAll(async () => {
    await mockServer.close();
  });

  it('verifies Central Example: flags id type mismatch and missing email', async () => {
    const fixturePath = resolve('fixtures/central-example/spec-v1.yaml');
    const loaded = loadSpec(fixturePath);
    const ops = extractOperations(loaded.document);

    const config = {
      ...DEFAULT_CONFIG,
      baseUrl: mockServer.baseUrl,
      pathParameters: {
        '/api/users/{id}': { id: '101' },
      },
    };

    const result = await executeContractChecks(ops, config, loaded.version);

    expect(result.summary.checkedOperations).toBe(1);
    expect(result.findings.length).toBe(2);

    const typeFinding = result.findings.find((f) => f.ruleId === RUNTIME_RULES.TYPE_MISMATCH);
    expect(typeFinding).toBeDefined();
    expect(typeFinding?.location).toContain('/schema/id');
    expect(typeFinding?.expected).toBe('string');
    expect(typeFinding?.actual).toBe('number');

    const missingFinding = result.findings.find((f) => f.ruleId === RUNTIME_RULES.REQUIRED_MISSING);
    expect(missingFinding).toBeDefined();
    expect(missingFinding?.location).toContain('/schema');
    expect(missingFinding?.expected).toContain("property 'email'");
  });

  it('passes on valid response matching schema', async () => {
    const fixturePath = resolve('fixtures/central-example/spec-v1.yaml');
    const loaded = loadSpec(fixturePath);
    const ops = extractOperations(loaded.document);

    const config = {
      ...DEFAULT_CONFIG,
      baseUrl: mockServer.baseUrl,
      pathParameters: {
        '/api/users/{id}': { id: 'good' },
      },
    };

    const result = await executeContractChecks(ops, config, loaded.version);
    expect(result.findings.length).toBe(0);
    expect(result.summary.criticalCount).toBe(0);
  });

  it('detects undocumented status code (TG-CONTRACT-STATUS-MISMATCH)', async () => {
    const fixturePath = resolve('fixtures/central-example/spec-v1.yaml');
    const loaded = loadSpec(fixturePath);
    const ops = extractOperations(loaded.document);

    const config = {
      ...DEFAULT_CONFIG,
      baseUrl: mockServer.baseUrl,
      pathParameters: {
        '/api/users/{id}': { id: 'undocumented' },
      },
    };

    const result = await executeContractChecks(ops, config, loaded.version);
    const statusFinding = result.findings.find((f) => f.ruleId === RUNTIME_RULES.STATUS_MISMATCH);
    expect(statusFinding).toBeDefined();
    expect(statusFinding?.actual).toBe('status 418');
  });

  it('detects Content-Type mismatch (TG-CONTRACT-CONTENT-TYPE-MISMATCH)', async () => {
    const fixturePath = resolve('fixtures/central-example/spec-v1.yaml');
    const loaded = loadSpec(fixturePath);
    const ops = extractOperations(loaded.document);

    const config = {
      ...DEFAULT_CONFIG,
      baseUrl: mockServer.baseUrl,
      pathParameters: {
        '/api/users/{id}': { id: 'bad-content-type' },
      },
    };

    const result = await executeContractChecks(ops, config, loaded.version);
    const ctFinding = result.findings.find((f) => f.ruleId === RUNTIME_RULES.CONTENT_TYPE_MISMATCH);
    expect(ctFinding).toBeDefined();
    expect(ctFinding?.actual).toBe('text/plain');
  });

  it('detects malformed JSON response (TG-CONTRACT-INVALID-JSON)', async () => {
    const fixturePath = resolve('fixtures/central-example/spec-v1.yaml');
    const loaded = loadSpec(fixturePath);
    const ops = extractOperations(loaded.document);

    const config = {
      ...DEFAULT_CONFIG,
      baseUrl: mockServer.baseUrl,
      pathParameters: {
        '/api/users/{id}': { id: 'malformed-json' },
      },
    };

    const result = await executeContractChecks(ops, config, loaded.version);
    const jsonFinding = result.findings.find((f) => f.ruleId === RUNTIME_RULES.INVALID_JSON);
    expect(jsonFinding).toBeDefined();
  });

  it('aborts and throws TimeoutError on slow response (exit code 3)', async () => {
    await expect(
      executeRequest(`${mockServer.baseUrl}/api/slow`, 'GET', {}, { timeoutMs: 150, maxBodySizeBytes: 1024 })
    ).rejects.toThrow(TimeoutError);
  });

  it('throws NetworkError when connection is refused (exit code 3)', async () => {
    await expect(
      executeRequest('http://127.0.0.1:54321/offline', 'GET', {}, { timeoutMs: 500, maxBodySizeBytes: 1024 })
    ).rejects.toThrow(NetworkError);
  });
});
