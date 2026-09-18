/**
 * Fails the build when a public symbol lacks a TSDoc description.
 *
 * TypeDoc exits 0 on warnings, so this wrapper inspects them. Members of *anonymous* inline object
 * types — the callbacks inside a slot's prop bag, reported as `SlotPropsMap.X.__type.onChange` —
 * are exempt: the slot itself is documented and its callbacks are listed with their types on
 * `/api/slots`.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['exec', 'typedoc', '--emit', 'none'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);

if (result.status !== 0) {
  console.error('[docs-check] TypeDoc failed.');
  process.exit(result.status ?? 1);
}

const undocumented = output
  .split('\n')
  .filter((line) => line.includes('does not have any documentation'))
  .filter((line) => !line.includes('__type'));

if (undocumented.length > 0) {
  console.error(
    `\n[docs-check] ${String(undocumented.length)} public symbol(s) lack a TSDoc description:`,
  );
  for (const line of undocumented.slice(0, 40)) console.error(`  ${line.trim()}`);
  process.exit(1);
}

console.log('[docs-check] every public symbol is documented');
