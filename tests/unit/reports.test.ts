import { describe, it, expect } from 'vitest';
import { formatTerminalReport } from '../../src/report/terminal.js';
import { formatJsonReport } from '../../src/report/json.js';
import { formatMarkdownReport } from '../../src/report/markdown.js';
import type { Report } from '../../src/types/core.js';

describe('Report Formatters', () => {
  const sampleReport: Report = {
    schemaVersion: '1.0.0',
    toolVersion: '0.1.0',
    timestamp: '2026-10-26T12:00:00.000Z',
    mode: 'check',
    summary: {
      totalOperations: 2,
      checkedOperations: 1,
      skippedOperations: 1,
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
        id: 'sample-id',
        ruleId: 'TG-CONTRACT-TYPE-MISMATCH',
        severity: 'critical',
        compatibility: 'BREAKING',
        method: 'GET',
        endpoint: '/api/users/{id}',
        location: '#/schema/id',
        expected: 'string',
        actual: 'number (value: 101)',
        message: 'Type mismatch for id',
        suggestion: 'Return string',
      },
    ],
    policyResult: {
      passed: false,
      failureReasons: ['Detected 1 breaking change(s).'],
    },
  };

  it('formats terminal report in clean monochrome table', () => {
    const output = formatTerminalReport(sampleReport);
    expect(output).toContain('TRACEGUARD CONTRACT REPORT');
    expect(output).toContain('[CRITICAL]');
    expect(output).toContain('TG-CONTRACT-TYPE-MISMATCH');
    expect(output).toContain('STATUS: [FAIL]');
  });

  it('formats JSON report matching valid schema', () => {
    const jsonStr = formatJsonReport(sampleReport);
    const parsed = JSON.parse(jsonStr) as Report;

    expect(parsed.schemaVersion).toBe('1.0.0');
    expect(parsed.toolVersion).toBe('0.1.0');
    expect(parsed.findings.length).toBe(1);
    expect(parsed.findings[0]?.ruleId).toBe('TG-CONTRACT-TYPE-MISMATCH');
  });

  it('formats Markdown report with tables and status icon', () => {
    const md = formatMarkdownReport(sampleReport);
    expect(md).toContain('## TraceGuard Contract Report: ❌ **FAILED**');
    expect(md).toContain('| Checked Operations | 1 / 2 |');
    expect(md).toContain('| `TG-CONTRACT-TYPE-MISMATCH` |');
  });
});
