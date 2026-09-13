// Regenerates src/styles/tokens.css and src/styles/presets/*.css from the JS theme objects by
// running the token test in update mode.
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', 'test/core/tokens.test.ts', '--project', 'core'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, UPDATE_TOKENS: '1' },
    cwd: new URL('..', import.meta.url),
  },
);
process.exit(result.status ?? 1);
