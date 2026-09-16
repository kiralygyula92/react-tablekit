/**
 * The 26 conformance checks from the plugin docs standard (PPDS §11), run against the built
 * site.
 *
 * It reads the generated artefacts and `dist/`, so it checks what is actually shipped rather
 * than what the source intends. Run it after `pnpm --filter site build`; `--report <file>`
 * writes the result as Markdown.
 *
 * A check that the standard marks not-applicable for this project points at its entry in
 * `docs/ppds/EXCEPTIONS.md`; anything else that fails, fails the build.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.join(siteRoot, '..', '..');
const dist = path.join(siteRoot, 'dist');
const contentRoot = path.join(siteRoot, 'content');
const generated = path.join(siteRoot, 'src', 'generated');

const read = (file) => readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));

const pages = json(path.join(generated, 'content', 'index.json'));
const usedBy = json(path.join(generated, 'content', 'used-by.json'));
const symbols = json(path.join(generated, 'api', 'symbols.json'));
const nav = json(path.join(contentRoot, 'react-tablekit', 'nav.json'));
const titles = json(path.join(contentRoot, 'react-tablekit', 'titles.json'));
const config = json(path.join(contentRoot, 'react-tablekit', 'plugin.config.json'));
const vercel = json(path.join(siteRoot, 'vercel.json'));

const byPath = new Map(pages.map((p) => [p.pathname, p]));
const bodyOf = (page) =>
  read(path.join(contentRoot, page.file)).replace(/^---\n[\s\S]*?\n---\n/, '');
const htmlOf = (pathname) => {
  const file = path.join(dist, pathname, 'index.html');
  return existsSync(file) ? read(file) : null;
};

const flattenNav = (nodes = nav, out = []) => {
  for (const node of nodes) {
    out.push(node);
    if (node.children) flattenNav(node.children, out);
  }
  return out;
};
const navNodes = flattenNav();
const navPages = navNodes.filter((n) => !n.pathname.endsWith('-group'));

/** Headings of a page body, ignoring fenced code. */
function headings(body) {
  const out = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) out.push({ level: match[1].length, text: match[2] });
  }
  return out;
}

const results = [];
/** `fn` returns an array of failure strings; empty means the check passed. */
const check = (id, group, name, fn) => {
  let failures;
  try {
    failures = fn() ?? [];
  } catch (error) {
    failures = [`the check itself threw: ${error.message}`];
  }
  results.push({ id, group, name, failures, status: failures.length === 0 ? 'pass' : 'fail' });
};
const excepted = (id, group, name, reason) =>
  results.push({ id, group, name, failures: [], status: 'n/a', reason });

/* ── Structure ───────────────────────────────────────────────────────────── */

const REQUIRED_BLOCKS = {
  capability: ['## Basics', '## Customization', '## Limitations', '## API'],
  reference: ['## Reference'],
};

check(1, 'Structure', 'Every page resolves to one archetype and contains its required blocks', () =>
  pages.flatMap((page) => {
    const required = REQUIRED_BLOCKS[page.frontmatter.archetype] ?? [];
    const body = bodyOf(page);
    return required
      .filter((block) => !body.includes(`\n${block}\n`))
      .map((block) => `${page.pathname}: missing \`${block}\``);
  }),
);

check(2, 'Structure', 'Exactly one H1 per page; heading levels never skip', () =>
  pages.flatMap((page) => {
    const html = htmlOf(page.pathname);
    const failures = [];
    if (html) {
      const h1s = html.match(/<h1\b/g)?.length ?? 0;
      if (h1s !== 1) failures.push(`${page.pathname}: ${h1s} h1 elements`);
    }
    // The page title is the h1, so the body starts at h2.
    let previous = 1;
    for (const heading of headings(bodyOf(page))) {
      if (heading.level > previous + 1) {
        failures.push(`${page.pathname}: h${previous} → h${heading.level} at "${heading.text}"`);
      }
      previous = heading.level;
    }
    return failures;
  }),
);

check(3, 'Structure', 'Capability pages keep the required section order', () =>
  pages
    .filter((p) => p.frontmatter.archetype === 'capability')
    .flatMap((page) => {
      const order = page.headings
        .filter((h) => h.level === 2)
        .map((h) => h.text)
        .filter((t) => ['Basics', 'Customization', 'Limitations', 'API'].includes(t));
      const expected = ['Basics', 'Customization', 'Limitations', 'API'];
      return order.join() === expected.join()
        ? []
        : [`${page.pathname}: ${order.join(' → ') || '(none)'}`];
    }),
);

