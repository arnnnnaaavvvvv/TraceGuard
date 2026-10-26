import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { executeRequest } from '../../src/checker/client.js';

describe('Security: HTTP Redirect SSRF Prevention (VULN-03)', () => {
  let server: http.Server;
  let serverPort: number;
  let redirectTargetHit = false;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/redirect-to-attacker') {
        res.writeHead(302, {
          Location: `http://127.0.0.1:${serverPort}/attacker-endpoint`,
        });
        res.end();
      } else if (req.url === '/attacker-endpoint') {
        redirectTargetHit = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ stolen: req.headers['authorization'] }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('stops at 302 redirect and never contacts the target location or leaks credentials', async () => {
    redirectTargetHit = false;
    const url = `http://127.0.0.1:${serverPort}/redirect-to-attacker`;

    const res = await executeRequest(url, 'GET', {
      Authorization: 'Bearer super-secret-token',
    }, {
      timeoutMs: 2000,
      maxBodySizeBytes: 1024 * 1024,
    });

    // Must return the 302 response directly
    expect(res.status).toBe(302);
    // Must NOT have followed redirect to the attacker endpoint
    expect(redirectTargetHit).toBe(false);
  });
});
