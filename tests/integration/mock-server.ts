import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';

export interface MockServerInstance {
  readonly server: Server;
  readonly port: number;
  readonly baseUrl: string;
  close(): Promise<void>;
}

export function startMockServer(): Promise<MockServerInstance> {
  return new Promise((resolve, reject) => {
    const server = createServer(handleRequest);

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to obtain server address'));
        return;
      }
      const port = addr.port;
      const baseUrl = `http://127.0.0.1:${port}`;

      resolve({
        server,
        port,
        baseUrl,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url || '/';

  // 1. Central Example: returns { id: 101, name: "Arnav" } (wrong type for id, missing email)
  if (url.includes('/101')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 101, name: 'Arnav' }));
    return;
  }

  // 2. Valid user response
  if (url.includes('/good')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: '101', name: 'Arnav', email: 'arnav@example.com' }));
    return;
  }

  // 3. Missing required email
  if (url.includes('/no-email')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: '101', name: 'Arnav' }));
    return;
  }

  // 4. Undocumented status (418)
  if (url.includes('undocumented')) {
    res.writeHead(418, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "I'm a teapot" }));
    return;
  }

  // 5. Documented 404
  if (url.includes('/not-found')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User not found' }));
    return;
  }

  // 6. Bad content type
  if (url.includes('bad-content-type')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('plain text response');
    return;
  }

  // 7. Bodyless 204
  if (url.includes('empty-204')) {
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.includes('bad-204')) {
    res.writeHead(204);
    res.end('unexpected-body');
    return;
  }

  // 8. Malformed JSON
  if (url.includes('malformed-json')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"unclosed_json: true');
    return;
  }

  // 9. Slow response
  if (url.includes('slow')) {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"delayed": true}');
    }, 4000);
    return;
  }

  // 10. Sensitive headers & tokens
  if (url.includes('sensitive')) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=super_secret_cookie_123; HttpOnly',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
    });
    res.end(JSON.stringify({ token: 'bearer-secret-token-abc' }));
    return;
  }

  // Fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}
