import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter } from 'node:path';
const mode = process.argv[2] || 'check';
const python = process.env.PYTHON || 'python';
function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: false,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status) process.exit(result.status);
}
const js = ['src/**/*.{js,jsx,css}', 'shared', 'scripts/quality.mjs'];
const py = ['server', 'scripts/audit_normalization.py', 'scripts/verify_research.py'];
const localRuff = '.tools/python/bin/ruff.exe';
const ruff = existsSync(localRuff) ? localRuff : 'ruff';
if (mode === 'test-api')
  run(python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'], {
    PYTHONPATH: ['server', 'tests'].join(delimiter),
  });
else if (mode === 'check' || mode === 'format') {
  run(process.execPath, [
    'node_modules/prettier/bin/prettier.cjs',
    mode === 'format' ? '--write' : '--check',
    ...js,
  ]);
  run(ruff, ['format', ...(mode === 'check' ? ['--check'] : []), ...py]);
  run(ruff, ['check', ...py]);
} else {
  console.error('Expected check, format or test-api');
  process.exit(1);
}
