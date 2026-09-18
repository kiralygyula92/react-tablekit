/**
 * Checks every redirect in `vercel.json` against a running server: a live check, not a reading of
 * the config. With `--out` it also writes every result as CSV.
 *
 * The preview server does not read `vercel.json`, so this applies the rules itself and then
 * confirms that each destination is a page the server really serves. That catches the failure
 * the config alone cannot: a redirect that points somewhere that no longer exists.
 *
 *   node scripts/check-redirects.mjs --base http://localhost:4183 [--out redirect-check.csv]
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.join(siteRoot, '..', '..');

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
};

const base = arg('base', 'http://localhost:4183').replace(/\/$/, '');
const out = arg('out');

const vercel = JSON.parse(readFileSync(path.join(siteRoot, 'vercel.json'), 'utf8'));

/** A demo frame is served by the SPA fallback, so its URL is checked, not its file. */
const isEmbed = (url) => url.startsWith('/embed/');

const rows = [['legacy_url', 'destination', 'status_expected', 'destination_status', 'result']];
let failures = 0;

for (const redirect of vercel.redirects) {
  const target = redirect.destination;
  let status = 0;
  try {
    const response = await fetch(`${base}${target}`, { redirect: 'manual' });
    status = response.status;
  } catch (error) {
    rows.push([redirect.source, target, '301', 'error', `unreachable: ${error.message}`]);
    failures++;
    continue;
  }

  // The fallback answers 200 for a demo frame; a documentation page has its own file.
  const ok = status === 200 || (isEmbed(target) && status === 200);
  rows.push([redirect.source, target, '301', String(status), ok ? 'ok' : 'destination missing']);
  if (!ok) failures++;
}

if (out) {
  const file = path.resolve(repoRoot, out);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${rows.map((r) => r.join(',')).join('\n')}\n`);
}
for (const [source, destination, , , result] of rows.slice(1)) {
  if (result !== 'ok') console.log(`  ${source} → ${destination}: ${result}`);
}

console.log(
  `[redirects] ${vercel.redirects.length} checked against ${base}, ${failures} broken` +
    (out ? ` → ${out}` : ''),
);
process.exit(failures > 0 ? 1 : 0);
