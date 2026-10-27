import fs from 'node:fs';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceGuard — Catch Breaking API Changes Before Production</title>
  <meta name="description" content="Deterministic, zero-dependency OpenAPI contract testing and breaking change detection for TypeScript & CI pipelines.">
  
  <!-- Modern Enterprise Typography: Plus Jakarta Sans + Inter + JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg: #000000;
      --bg-surface: #09090b;
      --bg-surface-elevated: #121215;
      --bg-card: rgba(14, 14, 17, 0.75);
      --border: rgba(255, 255, 255, 0.1);
      --border-hover: rgba(255, 255, 255, 0.28);
      --border-focus: rgba(255, 255, 255, 0.5);
      --text: #ffffff;
      --text-muted: #a1a1aa;
      --text-dim: #71717a;
      --text-dark: #000000;
      --radius: 8px;
      --font-display: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-code: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-body);
      line-height: 1.6;
      overflow-x: hidden;
      letter-spacing: -0.011em;
      background-image: 
        radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255, 255, 255, 0.08), transparent 70%),
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 56px 56px, 56px 56px;
    }

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Navigation */
    header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      padding: 16px 0;
    }
    .nav-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--text);
    }
    .logo-badge {
      width: 28px;
      height: 28px;
      background: #ffffff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 13px;
      color: #000000;
      font-weight: 800;
      letter-spacing: -0.5px;
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.25);
    }
    .logo-text {
      font-family: var(--font-display);
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.025em;
      line-height: 1;
      color: #ffffff;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 28px;
      list-style: none;
    }
    .nav-link {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: -0.01em;
      transition: color 0.2s;
    }
    .nav-link:hover { color: var(--text); }
    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      border-radius: 6px;
      font-family: var(--font-code);
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-github {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn-github:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--border-hover);
    }
    .btn-primary {
      background: #ffffff;
      color: #000000;
      font-weight: 700;
      border: 1px solid #ffffff;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
    }
    .btn-primary:hover {
      background: #e4e4e7;
      box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
    }

    /* Hero Section */
    .hero {
      padding: 96px 0 64px;
      text-align: center;
      position: relative;
    }
    .hero-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 11px;
      font-weight: 600;
      color: #d4d4d8;
      margin-bottom: 28px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: var(--font-code);
    }
    .hero-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 0 8px #ffffff;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.85); }
    }
    .hero-title {
      font-family: var(--font-display);
      font-size: clamp(40px, 5.8vw, 74px);
      line-height: 1.08;
      letter-spacing: -0.035em;
      font-weight: 800;
      margin-bottom: 24px;
      color: #ffffff;
    }
    .hero-title span.accent {
      color: #a1a1aa;
      background: linear-gradient(180deg, #ffffff 30%, #71717a 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-sub {
      max-width: 660px;
      margin: 0 auto 36px;
      font-size: 18px;
      color: var(--text-muted);
      font-weight: 400;
      line-height: 1.65;
      letter-spacing: -0.015em;
    }
    .hero-actions {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 52px;
    }

    /* Install Box */
    .install-box {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      padding: 6px 10px 6px 14px;
      font-family: var(--font-code);
      font-size: 13px;
      gap: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    .install-cmd {
      color: #ffffff;
    }
    .copy-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border);
      color: var(--text-muted);
      cursor: pointer;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: var(--font-code);
      transition: all 0.2s;
    }
    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      border-color: var(--border-hover);
    }

    /* Terminal Simulator */
    .terminal-wrapper {
      max-width: 960px;
      margin: 0 auto 80px;
      border-radius: var(--radius);
      background: #09090b;
      border: 1px solid var(--border);
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8), 0 0 50px rgba(255, 255, 255, 0.03);
      overflow: hidden;
      text-align: left;
    }
    .terminal-header {
      background: #0f0f13;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 12px;
    }
    .terminal-dots {
      display: flex;
      gap: 7px;
    }
    .terminal-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .terminal-tabs {
      display: flex;
      gap: 6px;
    }
    .term-tab {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-family: var(--font-code);
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .term-tab:hover {
      color: #ffffff;
    }
    .term-tab.active {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--border);
      color: #ffffff;
    }
    .run-live-btn {
      background: #ffffff;
      color: #000000;
      font-family: var(--font-code);
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .run-live-btn:hover {
      background: #e4e4e7;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    }
    .run-live-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .spinner {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .terminal-body {
      padding: 24px;
      font-family: var(--font-code);
      font-size: 13px;
      line-height: 1.7;
      min-height: 340px;
      max-height: 440px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      color: #d4d4d8;
    }
    .term-prompt { color: #52525b; }
    .term-cmd { color: #ffffff; font-weight: 600; }
    .term-pass { color: #000000; background: #ffffff; padding: 1px 6px; font-weight: 700; border-radius: 3px; }
    .term-fail { color: #ffffff; border: 1px solid #ffffff; padding: 1px 6px; font-weight: 700; border-radius: 3px; background: rgba(255, 255, 255, 0.1); }
    .term-warn { color: #ffffff; text-decoration: underline; font-weight: 600; }
    .term-dim { color: #71717a; }

    /* Stats Bar */
    .stats-bar {
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.015);
      padding: 44px 0;
      margin-bottom: 80px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 32px;
      text-align: center;
    }
    .stat-val {
      font-family: var(--font-display);
      font-size: clamp(34px, 3.6vw, 48px);
      letter-spacing: -0.03em;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 8px;
    }
    .stat-lbl {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-family: var(--font-code);
      font-weight: 500;
    }

    /* Section Typography */
    .section-header {
      text-align: center;
      margin-bottom: 48px;
    }
    .section-eyebrow {
      font-family: var(--font-code);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: #71717a;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .section-heading {
      font-family: var(--font-display);
      font-size: clamp(30px, 3.8vw, 44px);
      letter-spacing: -0.025em;
      font-weight: 700;
      line-height: 1.2;
      color: #ffffff;
    }

    /* Installation Section */
    .install-section {
      margin-bottom: 90px;
    }
    .install-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      overflow: hidden;
    }
    .install-nav {
      display: flex;
      background: #0f0f13;
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
    }
    .install-tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.01em;
      padding: 14px 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 9px;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .install-tab-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.03);
    }
    .install-tab-btn.active {
      color: #ffffff;
      border-bottom-color: #ffffff;
      background: rgba(255, 255, 255, 0.06);
    }
    .install-body {
      padding: 32px;
    }
    .pkg-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      align-items: center;
      flex-wrap: wrap;
    }
    .pkg-label {
      font-size: 12px;
      color: var(--text-dim);
      font-family: var(--font-code);
      text-transform: uppercase;
      margin-right: 8px;
    }
    .pkg-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-family: var(--font-code);
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pkg-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: var(--border-hover);
    }
    .pkg-btn.active {
      background: #ffffff;
      border-color: #ffffff;
      color: #000000;
      font-weight: 700;
    }
    .code-snippet-box {
      background: #000000;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 20px 24px;
      position: relative;
      font-family: var(--font-code);
      font-size: 13px;
      line-height: 1.7;
      margin-bottom: 24px;
      overflow-x: auto;
    }
    .code-snippet-box .copy-icon-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border);
      color: var(--text-muted);
      border-radius: 4px;
      padding: 5px 12px;
      font-size: 11px;
      font-family: var(--font-code);
      cursor: pointer;
      transition: all 0.2s;
    }
    .code-snippet-box .copy-icon-btn:hover {
      background: #ffffff;
      color: #000000;
      border-color: #ffffff;
    }
    .install-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }
    .detail-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px 20px;
    }
    .detail-title {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.015em;
      color: var(--text);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .detail-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Central Walkthrough */
    .walkthrough-box {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 36px;
      margin-bottom: 80px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .walkthrough-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-top: 28px;
    }
    @media (max-width: 860px) {
      .walkthrough-cols { grid-template-columns: 1fr; }
    }
    .code-panel {
      background: #000000;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    .panel-head {
      background: #0f0f13;
      padding: 10px 16px;
      font-family: var(--font-code);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-pre {
      padding: 16px;
      font-family: var(--font-code);
      font-size: 13px;
      line-height: 1.6;
      color: #e4e4e7;
      overflow-x: auto;
    }
    .badge-subtle {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border);
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 80px;
    }
    .feature-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 32px;
      backdrop-filter: blur(8px);
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: hidden;
    }
    .feature-card:hover {
      transform: translateY(-4px);
      border-color: var(--border-hover);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    }
    .feature-icon {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: #ffffff;
    }
    .feature-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 10px;
      color: var(--text);
    }
    .feature-desc {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* Architecture Section */
    .arch-section {
      padding: 80px 0 100px;
      border-top: 1px solid var(--border);
    }
    .arch-pipeline-container {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 32px;
      margin-bottom: 40px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .arch-pipeline-nav {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .arch-step-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      color: var(--text-muted);
      border-radius: 6px;
      padding: 12px 18px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      min-width: 170px;
      transition: all 0.2s;
    }
    .arch-step-btn:hover {
      background: rgba(255, 255, 255, 0.07);
      color: var(--text);
      border-color: var(--border-hover);
    }
    .arch-step-btn.active {
      background: rgba(255, 255, 255, 0.08);
      border-color: #ffffff;
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
    }
    .arch-step-num {
      font-family: var(--font-code);
      font-size: 11px;
      font-weight: 600;
      color: #a1a1aa;
      letter-spacing: 0.06em;
    }
    .arch-step-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #fff;
    }
    .arch-step-detail {
      background: #000000;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 24px;
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .arch-step-detail { grid-template-columns: 1fr; }
    }
    .arch-detail-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .arch-detail-title {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--text);
    }
    .arch-file-badge {
      font-family: var(--font-code);
      font-size: 11px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .arch-detail-body {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.7;
    }
    .arch-card-box {
      background: #09090b;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      font-family: var(--font-code);
      font-size: 12px;
      color: #d4d4d8;
      overflow-x: auto;
      line-height: 1.6;
    }
    .arch-module-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }
    .arch-module-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      transition: all 0.2s;
    }
    .arch-module-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }
    .arch-mod-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .arch-mod-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }
    .arch-mod-badge {
      font-family: var(--font-code);
      font-size: 11px;
      color: #a1a1aa;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .arch-mod-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .arch-mod-list {
      margin-top: 14px;
      padding-left: 18px;
      font-size: 13px;
      color: #a1a1aa;
    }
    .arch-mod-list li {
      margin-bottom: 6px;
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      padding: 48px 0;
      font-size: 13px;
      color: var(--text-muted);
      background: #000000;
    }
    .footer-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .footer-links {
      display: flex;
      gap: 24px;
    }
    .footer-link {
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer-link:hover { color: #ffffff; }
  </style>
</head>
<body>

  <!-- Navigation -->
  <header>
    <div class="container nav-inner">
      <a href="#" class="logo">
        <div class="logo-badge">TG</div>
        <div class="logo-text">TraceGuard</div>
      </a>
      <ul class="nav-links">
        <li><a href="#install" class="nav-link">Installation</a></li>
        <li><a href="#features" class="nav-link">Features</a></li>
        <li><a href="#demo" class="nav-link">Interactive Demo</a></li>
        <li><a href="#architecture" class="nav-link">Architecture</a></li>
        <li>
          <a href="https://github.com/arnnnnaaavvvvv/TraceGuard" target="_blank" rel="noreferrer" class="nav-btn btn-github">
            <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
        </li>
        <li>
          <a href="https://www.npmjs.com/package/@arnavvv/traceguard" target="_blank" rel="noreferrer" class="nav-btn btn-primary">
            npm v0.1.0
          </a>
        </li>
      </ul>
    </div>
  </header>

  <!-- Hero -->
  <section class="hero">
    <div class="container">
      <div class="hero-pill">
        <span class="dot"></span>
        npm registry v0.1.0 available
      </div>
      <h1 class="hero-title">
        Catch breaking API changes<br>
        <span class="accent">before they reach production.</span>
      </h1>
      <p class="hero-sub">
        Deterministic OpenAPI contract validation and breaking-change detection. Zero AI hallucinations, zero cloud accounts, 100% offline-first TypeScript CLI and SDK.
      </p>

      <div class="hero-actions">
        <div class="install-box">
          <span style="color: #71717a;">$</span>
          <span class="install-cmd" id="installCmd">npx @arnavvv/traceguard --help</span>
          <button class="copy-btn" onclick="copyInstall()">Copy</button>
        </div>
      </div>

      <!-- Live Terminal Simulator -->
      <div class="terminal-wrapper" id="demo">
        <div class="terminal-header">
          <div class="terminal-dots">
            <span class="terminal-dot"></span>
            <span class="terminal-dot"></span>
            <span class="terminal-dot"></span>
          </div>
          <div class="terminal-tabs">
            <button class="term-tab active" onclick="switchTab('diff')">traceguard diff</button>
            <button class="term-tab" onclick="switchTab('check')">traceguard check</button>
            <button class="term-tab" onclick="switchTab('baseline')">traceguard baseline</button>
          </div>
          <button class="run-live-btn" onclick="executeLiveDemo()" id="runLiveBtn">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Trigger Live Test
          </button>
        </div>
        <div class="terminal-body" id="termOutput"></div>
      </div>
    </div>
  </section>

  <!-- Stats Bar -->
  <section class="stats-bar">
    <div class="container">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-val">100%</div>
          <div class="stat-lbl">Deterministic (Zero AI)</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">108 / 108</div>
          <div class="stat-lbl">Automated Tests Passing</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">0ms</div>
          <div class="stat-lbl">Cloud Telemetry Overhead</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">10 Attack</div>
          <div class="stat-lbl">Surfaces Hardened</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Installation & Setup Guide Section -->
  <section class="container install-section" id="install">
    <div class="section-header">
      <div class="section-eyebrow">Deployment Matrix</div>
      <h2 class="section-heading">Installation &amp; Setup Guide</h2>
      <p style="color: var(--text-muted); max-width: 650px; margin: 12px auto 0; font-size: 15px;">
        Deploy TraceGuard globally across developer machines, inside project repositories, or as an automated pull-request gate in your CI/CD pipelines.
      </p>
    </div>

    <div class="install-card">
      <!-- Method Navigation Tabs -->
      <div class="install-nav">
        <button class="install-tab-btn active" onclick="switchInstallMethod('global')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          Global CLI
        </button>
        <button class="install-tab-btn" onclick="switchInstallMethod('npx')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          Zero-Install (npx)
        </button>
        <button class="install-tab-btn" onclick="switchInstallMethod('local')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          Project Dependency
        </button>
        <button class="install-tab-btn" onclick="switchInstallMethod('sdk')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          TypeScript SDK
        </button>
        <button class="install-tab-btn" onclick="switchInstallMethod('ci')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M18 6a9 9 0 0 1-9 9"></path></svg>
          CI/CD GitHub Actions
        </button>
      </div>

      <div class="install-body">
        <!-- Package Manager Selector -->
        <div class="pkg-selector" id="pkgSelectorRow">
          <span class="pkg-label">Package Manager:</span>
          <button class="pkg-btn active" onclick="switchPkgManager('npm')">npm</button>
          <button class="pkg-btn" onclick="switchPkgManager('pnpm')">pnpm</button>
          <button class="pkg-btn" onclick="switchPkgManager('yarn')">yarn</button>
          <button class="pkg-btn" onclick="switchPkgManager('bun')">bun</button>
        </div>

        <!-- Code Snippet Display with Copy Button -->
        <div class="code-snippet-box">
          <button class="copy-icon-btn" onclick="copySnippetCode()" id="snippetCopyBtn">Copy Command</button>
          <pre style="margin: 0;"><code id="snippetCode" style="color: #ffffff; background: transparent; padding: 0;">npm install -g @arnavvv/traceguard</code></pre>
        </div>

        <!-- Dynamic Explanations & Workflow Guidance -->
        <div id="installDetailsContent"></div>

        <!-- Requirements & Compatibility Footer -->
        <div class="install-details">
          <div class="detail-card">
            <div class="detail-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Runtime Requirements
            </div>
            <div class="detail-desc">
              Requires <strong>Node.js &gt;= 20.18.0 (LTS)</strong>. Verified across Node 20, 22, and 24 on Windows, macOS, and Linux.
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Zero Native Dependencies
            </div>
            <div class="detail-desc">
              Pure TypeScript compiled to ESM and CJS. Relies on standard Fetch API and Node built-ins. Zero external binaries required.
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              100% Offline &amp; Private
            </div>
            <div class="detail-desc">
              Operates entirely within your local environment with zero telemetry, zero analytics, zero external network calls, and no cloud accounts.
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Central Example Walkthrough -->
  <section class="container" style="margin-bottom: 80px;">
    <div class="section-header">
      <div class="section-eyebrow">Real-World Protection</div>
      <h2 class="section-heading">How TraceGuard Catches Breaking Changes</h2>
    </div>

    <div class="walkthrough-box">
      <p style="color: var(--text-muted); font-size: 15px;">
        Consider an API contract declaring <code>GET /api/users/{id}</code> returning <code>{ id: string, name: string, email: string }</code>. When a service inadvertently returns an integer <code>id: 101</code> and drops <code>email</code>, TraceGuard immediately halts the CI gate:
      </p>

      <div class="walkthrough-cols">
        <div class="code-panel">
          <div class="panel-head">
            <span>fixtures/central-example/spec-v1.yaml</span>
            <span class="badge-subtle">OpenAPI 3.1</span>
          </div>
          <pre class="panel-pre"><code>paths:
  /api/users/{id}:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                required: [id, name, email]
                properties:
                  id: { type: string }
                  name: { type: string }
                  email: { type: string }</code></pre>
        </div>

        <div class="code-panel">
          <div class="panel-head">
            <span>Observed API Response</span>
            <span class="badge-subtle" style="border-color: #ffffff; color: #ffffff;">CONTRACT DRIFT</span>
          </div>
          <pre class="panel-pre"><code>{
  "id": 101,          <span style="color: #71717a;">// Violation: expected string</span>
  "name": "Arnav"     <span style="color: #71717a;">// Violation: required property 'email' missing</span>
}</code></pre>
        </div>
      </div>
    </div>
  </section>

  <!-- Key Features -->
  <section class="container" id="features">
    <div class="section-header">
      <div class="section-eyebrow">Core Capabilities</div>
      <h2 class="section-heading">Engineered for High-Stakes CI Pipelines</h2>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <h3 class="feature-title">Runtime Contract Verification</h3>
        <p class="feature-desc">
          Validates actual HTTP responses from active microservices against OpenAPI 3.0.x and 3.1.x specifications, verifying status codes, headers, and schemas.
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
        </div>
        <h3 class="feature-title">Direction-Aware Compatibility Diff</h3>
        <p class="feature-desc">
          Differentiates request vs response direction. Correctly flags enum narrowing on responses as breaking, while safely tolerating optional parameter expansion on requests.
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        </div>
        <h3 class="feature-title">Baseline Snapshot Quarantine</h3>
        <p class="feature-desc">
          Record existing legacy contract mismatches into an audited <code>.traceguard-baseline.json</code> snapshot. Only newly introduced breaking changes fail your PR builds.
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h3 class="feature-title">Adversarially Hardened</h3>
        <p class="feature-desc">
          Built under hostile-input assumptions: automatic masking of canary secrets, ReDoS catastrophic regex defenses, prototype-pollution blocks, and manual redirect SSRF prevention.
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <h3 class="feature-title">Multi-Format Reporting</h3>
        <p class="feature-desc">
          Outputs beautifully styled terminal dashboards, GitHub Flavored Markdown for automated PR sticky comments, clean JSON for telemetry, and standalone HTML reports.
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
        </div>
        <h3 class="feature-title">Dual CLI &amp; TypeScript SDK</h3>
        <p class="feature-desc">
          Run <code>traceguard</code> directly in terminal and CI runners, or import <code>createTraceGuard()</code> and <code>compareContracts()</code> into Vitest, Jest, or custom test suites.
        </p>
      </div>
    </div>
  </section>

  <!-- Architecture Section -->
  <section class="container arch-section" id="architecture">
    <div class="section-header">
      <div class="section-eyebrow">Zero-Trust Pipeline</div>
      <h2 class="section-heading">System Architecture</h2>
      <p style="color: var(--text-muted); max-width: 720px; margin: 12px auto 0; font-size: 15px;">
        TraceGuard is engineered around deterministic, immutable data streams. Every phase executes with bounded memory, hardened regex timeouts, and zero external network leaks.
      </p>
    </div>

    <!-- Pipeline Flow Visual Explorer -->
    <div class="arch-pipeline-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
        <span style="font-family: var(--font-code); font-size: 11px; color: #ffffff; letter-spacing: 0.08em; text-transform: uppercase;">
          Interactive Pipeline Flow (Click any stage to inspect internals)
        </span>
        <span style="font-family: var(--font-code); font-size: 11px; color: var(--text-dim);">
          Pure Functions &amp; Immutable ASTs
        </span>
      </div>

      <div class="arch-pipeline-nav">
        <button class="arch-step-btn active" id="step-btn-parser" onclick="selectArchStep('parser')">
          <span class="arch-step-num">Step 01</span>
          <span class="arch-step-title">Spec Ingestion</span>
        </button>
        <button class="arch-step-btn" id="step-btn-normalize" onclick="selectArchStep('normalize')">
          <span class="arch-step-num">Step 02</span>
          <span class="arch-step-title">Normalizer</span>
        </button>
        <button class="arch-step-btn" id="step-btn-checker" onclick="selectArchStep('checker')">
          <span class="arch-step-num">Step 03A</span>
          <span class="arch-step-title">Live Checker</span>
        </button>
        <button class="arch-step-btn" id="step-btn-diff" onclick="selectArchStep('diff')">
          <span class="arch-step-num">Step 03B</span>
          <span class="arch-step-title">AST Diff Engine</span>
        </button>
        <button class="arch-step-btn" id="step-btn-baseline" onclick="selectArchStep('baseline')">
          <span class="arch-step-num">Step 04</span>
          <span class="arch-step-title">Baseline Filter</span>
        </button>
        <button class="arch-step-btn" id="step-btn-policy" onclick="selectArchStep('policy')">
          <span class="arch-step-num">Step 05</span>
          <span class="arch-step-title">Policy &amp; Secrets</span>
        </button>
        <button class="arch-step-btn" id="step-btn-exit" onclick="selectArchStep('exit')">
          <span class="arch-step-num">Step 06</span>
          <span class="arch-step-title">Exit Codes</span>
        </button>
      </div>

      <div class="arch-step-detail">
        <div>
          <div class="arch-detail-header">
            <span class="arch-step-num" id="archDetailNum">01 / Ingestion</span>
            <span class="arch-file-badge" id="archDetailFile">src/parser/index.ts</span>
          </div>
          <h3 class="arch-detail-title" id="archDetailTitle">Spec Ingestion &amp; Local $ref Resolution</h3>
          <div class="arch-detail-body" id="archDetailDesc" style="margin-top: 14px;"></div>
        </div>
        <div>
          <div style="font-family: var(--font-code); font-size: 11px; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px;">
            Core Implementation Logic:
          </div>
          <pre class="arch-card-box" id="archDetailCode"></pre>
        </div>
      </div>
    </div>

    <!-- Core Module Deep Dives Grid -->
    <div class="arch-module-grid">
      <div class="arch-module-card">
        <div class="arch-mod-head">
          <h3 class="arch-mod-title">Local-Only Parser</h3>
          <span class="arch-mod-badge">src/parser</span>
        </div>
        <p class="arch-mod-desc">
          Safe YAML and JSON deserialization with strict local JSON-pointer resolution. Immune to SSRF, file traversal, and DNS rebinding attacks.
        </p>
        <ul class="arch-mod-list">
          <li>Rejects remote HTTP/HTTPS schemas and external file paths.</li>
          <li>Auto-detects OpenAPI 3.0.x vs 3.1.x dialects.</li>
          <li>Cycles and recursion in schema references detected and handled.</li>
        </ul>
      </div>

      <div class="arch-module-card">
        <div class="arch-mod-head">
          <h3 class="arch-mod-title">Bounded HTTP Checker</h3>
          <span class="arch-mod-badge">src/checker</span>
        </div>
        <p class="arch-mod-desc">
          High-performance contract tester utilizing Node.js native <code>fetch</code> with bounded execution guarantees and streaming response safety.
        </p>
        <ul class="arch-mod-list">
          <li>10MB maximum response body streaming abort protection.</li>
          <li>Per-request <code>AbortController</code> timeout guards against hung servers.</li>
          <li>Dual Ajv engines: Ajv with nullable transforms (3.0) + Ajv2020 (3.1).</li>
        </ul>
      </div>

      <div class="arch-module-card">
        <div class="arch-mod-head">
          <h3 class="arch-mod-title">Directional AST Comparator</h3>
          <span class="arch-mod-badge">src/diff</span>
        </div>
        <p class="arch-mod-desc">
          Differentiates request direction (client sending) from response direction (client consuming) across 10 formal compatibility rules.
        </p>
        <ul class="arch-mod-list">
          <li>Widening enum on request is safe; narrowing enum on response is breaking.</li>
          <li>Adding required request body breaks clients; adding response fields is safe.</li>
          <li>Polymorphic <code>oneOf</code> / <code>anyOf</code> marked conservatively as <code>UNKNOWN</code>.</li>
        </ul>
      </div>

      <div class="arch-module-card">
        <div class="arch-mod-head">
          <h3 class="arch-mod-title">SHA-256 Baseline Quarantine</h3>
          <span class="arch-mod-badge">src/baseline</span>
        </div>
        <p class="arch-mod-desc">
          Quarantines legacy contract mismatches into an audited <code>.traceguard-baseline.json</code> snapshot file so only new regressions fail builds.
        </p>
        <ul class="arch-mod-list">
          <li>Cryptographic fingerprint: <code>SHA-256(ruleId:method:path:location)</code>.</li>
          <li>Zero storage of customer payloads, responses, or secret keys.</li>
          <li>Explicit <code>--force</code> flag required to prevent accidental snapshot overwrites.</li>
        </ul>
      </div>

      <div class="arch-module-card">
        <div class="arch-mod-head">
          <h3 class="arch-mod-title">Secret Redaction &amp; Policy</h3>
          <span class="arch-mod-badge">src/policy &amp; src/report</span>
        </div>
        <p class="arch-mod-desc">
          Automated privacy sanitizers ensure zero credentials or tokens leak into terminal logs, CI comments, or saved report files.
        </p>
        <ul class="arch-mod-list">
          <li>Automatic masking of <code>Bearer [REDACTED]</code>, cookies, and tokens.</li>
          <li>ReDoS catastrophic backtracking guards on user validation regexes.</li>
          <li>Multi-format reporters: Terminal, Markdown, JSON, and standalone HTML.</li>
        </ul>
      </div>

      <div class="arch-module-card">
        <div class="arch-mod-head">
          <h3 class="arch-mod-title">Deterministic Exit Codes</h3>
          <span class="arch-mod-badge">src/cli</span>
        </div>
        <p class="arch-mod-desc">
          Built for seamless POSIX and CI pipe execution with unambiguous, standardized return codes for every run condition.
        </p>
        <ul class="arch-mod-list">
          <li><code>0</code>: All checks passed or suppressed by baseline.</li>
          <li><code>1</code>: Contract failure or breaking changes exceeded threshold.</li>
          <li><code>2</code>: CLI syntax or command argument validation error.</li>
          <li><code>3</code>: Fatal network connection error or unparsable spec.</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <div class="container footer-inner">
      <div>
        <span style="font-family: var(--font-display); font-size: 17px; font-weight: 700; letter-spacing: -0.02em; color: #fff;">TraceGuard</span>
        <span style="margin-left: 12px; color: var(--text-dim);">MIT License © 2026 Arnav</span>
      </div>
      <div class="footer-links">
        <a href="https://github.com/arnnnnaaavvvvv/TraceGuard" target="_blank" rel="noreferrer" class="footer-link">GitHub Repository</a>
        <a href="https://www.npmjs.com/package/@arnavvv/traceguard" target="_blank" rel="noreferrer" class="footer-link">npm Package</a>
        <a href="SECURITY.md" class="footer-link">Security Policy</a>
      </div>
    </div>
  </footer>

  <script>
    const termData = {
      diff: \`<span class="term-prompt">$</span> <span class="term-cmd">traceguard diff ./spec-v1.yaml ./spec-v2.yaml</span>

================================================================================
 TRACEGUARD CONTRACT REPORT - MODE: DIFF
 Schema Version: 1.0.0 | Engine: v0.1.0
================================================================================

 <span class="term-fail">[FAIL]</span> FINDINGS (2 total):
--------------------------------------------------------------------------------
 #1 [<span class="term-fail">CRITICAL</span>] [<span class="term-warn">BREAKING</span>] TG-COMPAT-RESPONSE-TYPE-CHANGED
    Target:     GET /api/users/{id}
    Location:   #/paths/~1api~1users~1{id}/get/responses/200/content/application~1json/schema/properties/id/type
    Expected:   Type 'string'
    Actual:     Type 'integer'
    Message:    Response schema type changed from 'string' to 'integer'.
--------------------------------------------------------------------------------
 #2 [<span class="term-fail">CRITICAL</span>] [<span class="term-warn">BREAKING</span>] TG-COMPAT-REQUIRED-RESPONSE-FIELD-REMOVED
    Target:     GET /api/users/{id}
    Location:   #/paths/~1api~1users~1{id}/get/responses/200/content/application~1json/schema/required
    Expected:   Property 'email' required
    Actual:     Property 'email' removed or optional
    Message:    Required response property 'email' was removed in 'GET /api/users/{id}'.
--------------------------------------------------------------------------------
 <span class="term-fail">STATUS: [FAIL] CI Policy Threshold Violations:</span>
   * Detected 2 breaking change(s) or critical contract mismatch(es).
   * Critical findings (2) exceeded threshold of 0.
================================================================================\`,
      check: \`<span class="term-prompt">$</span> <span class="term-cmd">traceguard check --spec ./openapi.yaml --base-url http://localhost:8080</span>

[Target API] Dispatched: GET /api/users/101
================================================================================
 TRACEGUARD CONTRACT REPORT - MODE: CHECK
 Evaluated: 1 / 1 Operations
================================================================================

 <span class="term-fail">[FAIL]</span> FINDINGS (2 total):
--------------------------------------------------------------------------------
 #1 [<span class="term-fail">CRITICAL</span>] [<span class="term-warn">BREAKING</span>] TG-CONTRACT-REQUIRED-MISSING
    Target:     GET /api/users/{id}
    Expected:   property 'email' present
    Actual:     undefined (missing)
    Message:    Response body schema violation: must have required property 'email'.
--------------------------------------------------------------------------------
 #2 [<span class="term-fail">CRITICAL</span>] [<span class="term-warn">BREAKING</span>] TG-CONTRACT-TYPE-MISMATCH
    Target:     GET /api/users/{id}
    Expected:   string
    Actual:     number (101)
    Message:    Response body schema violation at '#/id': must be string.
--------------------------------------------------------------------------------
 <span class="term-fail">STATUS: [FAIL] 2 Critical Violations Found (Exit Code: 1)</span>\`,
      baseline: \`<span class="term-prompt">$</span> <span class="term-cmd">traceguard baseline save .traceguard-baseline.json --diff ./spec-v2.yaml</span>
Baseline snapshot saved with 2 entries.

<span class="term-prompt">$</span> <span class="term-cmd">traceguard diff ./spec-v1.yaml ./spec-v2.yaml --baseline .traceguard-baseline.json</span>
================================================================================
 TRACEGUARD CONTRACT REPORT - MODE: DIFF (BASELINE ENABLED)
================================================================================
 FINDINGS (2 total):
   #1 [TG-COMPAT-RESPONSE-TYPE-CHANGED] <span class="term-dim">[SUPPRESSED (BASELINE)]</span>
   #2 [TG-COMPAT-REQUIRED-RESPONSE-FIELD-REMOVED] <span class="term-dim">[SUPPRESSED (BASELINE)]</span>

 SUMMARY:
   Total Findings: 2 (2 suppressed by baseline)
   Breaking Changes Count: 0 active

 <span class="term-pass">[PASS] All policy requirements satisfied. (Exit Code: 0)</span>
================================================================================\`
    };

    let currentMode = 'diff';

    function switchTab(mode) {
      currentMode = mode;
      document.querySelectorAll('.term-tab').forEach(b => b.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.term-tab')).find(b => b.textContent.includes(mode));
      if (activeBtn) activeBtn.classList.add('active');
      document.getElementById('termOutput').innerHTML = termData[mode];
    }

    async function executeLiveDemo() {
      const btn = document.getElementById('runLiveBtn');
      const out = document.getElementById('termOutput');
      btn.innerHTML = '<span class="spinner"></span> Running Verification...';
      btn.disabled = true;

      const endpoint = currentMode === 'check' ? '/api/run-check' : '/api/run-diff';

      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          out.innerHTML = \`<span class="term-prompt">$</span> <span class="term-cmd">Live Engine Scan Completed (\${new Date().toLocaleTimeString()})</span>\\n\\n\` + 
            data.terminal
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/\\[PASS\\]/g, '<span class="term-pass">[PASS]</span>')
              .replace(/\\[FAIL\\]/g, '<span class="term-fail">[FAIL]</span>')
              .replace(/\\[CRITICAL\\]/g, '<span class="term-fail">[CRITICAL]</span>')
              .replace(/\\[BREAKING\\]/g, '<span class="term-warn">[BREAKING]</span>');
        } else {
          switchTab(currentMode);
        }
      } catch {
        switchTab(currentMode);
      } finally {
        btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Trigger Live Test';
        btn.disabled = false;
      }
    }

    function copyInstall() {
      const text = document.getElementById('installCmd').textContent;
      navigator.clipboard.writeText(text);
      const btn = document.querySelector('.copy-btn');
      btn.textContent = 'Copied to Clipboard';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    }

    // --- Installation Matrix Logic ---
    let currentInstallMethod = 'global';
    let currentPkgManager = 'npm';

    const installData = {
      global: {
        npm: 'npm install -g @arnavvv/traceguard',
        pnpm: 'pnpm add -g @arnavvv/traceguard',
        yarn: 'yarn global add @arnavvv/traceguard',
        bun: 'bun add -g @arnavvv/traceguard',
        showPkgRow: true,
        desc: \`
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 14px;">
            Installs the <code>traceguard</code> executable system-wide. Run contract tests, compare specifications, or launch the visual UI from <strong>any folder</strong> or repository:
          </p>
          <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; font-family: var(--font-code); font-size: 13px; color: #d4d4d8;">
            <div style="margin-bottom: 6px;"><span style="color: #71717a;">$</span> traceguard --help <span style="color: var(--text-dim);"># Verify installation</span></div>
            <div style="margin-bottom: 6px;"><span style="color: #71717a;">$</span> traceguard diff ./openapi.v1.yaml ./openapi.v2.yaml <span style="color: var(--text-dim);"># Breaking changes diff</span></div>
            <div><span style="color: #71717a;">$</span> traceguard serve --port 3000 <span style="color: var(--text-dim);"># Launch visual web dashboard</span></div>
          </div>
        \`
      },
      npx: {
        npm: 'npx @arnavvv/traceguard --help',
        pnpm: 'pnpm dlx @arnavvv/traceguard --help',
        yarn: 'yarn dlx @arnavvv/traceguard --help',
        bun: 'bunx @arnavvv/traceguard --help',
        showPkgRow: true,
        desc: \`
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 14px;">
            Execute directly in terminal with <strong>zero permanent installation</strong>. Ideal for one-off manual audits, quick git hooks, or ephemeral Docker containers:
          </p>
          <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; font-family: var(--font-code); font-size: 13px; color: #d4d4d8;">
            <div style="margin-bottom: 6px;"><span style="color: #71717a;">$</span> npx @arnavvv/traceguard diff ./spec.base.yaml ./spec.head.yaml</div>
            <div style="margin-bottom: 6px;"><span style="color: #71717a;">$</span> npx @arnavvv/traceguard check --spec ./openapi.yaml --base-url http://localhost:8080</div>
            <div><span style="color: #71717a;">$</span> npx @arnavvv/traceguard serve</div>
          </div>
        \`
      },
      local: {
        npm: 'npm install --save-dev @arnavvv/traceguard',
        pnpm: 'pnpm add -D @arnavvv/traceguard',
        yarn: 'yarn add -D @arnavvv/traceguard',
        bun: 'bun add -d @arnavvv/traceguard',
        showPkgRow: true,
        desc: \`
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 14px;">
            Save TraceGuard directly in your repository's <code>package.json</code> for locked versions, peer reviews, and reproducible team execution:
          </p>
          <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; font-family: var(--font-code); font-size: 13px; color: #d4d4d8;">
            <div style="color: var(--text-dim); margin-bottom: 4px;">// Add to package.json scripts:</div>
            <div style="margin-bottom: 4px;">"scripts": {</div>
            <div style="margin-left: 16px; margin-bottom: 4px;">"test:contract": "traceguard check --spec ./openapi.yaml --base-url http://localhost:8080 --ci",</div>
            <div style="margin-left: 16px;">"contract:diff": "traceguard diff ./openapi.base.yaml ./openapi.head.yaml --ci"</div>
            <div>}</div>
          </div>
        \`
      },
      sdk: {
        npm: \`import { createTraceGuard, compareContracts } from '@arnavvv/traceguard';

// 1. Diffs two OpenAPI contracts programmatically:
const diffReport = await compareContracts({
  baseSpecPath: './openapi.base.yaml',
  headSpecPath: './openapi.head.yaml',
});

// 2. Validates running API service against contract:
const client = createTraceGuard({
  spec: './openapi.yaml',
  baseUrl: 'http://localhost:8080',
});
const checkReport = await client.check();\`,
        pnpm: '',
        yarn: '',
        bun: '',
        showPkgRow: false,
        desc: \`
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 14px;">
            Use the typed, promise-based TypeScript SDK inside Vitest, Jest, Playwright, or custom microservice test suites. Ships with full TypeScript definitions (<code>dist/index.d.ts</code>) and both ESM and CJS bundles.
          </p>
        \`
      },
      ci: {
        npm: \`name: OpenAPI Contract Gate
on: [push, pull_request]

jobs:
  contract-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Detect Breaking API Changes
        run: npx @arnavvv/traceguard diff ./openapi.base.yaml ./openapi.head.yaml --ci --format markdown --output $GITHUB_STEP_SUMMARY\`,
        pnpm: '',
        yarn: '',
        bun: '',
        showPkgRow: false,
        desc: \`
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 14px;">
            Enforce zero breaking changes on every Git pull request. TraceGuard automatically formats GitHub Flavored Markdown and posts breaking change findings directly to the GitHub Actions Job Summary.
          </p>
        \`
      }
    };

    function switchInstallMethod(method) {
      currentInstallMethod = method;
      document.querySelectorAll('.install-tab-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.install-tab-btn')).find(b => {
        if (method === 'global') return b.textContent.includes('Global');
        if (method === 'npx') return b.textContent.includes('Zero-Install');
        if (method === 'local') return b.textContent.includes('Dependency');
        if (method === 'sdk') return b.textContent.includes('SDK');
        if (method === 'ci') return b.textContent.includes('CI/CD');
        return false;
      });
      if (activeBtn) activeBtn.classList.add('active');

      const data = installData[method];
      const pkgRow = document.getElementById('pkgSelectorRow');
      if (data.showPkgRow) {
        pkgRow.style.display = 'flex';
      } else {
        pkgRow.style.display = 'none';
      }

      updateInstallSnippet();
      document.getElementById('installDetailsContent').innerHTML = data.desc;
    }

    function switchPkgManager(pkg) {
      currentPkgManager = pkg;
      document.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.pkg-btn')).find(b => b.textContent.trim() === pkg);
      if (activeBtn) activeBtn.classList.add('active');
      updateInstallSnippet();
    }

    function updateInstallSnippet() {
      const codeEl = document.getElementById('snippetCode');
      const data = installData[currentInstallMethod];
      if (currentInstallMethod === 'sdk' || currentInstallMethod === 'ci') {
        codeEl.textContent = data.npm;
      } else {
        codeEl.textContent = data[currentPkgManager] || data.npm;
      }
    }

    function copySnippetCode() {
      const text = document.getElementById('snippetCode').textContent;
      navigator.clipboard.writeText(text);
      const btn = document.getElementById('snippetCopyBtn');
      btn.textContent = 'Copied to Clipboard';
      setTimeout(() => btn.textContent = 'Copy Command', 2000);
    }

    // --- Architecture Interactive Pipeline Logic ---
    const archSteps = {
      parser: {
        num: '01 / Ingestion',
        title: 'Spec Ingestion & Local $ref Dereferencing',
        file: 'src/parser/index.ts',
        desc: 'Loads YAML and JSON specifications directly from disk into immutable syntax trees. Local JSON pointers (<code>#/components/...</code>) are dereferenced recursively with cycle detection. External URLs (<code>http://</code>, <code>https://</code>) and remote file paths are blocked outright to guarantee offline execution and prevent Server-Side Request Forgery (SSRF).',
        code: \`// Strict local-only pointer dereferencing:
if (ref.startsWith('http://') || ref.startsWith('https://')) {
  throw new SecurityError('Remote $ref blocked: SSRF protection');
}
if (!ref.startsWith('#/')) {
  throw new SecurityError('External file $ref blocked');
}\`
      },
      normalize: {
        num: '02 / Normalization',
        title: 'Operation AST Normalizer',
        file: 'src/parser/normalize.ts',
        desc: 'Translates complex, polymorphic OpenAPI 3.0.x and 3.1.x specifications into a flat, strongly typed sequence of <code>NormalizedOperation</code> records. Resolves path-level parameters, handles default responses, and normalizes media types (tolerating <code>application/json; charset=utf-8</code>).',
        code: \`export interface NormalizedOperation {
  readonly method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  readonly path: string;
  readonly operationId?: string;
  readonly parameters: readonly ParameterObject[];
  readonly responses: ReadonlyMap<string, ResponseObject>;
  readonly openApiVersion: '3.0' | '3.1';
}\`
      },
      checker: {
        num: '03A / Checker',
        title: 'Bounded Runtime Live Checker',
        file: 'src/checker/index.ts',
        desc: 'Dispatches live HTTP probes against target services using Node.js native <code>fetch</code>. Uses streamed body reader to enforce strict <code>maxBodySizeBytes</code> memory limits, terminating connections mid-stream if payloads balloon. Routes schemas to standard <code>Ajv</code> (OpenAPI 3.0 with nullable pre-transforms) or <code>Ajv2020</code> (OpenAPI 3.1 Draft 2020-12).',
        code: \`// AbortController timeout & streaming memory protection:
const response = await fetch(targetUrl, { signal: controller.signal });
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  bytesRead += value.length;
  if (bytesRead > MAX_BODY_BYTES) throw new PayloadTooLargeError();
}\`
      },
      diff: {
        num: '03B / Spec Diff',
        title: 'Directional Compatibility Diff Engine',
        file: 'src/diff/index.ts',
        desc: 'Compares two OpenAPI versions across 10 formal compatibility rules with directional semantics: <strong>Request Direction</strong> (old client calling new server: widening enums is safe, adding optional params is safe) vs <strong>Response Direction</strong> (old client consuming new responses: narrowing enums is breaking, removing required fields is breaking). Returns <code>UNKNOWN</code> for non-deterministic polymorphism.',
        code: \`// Directional Rule Evaluation:
if (direction === 'response' && isEnumNarrowed(baseEnum, headEnum)) {
  return createFinding('TG-COMPAT-RESPONSE-ENUM-NARROWED', 'CRITICAL');
}
if (direction === 'request' && isEnumExpanded(baseEnum, headEnum)) {
  return null; // Safe for existing clients
}\`
      },
      baseline: {
        num: '04 / Baseline',
        title: 'SHA-256 Baseline Quarantine',
        file: 'src/baseline/filter.ts',
        desc: 'Computes cryptographic fingerprints: <code>SHA-256(ruleId + ":" + method + ":" + endpoint + ":" + location)</code>. Legacy contract drift or known technical debt is quarantined in <code>.traceguard-baseline.json</code> so existing flaws do not break your CI builds, while newly introduced regressions are blocked immediately.',
        code: \`// Deterministic finding fingerprint:
function fingerprintFinding(f: Finding): string {
  const seed = [f.ruleId, f.method, f.endpoint, f.location].join(':');
  return crypto.createHash('sha256').update(seed).digest('hex');
}\`
      },
      policy: {
        num: '05 / Policy & Secrets',
        title: 'Policy Engine & Secret Masking',
        file: 'src/policy/index.ts & src/report/sanitizer.ts',
        desc: 'Evaluates unsuppressed findings against configurable CI thresholds. All reporters (Terminal, Markdown, JSON, HTML) run through automatic secret redaction: Authorization Bearer tokens, query credentials, cookie headers, and canary strings are masked with <code>[REDACTED]</code> before rendering.',
        code: \`// Canary & credential auto-masking:
export function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\\\\s+[A-Za-z0-9\\\\-_.~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/(password|secret|apiKey)=([^&\\\\s]+)/gi, '$1=[REDACTED]');
}\`
      },
      exit: {
        num: '06 / Exit Codes',
        title: 'Deterministic Process Exit Codes',
        file: 'src/cli/index.ts',
        desc: 'Integrates cleanly with GitHub Actions, GitLab CI, and Unix pipes with standard, deterministic exit codes: <strong>0</strong> (All checks passed), <strong>1</strong> (Breaking change or contract violation policy failed), <strong>2</strong> (CLI syntax or flag validation error), <strong>3</strong> (Fatal network timeout, connection refused, or unparsable spec).',
        code: \`enum ExitCode {
  SUCCESS = 0,         // Clean or baseline-suppressed
  POLICY_FAILURE = 1,  // Breaking change threshold exceeded
  USAGE_ERROR = 2,     // Invalid CLI arguments
  FATAL_ERROR = 3,     // Network crash or unresolvable spec
}\`
      }
    };

    function selectArchStep(stepKey) {
      document.querySelectorAll('.arch-step-btn').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById('step-btn-' + stepKey);
      if (btn) btn.classList.add('active');

      const data = archSteps[stepKey];
      if (!data) return;
      document.getElementById('archDetailNum').textContent = data.num;
      document.getElementById('archDetailTitle').textContent = data.title;
      document.getElementById('archDetailFile').textContent = data.file;
      document.getElementById('archDetailDesc').innerHTML = data.desc;
      document.getElementById('archDetailCode').textContent = data.code;
    }

    // Initialize architecture section
    selectArchStep('parser');

    // Initialize installation section
    switchInstallMethod('global');

    // Default tab
    switchTab('diff');
  </script>
</body>
</html>
`;

fs.writeFileSync('index.html', htmlContent, 'utf-8');
fs.writeFileSync('docs/index.html', htmlContent, 'utf-8');
console.log('Successfully updated index.html and docs/index.html with Plus Jakarta Sans & Inter professional enterprise typography!');