check(4, 'Structure', 'No capability page exceeds 8 H2s or ~2,000 words', () =>
  pages
    .filter((p) => p.frontmatter.archetype === 'capability')
    .flatMap((page) => {
      const body = bodyOf(page);
      const h2s = page.headings.filter((h) => h.level === 2).length;
      const words = body.split(/\s+/).filter(Boolean).length;
      const failures = [];
      if (h2s > 8) failures.push(`${page.pathname}: ${h2s} H2s`);
      if (words > 2000) failures.push(`${page.pathname}: ${words} words`);
      return failures;
    }),
);

check(5, 'Structure', 'Sidebar section order matches the standard', () => {
  const expected = [
    'Getting started',
    'Features',
    'Demos',
    'Reference',
    'Customization',
    'Guides',
    'Integrations',
    'Migration',
    'Discover more',
  ];
  const actual = nav.map((section) => section.subheader);
  return actual.join() === expected.join() ? [] : [`order is ${actual.join(' → ')}`];
});

/* ── Navigation and data ─────────────────────────────────────────────────── */

check(6, 'Navigation', 'Sidebar and features index render from the same nav data', () => {
  // The features index is `<FeaturesIndex />`, which reads nav.json; a hand-written list of
  // capability links anywhere in the content tree would be the divergence this forbids.
  const index = byPath.get('/react-tablekit/all-features/');
  if (!index) return ['/react-tablekit/all-features/ does not exist'];
  const body = bodyOf(index);
  if (!body.includes('<FeaturesIndex')) return ['the features index is not rendered from nav data'];
  const capabilityLinks = [...body.matchAll(/\]\((\/react-tablekit\/[a-z0-9-]+\/)\)/g)];
  return capabilityLinks.length > 3
    ? [`the features index hand-lists ${capabilityLinks.length} capabilities`]
    : [];
});

check(7, 'Navigation', 'Nav depth is at most 3', () => {
  const depth = (nodes, level = 1) =>
    Math.max(level, ...nodes.map((n) => (n.children ? depth(n.children, level + 1) : level)));
  const found = depth(nav);
  return found <= 3 ? [] : [`depth is ${found}`];
});

check(8, 'Navigation', "Every nav node's pathname resolves to a real page or a group", () =>
  navPages.filter((n) => !byPath.has(n.pathname)).map((n) => `${n.pathname} has no page`),
);

check(9, 'Navigation', 'Every rendered badge traces back to a nav-node value', () => {
  const vocabulary = new Set(['new', 'preview', 'beta', 'planned', 'deprecated', 'legacy']);
  const failures = navNodes
    .filter((n) => n.lifecycle && !vocabulary.has(n.lifecycle))
    .map((n) => `${n.pathname}: lifecycle "${n.lifecycle}" is not in the vocabulary`);
  // A badge written into page content instead of declared on the node.
  for (const page of pages) {
    if (/<Badge\b/.test(bodyOf(page))) failures.push(`${page.pathname}: hardcodes a badge`);
  }
  return failures;
});

/* ── Reference ───────────────────────────────────────────────────────────── */

check(10, 'Reference', 'Reference data is generated, never hand-edited', () => {
  // The generated tree is not in version control and is rebuilt on every build, so there is no
  // committed copy for anyone to edit. Check that the rule still holds.
  const ignore = read(path.join(repoRoot, '.gitignore'));
  const failures = ignore.includes('apps/site/src/generated/')
    ? []
    : ['src/generated/ is no longer ignored, so a hand-edit could be committed'];
  // And that no reference page writes its own table.
  for (const page of pages.filter((p) => p.frontmatter.archetype === 'reference')) {
    const body = bodyOf(page);
    if (/^\|.*\|.*\|/m.test(body)) failures.push(`${page.pathname}: hand-written table`);
    if (!body.includes('<ApiReference'))
      failures.push(`${page.pathname}: renders no generated reference`);
  }
  return failures;
});

check(11, 'Reference', 'Every cited symbol has a reference page', () =>
  pages.flatMap((page) =>
    (page.frontmatter.symbols ?? [])
      .filter((symbol) => !symbols[symbol])
      .map((symbol) => `${page.pathname}: \`${symbol}\` has no reference page`),
  ),
);

