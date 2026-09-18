import { handlerMeta, iconNames, localeMeta, slotMeta, tokenMeta } from 'react-tablekit/meta';
import columnDef from '../../src/generated/api/column-def.json';
import dataTable from '../../src/generated/api/data-table.json';
import hooks from '../../src/generated/api/hooks.json';
import instance from '../../src/generated/api/instance.json';
import state from '../../src/generated/api/state.json';
import utilities from '../../src/generated/api/utilities.json';
import { pages } from '../content/pages';
import type { ApiSymbol } from '../interactive/api/PropsPage';
import { sectionFor } from '../nav/nav';

/** Where a result came from; also the group heading in the palette. */
export type SearchSection = 'Pages' | 'Headings' | 'API' | 'Tokens' | 'Icons';

/** One entry in the in-memory index: search with no external service. */
export interface SearchEntry {
  id: string;
  title: string;
  /** The line under the title: a description, a type, or the parent page. */
  detail: string;
  section: SearchSection;
  to: string;
  /** Lower-cased text the query is matched against. */
  haystack: string;
}

const API_PAGES: { route: string; label: string; symbols: ApiSymbol[] }[] = [
  {
    route: '/react-tablekit/api/data-table-props/',
    label: 'DataTableProps',
    symbols: dataTable as ApiSymbol[],
  },
  {
    route: '/react-tablekit/api/column-def/',
    label: 'ColumnDef',
    symbols: columnDef as ApiSymbol[],
  },
  {
    route: '/react-tablekit/api/table-instance/',
    label: 'TableInstance',
    symbols: instance as ApiSymbol[],
  },
  { route: '/react-tablekit/api/table-state/', label: 'TableState', symbols: state as ApiSymbol[] },
  { route: '/react-tablekit/api/hooks/', label: 'Hooks', symbols: hooks as ApiSymbol[] },
  {
    route: '/react-tablekit/api/utilities/',
    label: 'Utilities',
    symbols: utilities as ApiSymbol[],
  },
];

/**
 * The index is built once at module scope from the same content the pages render from, so it
 * cannot describe a page that does not exist.
 */
function build(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const push = (entry: Omit<SearchEntry, 'haystack'>) => {
    entries.push({ ...entry, haystack: `${entry.title} ${entry.detail}`.toLowerCase() });
  };

  for (const page of pages) {
    const section = sectionFor(page.pathname);
    push({
      id: `page:${page.pathname}`,
      title: page.frontmatter.title,
      detail: page.frontmatter.description,
      section: 'Pages',
      to: page.pathname,
    });
    for (const heading of page.headings) {
      push({
        id: `heading:${page.pathname}#${heading.id}`,
        title: heading.text,
        detail: `${page.frontmatter.title}${section?.subheader ? ` · ${section.subheader}` : ''}`,
        section: 'Headings',
        to: `${page.pathname}#${heading.id}`,
      });
    }
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
      to: '/react-tablekit/api/slots/',
    });
  }
  for (const handler of handlerMeta) {
    push({
      id: `handler:${handler.name}`,
      title: handler.name,
      detail: 'Handler',
      section: 'API',
      to: '/react-tablekit/api/handlers/',
    });
  }
  for (const entry of localeMeta) {
    push({
      id: `locale:${entry.key}`,
      title: entry.key,
      detail: `Localization · ${entry.english}`,
      section: 'API',
      to: '/react-tablekit/api/localization-keys/',
    });
  }
  for (const token of tokenMeta) {
    push({
      id: `token:${token.path}`,
      title: token.path,
      detail: token.cssVar,
      section: 'Tokens',
      to: '/react-tablekit/api/theme-tokens/',
    });
  }
  for (const name of iconNames) {
    push({
      id: `icon:${name}`,
      title: name,
      detail: 'Icon',
      section: 'Icons',
      to: '/react-tablekit/api/icons/',
    });
  }

  return entries;
}

export const SEARCH_INDEX: SearchEntry[] = build();

const SECTION_ORDER: SearchSection[] = ['Pages', 'Headings', 'API', 'Tokens', 'Icons'];

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
