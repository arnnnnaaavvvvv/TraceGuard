import { describe, it, expect } from 'vitest';
import { formatTerminalReport, sanitizeTerminal } from '../../src/report/terminal.js';
import type { Report } from '../../src/types/core.js';

describe('Security: Terminal ANSI & Escape Sequence Injection (VULN-05)', () => {
  it('strips dangerous ANSI screen clears, cursor movements, and control chars', () => {
    const maliciousPayload = '\x1b[2J\x1b[H\x1b[31;1mCRITICAL STATUS SPOOF\x1b[0m\x07\x00';
    const sanitized = sanitizeTerminal(maliciousPayload);

    expect(sanitized).not.toContain('\x1b');
    expect(sanitized).not.toContain('\x07');
    expect(sanitized).not.toContain('\x00');
    expect(sanitized).toBe('CRITICAL STATUS SPOOF');
  });

  it('renders report cleanly without injecting raw escape sequences from hostile responses', () => {
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
          id: 'test-1',
          ruleId: 'TG-CONTRACT-TYPE-MISMATCH',
          severity: 'critical',
          compatibility: 'BREAKING',
          method: 'GET',
          endpoint: '/api/test',
          location: '#/location',
          expected: 'string',
          actual: '\x1b[2J\x1b[32mSTATUS: [PASS] Spoofed\x1b[0m',
          message: 'Malformed response with ANSI \x1b]0;Pwned\x07',
          suggestion: 'Fix it',
        },
      ],
      policyResult: {
        passed: false,
        failureReasons: ['Policy failed\x1b[2K'],
      },
    };

    const formatted = formatTerminalReport(hostileReport);
    expect(formatted).not.toContain('\x1b');
    expect(formatted).not.toContain('\x07');
    expect(formatted).toContain('STATUS: [PASS] Spoofed');
  });
});
