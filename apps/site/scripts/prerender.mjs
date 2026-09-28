/**
 * Renders every route to a real HTML file after the client build.
 *
 * Without this the site is one empty shell served at every URL: the first paint is blank, and a
 * crawler that does not run JavaScript sees no title, no description and no content. With it,
 * every URL is a document — and the same JavaScript still hydrates it into the interactive site.
 *
 * Page bodies and demos are code-split, so what is captured here is the chrome, the heading, the
 * lead paragraph and the metadata. That is what first paint and search engines need; the rest
 * arrives when the page hydrates.
 *
 * Run with `node scripts/prerender.mjs` after `vite build`; `pnpm --filter site build` does both.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(siteRoot, 'dist');
const ssrDist = path.join(siteRoot, 'dist-ssr');
const indexFile = path.join(siteRoot, 'src', 'generated', 'content', 'index.json');

const pages = JSON.parse(readFileSync(indexFile, 'utf8'));
const template = readFileSync(path.join(dist, 'index.html'), 'utf8');

const { render } = await import(pathToFileURL(path.join(ssrDist, 'entry-server.js')).href);

/**
 * React hoists `<title>`, `<meta>` and `<link>` for the client, but in a string render they come
 * out wherever they were written. Moving them into `<head>` is what makes them visible to a
 * crawler that reads the document rather than running it.
 */
const HOISTED = /<(title|meta|link)\b[^>]*?(?:\/>|>(?:[\s\S]*?<\/\1>)?)/gi;

function splitHead(html) {
  const head = [];
  const body = html.replace(HOISTED, (tag) => {
    // Only the document-level tags are hoisted; anything inside an SVG stays where it is.
    if (/^<link\b/i.test(tag) && !/\brel=/i.test(tag)) return tag;
    head.push(tag);
    return '';
  });
  return { head: head.join('\n    '), body };
}

let written = 0;
for (const page of pages) {
  const html = await render(page.pathname);
  const { head, body } = splitHead(html);

  const document = template
    // The shell's own title and description are placeholders for exactly this substitution.
    .replace(/\n\s*<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace(/\n\s*<title>[\s\S]*?<\/title>/, '')
    .replace('</head>', `  ${head}\n  </head>`)
    // The route is stamped on the container so the browser can tell whether the HTML it was
    // served is this page's. A host that falls back to `index.html` for an unknown URL would
    // otherwise hand the home page's markup to a different route, and hydration would fail.
    .replace('<div id="root"></div>', `<div id="root" data-route="${page.pathname}">${body}</div>`);

  const dir = path.join(dist, page.pathname);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), document);
  written++;
}

// The page a host serves for a URL that matches nothing: the not-found page itself, rendered, so
// the first paint is the site with its title rather than an empty shell. It carries no
// `data-route`, so the browser renders it again at whatever URL was asked for, which is how the
// real address stays in the bar instead of the page pretending to be somewhere else.
const notFound = splitHead(await render('/404/'));
writeFileSync(
  path.join(dist, '404.html'),
  template
    .replace(/\n\s*<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace(/\n\s*<title>[\s\S]*?<\/title>/, '')
    .replace('</head>', `  ${notFound.head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${notFound.body}</div>`),
);

// The SSR bundle is a build artefact, not something to deploy.
rmSync(ssrDist, { recursive: true, force: true });

console.log(`[prerender] ${written} routes written as static HTML`);
