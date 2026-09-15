import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** Metadata for one example page (docs/08 §2). */
export interface ExampleMeta {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  features?: string[];
  related?: string[];
  /** Showcase examples render with the dense `classic` preset rather than the defaults. */
  usesClassicTheme?: boolean;
}

export interface ExampleEntry extends ExampleMeta {
  /** The demo, code-split and created once at module scope (never during render). */
  Component: LazyExoticComponent<ComponentType>;
  /** Loads the example's source for the Code tab. */
  loadSource: () => Promise<string>;
}

const demos = import.meta.glob<{ default: ComponentType }>('./*/index.tsx');
const sources = import.meta.glob<string>('./*/index.tsx', { query: '?raw', import: 'default' });

/** Registers an example; its demo lives in `src/examples/<slug>/index.tsx`. */
export function defineExample(meta: ExampleMeta): ExampleEntry {
  const key = `./${meta.slug}/index.tsx`;
  const load = demos[key];
  const source = sources[key];
  if (!load || !source) throw new Error(`Example "${meta.slug}" has no ${key}`);
  return { ...meta, Component: lazy(load), loadSource: source };
}

/** All examples, in gallery order. */
export const examples: ExampleEntry[] = [
  defineExample({
    slug: 'showcase-account-list',
    title: 'Showcase: account list',
    description:
      'A full application screen with the dense classic preset: server pagination against the mock API, search in the page header (Ctrl+K, 300ms debounce, min 3 chars), two-line addresses and a pinned edit action.',
    tags: ['showcase', 'server', 'search', 'pagination', 'pinning'],
    related: ['client-vs-server', 'pagination-variants'],
    usesClassicTheme: true,
  }),
  defineExample({
    slug: 'showcase-asset-list',
    title: 'Showcase: asset list',
    description:
      'The same screen with a chip list in its widest column: at most three chips plus a +N overflow, each one a button, and a row action that opens a dialog.',
    tags: ['showcase', 'server', 'chips', 'pinning'],
    related: ['showcase-account-list', 'client-vs-server'],
    usesClassicTheme: true,
  }),
  defineExample({
    slug: 'showcase-readings',
    title: 'Showcase: reading history',
    description:
      'A deliberately wide table: 18 columns in a horizontal scroll, sorted on the server, with pinned right actions whose disabled states follow the row.',
    tags: ['showcase', 'server', 'pinning', 'wide'],
    related: ['showcase-asset-list', 'showcase-asset-picker'],
    usesClassicTheme: true,
  }),
  defineExample({
    slug: 'showcase-asset-picker',
    title: 'Showcase: asset picker',
    description:
      'A picker as it would appear in a dialog: client mode throughout, single selection by row click or radio, and a sticky header inside a 400px scroll area.',
    tags: ['showcase', 'client', 'selection', 'sticky'],
    related: ['row-selection', 'showcase-asset-list'],
    usesClassicTheme: true,
  }),
  defineExample({
    slug: 'row-selection',
    title: 'Row selection',
    description:
      'Multi and single selection, range selection with Shift+click, row-click selection, disabled rows, and a selection bar with bulk actions.',
    tags: ['selection', 'client'],
    related: ['showcase-asset-picker', 'row-overrides'],
  }),
  defineExample({
    slug: 'detail-panels',
    title: 'Detail panels',
    description:
      'Collapsible row content with renderDetailPanel: a full-width panel under the expanded row that stays put while a wide table scrolls sideways.',
    tags: ['expansion', 'client'],
    related: ['tree-data', 'row-overrides'],
  }),
  defineExample({
    slug: 'tree-data',
    title: 'Tree data',
    description:
      'Nested rows through getSubRows: indentation, per-row toggles, expand all, and filtering that keeps parents of matching descendants.',
    tags: ['expansion', 'tree', 'client'],
    related: ['tree-lazy-server', 'detail-panels'],
  }),
  defineExample({
    slug: 'tree-lazy-server',
    title: 'Tree: lazy server children',
    description:
      'Only the roots are fetched up front; expanding a row loads that node’s children through dataSource.fetchChildren, with a per-row loading state.',
    tags: ['expansion', 'tree', 'server'],
    related: ['tree-data', 'filters-server'],
  }),
  defineExample({
    slug: 'row-overrides',
    title: 'Row overrides',
    description:
      'renderRow with defaultRender, getRowProps, getRowClassName, disabled rows and row click events.',
    tags: ['customization', 'client'],
    related: ['handlers-middleware', 'row-selection'],
  }),
  defineExample({
    slug: 'handlers-middleware',
    title: 'Handler middleware',
    description:
      'Every interaction runs through an overridable handler: observe it, rewrite the intent, or cancel it by not calling next.',
    tags: ['customization', 'handlers'],
    related: ['row-overrides', 'global-search'],
  }),
  defineExample({
    slug: 'column-features',
    title: 'Column features',
    description:
      'Resize by drag or keyboard, reorder by dragging a header, and the per-column “⋮” menu for sorting, filtering, pinning, hiding and autosizing.',
    tags: ['columns', 'client', 'keyboard'],
    related: ['sticky-header-footer', 'filters-popover-and-column-menu'],
  }),
  defineExample({
    slug: 'sticky-header-footer',
    title: 'Sticky header and footer',
    description:
      'A bounded scroll area where the header, the aggregate footer and a pinned column all stay visible, with pagination outside the scroll.',
    tags: ['columns', 'sticky', 'client'],
    related: ['column-features', 'virtualization-100k'],
  }),
  defineExample({
    slug: 'virtualization-100k',
    title: 'Virtualization: 100k rows',
    description:
      'One hundred thousand rows in a single scroll container, with only the visible window in the DOM and full sorting, search and filtering.',
    tags: ['performance', 'virtualization', 'client'],
    related: ['infinite-scroll', 'sticky-header-footer'],
  }),
  defineExample({
    slug: 'infinite-scroll',
    title: 'Infinite scroll',
    description:
      'Infinite pagination against a simulated server: reaching the end appends the next page, with virtualization keeping the DOM small.',
    tags: ['pagination', 'server', 'virtualization'],
    related: ['cursor-pagination', 'virtualization-100k'],
  }),
  defineExample({
    slug: 'cursor-pagination',
    title: 'Cursor pagination',
    description:
      'Opaque next/previous cursors instead of a page count: the numbered variant is unavailable and the total shows as “many”.',
    tags: ['pagination', 'server'],
    related: ['infinite-scroll', 'client-vs-server'],
  }),
  defineExample({
    slug: 'grouping-aggregation',
    title: 'Grouping and aggregation',
    description:
      'Group by one or more columns with counts and aggregates on the group rows, plus a footer that aggregates the whole filtered set.',
    tags: ['grouping', 'client'],
    related: ['export', 'column-features'],
  }),
  defineExample({
    slug: 'export',
    title: 'Export',
    description:
      'CSV export of the page, all matching rows or the selection, plus clipboard copy — including a chunked server export with progress.',
    tags: ['export', 'client', 'server'],
    related: ['grouping-aggregation', 'filters-server'],
  }),
  defineExample({
    slug: 'url-sync',
    title: 'URL and storage sync',
    description:
      'Page, sort, search and filters live in the URL in a compact format; column layout and density persist to localStorage.',
    tags: ['persistence', 'client'],
    related: ['keyboard-navigation', 'basic'],
  }),
  defineExample({
    slug: 'keyboard-navigation',
    title: 'Keyboard navigation',
    description:
      'The WAI-ARIA data-grid pattern: one tab stop, arrow keys between cells, Enter to sort or step into a cell, Space to select.',
    tags: ['keyboard', 'a11y', 'client'],
    related: ['row-selection', 'column-features'],
  }),
  defineExample({
    slug: 'responsive-cards',
    title: 'Responsive cards',
    description:
      'Below the mobile breakpoint each row renders as a card of label/value pairs — a list of articles rather than a scrolling table.',
    tags: ['responsive', 'client'],
    related: ['states', 'basic'],
  }),
  defineExample({
    slug: 'states',
    title: 'Loading, empty and error states',
    description:
      'Every data state in one place: skeleton and text loading, the refetch overlay, both empty states and the error state with Retry.',
    tags: ['states', 'server'],
    related: ['responsive-cards', 'filters-server'],
  }),
  defineExample({
    slug: 'basic',
    title: 'Basic',
    description:
      'The minimal table: data and columns. Sorting, search, filters, column visibility and pagination come for free.',
    tags: ['client', 'getting-started'],
    related: ['pagination-variants'],
  }),
  defineExample({
    slug: 'pagination-variants',
    title: 'Pagination variants',
    description:
      'Numbered, compact, simple and load-more pagination side by side, with the page-size selector, row range and a visualizer comparing the classic and stable page-item algorithms.',
    tags: ['pagination', 'client'],
    related: ['basic', 'showcase-account-list'],
  }),
  defineExample({
    slug: 'global-search',
    title: 'Global search',
    description:
      'Client search with match highlighting, diacritic-insensitive matching, a minimum length and a debounce. Two tables share the Ctrl+K hotkey to show that it is scoped to one table.',
    tags: ['search', 'client', 'keyboard'],
    related: ['filters-panel', 'filters-server'],
  }),
  defineExample({
    slug: 'filters-panel',
    title: 'Filters: panel',
    description:
      'The default filter panel: one control per variant (text, select, multi-select, range, date range, boolean), active filter chips and facet counts.',
    tags: ['filters', 'client'],
    related: ['filters-row', 'filters-popover-and-column-menu', 'filters-server'],
  }),
  defineExample({
    slug: 'filters-row',
    title: 'Filters: row',
    description: 'The filter row mode: an inline control under each filterable column header.',
    tags: ['filters', 'client'],
    related: ['filters-panel', 'filters-popover-and-column-menu'],
  }),
  defineExample({
    slug: 'filters-popover-and-column-menu',
    title: 'Filters: popover and column menu',
    description:
      'Popover mode plus the column actions menu, whose "Filter…" entry opens a single column’s filter.',
    tags: ['filters', 'client', 'columns'],
    related: ['filters-panel', 'filters-row'],
  }),
  defineExample({
    slug: 'filters-server',
    title: 'Filters: server',
    description:
      'Server filtering and faceting: filters and search are serialized into the query, and option lists with counts are loaded lazily through fetchFacets. Includes a request log.',
    tags: ['filters', 'server', 'faceting'],
    related: ['filters-panel', 'server-sorting', 'hybrid-mode'],
  }),
  defineExample({
    slug: 'server-sorting',
    title: 'Server sorting',
    description:
      'Manual sorting with sortServerKey mapping column ids to server field names, multi-sort included, with the emitted query shown as a request log.',
    tags: ['sorting', 'server'],
    related: ['filters-server', 'hybrid-mode', 'client-vs-server'],
  }),
  defineExample({
    slug: 'hybrid-mode',
    title: 'Hybrid mode',
    description:
      'Server pagination with client-side sorting of the page you already have, and the acknowledgement flag that documents the trade-off.',
    tags: ['server', 'client', 'sorting'],
    related: ['server-sorting', 'client-vs-server'],
  }),
  defineExample({
    slug: 'localization',
    title: 'Localization',
    description:
      'An en / hu / de / es switcher: every string comes from a locale pack, and Intl formats numbers, dates and the row range for the selected locale.',
    tags: ['localization', 'client'],
    related: ['filters-panel', 'basic'],
  }),
  defineExample({
    slug: 'client-vs-server',
    title: 'Client vs. server',
    description:
      'The same dataset twice: computed in the browser on the left, served by a simulated server with latency on the right. Identical interactions produce identical rows.',
    tags: ['server', 'client', 'data-source'],
    related: ['showcase-account-list'],
  }),
  defineExample({
    slug: 'column-types',
    title: 'Column types',
    description:
      'text / number / date / boolean and display columns: the type picks the alignment, comparator and filter control, and format decides what is shown, searched and exported.',
    tags: ['columns', 'client', 'getting-started'],
    related: ['cell-building-blocks', 'client-sorting'],
  }),
  defineExample({
    slug: 'client-sorting',
    title: 'Client sorting',
    description:
      'Single and multi-sort, the natural and locale-aware comparators, a custom sortingFn for a domain order, sortUndefined and descending-first columns.',
    tags: ['sorting', 'client'],
    related: ['server-sorting', 'column-types'],
  }),
  defineExample({
    slug: 'column-pinning',
    title: 'Column pinning',
    description:
      'Left and right pins that survive horizontal scrolling, a locked pin, a responsive pin that releases on small screens, scroll shadows and an RTL toggle.',
    tags: ['columns', 'pinning', 'client', 'responsive'],
    related: ['sticky-header-footer', 'column-sizing'],
  }),
  defineExample({
    slug: 'column-sizing',
    title: 'Column sizing',
    description:
      'Percentage widths next to pixel sizes, min/max bounds, an unresizable column, keyboard resizing, autosize, and onChange vs onEnd resize modes.',
    tags: ['columns', 'client', 'keyboard'],
    related: ['column-ordering-visibility', 'column-pinning'],
  }),
  defineExample({
    slug: 'column-ordering-visibility',
    title: 'Column ordering and visibility',
    description:
      'Drag headers to reorder, hide columns from the Columns menu, lock a column first and unhideable, and persist the arrangement to localStorage.',
    tags: ['columns', 'client', 'persistence'],
    related: ['column-sizing', 'url-sync'],
  }),
  defineExample({
    slug: 'cell-building-blocks',
    title: 'Cell building blocks',
    description:
      'The shipped cell primitives: TwoLineText, MultiLineList, ChipList with +N overflow, TruncatedText with a tooltip, ActionButton and RowActionsMenu.',
    tags: ['customization', 'cells', 'client'],
    related: ['row-overrides', 'slots-custom-components'],
  }),
  defineExample({
    slug: 'slots-custom-components',
    title: 'Slots: custom components',
    description:
      'Four replaced slots — the search box, the header cells, the empty state and the pagination bar — each receiving the state it needs as plain props.',
    tags: ['customization', 'slots'],
    related: ['slots-design-system', 'cell-building-blocks'],
  }),
  defineExample({
    slug: 'slots-design-system',
    title: 'Slots: design system',
    description:
      'Re-skinning without replacing anything: unstyled drops the visual layer, and classNames puts your own class on every part, including per-row functions.',
    tags: ['customization', 'slots', 'theming'],
    related: ['slots-custom-components', 'theming-custom'],
  }),
  defineExample({
    slug: 'theming-presets',
    title: 'Theming: presets',
    description:
      'The five built-in presets with a colour-scheme switch, including auto, which follows the operating system.',
    tags: ['theming', 'client'],
    related: ['theming-custom', 'density'],
  }),
  defineExample({
    slug: 'theming-custom',
    title: 'Theming: custom',
    description:
      'The same table styled three ways: a createTheme brand theme, raw CSS-variable overrides, and unstyled for a utility framework.',
    tags: ['theming', 'client'],
    related: ['theming-presets', 'slots-design-system'],
  }),
  defineExample({
    slug: 'density',
    title: 'Density',
    description:
      'The density toggle cycling compact, standard and comfortable — row height and padding change, the layout does not.',
    tags: ['theming', 'client'],
    related: ['theming-presets', 'basic'],
  }),
  defineExample({
    slug: 'composable-layout',
    title: 'Composable layout',
    description:
      'The table taken apart with useDataTable and DataTable.Root: search moved into the page header and pagination placed above the table.',
    tags: ['customization', 'composition'],
    related: ['headless', 'slots-custom-components'],
  }),
  defineExample({
    slug: 'headless',
    title: 'Headless',
    description:
      'No table markup at all: useDataTable drives searching, selection and pagination while the rows render as a grid of cards.',
    tags: ['customization', 'composition', 'headless'],
    related: ['composable-layout', 'responsive-cards'],
  }),
  defineExample({
    slug: 'react-query-recipe',
    title: 'React Query recipe',
    description:
      'A dataSource that hands the query to React Query: the cache is owned by the query client, while the table keeps debouncing, aborting and race handling.',
    tags: ['server', 'data-source', 'recipe'],
    related: ['client-vs-server', 'filters-server'],
  }),
];

export function findExample(slug: string | undefined): ExampleEntry | undefined {
  return examples.find((e) => e.slug === slug);
}

export function allTags(entries: readonly ExampleMeta[] = examples): string[] {
  return [...new Set(entries.flatMap((e) => e.tags))].sort();
}
