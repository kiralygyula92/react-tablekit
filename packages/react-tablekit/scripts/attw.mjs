// Runs @arethetypeswrong/cli on the packed tarball for every JS entrypoint.
// CSS subpaths are not JS modules, so they are left out; the locale wildcard is expanded.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const locales = readdirSync(new URL('../src/locales', import.meta.url))
  .filter((f) => f.endsWith('.ts') && f !== 'types.ts')
  .map((f) => `./locales/${f.replace(/\.ts$/, '')}`);

const entrypoints = ['.', './core', './meta', ...locales];
const result = spawnSync(
  'attw',
  ['--pack', '.', '--profile', 'node16', '--entrypoints', ...entrypoints],
  { stdio: 'inherit', shell: true, cwd: new URL('..', import.meta.url) },
);
process.exit(result.status ?? 1);
