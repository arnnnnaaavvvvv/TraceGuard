import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CANARIES = [
  'CANARY_SECRET_API_KEY_1234567890',
  'CANARY_BEARER_TOKEN_ABCDEFGHIJKL',
  'CANARY_PASSWORD_SUPER_SECRET_PWD',
  'CANARY_USERINFO_PASSWORD_SECRET',
];

console.log('--- RUNNING ADVERSARIAL CANARY GREP VERIFICATION ---');

const canarySpecPath = resolve('canary-spec-temp.yaml');
const canaryOutputPath = resolve('canary-output-temp.txt');
const canaryBaselinePath = resolve('canary-baseline-temp.json');

const specContent = `
openapi: "3.0.3"
info:
  title: Canary API
  version: "1.0.0"
paths:
  /api/v1/test:
    get:
      summary: Canary endpoint
      parameters:
        - name: apiKey
          in: query
          required: true
          example: "${CANARIES[0]}"
      responses:
        "200":
          description: OK
          headers:
            X-Canary-Secret:
              schema:
                type: string
                example: "${CANARIES[1]}"
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  password:
                    type: string
                    example: "${CANARIES[2]}"
              example:
                id: "1"
                password: "${CANARIES[2]}"
`;

writeFileSync(canarySpecPath, specContent, 'utf-8');

const formats = ['terminal', 'json', 'markdown', 'html'];
let totalLeaks = 0;

try {
  for (const format of formats) {
    let output = '';
    try {
      output = execSync(
        `node ./dist/cli/index.js diff "${canarySpecPath}" "${canarySpecPath}" --format ${format}`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch (err) {
      output = (err.stdout || '') + (err.stderr || '');
    }

    for (const canary of CANARIES) {
      if (output.includes(canary)) {
        console.error(`[FAIL] Canary leak detected in format '${format}': ${canary}`);
        totalLeaks++;
      }
    }
  }

  // Also test error output (stderr)
  try {
    execSync(
      `node ./dist/cli/index.js check --spec non-existent.yaml --baseUrl "https://user:${CANARIES[3]}@localhost:8080"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (err) {
    const errorOutput = (err.stdout || '') + (err.stderr || '');
    for (const canary of CANARIES) {
      if (errorOutput.includes(canary)) {
        console.error(`[FAIL] Canary leak detected in stderr: ${canary}`);
        totalLeaks++;
      }
    }
  }

} finally {
  if (existsSync(canarySpecPath)) unlinkSync(canarySpecPath);
  if (existsSync(canaryOutputPath)) unlinkSync(canaryOutputPath);
  if (existsSync(canaryBaselinePath)) unlinkSync(canaryBaselinePath);
}

if (totalLeaks === 0) {
  console.log('[PASS] ZERO CANARY LEAKS DETECTED ACROSS ALL REPORTERS AND STDERR.');
  process.exit(0);
} else {
  console.error(`[FAIL] Detected ${totalLeaks} total canary leak(s)!`);
  process.exit(1);
}
