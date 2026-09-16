/**
 * The machine-readable surface of the site (PPDS §7.7): `llms.txt`, a Markdown twin of every
 * page, `sitemap.xml`, `robots.txt` and an RSS feed for the changelog.
 *
 * Everything here is derived from the generated content index, so a page cannot be published
 * without appearing in all of them — and cannot be deleted while still being listed.
 *
 * It writes into `public/`, which Vite copies verbatim into `dist/`, so the files are static and
 * need no server.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(siteRoot, 'content');
const publicRoot = path.join(siteRoot, 'public');
const indexFile = path.join(siteRoot, 'src', 'generated', 'content', 'index.json');
const configFile = path.join(contentRoot, 'react-tablekit', 'plugin.config.json');
const navFile = path.join(contentRoot, 'react-tablekit', 'nav.json');

/**
 * The origin every absolute URL is built from. `VITE_SITE_ORIGIN` is the setting; on Vercel the
 * production domain is already in the build environment, so a deployment nobody configured still
 * emits its own URLs rather than someone else's.
 */
const ORIGIN = (
  process.env.VITE_SITE_ORIGIN ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://react-tablekit.vercel.app')
).replace(/\/$/, '');

const pages = JSON.parse(readFileSync(indexFile, 'utf8'));
const config = JSON.parse(readFileSync(configFile, 'utf8'));
const nav = JSON.parse(readFileSync(navFile, 'utf8'));

const docs = pages.filter((p) => p.pathname.startsWith('/react-tablekit/'));
const marketing = pages.filter((p) => !p.pathname.startsWith('/react-tablekit/'));

/* ── Markdown twins ────────────────────────────────────────────────────────
   `/react-tablekit/sorting/` also answers at `/react-tablekit/sorting/index.md` with the page's
   own source. Frontmatter is replaced by a title and a description an agent can read, and the
   JSX-only lines are dropped — a `<Demo>` tag means nothing outside the site. */

// Written at the URL itself — `/react-tablekit/sorting/index.md` — so the twin is a static
// file on every host, with no rewrite rule to keep in sync.
rmSync(path.join(publicRoot, 'react-tablekit'), { recursive: true, force: true });

/** The MDX body as plain Markdown: no frontmatter, no component tags, no stray blank runs. */
function toMarkdown(page) {
  const raw = readFileSync(path.join(contentRoot, page.file), 'utf8');
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '');

  const lines = [];
  let inFence = false;
  let openTag = null;
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence) {
      lines.push(line);
      continue;
    }
    // A demo is not portable, but the fact that one exists is worth telling an agent.
    const demo = /^<Demo\s/.test(line) ? line : null;
    if (demo || openTag === 'Demo') {
      const id = /id="([^"]+)"/.exec(line)?.[1];
      if (id) lines.push(`_Live example: ${ORIGIN}/embed/${id}_`);
      openTag = line.trimEnd().endsWith('/>') ? null : 'Demo';
      continue;
    }
    if (/^\s*<\/?[A-Za-z][^>]*>?\s*$/.test(line)) continue; // a JSX-only line
    lines.push(line);
  }

  const markdown = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return `# ${page.frontmatter.title}\n\n> ${page.frontmatter.description}\n\n${markdown}\n`;
}

let twins = 0;
for (const page of pages) {
  const dir = path.join(publicRoot, page.pathname);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.md'), toMarkdown(page));
  twins++;
}

/* ── llms.txt ──────────────────────────────────────────────────────────────
   One line per page, grouped by the sidebar's own sections so the order an agent reads matches
   the order a person would. The description is the page's single description (P10). */

const titleOf = (pathname) => pages.find((p) => p.pathname === pathname)?.frontmatter.title;
const describe = (pathname) => pages.find((p) => p.pathname === pathname)?.frontmatter.description;
const entry = (pathname) =>
  `- [${titleOf(pathname)}](${ORIGIN}${pathname}index.md): ${describe(pathname)}`;

const flatten = (nodes, out = []) => {
  for (const node of nodes) {
    if (!node.pathname.endsWith('-group')) out.push(node.pathname);
    if (node.children) flatten(node.children, out);
  }
  return out;
};

const llms = [`# ${config.name}`, '', `> ${config.description}`, ''];
if (marketing.length > 0) {
  llms.push('## Home', '');
  for (const page of marketing) llms.push(entry(page.pathname));
  llms.push('');
}
for (const section of nav) {
  const listed = flatten(section.children ?? []).filter((p) => titleOf(p));
  if (listed.length === 0) continue;
  llms.push(`## ${section.subheader ?? titleOf(section.pathname)}`, '');
  for (const pathname of listed) llms.push(entry(pathname));
  llms.push('');
}
writeFileSync(path.join(publicRoot, 'llms.txt'), `${llms.join('\n').trim()}\n`);

/* ── sitemap.xml ───────────────────────────────────────────────────────────
   Both surfaces. `/embed/*` is excluded: it is a demo frame, not a page. */

const today = new Date().toISOString().slice(0, 10);
const priority = (pathname) =>
  pathname === '/' ? '1.0' : pathname === '/react-tablekit/' ? '0.9' : '0.7';
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.map(
    (p) =>
      `  <url><loc>${ORIGIN}${p.pathname}</loc><lastmod>${today}</lastmod>` +
      `<priority>${priority(p.pathname)}</priority></url>`,
  ),
  '</urlset>',
];
writeFileSync(path.join(publicRoot, 'sitemap.xml'), `${sitemap.join('\n')}\n`);

writeFileSync(
  path.join(publicRoot, 'robots.txt'),
  ['User-agent: *', 'Allow: /', 'Disallow: /embed/', '', `Sitemap: ${ORIGIN}/sitemap.xml`, ''].join(
    '\n',
  ),
);

/* ── changelog feed ────────────────────────────────────────────────────────
   One item per released version, read from the package's own CHANGELOG so the feed cannot claim
   a release that was never made. */

const changelog = readFileSync(
  path.join(siteRoot, '..', '..', 'packages', 'react-tablekit', 'CHANGELOG.md'),
  'utf8',
);
const releases = [...changelog.matchAll(/^## (\d+\.\d+\.\d+)\n([\s\S]*?)(?=\n## |\s*$)/gm)].map(
  ([, version, body]) => ({ version, body: body.trim() }),
);

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const changelogUrl = `${ORIGIN}/react-tablekit/discover-more/changelog/`;
const rss = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  '  <channel>',
  `    <title>${escapeXml(config.name)} releases</title>`,
  `    <link>${changelogUrl}</link>`,
  `    <description>${escapeXml(config.tagline)}</description>`,
  `    <atom:link href="${ORIGIN}/changelog.xml" rel="self" type="application/rss+xml" />`,
  ...releases.flatMap(({ version, body }) => [
    '    <item>',
    `      <title>${escapeXml(config.name)} ${version}</title>`,
    `      <link>${changelogUrl}</link>`,
    `      <guid isPermaLink="false">${config.id}@${version}</guid>`,
    `      <description>${escapeXml(body.slice(0, 600))}</description>`,
    '    </item>',
  ]),
  '  </channel>',
  '</rss>',
];
writeFileSync(path.join(publicRoot, 'changelog.xml'), `${rss.join('\n')}\n`);

console.log(
  `[machine-surface] ${twins} markdown twins, llms.txt (${docs.length} docs pages), ` +
    `sitemap.xml (${pages.length} urls), robots.txt, changelog.xml (${releases.length} releases)`,
);