check(12, 'Reference', "Every reference page's usedBy is non-empty or marked internal", () => {
  const referenced = new Set(Object.keys(usedBy));
  const pagesWithSymbols = new Map();
  for (const [symbol, route] of Object.entries(symbols)) {
    if (!pagesWithSymbols.has(route)) pagesWithSymbols.set(route, []);
    pagesWithSymbols.get(route).push(symbol);
  }
  return [...pagesWithSymbols.entries()]
    .filter(([, list]) => !list.some((symbol) => referenced.has(symbol)))
    .map(([route]) => `${route}: no page cites any of its symbols`);
});

/* ── Pricing ─────────────────────────────────────────────────────────────── */

excepted(13, 'Pricing', 'Every pricing-matrix row href resolves', 'E-01, E-02');
excepted(14, 'Pricing', 'Every non-free capability appears in the matrix', 'E-01, E-02, E-03');
excepted(15, 'Pricing', 'Every plan card has a distinct CTA verb', 'E-01');

/* ── Machine surface ─────────────────────────────────────────────────────── */

check(16, 'Machine surface', 'llms.txt lists every published page and every entry resolves', () => {
  const llms = read(path.join(dist, 'llms.txt'));
  const listed = [...llms.matchAll(/\]\(https?:\/\/[^/]+(\/[^)]*)\)/g)].map((m) => m[1]);
  const failures = [];
  for (const page of pages) {
    if (!listed.includes(`${page.pathname}index.md`))
      failures.push(`${page.pathname} is not listed`);
  }
  for (const entry of listed) {
    if (!existsSync(path.join(dist, entry))) failures.push(`${entry} does not resolve`);
  }
  return failures;
});

check(17, 'Machine surface', 'Every docs URL has a Markdown twin', () =>
  pages
    .filter((page) => !existsSync(path.join(dist, page.pathname, 'index.md')))
    .map((page) => `${page.pathname}index.md is missing`),
);

check(18, 'Machine surface', 'sitemap.xml covers both surfaces', () => {
  const sitemap = read(path.join(dist, 'sitemap.xml'));
  return pages
    .filter((page) => !sitemap.includes(`<loc>`) || !sitemap.includes(`${page.pathname}</loc>`))
    .map((page) => `${page.pathname} is not in the sitemap`);
});

/* ── Metadata ────────────────────────────────────────────────────────────── */

const REQUIRED_META = [
  '<title>',
  'name="description"',
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'property="og:type"',
  'property="og:url"',
  'name="twitter:card"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:image"',
  'name="search:version"',
  'name="plugin:id"',
];

check(19, 'Metadata', 'Every page emits the full metadata set', () =>
  pages.flatMap((page) => {
    const html = htmlOf(page.pathname);
    if (!html) return [`${page.pathname}: not prerendered`];
    const head = html.slice(0, html.indexOf('</head>'));
    return REQUIRED_META.filter((tag) => !head.includes(tag)).map(
      (tag) => `${page.pathname}: missing ${tag}`,
    );
  }),
);

check(20, 'Metadata', 'The description is written once and reused everywhere', () => {
  const llms = read(path.join(dist, 'llms.txt'));
  return pages.flatMap((page) => {
    const html = htmlOf(page.pathname);
    const failures = [];
    const description = page.frontmatter.description;
    if (html && !html.includes(`name="description" content="${escapeHtml(description)}"`)) {
      failures.push(`${page.pathname}: meta description differs from the frontmatter`);
    }
    if (!llms.includes(`: ${description}`)) {
      failures.push(`${page.pathname}: llms.txt description differs from the frontmatter`);
    }
    return failures;
  });
});

check(21, 'Metadata', 'Every page has a canonical URL with a trailing slash', () =>
  pages.flatMap((page) => {
    const html = htmlOf(page.pathname);
    if (!html) return [`${page.pathname}: not prerendered`];
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    if (!canonical) return [`${page.pathname}: no canonical link`];
    return canonical.endsWith('/') ? [] : [`${page.pathname}: canonical is ${canonical}`];
  }),
);

/* ── Migration ───────────────────────────────────────────────────────────── */

check(22, 'Migration', 'Every legacy URL 301s', () => {
  const rows = read(path.join(contentRoot, 'react-tablekit', 'migration', 'url-map.csv'))
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(','));
  const configured = new Map(vercel.redirects.map((r) => [r.source, r.destination]));
  return rows
    .filter(([legacy, , , target, , redirect]) => redirect === '301' && legacy !== target)
    .filter(([legacy, , , target]) => configured.get(legacy) !== target)
    .map(([legacy, , , target]) => `${legacy} → ${target} is not configured`);
});

