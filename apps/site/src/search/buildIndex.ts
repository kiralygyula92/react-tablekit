import { isValidElement, type ReactNode } from 'react';
import { handlerMeta, iconNames, localeMeta, slotMeta, tokenMeta } from 'react-tablekit/meta';
import columnDef from '../generated/api/column-def.json';
import dataTable from '../generated/api/data-table.json';
import hooks from '../generated/api/hooks.json';
import instance from '../generated/api/instance.json';
import state from '../generated/api/state.json';
import utilities from '../generated/api/utilities.json';
import { examples } from '../examples/registry';
import { GUIDES } from '../pages/guides/registry';
import type { ApiSymbol } from '../pages/api/PropsPage';

/** Where a result came from; also the group heading in the palette. */
export type SearchSection = 'Pages' | 'Guides' | 'Examples' | 'API' | 'Tokens' | 'Icons';

/** One entry in the in-memory index (08 §1: no external service). */
export interface SearchEntry {
  id: string;
  title: string;
  /** The line under the title: a description, a type, or the parent symbol. */
  detail: string;
  section: SearchSection;
  to: string;
  /** Lower-cased text the query is matched against. */
  haystack: string;
}

/* ── guide headings ───────────────────────────────────────────────────────
   A guide body is JSX rather than markdown, so the headings are read back out
   of the element tree. That keeps the index honest: a heading exists in the
   search results only because it exists on the page. */

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  // `Array.isArray` widens a ReactNode to `any[]`, so the element type is restated.
  if (Array.isArray(node)) return (node as ReactNode[]).map(textOf).join('');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return textOf(props.children);
  }
  return '';
}

/** Collects the `<h2>` headings of a guide body, in document order. */
function headingsOf(node: ReactNode, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const child of node as ReactNode[]) headingsOf(child, found);
    return found;
  }
  if (!isValidElement(node)) return found;
  const props = node.props as { children?: ReactNode };
  if (node.type === 'h2') {
    const text = textOf(props.children).trim();
    if (text) found.push(text);
    return found;
  }
  headingsOf(props.children, found);
  return found;
}

/* ── API pages ────────────────────────────────────────────────────────────── */

const API_PAGES: { route: string; label: string; symbols: ApiSymbol[] }[] = [
  { route: '/api/data-table', label: '<DataTable>', symbols: dataTable as ApiSymbol[] },
  { route: '/api/column-def', label: 'ColumnDef', symbols: columnDef as ApiSymbol[] },
  { route: '/api/instance', label: 'TableInstance', symbols: instance as ApiSymbol[] },
  { route: '/api/state', label: 'State and query', symbols: state as ApiSymbol[] },
  { route: '/api/hooks', label: 'Hooks', symbols: hooks as ApiSymbol[] },
  { route: '/api/utilities', label: 'Utilities', symbols: utilities as ApiSymbol[] },
];

/** The pages that are not generated from a list. */
const STATIC_PAGES: { title: string; detail: string; to: string }[] = [
  {
    title: 'Getting started',
    detail: 'Install, import the CSS, render your first table',
    to: '/docs/getting-started',
  },
  { title: 'Examples', detail: 'The gallery, filterable by tag', to: '/examples' },
  {
    title: 'Playground',
    detail: 'Every option as a control, with the code it produces',
    to: '/playground',
  },
  {
    title: 'Theme editor',
    detail: 'Edit the tokens live and export the result',
    to: '/theme-editor',
  },
  { title: 'API reference', detail: 'The index of every documented symbol', to: '/api' },
];

/**
 * Builds the whole index once, at module scope. It is a few hundred small objects — far cheaper
 * than a network round trip, and it cannot go stale, because every entry is derived from the
 * same source the pages render from.
 */
