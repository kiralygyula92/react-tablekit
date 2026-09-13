// Copies packages/react-tablekit/package.json#version into src/version.ts.
// Runs after `changeset version` (see the root "version-packages" script).
import { readFileSync, writeFileSync } from 'node:fs';

const pkgDir = new URL('../packages/react-tablekit/', import.meta.url);
const { version } = JSON.parse(readFileSync(new URL('package.json', pkgDir), 'utf8'));
const file = new URL('src/version.ts', pkgDir);
const source = readFileSync(file, 'utf8');
const next = source.replace(
  /export const version = '[^']*';/,
  `export const version = '${version}';`,
);

if (next === source && !source.includes(`'${version}'`)) {
  throw new Error('sync-version: could not find the version constant in src/version.ts');
}
writeFileSync(file, next);
console.log(`[sync-version] src/version.ts -> ${version}`);
