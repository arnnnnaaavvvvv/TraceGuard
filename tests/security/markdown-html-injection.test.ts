import { describe, it, expect } from 'vitest';
import { formatMarkdownReport, sanitizeMarkdown } from '../../src/report/markdown.js';
import type { Report } from '../../src/types/core.js';

describe('Security: Markdown & HTML Injection (VULN-06)', () => {
  it('neutralizes HTML tags and markdown link injection', () => {
    const raw = '<img src="https://evil.com/track.png" onerror="alert(1)"> [click me](http://evil.com) `code`';
    const clean = sanitizeMarkdown(raw);

    expect(clean).not.toContain('<img');
    expect(clean).toContain('&lt;img');
    expect(clean).toContain('&gt;');
    expect(clean).toContain('&#91;click me&#93;');
  });

  it('generates secure markdown report tables without table layout destruction or raw tags', () => {
    const hostileReport: Report = {
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
          id: 'test-md-1',
          ruleId: 'TG-CONTRACT-TYPE-MISMATCH',
          severity: 'critical',
          compatibility: 'BREAKING',
          method: 'GET',
          endpoint: '/api/test|<script>alert(1)</script>|',
          location: '#/location',
          expected: 'string',
          actual: 'number',
          message: 'Error with <iframe src="evil"> and | pipe injection',
          suggestion: 'See [attacker](https://attacker.com)',
        },
      ],
      policyResult: {
        passed: false,
        failureReasons: ['Critical error'],
      },
    };

    const md = formatMarkdownReport(hostileReport);
    expect(md).not.toContain('<script>');
    expect(md).not.toContain('<iframe');
    expect(md).not.toContain('[attacker](');
    expect(md).toContain('&lt;script&gt;');
    expect(md).toContain('&lt;iframe');
  });
});