function build(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const push = (entry: Omit<SearchEntry, 'haystack'>) => {
    entries.push({ ...entry, haystack: `${entry.title} ${entry.detail}`.toLowerCase() });
  };

  for (const page of STATIC_PAGES) {
    push({
      id: `page:${page.to}`,
      title: page.title,
      detail: page.detail,
      section: 'Pages',
      to: page.to,
    });
  }

  for (const guide of GUIDES) {
    const to = `/docs/guides/${guide.slug}`;
    push({
      id: `guide:${guide.slug}`,
      title: guide.title,
      detail: guide.lead,
      section: 'Guides',
      to,
    });
    for (const heading of headingsOf(guide.body)) {
      push({
        id: `guide:${guide.slug}#${heading}`,
        title: heading,
        detail: guide.title,
        section: 'Guides',
        to,
      });
    }
  }

  for (const example of examples) {
    push({
      id: `example:${example.slug}`,
      title: example.title,
      detail: `${example.description} ${example.tags.join(' ')}`,
      section: 'Examples',
      to: `/examples/${example.slug}`,
    });
  }

  for (const page of API_PAGES) {
    for (const symbol of page.symbols) {
      push({
        id: `api:${symbol.name}`,
        title: symbol.name,
        detail: symbol.description || page.label,
        section: 'API',
        to: page.route,
      });
      // Members are anchored, so searching for a prop lands on that prop.
      for (const member of symbol.members) {
        push({
          id: `api:${symbol.name}.${member.name}`,
          title: member.name,
          detail: `${symbol.name} · ${member.type}`,
          section: 'API',
          to: `${page.route}#${member.name}`,
        });
      }
    }
  }

  for (const slot of slotMeta) {
    push({
      id: `slot:${slot.name}`,
      title: slot.name,
      detail: `Slot · renders <${slot.element}>`,
      section: 'API',
      to: '/api/slots',
    });
  }
  for (const handler of handlerMeta) {
    push({
      id: `handler:${handler.name}`,
      title: handler.name,
      detail: 'Handler',
      section: 'API',
      to: '/api/handlers',
    });
  }
  for (const entry of localeMeta) {
    push({
      id: `locale:${entry.key}`,
      title: entry.key,
      detail: `Localization · ${entry.english}`,
      section: 'API',
      to: '/api/localization',
    });
  }
  for (const token of tokenMeta) {
    push({
      id: `token:${token.path}`,
      title: token.path,
      detail: token.cssVar,
      section: 'Tokens',
      to: '/api/theme-tokens',
    });
  }
  for (const name of iconNames) {
    push({ id: `icon:${name}`, title: name, detail: 'Icon', section: 'Icons', to: '/api/icons' });
  }

  return entries;
}

export const SEARCH_INDEX: SearchEntry[] = build();

const SECTION_ORDER: SearchSection[] = ['Pages', 'Guides', 'Examples', 'API', 'Tokens', 'Icons'];

/**
 * Ranks entries against a query. A title match always beats a body match, and a prefix beats a
 * match in the middle, so typing `enableRow` puts `enableRowSelection` first rather than some
 * paragraph that happens to mention it.
 */
export function searchEntries(query: string, limit = 30): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of SEARCH_INDEX) {
    const title = entry.title.toLowerCase();
    let score = -1;
    if (title === q) score = 0;
    else if (title.startsWith(q)) score = 1;
    else if (title.includes(q)) score = 2;
    else if (entry.haystack.includes(q)) score = 3;
    if (score >= 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const section = SECTION_ORDER.indexOf(a.entry.section) - SECTION_ORDER.indexOf(b.entry.section);
    if (section !== 0) return section;
    return a.entry.title.localeCompare(b.entry.title);
  });

  return scored.slice(0, limit).map((hit) => hit.entry);
}

/** Groups ranked results under their section, preserving rank within each group. */
export function groupEntries(entries: SearchEntry[]): [SearchSection, SearchEntry[]][] {
  const groups = new Map<SearchSection, SearchEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.section);
    if (list) list.push(entry);
    else groups.set(entry.section, [entry]);
  }
  return [...groups.entries()].sort(
    (a, b) => SECTION_ORDER.indexOf(a[0]) - SECTION_ORDER.indexOf(b[0]),
  );
}
