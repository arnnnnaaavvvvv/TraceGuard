import type { Report } from '../types/core.js';
import { redactText } from './redaction.js';

export function formatJsonReport(report: Report): string {
  const sanitizedReport: Report = {
    ...report,
    findings: report.findings.map((f) => ({
      ...f,
      expected: redactText(f.expected),
      actual: redactText(f.actual),
      message: redactText(f.message),
    })),
  };

  return JSON.stringify(sanitizedReport, null, 2);
}
