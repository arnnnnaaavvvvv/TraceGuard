import type { Report } from '../types/core.js';
import { redactReport } from './redaction.js';
import { renderHtmlLayout } from './html-template.js';

export function formatHtmlReport(report: Report): string {
  const safeReport = redactReport(report);
  const isPassed = safeReport.policyResult.passed;
  const statusBadge = isPassed
    ? '<span class="status-pill status-pass">PASSED</span>'
    : '<span class="status-pill status-fail">FAILED</span>';

  const findingsHtml = safeReport.findings.length === 0
    ? '<div class="empty-state">No contract discrepancies or breaking changes detected.</div>'
    : safeReport.findings.map((f, idx) => `
      <div class="finding-card ${f.suppressed ? 'suppressed' : ''}">
        <div class="finding-header">
          <span class="finding-num">#${idx + 1}</span>
          <span class="badge badge-${f.severity}">${f.severity.toUpperCase()}</span>
          <span class="badge badge-compat">${f.compatibility}</span>
          <span class="rule-id">${escapeHtml(f.ruleId)}</span>
          ${f.suppressed ? '<span class="badge badge-suppressed">BASELINE SUPPRESSED</span>' : ''}
        </div>
        <div class="finding-body">
          <div class="finding-row"><span class="label">Target</span> <code class="code-target">${escapeHtml(f.method)} ${escapeHtml(f.endpoint)}</code></div>
          <div class="finding-row"><span class="label">Location</span> <code class="code-location">${escapeHtml(f.location)}</code></div>
          <div class="finding-row"><span class="label">Expected</span> <span class="val-expected">${escapeHtml(f.expected)}</span></div>
          <div class="finding-row"><span class="label">Actual</span> <span class="val-actual">${escapeHtml(f.actual)}</span></div>
          <div class="finding-row"><span class="label">Message</span> <span class="val-msg">${escapeHtml(f.message)}</span></div>
          <div class="finding-row suggestion-row"><span class="label">Suggestion</span> <span class="val-sug">${escapeHtml(f.suggestion)}</span></div>
        </div>
      </div>
    `).join('\n');

  const failureReasonsHtml = !isPassed && safeReport.policyResult.failureReasons.length > 0
    ? `
      <div class="policy-alert">
        <h3 class="alert-title">POLICY VIOLATIONS</h3>
        <ul>
          ${safeReport.policyResult.failureReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  return renderHtmlLayout({
    mode: safeReport.mode,
    isPassed,
    statusBadge,
    timestamp: safeReport.timestamp,
    summary: safeReport.summary,
    toolVersion: safeReport.toolVersion,
    schemaVersion: safeReport.schemaVersion,
    totalFindings: safeReport.findings.length,
    failureReasonsHtml,
    findingsHtml,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
