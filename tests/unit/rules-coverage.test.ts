import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { compareOperations } from '../../src/diff/comparator.js';
import { evaluateRuntimeRules } from '../../src/checker/rules.js';
import { loadSpec } from '../../src/parser/loader.js';
import { buildRequest } from '../../src/checker/builder.js';
import { validateConfig } from '../../src/config/schema.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import { normalizeSchemaTypes } from '../../src/diff/normalizer.js';
import { COMPAT_RULES, RUNTIME_RULES } from '../../src/types/rules.js';
import { SpecError, ConfigError } from '../../src/types/errors.js';
import { runCli } from '../../src/cli/index.js';
import type { Operation } from '../../src/types/core.js';
import type { HttpResponse } from '../../src/checker/client.js';

describe('Targeted Compatibility & Runtime Rules Coverage', () => {
  it('detects method removed when endpoint path still exists', () => {
    const baseOps: Operation[] = [
      {
        method: 'GET',
        pathTemplate: '/users',
        parameters: [],
        responses: { '200': { statusCode: '200', description: 'OK' } },
      },
      {
        method: 'POST',
        pathTemplate: '/users',
        parameters: [],
        responses: { '201': { statusCode: '201', description: 'Created' } },
      },
    ];

    const headOps: Operation[] = [
      {
        method: 'GET',
        pathTemplate: '/users',
        parameters: [],
        responses: { '200': { statusCode: '200', description: 'OK' } },
      },
    ];

    const result = compareOperations(baseOps, headOps);
    const methodRemoved = result.changes.find((c) => c.ruleId === COMPAT_RULES.METHOD_REMOVED);
    expect(methodRemoved).toBeDefined();
    expect(methodRemoved?.compatibility).toBe('BREAKING');
    expect(methodRemoved?.method).toBe('POST');
  });

  it('detects status removed, media type removed, and auth changed', () => {
    const baseOp: Operation = {
      method: 'GET',
      pathTemplate: '/data',
      parameters: [],
      responses: {
        '200': {
          statusCode: '200',
          description: 'OK',
          content: {
            'application/json': {},
            'application/xml': {},
          },
        },
        '404': {
          statusCode: '404',
          description: 'Not Found',
        },
      },
    };

    const headOp: Operation = {
      method: 'GET',
      pathTemplate: '/data',
      parameters: [],
      security: [{ ApiKeyAuth: [] }],
      responses: {
        '200': {
          statusCode: '200',
          description: 'OK',
          content: {
            'application/json': {},
          },
        },
      },
    };

    const result = compareOperations([baseOp], [headOp]);

    const statusRemoved = result.changes.find((c) => c.ruleId === COMPAT_RULES.STATUS_REMOVED);
    expect(statusRemoved).toBeDefined();
    expect(statusRemoved?.description).toContain("status code '404'");

    const mediaRemoved = result.changes.find((c) => c.ruleId === COMPAT_RULES.MEDIA_TYPE_REMOVED);
    expect(mediaRemoved).toBeDefined();
    expect(mediaRemoved?.description).toContain("'application/xml'");

    const authChanged = result.changes.find((c) => c.ruleId === COMPAT_RULES.AUTH_CHANGED);
    expect(authChanged).toBeDefined();
  });

  it('detects parameter changed from optional to required and request body field added', () => {
    const baseOp: Operation = {
      method: 'POST',
      pathTemplate: '/create',
      parameters: [{ name: 'flag', in: 'query', required: false }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['id'],
              properties: { id: { type: 'string' } },
            },
          },
        },
      },
      responses: { '200': { statusCode: '200', description: 'OK' } },
    };

    const headOp: Operation = {
      method: 'POST',
      pathTemplate: '/create',
      parameters: [{ name: 'flag', in: 'query', required: true }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['id', 'name'],
              properties: { id: { type: 'string' }, name: { type: 'string' } },
            },
          },
        },
      },
      responses: { '200': { statusCode: '200', description: 'OK' } },
    };

    const result = compareOperations([baseOp], [headOp]);
    const reqFieldAdded = result.changes.filter((c) => c.ruleId === COMPAT_RULES.REQUIRED_REQUEST_FIELD_ADDED);
    expect(reqFieldAdded.length).toBe(2);
  });

  it('detects response enum expanded (TG-COMPAT-ENUM-NARROWED on response side)', () => {
    const baseOp: Operation = {
      method: 'GET',
      pathTemplate: '/status',
      parameters: [],
      responses: {
        '200': {
          statusCode: '200',
          description: 'Status',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  state: { type: 'string', enum: ['active', 'inactive'] },
                },
              },
            },
          },
        },
      },
    };

    const headOp: Operation = {
      method: 'GET',
      pathTemplate: '/status',
      parameters: [],
      responses: {
        '200': {
          statusCode: '200',
          description: 'Status',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  state: { type: 'string', enum: ['active', 'inactive', 'archived'] },
                },
              },
            },
          },
        },
      },
    };

    const result = compareOperations([baseOp], [headOp]);
    const enumExpanded = result.changes.find((c) => c.ruleId === COMPAT_RULES.ENUM_NARROWED);
    expect(enumExpanded).toBeDefined();
    expect(enumExpanded?.compatibility).toBe('BREAKING');
  });

  it('normalizes 3.0 nullable schemas correctly', () => {
    const schema30 = {
      type: 'object',
      required: ['b', 'a'],
      properties: {
        name: { type: 'string', nullable: true },
        tags: { type: ['string'], nullable: true },
        status: { type: 'string', enum: ['b', 'a'] },
      },
    };

    const normalized = normalizeSchemaTypes(schema30);
    expect(normalized).toBeDefined();
    const props = normalized?.['properties'] as Record<string, { type?: unknown; enum?: unknown[] }>;
    expect(props?.['name']?.type).toEqual(['string', 'null']);
    expect(props?.['tags']?.type).toEqual(['string', 'null']);
    expect(props?.['status']?.enum).toEqual(['a', 'b']);
    expect(normalized?.['required']).toEqual(['a', 'b']);
  });

  it('detects required header missing, enum mismatch, and 204 with body in runtime rules', () => {
    const op: Operation = {
      method: 'GET',
      pathTemplate: '/profile',
      parameters: [],
      responses: {
        '200': {
          statusCode: '200',
          description: 'Profile',
          headers: {
            'X-Trace-Id': { required: true },
          },
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['admin', 'member'] },
                },
              },
            },
          },
        },
      },
    };

    const res: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      contentType: 'application/json',
      bodyText: JSON.stringify({ role: 'guest' }),
      bodyJson: { role: 'guest' },
      isJson: true,
      malformedJson: false,
    };

    const findings = evaluateRuntimeRules(op, res, '3.1');
    const headerMissing = findings.find((f) => f.ruleId === RUNTIME_RULES.HEADER_MISSING);
    expect(headerMissing).toBeDefined();

    const enumMismatch = findings.find((f) => f.ruleId === RUNTIME_RULES.ENUM_MISMATCH);
    expect(enumMismatch).toBeDefined();

    // 204 with body
    const op204: Operation = {
      method: 'DELETE',
      pathTemplate: '/item',
      parameters: [],
      responses: { '204': { statusCode: '204', description: 'No content' } },
    };
    const res204: HttpResponse = {
      status: 204,
      statusText: 'No Content',
      headers: {},
      bodyText: 'unexpected content',
      isJson: false,
      malformedJson: false,
    };
    const findings204 = evaluateRuntimeRules(op204, res204, '3.1');
    expect(findings204.some((f) => f.message.includes('204 No Content'))).toBe(true);
  });

  it('exercises request builder parameter types and defaults', () => {
    const op: Operation = {
      method: 'GET',
      pathTemplate: '/test/{num}/{bool}',
      parameters: [
        { name: 'num', in: 'path', required: true, schema: { type: 'integer', default: 42 } },
        { name: 'bool', in: 'path', required: true, schema: { type: 'boolean' } },
        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'h', in: 'header', required: false, example: 'custom-header' },
      ],
      responses: { '200': { statusCode: '200', description: 'OK' } },
    };

    const built = buildRequest(op, DEFAULT_CONFIG);
    expect(built.url).toContain('/test/42/true?q=1');
    expect(built.headers['h']).toBe('custom-header');
  });

  it('validates config policy bounds', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, policy: { ...DEFAULT_CONFIG.policy, maxCriticalFindings: -1 } })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, policy: { ...DEFAULT_CONFIG.policy, maxMajorFindings: -1 } })).toThrow(ConfigError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateConfig({ ...DEFAULT_CONFIG, policy: { ...DEFAULT_CONFIG.policy, ignoredRules: 'not-array' as any } })).toThrow(ConfigError);
  });

  it('rejects swagger 2.0 and unsupported versions with SpecError', () => {
    const tmpSwagger = resolve('fixtures/temp-swagger.yaml');
    writeFileSync(tmpSwagger, 'swagger: "2.0"\ninfo:\n  title: Old\n  version: 1.0\npaths: {}\n');

    try {
      expect(() => loadSpec(tmpSwagger)).toThrow(SpecError);
    } finally {
      if (existsSync(tmpSwagger)) unlinkSync(tmpSwagger);
    }

    const tmpUnsupported = resolve('fixtures/temp-v4.yaml');
    writeFileSync(tmpUnsupported, 'openapi: "4.0.0"\ninfo:\n  title: Future\n  version: 1.0\npaths: {}\n');
    try {
      expect(() => loadSpec(tmpUnsupported)).toThrow(SpecError);
    } finally {
      if (existsSync(tmpUnsupported)) unlinkSync(tmpUnsupported);
    }
  });

  it('executes CLI commands through runCli runner', async () => {
    const v1Path = resolve('fixtures/central-example/spec-v1.yaml');
    const v2Path = resolve('fixtures/central-example/spec-v2.yaml');
    const tmpBase = resolve('fixtures/temp-cli-baseline.json');

    const diffCode = await runCli(['node', 'traceguard', 'diff', v1Path, v2Path, '--format', 'json']);
    expect(diffCode).toBe(1);

    const baseSaveCode = await runCli([
      'node',
      'traceguard',
      'baseline',
      'save',
      tmpBase,
      '--spec',
      v1Path,
      '--diff',
      v2Path,
      '--force',
    ]);
    expect(baseSaveCode).toBe(0);

    const baseShowCode = await runCli(['node', 'traceguard', 'baseline', 'show', tmpBase]);
    expect(baseShowCode).toBe(0);

    const baseClearCode = await runCli(['node', 'traceguard', 'baseline', 'clear', tmpBase]);
    expect(baseClearCode).toBe(0);
  });
});
