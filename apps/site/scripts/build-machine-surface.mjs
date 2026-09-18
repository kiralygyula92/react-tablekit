/**
 * The machine-readable surface of the site (PPDS §7.7): `llms.txt`, `llms-full.md` (also served as
 * `llms-full.txt`), a Markdown twin of every page, `sitemap.xml`, `robots.txt` and an RSS feed for
 * the changelog.
 *
 * Everything here is derived from the generated content index, so a page cannot be published
 * without appearing in all of them — and cannot be deleted while still being listed.
 *
 * It writes into `public/`, which Vite copies verbatim into `dist/`, so the files are static and
 * need no server.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(siteRoot, 'content');
const srcRoot = path.join(siteRoot, 'src');
const publicRoot = path.join(siteRoot, 'public');
const apiDir = path.join(srcRoot, 'generated', 'api');
const indexFile = path.join(srcRoot, 'generated', 'content', 'index.json');
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

const docs = pages;

const pageAt = (pathname) => pages.find((p) => p.pathname === pathname);
const titleOf = (pathname) => pageAt(pathname)?.frontmatter.title;
const describe = (pathname) => pageAt(pathname)?.frontmatter.description;
const isGroup = (node) => node.pathname.endsWith('-group');

/** Every page under the given nav nodes, in sidebar order. */
const flatten = (nodes, out = []) => {
  for (const node of nodes) {
    if (!isGroup(node)) out.push(node.pathname);
    if (node.children) flatten(node.children, out);
  }
  return out;
};

/* ── Reference data ────────────────────────────────────────────────────────
   The reference pages render their tables in the browser: six from the TypeDoc output, five from
   the package's runtime metadata. The Markdown has to carry the same rows, so it reads the same
   sources, and the TypeScript ones are loaded through Vite's module runner.

   The runner does not read `vite.config.ts`, and it treats a bare import as an installed package.
   Left to itself it resolves `react-tablekit/meta` to the package's build output — which a
   deployment never has, because the site builds against the library source. So it is given the
   site's own aliases, exported by the config, and the load is checked to have come from source:
   a stale `dist/` on a developer's machine would otherwise let it pass there and fail in CI. */

const { module: viteConfig } = await runnerImport(path.join(siteRoot, 'vite.config.ts'), {
  root: siteRoot,
  logLevel: 'error',
});
const runnerOptions = {
  root: siteRoot,
  logLevel: 'error',
  resolve: { alias: viteConfig.libraryAliases },
};

const { module: meta, dependencies: metaSources } = await runnerImport(
  'react-tablekit/meta',
  runnerOptions,
);
if (!metaSources.some((file) => file.replace(/\\/g, '/').includes('/react-tablekit/src/'))) {
  throw new Error('[machine-surface] react-tablekit/meta did not load from the library source');
}
const { handlerRows, HANDLERS_EXAMPLE } = (
  await runnerImport(path.join(srcRoot, 'interactive', 'api', 'handlerDetails.ts'), runnerOptions)
).module;

/* ── Markdown primitives ─────────────────────────────────────────────────── */

/** An inline code span that survives a backtick in its content. */
const codeSpan = (value) => {
  const text = String(value ?? '');
  if (text === '') return '';
  return text.includes('`') ? `\`\` ${text} \`\`` : `\`${text}\``;
};

