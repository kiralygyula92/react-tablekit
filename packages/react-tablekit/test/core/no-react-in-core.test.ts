import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const coreDir = fileURLToPath(new URL('../../src/core', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('core layering', () => {
  it('never imports react or react-dom (headless-first)', () => {
    const offenders = walk(coreDir).filter((file) =>
      /from\s+['"](react|react-dom)(\/[^'"]*)?['"]/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
