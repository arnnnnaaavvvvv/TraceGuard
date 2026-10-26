import { createServer } from 'node:http';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const server = createServer((req, res) => {
  const url = req.url || '';

  // 1. Interactive Web Dashboard styled with Bebas Neue & Monochrome theme
  if (url === '/' || url === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TraceGuard Demo Service</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body { background: #000; color: #fff; font-family: 'Inter', sans-serif; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; border: 2px solid #333; padding: 32px; background: #0a0a0a; }
    h1 { font-family: 'Bebas Neue', sans-serif; font-size: 64px; letter-spacing: 3px; margin: 0; line-height: 1; }
    p.tagline { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #888; letter-spacing: 1.5px; margin-top: 8px; }
    .divider { border-top: 2px solid #222; margin: 24px 0; }
    .badge { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 1px; padding: 4px 10px; background: #fff; color: #000; }
    .card { background: #111; border: 1px solid #333; padding: 16px; margin-top: 16px; }
    code { font-family: 'JetBrains Mono', monospace; color: #fff; background: #222; padding: 2px 6px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>TRACEGUARD DEMO API</h1>
    <p class="tagline">RUNNING ON LOCALHOST:${PORT}</p>
    <div class="divider"></div>
    <span class="badge">ACTIVE CONTRACT MISMATCH</span>
    <div class="card">
      <p>Endpoint: <code>GET /api/users/101</code></p>
      <p style="color: #888; margin-top: 8px;">Returns: <code>{"id": 101, "name": "Arnav"}</code></p>
      <p style="color: #bbb; margin-top: 8px;">Notice: Contract promises <code>id: string</code> and required <code>email</code>. TraceGuard will catch this discrepancy!</p>
    </div>
  </div>
</body>
</html>`);
    return;
  }

  // 2. Target API Endpoint
  if (url.startsWith('/api/users/')) {
    // Deliberate contract bug:
    // Spec v1 promises: { id: string, name: string, email: string }
    // Implementation returns: { id: 101, name: "Arnav" } (number id, email missing)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 101, name: 'Arnav' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Demo API listening on http://127.0.0.1:${PORT}`);
});
