# react-tablekit

A headless-core React data table. Every data feature works in **client mode** (you pass `data`)
and in **server mode** (you pass a `dataSource`), every part is a replaceable slot, every
interaction goes through overridable handler middleware, and every visual value is a CSS variable.

Zero runtime dependencies.

```sh
pnpm add react-tablekit
```

## Quick start

```tsx
import 'react-tablekit/styles.css';
import { createColumnHelper, DataTable } from 'react-tablekit';

const col = createColumnHelper<Person>();

const columns = [
  col.accessor('email', { header: 'Email' }),
  col.accessor((p) => `${p.firstName} ${p.lastName}`, { id: 'name', header: 'Name' }),
  col.accessor('salary', {
    header: 'Salary',
    type: 'number', // right-aligned, numeric sort, range filter
    format: (v) => money.format(v), // display, search and CSV
  }),
];

<DataTable aria-label="People" data={people} columns={columns} getRowId={(p) => p.id} />;
```

Sorting, global search, column filters, column visibility, density and pagination are on by
default. Nothing else is required.

## Server mode

The same component, with the work moved to your API. The table emits one normalized query and
handles the awkward parts for you: debouncing, a minimum search length, aborting superseded
requests, ignoring out-of-order responses, adopting the server's echo of the query, and
correcting a page that no longer exists.

```tsx
import { createRestDataSource } from 'react-tablekit';

interface PeopleResponse {
  items: Person[];
  total: number;
}

const source = createRestDataSource<Person, PeopleResponse>({
  url: '/api/people/search',
  mapQuery: (q) => ({
    q: q.globalFilter,
    page: q.pagination.pageIndex,
    size: q.pagination.pageSize,
  }),
  mapResult: (json) => ({ rows: json.items, rowCount: json.total }),
});

<DataTable aria-label="People" dataSource={source} columns={columns} getRowId={(p) => p.id} />;
```

Each feature can also be split independently with `sortingMode`, `filterMode`, `searchMode`,
`paginationMode`, `groupingMode` and `facetingMode`: server pagination with client sorting of the
fetched page, for example.

## What's included

- **Data:** sorting (multi-sort, natural and locale-aware comparators), global search with
  highlighting and diacritic folding, column filters with operators and facet counts, grouping
  with aggregation, expansion and tree data with lazily loaded children, row selection with an
  exclusion model that works across server pages.
- **Columns:** typed accessors, formatting and fallbacks, pinning (responsive), resizing,
  reordering, visibility, a per-column actions menu.
- **Rendering:** row virtualization, sticky header and footer, a mobile cards layout, CSV export
  (page / all / selection, with chunked server export), URL and `localStorage` persistence.
- **Accessibility:** real table semantics, the roles the enabled state requires (`grid` when
  selectable, `treegrid` for hierarchical data), the WAI-ARIA data-grid keyboard pattern, and
  polite live-region announcements, all localized.
- **Customization:** nine levels, from props and CSS variables through slots and handler
  middleware to `useDataTable` (the engine, rendering nothing) and `createTable` (no React).

## Bundle size

Measured min+gzip, React external:

| Entry                                        | Size     |
| -------------------------------------------- | -------- |
| `import { DataTable } from 'react-tablekit'` | 57.47 kB |
| Full import                                  | 61.1 kB  |
| `react-tablekit/core`                        | 21.06 kB |
| `react-tablekit/styles.css`                  | 6.15 kB  |

`DataTable` is batteries-included by design: its default layout reaches the toolbar, filter panel,
selection bar and pagination, so the first two numbers are close together. If you need a small
bundle, use **`react-tablekit/core`** (the engine with your own markup) or `useDataTable`, which
renders nothing. A lean React entry (`DataTableLite` with an explicit feature list) is planned for
a 1.x release.

Locale packs (`react-tablekit/locales/*`) and the CSS presets are separate entry points, so you
only pay for the ones you import.

## Requirements

- Peer dependencies: `react >= 18.2`, `react-dom >= 18.2` (React 18 and 19 are both supported).
- ESM and CJS builds with type definitions for both.
- The last two versions of evergreen browsers, Safari ≥ 15.4.

## Documentation

Guides, an example gallery, a playground, a theme editor and the full API reference:
<https://react-tablekit.vercel.app/react-tablekit/>

## License

MIT
