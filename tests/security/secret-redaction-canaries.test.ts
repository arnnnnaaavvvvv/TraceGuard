import { describe, it, expect } from 'vitest';
import { redactText, redactHeaders } from '../../src/report/redaction.js';
import { formatTerminalReport } from '../../src/report/terminal.js';
import { formatMarkdownReport } from '../../src/report/markdown.js';
import { formatHtmlReport } from '../../src/report/html.js';
import { formatJsonReport } from '../../src/report/json.js';
import type { Report } from '../../src/types/core.js';

describe('Security: Secret Redaction & Canary Masking (VULN-08)', () => {
  const CANARY_API_KEY = 'canary_sk_live_998877665544332211';
  const CANARY_BEARER = 'canary_bearer_token_xyz_123';
  const CANARY_BASIC = 'canary_basic_auth_pass_456';
  const CANARY_PWD = 'canary_password_hunter2_secret';
  const CANARY_USERINFO_PWD = 'canary_userinfo_supersecret_pass';
  const CANARY_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.canary_signature_hash_xyz';

  it('redacts canary secrets in text, URLs, headers, and credentials', () => {
    const rawText = `
      Failed connecting to https://admin:${CANARY_USERINFO_PWD}@api.com/users?apiKey=${CANARY_API_KEY}&signature=abc
      Authorization header was: Bearer ${CANARY_BEARER}
      Proxy auth was: Basic ${Buffer.from(`user:${CANARY_BASIC}`).toString('base64')}
      JWT token: ${CANARY_JWT}
      Payload was: {"username": "admin", "password": "${CANARY_PWD}"}
    `;

    const cleaned = redactText(rawText);

    expect(cleaned).not.toContain(CANARY_API_KEY);
    expect(cleaned).not.toContain(CANARY_BEARER);
    expect(cleaned).not.toContain(CANARY_PWD);
    expect(cleaned).not.toContain(CANARY_USERINFO_PWD);
    expect(cleaned).not.toContain(CANARY_JWT);
    expect(cleaned).toContain('[REDACTED]');
  });

  it('masks sensitive headers in header dictionaries', () => {
    const headers = {
      Authorization: `Bearer ${CANARY_BEARER}`,
      'X-Access-Token': CANARY_API_KEY,
      'Private-Token': CANARY_PWD,
      'Content-Type': 'application/json',
    };

    const cleaned = redactHeaders(headers);
    expect(cleaned['authorization']).toBe('[REDACTED]');
    expect(cleaned['x-access-token']).toBe('[REDACTED]');
    expect(cleaned['private-token']).toBe('[REDACTED]');
    expect(cleaned['content-type']).toBe('application/json');
  });

  it('ensures zero canaries appear across Terminal, Markdown, HTML, and JSON reports', () => {
    const canaryReport: Report = {
      schemaVersion: '1.0.0',
      toolVersion: '0.1.0',
      timestamp: '2026-10-26T00:00:00.000Z',
      mode: 'check',
      summary: {
        totalOperations: 1,
        checkedOperations: 1,
        skippedOperations: 0,
        totalFindings: 1,
        criticalCount: 1,
        majorCount: 0,
        minorCount: 0,
        infoCount: 0,
        suppressedCount: 0,
        breakingChangesCount: 1,
      },
      findings: [
        {
          id: 'canary-finding',
          ruleId: 'TG-CONTRACT-TYPE-MISMATCH',
          severity: 'critical',
          compatibility: 'BREAKING',
          method: 'GET',
          endpoint: '/api/v1/users',
          location: '#/location',
          expected: `string with token=${CANARY_API_KEY}`,
          actual: `https://user:${CANARY_USERINFO_PWD}@target.internal/api?apiKey=${CANARY_API_KEY}`,
          message: `Bearer ${CANARY_BEARER} failed with password: "${CANARY_PWD}"`,
          suggestion: `Do not leak JWT: ${CANARY_JWT}`,
        },
      ],
      policyResult: {
        passed: false,
        failureReasons: [`Policy violation with token=${CANARY_API_KEY}`],
      },
    };

    const terminalOut = formatTerminalReport(canaryReport);
    const markdownOut = formatMarkdownReport(canaryReport);
    const htmlOut = formatHtmlReport(canaryReport);
    const jsonOut = formatJsonReport(canaryReport);

    const allOutputs = [terminalOut, markdownOut, htmlOut, jsonOut].join('\n');
    const canaries = [CANARY_API_KEY, CANARY_BEARER, CANARY_PWD, CANARY_USERINFO_PWD, CANARY_JWT];

    for (const canary of canaries) {
      expect(allOutputs).not.toContain(canary);
    }
  });
});
