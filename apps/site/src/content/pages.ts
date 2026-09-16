import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import index from '../generated/content/index.json';
import type { ContentPage } from './types';

interface MdxModule {
  default: ComponentType;
}

/**
 * Page metadata comes from the generated index (`scripts/build-content.mjs`) so the router, the
 * sidebar, the table of contents and the search index all know about every page without any page
 * body being in the initial bundle.
 */
export const pages = index as ContentPage[];
export const pageByPath = new Map(pages.map((page) => [page.pathname, page]));

// The bodies themselves are code-split: one chunk per page, fetched when it is first visited.
const loaders = import.meta.glob<MdxModule>('../../content/**/*.mdx');

const componentByPath = new Map<string, LazyExoticComponent<ComponentType>>(
  pages.flatMap((page) => {
    const load = loaders[`../../content/${page.file}`];
    return load ? [[page.pathname, lazy(load)] as const] : [];
  }),
);

/**
 * Bodies that have already been fetched, held as plain components rather than lazy ones.
 *
 * `React.lazy` always suspends the first time it renders, even for a module already in memory —
 * which would mean prerendering a "Loading…" instead of the prose, and throwing the prerendered
 * prose away again on hydration. Preloading into this map lets the first render be synchronous
 * on both sides; every later navigation goes back through the lazy component.
 */
const preloaded = new Map<string, ComponentType>();

/** The body of a page, or `undefined` if the index names a file that is gone. */
export const componentFor = (pathname: string): ComponentType | undefined =>
  preloaded.get(pathname) ?? componentByPath.get(pathname);

/** Fetches one page's chunk so that rendering it does not suspend. */
export async function preloadPage(pathname: string): Promise<void> {
  const page = pageByPath.get(pathname);
  const load = page && loaders[`../../content/${page.file}`];
  if (!load || preloaded.has(pathname)) return;
  preloaded.set(pathname, (await load()).default);
}
