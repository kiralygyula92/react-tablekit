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

/** The lazily-loaded body of a page, or `undefined` if the index names a file that is gone. */
export const componentFor = (pathname: string) => componentByPath.get(pathname);
