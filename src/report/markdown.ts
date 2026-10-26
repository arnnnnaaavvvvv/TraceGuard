import type { Report } from '../types/core.js';
import { redactReport, redactText } from './redaction.js';

export function formatMarkdownReport(rawReport: Report): string {
  const report = redactReport(rawReport);
  const lines: string[] = [];
  const statusIcon = report.policyResult.passed ? '✅ **PASSED**' : '❌ **FAILED**';

  lines.push(`## TraceGuard Contract Report: ${statusIcon}`);
  lines.push('');
  lines.push(`- **Mode:** \`${report.mode}\``);
  lines.push(`- **Timestamp:** ${report.timestamp}`);
  lines.push(`- **Schema Version:** \`${report.schemaVersion}\``);
  lines.push('');

  // Summary Metrics Table
  lines.push('### Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| :--- | :--- |');
  lines.push(`| Checked Operations | ${report.summary.checkedOperations} / ${report.summary.totalOperations} |`);
  lines.push(`| Skipped Operations | ${report.summary.skippedOperations} |`);
  lines.push(`| Total Findings | ${report.summary.totalFindings} |`);
  lines.push(`| Suppressed Findings | ${report.summary.suppressedCount} |`);
  lines.push(`| Breaking Changes | ${report.summary.breakingChangesCount} |`);
  lines.push(`| Critical / Major Severity | ${report.summary.criticalCount} / ${report.summary.majorCount} |`);
  lines.push('');

  // Policy Violations
  if (!report.policyResult.passed) {
    lines.push('### ⚠️ Policy Violations');
    for (const r of report.policyResult.failureReasons) {
      lines.push(`- ${sanitizeMarkdown(redactText(r))}`);
    }
    lines.push('');
  }

  // Findings Details
  if (report.findings.length > 0) {
    lines.push('### Findings Detail');
    lines.push('');
    lines.push('| Rule | Severity | Compat | Target | Message | Suggestion |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

    for (const f of report.findings) {
      const target = `\`${sanitizeMarkdown(f.method)} ${sanitizeMarkdown(f.endpoint)}\``;
      const suppressedBadge = f.suppressed ? ' *(suppressed)*' : '';
      lines.push(
        `| \`${sanitizeMarkdown(f.ruleId)}\`${suppressedBadge} | **${sanitizeMarkdown(f.severity)}** | \`${sanitizeMarkdown(f.compatibility)}\` | ${target} | ${sanitizeMarkdown(f.message)} | ${sanitizeMarkdown(f.suggestion)} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function sanitizeMarkdown(text: string): string {
  if (!text) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '\\|')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/`/g, '\\`')
    .replace(/\r?\n/g, ' ');
}
