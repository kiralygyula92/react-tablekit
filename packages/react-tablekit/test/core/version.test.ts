import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { version as coreVersion } from '../../src/core';
import { version } from '../../src';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

describe('version', () => {
  it('matches package.json (run `pnpm version-packages` to sync)', () => {
    expect(version).toBe(pkg.version);
  });

  it('is re-exported identically from react-tablekit/core', () => {
    expect(coreVersion).toBe(version);
  });
});
