# 03: Data Modes: Client, Server, Hybrid

**Requirement:** every data operation — pagination, global search, column filters, sorting, grouping/aggregation, faceting (filter options and counts), row expansion (children), selection and export — must work in:

- **client mode:** the full dataset is in memory and the engine computes everything;
- **server mode:** the server computes it, and the table only emits the query and renders the returned page;
- **hybrid mode:** some features run on the server and others in the client (for example, server pagination and search, but client sorting of the current page).

Skimmer uses server mode for Customer List, Pool List and Water-test History, and client mode for the Body-of-Water modal. Both must be reproducible with the same component.

---

## 1. Choosing the mode

### 1.1 Shortcut: `dataMode`

```ts
dataMode?: 'client' | 'server';   // default 'client'
```

`dataMode: 'server'` sets every `manualX` flag to `true`: `manualPagination`, `manualSorting`, `manualFiltering` (global and column), `manualGrouping` and `manualFaceting`. `manualExpanding` stays `false` because sub-rows can still be client-provided.

### 1.2 Per-feature override (hybrid)

```ts
paginationMode?: 'client' | 'server';
sortingMode?:    'client' | 'server';
filterMode?:     'client' | 'server';   // column filters + global search
searchMode?:     'client' | 'server';   // overrides filterMode for the global search only
groupingMode?:   'client' | 'server';
facetingMode?:   'client' | 'server';
```

These are aliases for the `manualX` flags (`manualPagination = paginationMode === 'server'`). The per-feature value wins over `dataMode`.

**Hybrid validity rules** (the engine warns in dev when they are violated):

| Combination | Allowed? | Note |
|---|---|---|
| server pagination + client sorting | ✓ with warning | Sorts **only the current page**. Shows a dev warning unless `acknowledgePageLocalSorting: true` |
| server pagination + client filtering | ✓ with warning | Filters only the current page. Same acknowledgement flag (`acknowledgePageLocalFiltering`) |
| client pagination + server sorting/filtering | ✓ | e.g. the server returns all matching rows sorted, and the table paginates locally |
| server filtering + client faceting | ✓ | Facets are computed from loaded rows only |
| server grouping + client pagination | ✗ | Unsupported. Throws in dev |

## 2. The query object

Whatever the modes, the table always maintains and exposes one normalized **query**:

```ts
interface TableQuery {
  pagination: { pageIndex: number; pageSize: number; cursor?: string | null };
  sorting: { id: string; desc: boolean }[];
  globalFilter: string;                       // already debounced + min-length gated
  columnFilters: { id: string; value: unknown; operator?: FilterOperator }[];
  grouping: string[];
  expanded?: Record<string, boolean>;         // only when lazy children are server-loaded
}
```

