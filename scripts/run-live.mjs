import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTraceGuard, compareContracts, formatTerminalReport, formatHtmlReport } from '../dist/index.js';

console.log('='.repeat(80));
console.log(' STARTING TRACEGUARD LIVE RUNNER (CENTRAL EXAMPLE WALKTHROUGH)');
console.log('='.repeat(80));

const apiResponse = JSON.parse(readFileSync('fixtures/central-example/api-response.json', 'utf-8'));

// 1. Spin up mock HTTP service
const server = http.createServer((req, res) => {
  console.log(`\n[Target API] Received HTTP request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(apiResponse));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

console.log(`[Target API] Mock server running at ${baseUrl}`);
console.log(`[Target API] Payload returned: ${JSON.stringify(apiResponse)}`);

try {
  // 2. Run Live Runtime Contract Check (traceguard check)
  console.log('\n' + '-'.repeat(80));
  console.log(' STEP 1: RUNNING RUNTIME CONTRACT CHECK (`traceguard check`)');
  console.log('-'.repeat(80));
  
  const client = createTraceGuard({
    spec: 'fixtures/central-example/spec-v1.yaml',
    baseUrl,
  });

  const checkReport = await client.check();
  console.log(formatTerminalReport(checkReport));

  // 3. Run Contract Compatibility Diff (traceguard diff)
  console.log('\n' + '-'.repeat(80));
  console.log(' STEP 2: RUNNING BREAKING CHANGE DIFF (`traceguard diff`)');
  console.log('-'.repeat(80));

  const diffReport = await compareContracts({
    baseSpecPath: 'fixtures/central-example/spec-v1.yaml',
    headSpecPath: 'fixtures/central-example/spec-v2.yaml',
  });
  console.log(formatTerminalReport(diffReport));

  // 4. Generate HTML Report
  const html = formatHtmlReport(diffReport);
  writeFileSync('report.html', html, 'utf-8');
  console.log('\n[Report] Generated HTML report at report.html');

} finally {
  server.close();
  console.log('\n[Target API] Mock server shut down.');
  console.log('='.repeat(80));
}
