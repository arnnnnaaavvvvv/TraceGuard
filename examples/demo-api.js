import { createServer } from 'node:http';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const server = createServer((req, res) => {
  const url = req.url || '';

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