- `table.getQuery(): TableQuery` returns the current query.
- `onQueryChange?(query: TableQuery, change: QueryChange)` is **one consolidated callback** fired after debounce whenever anything that affects server data changes. `QueryChange` is `{ reason: 'pagination' | 'sorting' | 'globalFilter' | 'columnFilters' | 'grouping' | 'refresh'; previous: TableQuery }`.
- The per-slice callbacks (`onPaginationChange`, `onSortingChange`, ...) still fire *immediately* (they're not debounced) for controlled-state users.

## 3. Client mode (default)

```tsx
<DataTable data={bodiesOfWater} columns={columns} getRowId={(r) => r.id}
           initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }} />
```

- Pagination slices the processed rows. `rowCount` is derived.
- Global search uses `globalFilterFn` (default `'includesString'`, case/diacritic-insensitive, across all columns with `enableGlobalFilter !== false`) and matches on the **display string** from `column.getSearchValue?.(row)`, falling back to the accessor value turned into a string.
- Column filters use `column.filterFn` (resolved from `filterVariant` if not set; see 05 §3).
- Sorting uses `column.sortingFn` (auto-detected from the first non-null value: `alphanumeric` / `datetime` / `basic` / `text`).
- Faceting: `column.getFacetedUniqueValues()` (Map value→count) and `getFacetedMinMaxValues()` are computed from the rows that pass all *other* filters.
- Selection: "select all" chooses between `page` and `all` via `selectAllMode` (default `'page'`, matching the Skimmer modal).

## 4. Server mode: controlled-state style (lowest level)

The consumer owns the state and fetches manually. This is exactly Skimmer's current Zustand pattern:

```tsx
const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
const [globalFilter, setGlobalFilter] = useState('');
const { data, isLoading, isFetching } = useCustomers({ pagination, globalFilter }); // any fetch lib

<DataTable
  dataMode="server"
  data={data?.items ?? []}
  rowCount={data?.totalItemCount ?? 0}
  state={{ pagination, globalFilter }}
  onPaginationChange={setPagination}
  onGlobalFilterChange={(v) => { setGlobalFilter(v); setPagination(p => ({ ...p, pageIndex: 0 })); }}
  loading={isLoading}        // initial: "Loading..." row / skeleton
  fetching={isFetching}      // refetch: overlay over body, previous rows kept
  columns={columns}
/>
```

## 5. Server mode: `dataSource` adapter (recommended)

This is a built-in adapter that owns fetching, debounce, abort, loading flags, stale-data handling and page resets. It's what makes server mode a one-liner.

```ts
interface DataSource<TData, TFilterMeta = unknown> {
  /** Called with the normalized query and an AbortSignal. Must resolve the page. */
  fetch(query: TableQuery, ctx: { signal: AbortSignal; reason: QueryChange['reason'] }): Promise<DataSourceResult<TData>>;

  /** Optional: server-side facets for filter option lists/counts. */
  fetchFacets?(columnId: string, query: TableQuery, ctx: { signal: AbortSignal }): Promise<FacetResult>;

  /** Optional: lazy children for tree rows (server expansion). */
  fetchChildren?(row: Row<TData>, query: TableQuery, ctx: { signal: AbortSignal }): Promise<TData[]>;

  /** Optional: resolve "select all matching" to ids (for bulk actions across pages). */
  fetchAllIds?(query: TableQuery, ctx: { signal: AbortSignal }): Promise<string[]>;
}

interface DataSourceResult<TData> {
  rows: TData[];
  rowCount?: number;              // total matching rows (offset pagination)
  pageCount?: number;             // alternative to rowCount
  nextCursor?: string | null;     // cursor pagination (rowCount may be unknown → -1)
  prevCursor?: string | null;
  /** Server may normalize/echo the query (Skimmer's `requestCriteria`); table adopts it. */
  query?: Partial<TableQuery>;
  facets?: Record<string, FacetResult>;
}

type FacetResult =
  | { type: 'values'; values: { value: unknown; label?: string; count?: number }[] }
  | { type: 'range'; min: number | string; max: number | string };
```

Usage:

```tsx
<DataTable
  dataSource={customersDataSource}   // implies dataMode="server" unless modes given explicitly
  columns={columns}
  initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
/>
```

### 5.1 Adapter behaviour (normative)

| Aspect | Behaviour |
|---|---|
| Initial load | Fetches on mount (`fetchOnMount`, default `true`) with `reason: 'refresh'`. Sets `loading = true` (initial state visual) |
| Refetch | Any query change sets `fetching = true`. Previous rows stay rendered under the overlay (`keepPreviousData: true`) |
| Debounce | Global filter: `searchDebounceMs` (300). Text column filters: `filterDebounceMs` (300). Pagination/sorting: immediate |
| Min search length | `searchMinLength` (default **0**; set to **3** for Skimmer parity). A query shorter than the minimum and longer than 0 does not fetch. An empty query always fetches (reset) |
| Page reset | Changing globalFilter, columnFilters, sorting, grouping or pageSize sets `pageIndex = 0` (and `cursor = null`) **before** fetching. Configurable per reason via `resetPageOn` |
| Abort | Each new fetch aborts the previous one. Aborted results are ignored |
| Race safety | Results are applied only if the request id is the latest |
| Dedup | An identical query (deep-equal) that's in flight is not refetched. `dedupeMs` defaults to 0 (in-flight only) |
| Errors | Sets the `error` state and renders the `ErrorState` slot (with Retry) *instead of* the rows if there is no previous data, or as a dismissible banner above the rows if there is. Calls `onError(error, query)` |
| Server echo | If the result contains `query`, it is merged into state without re-triggering a fetch (Skimmer's `normalizeSearchCustomerRequest`) |
| Page out of range | If `pageIndex >= pageCount` after a result (for example rows were deleted), the adapter moves to the last page and refetches once |
| Refresh API | `table.refresh()` refetches the current query. `table.invalidate()` marks it stale and refetches on the next render |
| Optimistic updates | `table.updateRow(id, updater)`, `table.removeRow(id)` and `table.insertRow(row, index?)` mutate the local page without refetching |
| Polling | `refetchInterval?: number` and `refetchOnWindowFocus?: boolean` (default `false`) |
| Caching | No built-in cache beyond the current page, by design. Users who need caching can wrap `fetch` with React Query (see the example in 08) |
| Status exposure | `table.getDataStatus(): { loading, fetching, error, lastQuery, lastUpdated }` plus `onStatusChange` |

### 5.2 `useDataSource` (headless)

```ts
const ds = useDataSource(dataSource, { table, searchDebounceMs, searchMinLength, ... });
// ds.rows, ds.rowCount, ds.loading, ds.fetching, ds.error, ds.refresh()
```

`<DataTable dataSource>` uses this internally. Headless users can call it directly.

### 5.3 Adapter helpers

```ts
// For REST endpoints with page/size/sort/search params:
createRestDataSource<TData>({
  url: '/api/customers/search',
  method: 'POST',
  mapQuery: (q) => ({                 // → request body/params
    queryCriteria: q.globalFilter,
    listingCriteria: {
      pageNumber: q.pagination.pageIndex,
      pageSize: q.pagination.pageSize,
      sortColumn: q.sorting[0]?.id,
      ascending: q.sorting[0] ? !q.sorting[0].desc : undefined,
    },
  }),
  mapResult: (json) => ({ rows: json.items, rowCount: json.totalItemCount }),
  fetcher?: typeof fetch,             // inject ky/axios wrapper, auth headers, etc.
});

// For an in-memory array that should BEHAVE like a server (demo, tests, latency simulation):
createLocalDataSource<TData>(allRows, { latencyMs?: number | [min, max], failRate?: number,
  columns /* for filter/sort semantics */ });
```

`createLocalDataSource` reuses the engine's own filter/sort functions, so client mode and simulated server mode produce identical results. The demo uses this to show a side-by-side comparison.

## 6. Feature-by-feature matrix

| Feature | Client mode | Server mode | What the table emits in server mode | What the server must return |
|---|---|---|---|---|
| **Pagination (offset)** | slice | `manualPagination` | `pagination.pageIndex/pageSize` | `rows` for that page + `rowCount` (or `pageCount`) |
| **Pagination (cursor)** | n/a | `paginationType: 'cursor'` | `pagination.cursor`, `pageSize` | `rows`, `nextCursor`, `prevCursor`; `rowCount` optional. The numbered variant is disabled, and `simple`/`loadMore`/`infinite` are used |
| **Infinite / load more** | incremental slice | appends pages | `pageIndex` increments | `rows` are appended; `hasMore` is derived from `rowCount` or `nextCursor` |
| **Global search** | `globalFilterFn` | `manualFiltering` / `searchMode` | `globalFilter` (debounced, min-length gated) | filtered page |
| **Column filters** | `filterFn` per column | `manualFiltering` | `columnFilters[]` with `operator` and a value typed per variant | filtered page |
| **Sorting** | `sortingFn` | `manualSorting` | `sorting[]` (multi-sort order) | sorted page |
| **Faceting** (options/counts/ranges) | computed | `manualFaceting` | `fetchFacets(columnId, query)` on filter-menu open (cached per query) or `result.facets` | values with counts, or min/max |
| **Grouping / aggregation** | computed | `manualGrouping` | `grouping[]` | rows already grouped: each group row has `subRows` or is lazy (`getRowCanExpand`) with aggregates in the row data (`aggregatedValues` via `getGroupingValue`) |
| **Expansion (tree)** | `getSubRows` | `fetchChildren(row)` lazily on first expand | the expanded row | children. Cached per row id until the query changes |
| **Detail panels** | `renderDetailPanel` | the same. Panels may fetch their own data via `useDetailPanelData(row)` (suspense-friendly) | n/a | n/a |
| **Selection: page** | ids on page | same | n/a | n/a |
| **Selection: all matching** | all filtered ids | `selectAllMode: 'all'` + server | `rowSelection` becomes `{ mode: 'all', except: Set<id> }` (exclusion model) | optional `fetchAllIds` when real ids are needed |
| **Export CSV** | all filtered rows | `exportMode: 'page' \| 'all'` | `'all'` calls `dataSource.fetch` with `pageSize = exportMaxRows` (or `onExport(query)` delegated) | rows |
| **Row count display** | exact | from `rowCount`; `-1`/unknown shows "1–10 of many" | n/a | n/a |

### 6.1 Selection across server pages (exclusion model)

When `selectAllMode === 'all'` in server mode and the user clicks "Select all N matching":

```ts
state.rowSelection = { __all: true, __except: { 'id_17': true } }   // serialized form
table.getSelectionQuery(): { mode: 'all'; query: TableQuery; except: string[] } | { mode: 'ids'; ids: string[] }
```

Bulk-action handlers receive `getSelectionQuery()`, so the backend can apply "all matching except X". Any query change (filter/search) clears an "all" selection by default (`clearSelectionOnQueryChange: true`).

### 6.2 Filter value serialization

Every built-in `filterVariant` defines a JSON-serializable value shape, so server mode and URL persistence work:

| Variant | Value | Default operator |
|---|---|---|
| `text` | `string` | `contains` (`equals`, `startsWith`, `endsWith`, `notContains`, `empty`, `notEmpty`) |
| `select` | `string \| number \| boolean` | `equals` |
| `multiSelect` | `(string\|number)[]` | `in` (`notIn`) |
| `number` | `number` | `equals` (`gt`, `gte`, `lt`, `lte`, `neq`) |
| `range` | `[min \| null, max \| null]` | `between` |
| `date` | ISO `string` | `on` (`before`, `after`) |
| `dateRange` | `[iso \| null, iso \| null]` | `between` |
| `boolean` | `boolean \| null` | `equals` |
| `custom` | user-defined; must be JSON-serializable when persisted | user-defined |

## 7. URL and storage synchronization (both modes)

```ts
syncState?: {
  url?: { keys?: (keyof TableState)[]; prefix?: string; mode?: 'push' | 'replace' }; // uses history API, router-agnostic
  storage?: { key: string; keys?: (keyof TableState)[]; storage?: Storage };       // default localStorage
}
```

- The URL format is compact and stable: `?tk.page=2&tk.size=25&tk.sort=name.asc,date.desc&tk.q=smith&tk.f.status=active,pending`.
- On mount, URL state wins over storage, which wins over `initialState`.
- An adapter hook is provided for routers (`useRouterSync({ getSearch, setSearch })`) so React Router / Next.js users can plug in.

## 8. Loading and state visuals per mode

| Situation | Visual (default slots) | Skimmer parity |
|---|---|---|
| First load, no data | `loadingDisplay: 'text' \| 'skeleton' \| 'spinner'` (default `'skeleton'`; `'text'` in `classic`) | `'text'` → one centred "Loading..." row, `py 16px`, secondary colour |
| Refetch with data | Body overlay with a spinner. Header, toolbar and pagination remain usable (pagination is disabled while fetching to prevent double-clicks: `disablePaginationWhileFetching: true`) | ✓ overlay `rgba(255,255,255,.7)` from the header bottom down |
| Empty (no rows, no filters) | `EmptyState` slot with `localization.noRows` | "No customers found" |
| Empty due to filters/search | `EmptyState` with `localization.noResults` + a "Clear filters" action | improvement |
| Error, no data | `ErrorState` with a message + Retry | improvement |
| Error, stale data | Dismissible error banner above the body. Rows stay | improvement |
| Precondition not met | `emptyStateContent` / `renderEmptyState({ reason })` custom | Modal "Please select a service location" |

`reason` passed to empty/loading renderers: `'loading' | 'noRows' | 'noResults' | 'error' | 'custom'`.

## 9. Required tests for data modes

1. The same dataset in client mode and in server mode (via `createLocalDataSource`) yields identical visible rows for 50 randomized query sequences (property test).
2. Typing in search resets `pageIndex` to 0, debounces (fake timers), respects `searchMinLength`, and an empty string refetches.
3. Rapid page clicks: only the last response is applied (abort + race guard).
4. Server echo query is adopted without an extra fetch.
5. Page out of range after a refetch corrects itself.
6. Hybrid warnings fire in dev and are silent in prod.
7. The "select all matching" exclusion model survives page changes and clears on filter change.
8. Cursor pagination: numbered variant disabled, next/prev work, unknown total renders "of many".
9. Lazy children: fetched once per row per query and re-fetched after the query changes.
10. Errors: the no-data error state has a working Retry; the stale-data banner keeps rows visible.
