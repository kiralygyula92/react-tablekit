// Post-build assertions on dist/ that publint/attw don't cover.
import { existsSync, readFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const read = (p) => readFileSync(new URL(p, dist), 'utf8');
const failures = [];

// The React entry must start with the RSC directive; the framework-agnostic entries must not.
for (const file of ['index.js', 'index.cjs']) {
  if (!read(file).startsWith('"use client";'))
    failures.push(`${file} must start with "use client"`);
}
for (const file of ['core/index.js', 'core/index.cjs', 'meta.js', 'meta.cjs']) {
  if (read(file).includes('use client')) failures.push(`${file} must not contain "use client"`);
}

// core must never reference React.
for (const file of ['core/index.js', 'core/index.cjs']) {
  if (/from\s*["']react|require\(["']react/.test(read(file)))
    failures.push(`${file} references react`);
}

// Every CSS file must establish the cascade-layer order base → theme. Layers rank by first
// appearance; Lightning CSS may fold the order statement into the blocks, which is equivalent.
for (const file of [
  'styles.css',
  'base.css',
  'presets/classic.css',
  'presets/dark.css',
  'presets/compact.css',
]) {
  if (!existsSync(new URL(file, dist))) {
    failures.push(`${file} is missing`);
    continue;
  }
  const css = read(file);
  const base = css.indexOf('@layer tablekit.base');
  const theme = css.search(/@layer (tablekit\.base,\s*)?tablekit\.theme/);
  if (!css.startsWith('@layer tablekit.base') || theme === -1 || theme < base) {
    failures.push(`${file} must declare @layer tablekit.base before tablekit.theme`);
  }
  if (/@layer (?!tablekit\.)/.test(css)) failures.push(`${file} uses a layer outside tablekit.*`);
}

if (failures.length) {
  console.error('[verify-dist] failed:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('[verify-dist] OK');
