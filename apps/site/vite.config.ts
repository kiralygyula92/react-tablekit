import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Alias } from 'vite';

const lib = (p: string) =>
  fileURLToPath(new URL(`../../packages/react-tablekit/src/${p}`, import.meta.url));

/**
 * The site always runs against the library *source* (docs/08: "it always runs against the
 * current source"), so every public subpath export is aliased to its src counterpart.
 * Order matters: the most specific patterns come first.
 */
export const libraryAliases: Alias[] = [
  { find: /^react-tablekit\/core$/, replacement: lib('core/index.ts') },
  { find: /^react-tablekit\/meta$/, replacement: lib('meta.ts') },
  { find: /^react-tablekit\/locales\/(.+)$/, replacement: lib('locales/$1.ts') },
  { find: /^react-tablekit\/styles\.css$/, replacement: lib('styles/index.css') },
  { find: /^react-tablekit\/base\.css$/, replacement: lib('styles/base-entry.css') },
  { find: /^react-tablekit\/presets\/(.+)\.css$/, replacement: lib('styles/presets/$1.css') },
  { find: /^react-tablekit$/, replacement: lib('index.ts') },
];

export default defineConfig({
  base: process.env.SITE_BASE ?? '/',
  plugins: [react()],
  resolve: { alias: libraryAliases },
  server: { port: 5173 },
  preview: { port: 4173 },
});
