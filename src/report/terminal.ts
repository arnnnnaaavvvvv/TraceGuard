import type { Report } from '../types/core.js';
import { redactText } from './redaction.js';

export function formatTerminalReport(report: Report): string {
  const lines: string[] = [];

  // Header Box
  lines.push('================================================================================');
  lines.push(` TRACEGUARD CONTRACT REPORT - MODE: ${report.mode.toUpperCase()}`);
  lines.push(` Generated: ${report.timestamp} | Schema Version: ${report.schemaVersion}`);
  lines.push('================================================================================');
  lines.push('');

  // Findings Table
  if (report.findings.length === 0) {
    lines.push(' [PASS] No contract discrepancies or breaking changes detected.');
    lines.push('');
  } else {
    lines.push(` FINDINGS (${report.findings.length} total):`);
    lines.push('--------------------------------------------------------------------------------');

    for (const [idx, f] of report.findings.entries()) {
      const suppressionTag = f.suppressed ? ' [SUPPRESSED (BASELINE)]' : '';
      lines.push(` #${idx + 1} [${f.severity.toUpperCase()}] [${f.compatibility}] ${f.ruleId}${suppressionTag}`);
      lines.push(`    Target:     ${f.method} ${f.endpoint}`);
      lines.push(`    Location:   ${f.location}`);
      lines.push(`    Expected:   ${redactText(f.expected)}`);
      lines.push(`    Actual:     ${redactText(f.actual)}`);
      lines.push(`    Message:    ${redactText(f.message)}`);
      lines.push(`    Suggestion: ${f.suggestion}`);
      lines.push('--------------------------------------------------------------------------------');
    }
  }

  // Summary Table
  const s = report.summary;
  lines.push(' SUMMARY:');
  lines.push(`   Operations Evaluated:    ${s.checkedOperations} / ${s.totalOperations} (${s.skippedOperations} skipped)`);
  lines.push(`   Total Findings:          ${s.totalFindings} (${s.suppressedCount} suppressed by baseline)`);
  lines.push(`   Breaking Changes:        ${s.breakingChangesCount}`);
  lines.push(`   Severity Breakdown:      Critical: ${s.criticalCount} | Major: ${s.majorCount} | Minor: ${s.minorCount} | Info: ${s.infoCount}`);
  lines.push('');

  // Policy Outcome
  if (report.policyResult.passed) {
    lines.push(' STATUS: [PASS] All policy requirements satisfied.');
  } else {
    lines.push(' STATUS: [FAIL] CI Policy Threshold Violations:');
    for (const reason of report.policyResult.failureReasons) {
      lines.push(`   * ${reason}`);
    }
  }
  lines.push('================================================================================');

  return lines.join('\n');
}
