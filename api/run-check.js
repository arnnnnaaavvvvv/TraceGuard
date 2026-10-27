import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createTraceGuard, formatTerminalReport } from '../dist/index.js';

const SPEC_V1 = `openapi: 3.1.0
info:
  title: User Service
  version: 1.0.0
paths:
  /api/users/{id}:
    get:
      summary: Retrieve user by ID
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          example: '101'
      responses:
        '200':
          description: Successful user response
          content:
            application/json:
              schema:
                type: object
                required:
                  - id
                  - name
                  - email
                properties:
                  id:
                    type: string
                  name:
                    type: string
                  email:
                    type: string
`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const tmpDir = os.tmpdir();
    const v1Path = path.join(tmpDir, 'traceguard-demo-v1.yaml');
    if (!fs.existsSync(v1Path)) fs.writeFileSync(v1Path, SPEC_V1, 'utf-8');

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${proto}://${host}`;

    const client = createTraceGuard({
      spec: v1Path,
      baseUrl,
    });

    const report = await client.check();
    const terminal = formatTerminalReport(report);
    return res.status(200).json({ terminal, raw: report });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
