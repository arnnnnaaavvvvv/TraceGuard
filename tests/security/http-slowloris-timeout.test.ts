import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { executeRequest } from '../../src/checker/client.js';
import { TimeoutError } from '../../src/types/errors.js';

describe('Security: Slowloris Response Body Timeout (VULN-04)', () => {
  let server: http.Server;
  let serverPort: number;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      // Send 200 headers immediately
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      });
      // Send a few bytes then intentionally stall without ending
      res.write('{"partial":');
      // Intentionally do not call res.end()
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

  it('aborts stalled response body streaming when timeoutMs is reached', async () => {
    const url = `http://127.0.0.1:${serverPort}/slowloris`;
    const timeoutMs = 250;

    const start = Date.now();
    await expect(
      executeRequest(url, 'GET', {}, { timeoutMs, maxBodySizeBytes: 1024 * 1024 })
    ).rejects.toThrow(TimeoutError);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(200);
    expect(elapsed).toBeLessThan(1000); // Must terminate within reasonable margin of timeoutMs
  });
});
