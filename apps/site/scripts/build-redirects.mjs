/**
 * Turns `content/react-tablekit/migration/url-map.csv` into the host's redirect table
 * (`vercel.json`), so the one place a moved URL is recorded is the one place it is served from.
 *
 * The file is written beside this package, not at the repository root: the Vercel project's
 * Root Directory is `apps/site`, and Vercel reads its configuration from — and resolves every
 * path in it against — that directory. A root-level config with `outputDirectory:
 * apps/site/dist` was looked for at `apps/site/apps/site/dist`.
 *
 * PPDS P12: a URL is never deleted. Everything the legacy site answered still resolves, by 301
 * where it moved.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapFile = path.join(siteRoot, 'content', 'react-tablekit', 'migration', 'url-map.csv');
const indexFile = path.join(siteRoot, 'src', 'generated', 'content', 'index.json');

const pages = new Set(JSON.parse(readFileSync(indexFile, 'utf8')).map((p) => p.pathname));

const rows = readFileSync(mapFile, 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const [legacy, contentType, archetype, target, action, redirect] = line.split(',');
    return { legacy, contentType, archetype, target, action, redirect };
  });

const errors = [];
const redirects = [];
const seen = new Set();

for (const row of rows) {
  if (row.redirect !== '301') continue;
  if (row.legacy === row.target) continue;
  if (seen.has(row.legacy)) {
    errors.push(`${row.legacy}: listed twice`);
    continue;
  }
  seen.add(row.legacy);

  // A target must be a page the site actually publishes, or a demo frame.
  const resolves = pages.has(row.target) || row.target.startsWith('/embed/');
  if (!resolves) errors.push(`${row.legacy} → ${row.target}: the target is not a published page`);

  redirects.push({ source: row.legacy, destination: row.target, permanent: true });
}

if (errors.length > 0) {
  console.error(`[redirects] ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  // One step, run in this directory. The site aliases the library to its source and generates
  // its own reference data, so nothing has to run before this and no order can be got wrong.
  buildCommand: 'pnpm run build',
  outputDirectory: 'dist',
  // pnpm finds the workspace root two levels up and installs all of it from here.
  installCommand: 'pnpm install --frozen-lockfile',
  framework: null,
  // Every canonical URL ends in a slash, and every page is a directory index, so this is the
  // shape the site is generated in rather than a preference.
  trailingSlash: true,
  redirects,
  headers: [
    {
      // Hashed filenames, so they can be cached forever.
      source: '/assets/(.*)',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'x-content-type-options', value: 'nosniff' },
        { key: 'referrer-policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

writeFileSync(path.join(siteRoot, 'vercel.json'), `${JSON.stringify(vercel, null, 2)}\n`);
console.log(`[redirects] vercel.json written with ${redirects.length} permanent redirects`);