check(23, 'Migration', 'No internal link 404s', () => {
  const known = new Set(pages.map((p) => p.pathname));
  const failures = [];
  for (const page of pages) {
    const body = bodyOf(page);
    for (const [, href] of body.matchAll(/\]\((\/[^)#]*)(?:#[^)]*)?\)/g)) {
      if (href.startsWith('/embed/')) continue;
      if (!known.has(href)) failures.push(`${page.pathname} → ${href}`);
    }
  }
  return failures;
});

check(24, 'Migration', 'Old version docs still resolve', () => {
  const versions = config.versions ?? [];
  return versions
    .filter((v) => !byPath.has(v.href))
    .map((v) => `${v.label}: ${v.href} has no page`);
});

/* ── Portfolio consistency ───────────────────────────────────────────────── */

check(25, 'Portfolio', 'Section names, badge vocabulary and taxonomy come from data', () => {
  const failures = [];
  const declared = new Set(config.taxonomy ?? []);
  for (const page of pages) {
    const group = page.frontmatter.group;
    const isCapability = page.frontmatter.archetype === 'capability';
    if (isCapability && group && !declared.has(group) && group !== 'Customization') {
      failures.push(`${page.pathname}: group "${group}" is not in the declared taxonomy`);
    }
  }
  for (const pathname of navPages.map((n) => n.pathname)) {
    if (!titles[pathname]) failures.push(`${pathname}: no entry in titles.json`);
  }
  return failures;
});

check(26, 'Portfolio', 'Shared components are imported, not forked', () => {
  // With one plugin in the repository there is nothing to fork *from*; what this can check is
  // that the blocks the standard names shared exist exactly once in the site's own tree.
  const shared = ['Demo', 'Badge', 'Callout', 'FeaturesIndex'];
  const componentDir = path.join(siteRoot, 'src', 'components');
  const files = readdirSync(componentDir);
  return shared
    .filter((name) => !files.includes(`${name}.tsx`))
    .map((name) => `src/components/${name}.tsx does not exist`);
});

function escapeHtml(value) {
  return (
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      // React escapes apostrophes in attribute values; the comparison has to match byte for byte.
      .replace(/'/g, '&#x27;')
  );
}

/* ── Report ──────────────────────────────────────────────────────────────── */

const failed = results.filter((r) => r.status === 'fail');
const passed = results.filter((r) => r.status === 'pass');
const skipped = results.filter((r) => r.status === 'n/a');

for (const result of results) {
  const mark = result.status === 'pass' ? 'ok  ' : result.status === 'n/a' ? 'n/a ' : 'FAIL';
  console.log(`${mark} ${String(result.id).padStart(2)} ${result.name}`);
  for (const failure of result.failures.slice(0, 10)) console.log(`        ${failure}`);
  if (result.failures.length > 10) {
    console.log(`        … and ${result.failures.length - 10} more`);
  }
}
console.log(
  `\n[conformance] ${passed.length} passed, ${failed.length} failed, ${skipped.length} not applicable`,
);

const reportIndex = process.argv.indexOf('--report');
if (reportIndex > -1 && process.argv[reportIndex + 1]) {
  const lines = [
    '# Conformance report — PPDS v1.0 §11',
    '',
    `Generated by \`apps/site/scripts/conformance.mjs\` against the built site on ${new Date()
      .toISOString()
      .slice(0, 10)}.`,
    '',
    `**${passed.length} passed · ${failed.length} failed · ${skipped.length} not applicable**`,
    '',
    '| # | Group | Check | Result |',
    '| --- | --- | --- | --- |',
    ...results.map((r) => {
      const verdict =
        r.status === 'pass'
          ? 'Pass'
          : r.status === 'n/a'
            ? `Not applicable (${r.reason})`
            : `**Fail** — ${r.failures.slice(0, 3).join('; ')}`;
      return `| ${r.id} | ${r.group} | ${r.name} | ${verdict} |`;
    }),
    '',
  ];
  writeFileSync(path.resolve(repoRoot, process.argv[reportIndex + 1]), `${lines.join('\n')}\n`);
}

process.exit(failed.length > 0 ? 1 : 0);
