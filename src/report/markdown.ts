import type { Report } from '../types/core.js';
import { redactText } from './redaction.js';

export function formatMarkdownReport(report: Report): string {
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
      lines.push(`- ${r}`);
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
      const target = `\`${f.method} ${f.endpoint}\``;
      const suppressedBadge = f.suppressed ? ' *(suppressed)*' : '';
      lines.push(
        `| \`${f.ruleId}\`${suppressedBadge} | **${f.severity}** | \`${f.compatibility}\` | ${target} | ${escapePipes(redactText(f.message))} | ${escapePipes(f.suggestion)} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

function escapePipes(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
