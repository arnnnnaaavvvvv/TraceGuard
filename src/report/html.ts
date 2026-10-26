import type { Report } from '../types/core.js';
import { redactText } from './redaction.js';

export function formatHtmlReport(report: Report): string {
  const isPassed = report.policyResult.passed;
  const statusBadge = isPassed
    ? '<span class="status-pill status-pass">PASSED</span>'
    : '<span class="status-pill status-fail">FAILED</span>';

  const findingsHtml = report.findings.length === 0
    ? '<div class="empty-state">No contract discrepancies or breaking changes detected.</div>'
    : report.findings.map((f, idx) => `
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
          <div class="finding-row"><span class="label">Expected</span> <span class="val-expected">${escapeHtml(redactText(f.expected))}</span></div>
          <div class="finding-row"><span class="label">Actual</span> <span class="val-actual">${escapeHtml(redactText(f.actual))}</span></div>
          <div class="finding-row"><span class="label">Message</span> <span class="val-msg">${escapeHtml(redactText(f.message))}</span></div>
          <div class="finding-row suggestion-row"><span class="label">Suggestion</span> <span class="val-sug">${escapeHtml(f.suggestion)}</span></div>
        </div>
      </div>
    `).join('\n');

  const failureReasonsHtml = !isPassed && report.policyResult.failureReasons.length > 0
    ? `
      <div class="policy-alert">
        <h3 class="alert-title">POLICY VIOLATIONS</h3>
        <ul>
          ${report.policyResult.failureReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceGuard Report | ${report.mode.toUpperCase()}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #ffffff;
      --fg: #000000;
      --card-bg: #f9f9f9;
      --border: #000000;
      --border-light: #e5e5e5;
      --muted: #555555;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.5;
      padding: 40px 20px;
    }
    .container {
      max-width: 1040px;
      margin: 0 auto;
    }
    header {
      border-bottom: 3px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 56px;
      letter-spacing: 2px;
      line-height: 1;
    }
    .brand-sub {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 20px;
      letter-spacing: 1.5px;
      color: var(--muted);
      margin-top: 4px;
    }
    .header-meta {
      text-align: right;
      font-size: 13px;
      color: var(--muted);
    }
    .status-pill {
      display: inline-block;
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px;
      letter-spacing: 1.5px;
      padding: 6px 20px;
      border: 2px solid var(--border);
      background: #000000;
      color: #ffffff;
    }
    .status-pass {
      background: #000000;
      color: #ffffff;
    }
    .status-fail {
      background: #ffffff;
      color: #000000;
      border: 3px solid #000000;
      box-shadow: 4px 4px 0px #000000;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .metric-card {
      border: 2px solid var(--border);
      padding: 16px;
      background: var(--bg);
    }
    .metric-card.highlight {
      background: #000000;
      color: #ffffff;
    }
    .metric-card.highlight .metric-label {
      color: #cccccc;
    }
    .metric-label {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 16px;
      letter-spacing: 1px;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .metric-val {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 42px;
      line-height: 1;
    }
    .policy-alert {
      border: 2px solid #000000;
      padding: 20px;
      margin-bottom: 32px;
      background: #fdfdfd;
      box-shadow: 4px 4px 0px #000000;
    }
    .alert-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 22px;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .policy-alert ul {
      margin-left: 20px;
      font-size: 14px;
    }
    .section-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 32px;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 6px;
    }
    .finding-card {
      border: 2px solid var(--border);
      margin-bottom: 16px;
      background: var(--bg);
    }
    .finding-card.suppressed {
      opacity: 0.6;
      border-style: dashed;
    }
    .finding-header {
      padding: 12px 16px;
      background: #000000;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .finding-num {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 22px;
    }
    .badge {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 14px;
      letter-spacing: 1px;
      padding: 2px 8px;
      border: 1px solid #ffffff;
      background: transparent;
      color: #ffffff;
    }
    .badge-critical {
      background: #ffffff;
      color: #000000;
      font-weight: bold;
    }
    .rule-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
    }
    .finding-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
    }
    .finding-row {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 12px;
    }
    .label {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 16px;
      letter-spacing: 1px;
      color: var(--muted);
    }
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      background: #f0f0f0;
      padding: 2px 6px;
    }
    .code-target {
      font-weight: 600;
      background: #000000;
      color: #ffffff;
    }
    .suggestion-row {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-light);
    }
    .val-sug {
      font-weight: 500;
    }
    .empty-state {
      padding: 40px;
      text-align: center;
      border: 2px dashed var(--border);
      font-family: 'Bebas Neue', sans-serif;
      font-size: 26px;
      letter-spacing: 1px;
    }
    footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1 class="brand-title">TRACEGUARD</h1>
        <p class="brand-sub">DETERMINISTIC OPENAPI CONTRACT REPORT</p>
      </div>
      <div>
        ${statusBadge}
        <div class="header-meta">
          <div>Mode: <strong>${report.mode.toUpperCase()}</strong></div>
          <div>Generated: ${report.timestamp}</div>
        </div>
      </div>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">OPERATIONS CHECKED</div>
        <div class="metric-val">${report.summary.checkedOperations} / ${report.summary.totalOperations}</div>
      </div>
      <div class="metric-card ${report.summary.breakingChangesCount > 0 ? 'highlight' : ''}">
        <div class="metric-label">BREAKING CHANGES</div>
        <div class="metric-val">${report.summary.breakingChangesCount}</div>
      </div>
      <div class="metric-card ${report.summary.criticalCount > 0 ? 'highlight' : ''}">
        <div class="metric-label">CRITICAL FINDINGS</div>
        <div class="metric-val">${report.summary.criticalCount}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">MAJOR FINDINGS</div>
        <div class="metric-val">${report.summary.majorCount}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">SUPPRESSED FINDINGS</div>
        <div class="metric-val">${report.summary.suppressedCount}</div>
      </div>
    </div>

    ${failureReasonsHtml}

    <section>
      <h2 class="section-title">FINDINGS DETAIL (${report.findings.length})</h2>
      ${findingsHtml}
    </section>

    <footer>
      <span>TraceGuard v${report.toolVersion} &bull; Schema v${report.schemaVersion}</span>
      <span>Deterministic &bull; Zero AI &bull; Offline</span>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
