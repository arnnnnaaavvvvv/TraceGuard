import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTraceGuard, compareContracts, formatTerminalReport } from '../index.js';

export async function startServer(options: { port?: number; host?: string } = {}): Promise<void> {
  const port = options.port || 3000;
  const host = options.host || '0.0.0.0';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // In dist/cli/index.js, root is two levels up: ../..
  const pkgRoot = path.resolve(__dirname, '../..');
  const cwd = process.cwd();

  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Mock Target API for Central Example
    if (pathname === '/api/mock/users/101' || pathname === '/api/users/101') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: 101, name: 'Arnav' }));
      return;
    }

    // Live API: Trigger Contract Check
    if (pathname === '/api/run-check') {
      try {
        const defaultSpec = path.join(pkgRoot, 'fixtures/central-example/spec-v1.yaml');
        const specCandidates = [
          path.join(cwd, 'openapi.yaml'),
          path.join(cwd, 'openapi.json'),
          defaultSpec,
        ];
        const specPath = specCandidates.find((p) => fs.existsSync(p)) ?? defaultSpec;

        const client = createTraceGuard({
          spec: specPath,
          baseUrl: `http://localhost:${port}/api/mock`,
        });
        const report = await client.check();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          terminal: formatTerminalReport(report),
          raw: report,
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }

    // Live API: Trigger Breaking Change Diff
    if (pathname === '/api/run-diff') {
      try {
        const defaultBase = path.join(pkgRoot, 'fixtures/central-example/spec-v1.yaml');
        const defaultHead = path.join(pkgRoot, 'fixtures/central-example/spec-v2.yaml');
        const baseSpecCandidates = [
          path.join(cwd, 'openapi.base.yaml'),
          path.join(cwd, 'openapi.yaml'),
          defaultBase,
        ];
        const headSpecCandidates = [
          path.join(cwd, 'openapi.head.yaml'),
          path.join(cwd, 'openapi.v2.yaml'),
          defaultHead,
        ];
        const baseSpec = baseSpecCandidates.find((p) => fs.existsSync(p)) ?? defaultBase;
        const headSpec = headSpecCandidates.find((p) => fs.existsSync(p)) ?? defaultHead;

        const report = await compareContracts({
          baseSpecPath: baseSpec,
          headSpecPath: headSpec,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          terminal: formatTerminalReport(report),
          raw: report,
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }

    // Static File Serving (Landing Page / Web UI)
    let filePath = path.join(pkgRoot, pathname === '/' ? 'index.html' : pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(pkgRoot, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
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

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      process.stdout.write(`\n================================================================================\n`);
      process.stdout.write(` TRACEGUARD GLOBAL VISUAL DASHBOARD\n`);
      process.stdout.write(` Running at: http://localhost:${port}\n`);
      process.stdout.write(` Network:    http://${host}:${port}\n`);
      process.stdout.write(`================================================================================\n\n`);
      resolve();
    });
  });
}