/** A table cell: one line, with pipes escaped (GFM honours `\|` inside code spans too). */
const cell = (value) =>
  String(value ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();

const table = (headers, rows) =>
  [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');

/** A fenced block, with a fence longer than any backtick run inside it. */
const fence = (lang, body) => {
  const longest = Math.max(0, ...[...body.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = '`'.repeat(Math.max(3, longest + 1));
  return `${ticks}${lang}\n${body.replace(/\s+$/, '')}\n${ticks}`;
};

const langOf = (file) => path.extname(file).slice(1);

/* ── Reference pages as Markdown ─────────────────────────────────────────── */

/** One documented symbol, as the reference page shows it. */
function symbolMarkdown(symbol) {
  const out = [`### ${symbol.name} (${symbol.kind})`];
  if (symbol.description) out.push(symbol.description);
  if (symbol.example) out.push(fence('tsx', symbol.example));
  for (const signature of symbol.signatures) {
    const params = signature.params
      .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
      .join(', ');
    const line = codeSpan(`${signature.name}(${params}): ${signature.returns}`);
    out.push(signature.description ? `${line} — ${signature.description}` : line);
  }
  if (symbol.members.length > 0) {
    out.push(
      table(
        ['Name', 'Type', 'Default', 'Description'],
        symbol.members.map((m) => [
          codeSpan(`${m.name}${m.optional ? '?' : ''}`),
          codeSpan(m.type),
          m.default ?? '',
          `${m.deprecated ? `Deprecated: ${m.deprecated}. ` : ''}${m.description ?? ''}`,
        ]),
      ),
    );
  }
  return out.join('\n\n');
}

const generated = (file) => () =>
  JSON.parse(readFileSync(path.join(apiDir, file), 'utf8'))
    .map(symbolMarkdown)
    .join('\n\n');

/** Every `<ApiReference id>` the content can use, and its Markdown. The build fails on any other. */
const references = {
  'data-table-props': generated('data-table.json'),
  'column-def': generated('column-def.json'),
  'table-instance': generated('instance.json'),
  'table-state': generated('state.json'),
  hooks: generated('hooks.json'),
  utilities: generated('utilities.json'),
  slots: () =>
    table(
      ['Slot', 'Default element'],
      meta.slotMeta.map((s) => [codeSpan(s.name), codeSpan(`<${s.element}>`)]),
    ),
  handlers: () =>
    [
      fence('tsx', HANDLERS_EXAMPLE),
      table(
        ['Handler', 'Context', 'Default behaviour'],
        handlerRows.map((h) => [codeSpan(h.name), codeSpan(h.context), h.behaviour]),
      ),
    ].join('\n\n'),
  'theme-tokens': () =>
    table(
      ['Token', 'CSS variable', 'light', 'classic', 'dark'],
      meta.tokenMeta.map((t) => [
        t.path,
        codeSpan(t.cssVar),
        ...['light', 'classic', 'dark'].map((preset) => codeSpan(t.values[preset])),
      ]),
    ),
  'localization-keys': () =>
    table(
      ['Key', 'English default'],
      meta.localeMeta.map((e) => [codeSpan(e.key), e.english]),
    ),
  icons: () => `Icon names: ${meta.iconNames.map(codeSpan).join(', ')}.`,
};

/** The features index, rendered from the same nav data the page renders it from. */
function featuresIndex(sectionPath = '/react-tablekit/features-group') {
  const section = nav.find((node) => node.pathname === sectionPath);
  return (section?.children ?? [])
    .filter(isGroup)
    .map((group) =>
      [
        `## ${group.subheader}`,
        '',
        ...(group.children ?? []).map(
          (p) => `- [${titleOf(p.pathname)}](${ORIGIN}${p.pathname}): ${describe(p.pathname)}`,
        ),
      ].join('\n'),
    )
    .join('\n\n');
}

/* ── Pages as Markdown ───────────────────────────────────────────────────── */

/** A live example, as its source. The label is what the page calls it. */
function demoMarkdown(attrs) {
  const source = readFileSync(path.join(contentRoot, `${attrs.id}.tsx`), 'utf8');
  const label = attrs.label ? `Example: ${attrs.label}` : 'Example';
  return `**${label}** (runs live at ${ORIGIN}/embed/${attrs.id})\n\n${fence('tsx', source)}`;
}

/** Components whose tags are dropped and whose children are kept, as prose. */
const CONTAINERS = new Set(['Callout']);

/** The Markdown for one self-closing component tag. Anything unknown stops the build. */
function renderTag(tag, page) {
  const name = /<([A-Z][A-Za-z0-9]*)/.exec(tag)?.[1];
  const attrs = Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  switch (name) {
    case 'Demo':
      return demoMarkdown(attrs);
    case 'ApiReference': {
      const render = references[attrs.id];
      if (!render) {
        throw new Error(
          `${page.file}: <ApiReference id="${attrs.id}"> has no Markdown form; add it to ` +
            '`references` in scripts/build-machine-surface.mjs',
        );
      }
      return render();
    }
    case 'FeaturesIndex':
      return featuresIndex(attrs.sectionPath);
    case 'Playground':
    case 'ThemeEditor': {
      const what = name === 'Playground' ? 'playground' : 'theme editor';
      return `_The ${what} is interactive: it runs in the browser at ${ORIGIN}${page.pathname} and has no Markdown form._`;
    }
    default:
      // Dropping it silently would publish a page with a hole in it.
      throw new Error(
        `${page.file}: <${name}> has no Markdown form; teach renderTag in ` +
          'scripts/build-machine-surface.mjs what it becomes',
      );
  }
}

/** A page's MDX body as plain Markdown: no frontmatter, every component written out. */
function pageBody(page) {
  const raw = readFileSync(path.join(contentRoot, page.file), 'utf8').replace(/\r\n/g, '\n');
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '');

  const out = [];
  let inFence = false;
  let pending = null; // a component tag that spans several lines
  for (const line of body.split('\n')) {
    if (pending !== null) {
      pending += ` ${line.trim()}`;
      if (/\/?>\s*$/.test(line)) {
        out.push(renderTag(pending, page));
        pending = null;
      }
      continue;
    }
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) {
      out.push(line);
      continue;
    }
    const component = /^\s*<([A-Z][A-Za-z0-9]*)\b/.exec(line)?.[1];
    if (component) {
      if (CONTAINERS.has(component)) continue;
      if (/\/?>\s*$/.test(line)) out.push(renderTag(line.trim(), page));
      else pending = line.trim();
      continue;
    }
    if (/^\s*<\/[A-Z]/.test(line)) continue; // a container's closing tag
    if (/^\s*<\/?[a-z][^>]*>?\s*$/.test(line)) continue; // a layout-only HTML line
    out.push(line);
  }
  if (pending !== null) throw new Error(`${page.file}: unterminated tag ${pending.slice(0, 60)}`);

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A page with its title, description and URL, so an answer drawn from it can cite it. */
const pageMarkdown = (page) =>
  `# ${page.frontmatter.title}\n\n> ${page.frontmatter.description}\n\n` +
  `URL: ${ORIGIN}${page.pathname}\n\n${pageBody(page)}\n`;

/* ── Example fixtures ──────────────────────────────────────────────────────
   The examples import a few site modules: sample data, shared columns. Without them an example is
   a list of imports nobody can resolve, so the files they reach are written out once, at the end,
   found by following the imports rather than from a list that could go stale. */

const IMPORT = /(?:\bfrom\s+|\bimport\s+|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;
const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function resolveLocal(spec, fromFile) {
  const base = spec.startsWith('@/')
    ? path.join(srcRoot, spec.slice(2))
    : spec.startsWith('.')
      ? path.resolve(path.dirname(fromFile), spec)
      : null;
  if (base === null) return null; // a package: react, react-tablekit
  for (const extension of EXTENSIONS) {
    const file = base + extension;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  throw new Error(`${path.relative(siteRoot, fromFile)}: cannot resolve '${spec}'`);
}

/** Every local module the given files reach through their imports, excluding the files themselves. */
function fixturesOf(files) {
  const found = new Set();
  const queue = [...files];
  while (queue.length > 0) {
    const file = queue.shift();
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(IMPORT)) {
      const dep = resolveLocal(spec, file);
      if (dep && !found.has(dep) && !files.includes(dep)) {
        found.add(dep);
        queue.push(dep);
      }
    }
  }
  return [...found].sort();
}

/** How an example imports a fixture: `@/demo-support/columns` rather than a file path. */
const specifierOf = (file) => {
  const rel = path.relative(siteRoot, file).split(path.sep).join('/');
  return rel.startsWith('src/') ? `@/${rel.slice(4).replace(/(\/index)?\.tsx?$/, '')}` : rel;
};

function fixturesMarkdown(files) {
  if (files.length === 0) return '';
  const blocks = files.map(
    (file) => `## ${specifierOf(file)}\n\n${fence(langOf(file), readFileSync(file, 'utf8'))}`,
  );
  return (
    '# Shared example code\n\nThe examples above import these site modules: sample data and ' +
    'shared column definitions. They are not part of the package; they are here so that every ' +
    `example is complete.\n\n${blocks.join('\n\n')}\n`
  );
}

const demoFilesOf = (page) => page.demos.map((id) => path.join(contentRoot, `${id}.tsx`));

/* ── Markdown twins ────────────────────────────────────────────────────────
   `/react-tablekit/sorting/` also answers at `/react-tablekit/sorting/index.md`: the same page,
   with its examples as source and the fixtures they import, so it stands on its own. Written at
   the URL itself, so the twin is a static file on every host with no rewrite rule to maintain. */

rmSync(path.join(publicRoot, 'react-tablekit'), { recursive: true, force: true });

let twins = 0;
for (const page of pages) {
  const dir = path.join(publicRoot, page.pathname);
  mkdirSync(dir, { recursive: true });
  const fixtures = fixturesMarkdown(fixturesOf(demoFilesOf(page)));
  writeFileSync(
    path.join(dir, 'index.md'),
    fixtures ? `${pageMarkdown(page)}\n---\n\n${fixtures}` : pageMarkdown(page),
  );
  twins++;
}

/* ── llms-full.md ──────────────────────────────────────────────────────────
   Every page in the sidebar's reading order, in one file, for an agent that should know the whole
   library. Served twice: `.md` for people and editors, `.txt` because that is the name tools ask
   for. A page the nav does not list still goes in, at the end, rather than being lost. */

const readingOrder = [
  ...new Set([
    ...nav.flatMap((section) => flatten(section.children ?? [])),
    ...pages.map((p) => p.pathname),
  ]),
]
  .map(pageAt)
  .filter(Boolean);

const contents = nav
  .map((section) => {
    const titles = flatten(section.children ?? [])
      .map(titleOf)
      .filter(Boolean);
    return titles.length > 0
      ? `- **${section.subheader ?? titleOf(section.pathname)}**: ${titles.join(', ')}`
      : null;
  })
  .filter(Boolean);

const allFixtures = fixturesOf([...new Set(readingOrder.flatMap(demoFilesOf))]);

const full = [
  `# ${config.name}: the complete documentation`,
  '',
  `> ${config.description}`,
  '',
  `Version ${meta.version}. Every page of ${ORIGIN}/react-tablekit/ in reading order, generated ` +
    'from the same sources in the same build as the site. Each live example is written out as its ' +
    'source and each reference page as its tables. The examples import a few site modules ' +
    '(paths beginning `@/`); they are at the end, under "Shared example code".',
  '',
  'Every page begins with its title as a level-one heading and its URL, so an answer taken from ' +
    'this file can name the page it came from.',
  '',
  '## Contents',
  '',
  ...contents,
  '',
  ...readingOrder.flatMap((page) => ['---', '', pageMarkdown(page)]),
  '---',
  '',
  fixturesMarkdown(allFixtures),
].join('\n');

writeFileSync(path.join(publicRoot, 'llms-full.md'), full);
writeFileSync(path.join(publicRoot, 'llms-full.txt'), full);

/* ── llms.txt ──────────────────────────────────────────────────────────────
   One line per page, grouped by the sidebar's own sections so the order an agent reads matches
   the order a person would. The description is the page's single description (P10). */

const entry = (pathname) =>
  `- [${titleOf(pathname)}](${ORIGIN}${pathname}index.md): ${describe(pathname)}`;

const llms = [
  `# ${config.name}`,
  '',
  `> ${config.description}`,
  '',
  `Every page below in one file, with the source of every example: [llms-full.txt](${ORIGIN}/llms-full.txt)`,
  '',
];
for (const section of nav) {
  const listed = flatten(section.children ?? []).filter((p) => titleOf(p));
  if (listed.length === 0) continue;
  llms.push(`## ${section.subheader ?? titleOf(section.pathname)}`, '');
  for (const pathname of listed) llms.push(entry(pathname));
  llms.push('');
}
writeFileSync(path.join(publicRoot, 'llms.txt'), `${llms.join('\n').trim()}\n`);

/* ── sitemap.xml ───────────────────────────────────────────────────────────
   Every published page. `/embed/*` is excluded: it is a demo frame, not a page. */

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
  `[machine-surface] ${twins} markdown twins, llms.txt (${docs.length} pages), ` +
    `llms-full.md (${readingOrder.length} pages, ${allFixtures.length} fixtures, ` +
    `${(Buffer.byteLength(full) / 1024).toFixed(0)} kB), ` +
    `sitemap.xml (${pages.length} urls), robots.txt, changelog.xml (${releases.length} releases)`,
);
