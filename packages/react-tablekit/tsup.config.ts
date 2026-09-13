import { readdirSync } from 'node:fs';
import { defineConfig, type Options } from 'tsup';

const locales = readdirSync(new URL('./src/locales', import.meta.url))
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && f !== 'types.ts')
  .map((f) => f.replace(/\.ts$/, ''));

const shared: Options = {
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  // esbuild already tree-shakes while bundling. tsup's extra rollup `treeshake` pass is off on
  // purpose: it strips the "use client" directive and duplicates sourceMappingURL comments.
  treeshake: false,
  target: 'es2020',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  tsconfig: 'tsconfig.build.json',
  outDir: 'dist',
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
};

export default defineConfig([
  // React entry: carries the "use client" directive for RSC frameworks (Next.js App Router).
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    // Single entry, so no splitting: tsup's CJS splitting transform would push the directive
    // below its own "use strict" prologue.
    splitting: false,
    banner: { js: '"use client";' },
  },
  // Framework-agnostic entries: no directive.
  {
    ...shared,
    entry: {
      'core/index': 'src/core/index.ts',
      meta: 'src/meta.ts',
      ...Object.fromEntries(locales.map((l) => [`locales/${l}`, `src/locales/${l}.ts`])),
    },
    splitting: true,
  },
]);
// Note: the two builds run in parallel, so neither uses `clean`; `scripts/clean.mjs` empties dist first.
