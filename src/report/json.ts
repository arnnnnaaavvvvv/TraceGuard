import type { Report } from '../types/core.js';
import { redactReport } from './redaction.js';

export function formatJsonReport(report: Report): string {
  const sanitizedReport = redactReport(report);
  return JSON.stringify(sanitizedReport, null, 2);
}
