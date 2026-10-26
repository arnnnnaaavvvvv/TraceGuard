import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-smoke-'));
console.log('Testing tarball in:', tmp);

const tgz = path.resolve('traceguard-0.1.0.tgz');
if (!fs.existsSync(tgz)) {
  console.log('Creating tarball...');
  cp.execSync('npm pack', { stdio: 'inherit' });
}

try {
  cp.execSync('npm init -y', { cwd: tmp, stdio: 'ignore' });
  cp.execSync(`npm install "${tgz}"`, { cwd: tmp, stdio: 'inherit' });

  const cliHelp = cp.execSync('npx traceguard --help', { cwd: tmp }).toString();
  console.log('CLI Help First Line:', cliHelp.split('\n')[0]);

  const cjs = cp.execSync(`node -e "const tg = require('traceguard'); console.log('CJS SDK export:', typeof tg.createTraceGuard);"`, { cwd: tmp }).toString();
  console.log(cjs.trim());

  const esm = cp.execSync(`node --input-type=module -e "import { createTraceGuard } from 'traceguard'; console.log('ESM SDK export:', typeof createTraceGuard);"`, { cwd: tmp }).toString();
  console.log(esm.trim());

  console.log('Smoke test passed successfully!');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
  if (fs.existsSync(tgz)) {
    fs.unlinkSync(tgz);
  }
}
