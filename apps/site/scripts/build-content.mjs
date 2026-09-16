/**
 * Builds the content index the site routes, navigates and searches from.
 *
 * Pages are MDX files under `content/`; the file path is the URL (PPDS P2). Reading every page's
 * frontmatter and headings at build time means the app can lazy-load the page bodies without
 * losing the metadata it needs up front — the router, the sidebar, the table of contents and the
 * search index all read this one JSON file.
 *
 * It is also the first conformance gate: a page with no title, a duplicate route or a `<Demo>`
 * that points at nothing fails the build rather than shipping broken.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import GithubSlugger from 'github-slugger';
import { parse as parseYaml } from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(here, '..');
const contentRoot = path.join(siteRoot, 'content');
const outDir = path.join(siteRoot, 'src', 'generated', 'content');

/** Every file under `content/` matching the extension, as a content-relative POSIX path. */
function walk(dir, ext, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (entry.name.endsWith(ext))
      out.push(path.relative(contentRoot, full).split(path.sep).join('/'));
  }
  return out;
}

/**
 * `react-tablekit/features/sorting/index.mdx` → `/react-tablekit/sorting/`.
 *
 * `features/` is a content-tree folder only: capability pages sit flat under the namespace so
 * their URLs stay short and stable (PPDS R1). The marketing tree is the site root.
 */
export function routeFor(file) {
  const rel = file.replace(/\/index\.mdx$/, '').replace(/\.mdx$/, '');
  if (rel === 'marketing') return '/';
  const flat = rel.replace(/^marketing\//, '').replace(/^([^/]+)\/features\//, '$1/');
  return `/${flat}/`.replace(/\/{2,}/g, '/');
}

/** `##`/`###` headings, slugged exactly as rehype-slug slugs the rendered ones. */
function headingsOf(body) {
  const slugger = new GithubSlugger();
  const headings = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const match = /^(##|###)\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[2].replace(/`/g, '').replace(/\[(.+?)\]\(.*?\)/g, '$1');
    headings.push({ id: slugger.slug(text), text, level: match[1].length });
  }
  return headings;
}

const errors = [];
const demoFiles = new Set(walk(contentRoot, '.tsx').map((f) => f.replace(/\.tsx$/, '')));
const pages = [];
const seenRoutes = new Map();

for (const file of walk(contentRoot, '.mdx').sort()) {
  const raw = readFileSync(path.join(contentRoot, file), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) {
    errors.push(`${file}: no frontmatter block`);
    continue;
  }
  let frontmatter;
  try {
    frontmatter = parseYaml(match[1]);
  } catch (error) {
    errors.push(`${file}: frontmatter is not valid YAML — ${error.message}`);
    continue;
  }

  const pathname = routeFor(file);
  const previous = seenRoutes.get(pathname);
  if (previous) errors.push(`${pathname}: written by both ${previous} and ${file}`);
  seenRoutes.set(pathname, file);

  for (const field of ['title', 'description', 'archetype']) {
    if (!frontmatter?.[field]) errors.push(`${file}: frontmatter is missing \`${field}\``);
  }
  if (frontmatter?.description && frontmatter.description.length > 200) {
    errors.push(`${file}: description is ${frontmatter.description.length} characters (max 200)`);
  }

  const body = raw.slice(match[0].length);
  const demos = [...body.matchAll(/<Demo\s+id="([^"]+)"/g)].map((m) => m[1]);
  for (const id of demos) {
    if (!demoFiles.has(id))
      errors.push(`${file}: <Demo id="${id}"> has no file at content/${id}.tsx`);
  }

  pages.push({ pathname, file, frontmatter, headings: headingsOf(body), demos });
}

if (errors.length > 0) {
  console.error(`[build-content] ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

pages.sort((a, b) => a.pathname.localeCompare(b.pathname));
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'index.json'), `${JSON.stringify(pages, null, 2)}\n`);
console.log(
  `[build-content] ${pages.length} pages, ${demoFiles.size} demos, ` +
    `${pages.reduce((n, p) => n + p.headings.length, 0)} headings`,
);
