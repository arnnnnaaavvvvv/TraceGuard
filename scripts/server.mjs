import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTraceGuard, compareContracts, formatTerminalReport, formatJsonReport } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // CORS headers for local inspection
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Mock Target API for Central Example
  if (pathname === '/api/mock/users/101' || pathname === '/api/users/101') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 101, name: 'Arnav' }));
    return;
  }

  // 2. Live API: Trigger Contract Check
  if (pathname === '/api/run-check') {
    try {
      const client = createTraceGuard({
        spec: path.join(ROOT_DIR, 'fixtures/central-example/spec-v1.yaml'),
        baseUrl: `http://localhost:${PORT}/api/mock`,
      });
      const report = await client.check();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        terminal: formatTerminalReport(report),
        raw: report,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 3. Live API: Trigger Breaking Change Diff
  if (pathname === '/api/run-diff') {
    try {
      const report = await compareContracts({
        baseSpecPath: path.join(ROOT_DIR, 'fixtures/central-example/spec-v1.yaml'),
        headSpecPath: path.join(ROOT_DIR, 'fixtures/central-example/spec-v2.yaml'),
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        terminal: formatTerminalReport(report),
        raw: report,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 4. Static File Server
  let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n================================================================================`);
  console.log(` TRACEGUARD INTERACTIVE SERVER RUNNING`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` API Check Endpoint: http://localhost:${PORT}/api/run-check`);
  console.log(` API Diff Endpoint:  http://localhost:${PORT}/api/run-diff`);
  console.log(` Mock Target API:    http://localhost:${PORT}/api/mock/users/101`);
  console.log(`================================================================================\n`);
});
