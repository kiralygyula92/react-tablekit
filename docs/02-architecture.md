# 02: Architecture

## 1. Repository layout (pnpm monorepo)

```
react-tablekit/
├─ package.json                  # private root; scripts; devDeps; "packageManager": "pnpm@9"
├─ pnpm-workspace.yaml           # packages/*, apps/*
├─ turbo.json                    # optional task graph (build → test → e2e)
├─ tsconfig.base.json            # strict, "moduleResolution": "bundler", "jsx": "react-jsx"
├─ eslint.config.js              # typescript-eslint strict, react-hooks, jsx-a11y
├─ .prettierrc
├─ .changeset/                   # versioning
├─ .github/workflows/ci.yml, release.yml
├─ docs/                         # ← THIS documentation set
├─ packages/
│  └─ react-tablekit/
│     ├─ package.json            # the published package
│     ├─ tsup.config.ts
│     ├─ size-limit.config.cjs
│     ├─ src/
│     │  ├─ core/                # headless, framework-agnostic (no React import)
│     │  │  ├─ createTable.ts
│     │  │  ├─ store.ts          # tiny observable store
│     │  │  ├─ types.ts
│     │  │  ├─ columns.ts        # column tree, accessors, leaf/flat columns, header groups
│     │  │  ├─ rowModels/        # core, filtered, faceted, grouped, sorted, expanded, paginated
│     │  │  ├─ features/         # one file per feature (see §4)
│     │  │  ├─ fns/              # sortingFns, filterFns, aggregationFns
│     │  │  └─ utils/            # memo, updater, pagination items, csv, debounce
│     │  ├─ react/
│     │  │  ├─ useDataTable.ts   # React binding (useSyncExternalStore)
│     │  │  ├─ DataTable.tsx     # all-in-one component
│     │  │  ├─ context.ts        # TableContext, SlotContext, ThemeContext
│     │  │  ├─ slots/            # default slot components (one file each)
│     │  │  ├─ hooks/            # useDataSource, usePersistedState, useVirtualRows, useMediaQuery...
│     │  │  ├─ handlers.ts       # handler middleware runner
│     │  │  └─ a11y/             # live region, keyboard navigation
│     │  ├─ styles/
│     │  │  ├─ base.css          # structural CSS (layout, pinning, sticky) in @layer tablekit.base
│     │  │  ├─ theme.css         # token-driven visual CSS in @layer tablekit.theme
│     │  │  └─ presets/          # classic.css, light.css, dark.css, compact.css
│     │  ├─ locales/             # en.ts (default), plus hu.ts, de.ts, es.ts as examples
│     │  ├─ icons/               # inline SVG icon components (no icon lib dependency)
│     │  └─ index.ts             # public entry
│     └─ test/
└─ apps/
   └─ site/                      # Vite + React 19 + React Router: demo, playground, API docs
      ├─ src/examples/           # each example: Example.tsx + meta.ts (title, description, tags)
      ├─ src/mock/               # seeded data generators + mock server (MSW or in-memory)
      ├─ src/api-docs/           # rendered from generated TypeDoc JSON
      └─ e2e/                    # Playwright specs + visual baselines
```

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript 5.5+, `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` | Library-grade typing |
| Build | **tsup** (esbuild) → ESM + CJS + `.d.ts`; CSS copied/concatenated by a small script or `tsup` `loader` | Fast and standard |
| Package manager | pnpm workspaces | Monorepo |
| Tests | Vitest + @testing-library/react + jsdom; `expectTypeOf` for type tests | Fast; the same runner for core and React |
| E2E / visual | Playwright (Chromium, WebKit, Firefox), `toHaveScreenshot` | Parity baselines |
| A11y | `@axe-core/playwright` + `vitest-axe` | Automated a11y gates |
| Lint | ESLint flat config, typescript-eslint strict-type-checked, eslint-plugin-react-hooks, jsx-a11y | |
| Docs site | Vite + React Router 7 + MDX (`@mdx-js/rollup`) + Shiki for code highlighting | |
| API docs | **TypeDoc** `--json` → rendered in the site (single source of truth: the TSDoc comments) | No drift |
| Versioning | Changesets | |
| Size | size-limit | Budgets in 09 |
| Mocking | MSW (Mock Service Worker) in the demo site for realistic server mode, plus an in-memory fallback | Real network semantics (latency, abort) |

**Runtime dependencies of the library: none.** Peer dependencies: `react >=18.2`, `react-dom >=18.2`.

## 3. Layering

```
┌──────────────────────────────────────────────────────────────────────┐
│  <DataTable>  (all-in-one, prop-driven)                               │
│    uses slots → default components  (Toolbar, Table, Row, Cell, ...)  │
├──────────────────────────────────────────────────────────────────────┤
│  Composable React parts (DataTable.Root / .Toolbar / .Table / ...)    │
│  Hooks: useDataTable, useDataSource, useTableSlots, useVirtualRows    │
├──────────────────────────────────────────────────────────────────────┤
│  React binding: useSyncExternalStore(store), context, handler runner  │
├──────────────────────────────────────────────────────────────────────┤
│  core (headless): createTable(options) → TableInstance                │
│   state store · column model · feature modules · row-model pipeline   │
└──────────────────────────────────────────────────────────────────────┘
```

Consumers can enter at any layer:

- **Level 1:** `<DataTable data columns />` with defaults.
- **Level 2:** `<DataTable>` with `slots`, `slotProps`, `classNames`, `handlers`, `theme`.
- **Level 3:** `const table = useDataTable(opts)` plus the composable parts arranged in any layout.
- **Level 4:** `useDataTable` plus fully custom markup (headless), e.g. a card grid or `<div>` grid.

## 4. Core engine

### 4.1 `createTable(options)`

- Normalizes options (defaults per feature).
- Builds the **column model**: nested `ColumnDef` groups → a `Column` tree → leaf columns → header groups (for multi-row headers).
- Creates the **store** (`getState`, `setState(updater)`, `subscribe`), seeded from `initialState` merged with controlled `state`.
- Installs **features**. Each feature is an object:

```ts
interface TableFeature<TData> {
  name: string;
  getDefaultOptions?(table): Partial<TableOptions<TData>>;
  getInitialState?(initial?: Partial<TableState>): Partial<TableState>;
  createTable?(table): void;                 // adds instance APIs (table.setSorting ...)
  createColumn?(column, table): void;        // adds column APIs (column.toggleSorting ...)
  createHeader?(header, table): void;
  createRow?(row, table): void;              // adds row APIs (row.toggleSelected ...)
  createCell?(cell, table): void;
}
```

Built-in features, in install order: `ColumnVisibility`, `ColumnOrdering`, `ColumnPinning`, `ColumnSizing`, `GlobalFilter`, `ColumnFilters`, `ColumnFaceting`, `Sorting`, `Grouping`, `Expanding`, `RowPinning`, `RowSelection`, `Pagination`, `Editing` *(v1.x)*, `Density`.

Custom features can be passed via `options._features` (documented as advanced), so the library is extensible without forking.

### 4.2 Row-model pipeline

Each stage is a memoized function of (previous-stage output, the relevant state slice, the relevant options). A stage is **skipped** (passes input through) when its feature is in **server/manual mode**:

```
data ─► coreRowModel        (accessors, rows, subRows via getSubRows, row ids via getRowId)
     ─► filteredRowModel    (skip if manualFiltering)   ← globalFilter + columnFilters
     ─► facetedRowModel     (per column; skip if manualFaceting → uses options.facets)
     ─► groupedRowModel     (skip if manualGrouping)    ← grouping + aggregation
     ─► sortedRowModel      (skip if manualSorting)     ← sorting (sorts within groups/sub-rows)
     ─► expandedRowModel    (flattens expanded sub-rows / group rows; detail panels are NOT rows)
     ─► paginatedRowModel   (skip if manualPagination)  ← pagination
     ─► rowModel            (what the body renders; row pinning splits top/center/bottom)
```

- `table.getPrePaginationRowModel()` is used for "select all (filtered)", export and counts.
- `table.getRowCount()`: `options.rowCount` in manual pagination, else the pre-pagination count.
- `table.getPageCount()`: `options.pageCount ?? ceil(rowCount / pageSize)`, or `-1` when unknown (cursor mode).

### 4.3 Memoization utility

```ts
memo(getDeps: () => unknown[], compute: (...deps) => T, { key, debug? }): () => T
```

It uses shallow array comparison and powers every row-model stage and derived value. In dev it has an optional `debugTable` timing log.

### 4.4 State model

```ts
interface TableState {
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnPinning: { left: string[]; right: string[] };
  columnSizing: Record<string, number>;
  columnSizingInfo: ColumnSizingInfo;
  globalFilter: string;
  columnFilters: { id: string; value: unknown }[];
  sorting: { id: string; desc: boolean }[];
  grouping: string[];
  expanded: true | Record<string, boolean>;   // true = all expanded
  rowPinning: { top: string[]; bottom: string[] };
  rowSelection: Record<string, boolean>;       // may include ids not on the current page
  pagination: { pageIndex: number; pageSize: number; cursor?: string | null };
  density: 'compact' | 'standard' | 'comfortable';
  editing?: EditingState;                      // v1.x
}
```

**Controlled/uncontrolled per slice.** For each slice `x`:

- `initialState.x` seeds the internal state (uncontrolled).
- `state.x` (if defined) **wins** over the internal state (controlled).
- `onXChange(updater)` is called with an `Updater<T> = T | ((old: T) => T)`. When `onXChange` is provided and `state.x` is not, the internal state is still updated (a "notified uncontrolled" mode). This must be documented clearly.
- `table.reset()` restores `initialState`; `table.resetX(defaultState?: boolean)` does the same per slice.

**Auto-reset rules** (each is configurable):

- `autoResetPageIndex` (default `true` in client mode, `false` when `manualPagination`) resets to page 0 when data, filters, global filter, sorting or grouping change. In server mode the **data-source adapter** resets the page on query-affecting changes instead (see 03 §5), replicating Skimmer's "typing resets to page 0".
- `autoResetExpanded` (default `true`).
- `autoResetSelection` (default `false`).

### 4.5 Row and cell objects

```ts
interface Row<TData> {
  id: string; index: number; depth: number; original: TData;
  subRows: Row<TData>[]; parentId?: string;
  getValue<TValue>(columnId: string): TValue;
  renderValue<TValue>(columnId: string): TValue | null; // uses column renderFallbackValue
  getVisibleCells(): Cell<TData, unknown>[];
  getLeftVisibleCells() / getCenterVisibleCells() / getRightVisibleCells();
  // feature APIs:
  getIsSelected(); getIsSomeSelected(); getCanSelect(); toggleSelected(value?, opts?);
  getIsExpanded(); getCanExpand(); toggleExpanded(value?); getIsGrouped(); groupingColumnId?; groupingValue?;
  getIsPinned(); pin(position);
  getIsDisabled();
}
```

Accessor values are **cached per row**.

## 5. React binding

- `useDataTable(options)` creates the table once (a `useState` initializer) and on each render calls `table.setOptions(prev => ({ ...prev, ...options }))` inside a layout effect-safe path. It subscribes via `useSyncExternalStore` (React 18/19, concurrent-safe).
- **Fine-grained subscriptions:** `useTableState(table, selector, isEqual?)` lets slots re-render only when their slice changes. For example, the pagination slot subscribes to `pagination` plus `rowCount`, not to `rowSelection`.
- **Row rendering:** `Row` is `React.memo` with a comparator on `(row.id, row.original identity, selected, expanded, pinned, visibleColumnsVersion, density, editing)`.
- **Context:** `TableContext` holds the instance, `SlotsContext` holds the resolved slots/slotProps/classNames/styles, `LocaleContext` holds localization and `ThemeContext` holds the theme tokens and `density`.
- **SSR:** no `window`/`document` access at module scope or during render. Media queries use `useSyncExternalStore` with `getServerSnapshot` returning the configured `ssrBreakpoint` (default `'lg'`).
- **StrictMode:** effects are idempotent; the data-source adapter aborts in-flight requests on cleanup.

## 6. DOM structure (default render)

```html
<div class="tk-root" data-density="standard" data-loading="false" style="--tk-...">
  <div class="tk-toolbar" role="toolbar" aria-label="Table controls">
    <div class="tk-toolbar__start">  <search> [filters button] [active filter chips] </div>
    <div class="tk-toolbar__end">    [density] [columns] [export] [custom actions] </div>
  </div>
  <div class="tk-filter-panel" hidden>…</div>
  <div class="tk-selection-bar" hidden>3 selected · [bulk actions] · Clear</div>
  <div class="tk-container" data-has-footer="true">      <!-- position:relative; overflow:auto; border; radius -->
    <table class="tk-table" aria-rowcount="235" aria-busy="false">
      <colgroup><col style="width:…"> …</colgroup>
      <thead class="tk-head">
        <tr class="tk-header-row">
          <th class="tk-header-cell" aria-sort="ascending" data-sortable data-sorted="asc" data-pinned="left">
            <button class="tk-sort-button">Name <svg class="tk-sort-icon"/></button>
            <span class="tk-resize-handle" role="separator" aria-orientation="vertical"></span>
          </th>
        </tr>
        <tr class="tk-filter-row"> … </tr>              <!-- filterDisplayMode="row" -->
      </thead>
      <tbody class="tk-body">
        <tr class="tk-row" data-row-id="c_1" aria-rowindex="2" aria-selected="false" data-expanded="false">
          <th class="tk-cell" scope="row">…</th><td class="tk-cell">…</td>
        </tr>
        <tr class="tk-detail-row"><td colspan="8"><div class="tk-detail-panel">…</div></td></tr>
      </tbody>
      <tfoot class="tk-foot">…</tfoot>                  <!-- column footers / aggregates -->
    </table>
    <div class="tk-overlay" role="status" aria-live="polite">spinner</div>
  </div>
  <nav class="tk-pagination" aria-label="Pagination">…</nav>
  <div class="tk-sr-live" aria-live="polite" class="tk-visually-hidden"></div>
</div>
```

- Widths are applied via `<colgroup>` so headers and body always agree (fixes B13).
- Pinned cells use `position: sticky` with `left`/`right` offsets computed from the pinned columns' widths (`column.getStart('left')`, `column.getAfter('right')`). Offsets are exposed as CSS variables per cell.
- The overlay is a child of `.tk-container` (`position: relative`). Its `top` is `var(--tk-head-height)`, set by a `ResizeObserver` on `<thead>`. Fixes B6 and B11.
- With `layout="grid"` (virtualization or `div` mode) the same class names are used with `role="grid"`/`row`/`gridcell`/`columnheader` on `<div>`s.

## 7. Performance rules

1. All derived data is memoized in core. React never recomputes row models.
2. Accessor results are cached per row. Filter/sort use the cached values.
3. Slots subscribe to state slices, not the whole state.
4. Rows are memoized. Cell renderers receive stable context objects (created once per row/column pair and reused while their inputs are unchanged).
5. **Virtualization** (`enableRowVirtualization`, or automatically when visible rows exceed `virtualizationThreshold`, default 200) uses an in-house windowing hook (fixed or measured row heights, overscan) with no external dependency.
6. Debounce global search and text filters (`searchDebounceMs` default 300, `filterDebounceMs` default 300).
7. The server data source deduplicates identical queries, aborts stale requests (`AbortController`), and keeps previous rows during refetch (`keepPreviousData`, the Skimmer overlay behaviour).
8. Benchmarks (in CI, informational): 10k rows client sort < 50ms; 100k rows virtualized scroll at 60fps on a mid-range laptop; initial render of 50 rows × 10 cols < 16ms.

## 8. Public entry points (`package.json` exports)

```jsonc
{
  "name": "react-tablekit",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".":               { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./core":          { "types": "./dist/core/index.d.ts", "import": "./dist/core/index.js", "require": "./dist/core/index.cjs" },
    "./styles.css":    "./dist/styles.css",           // base + theme (default "light" tokens)
    "./base.css":      "./dist/base.css",             // structural only (for unstyled mode)
    "./presets/classic.css": "./dist/presets/classic.css",
    "./presets/dark.css":    "./dist/presets/dark.css",
    "./presets/compact.css": "./dist/presets/compact.css",
    "./locales/*":     { "types": "./dist/locales/*.d.ts", "import": "./dist/locales/*.js", "require": "./dist/locales/*.cjs" },
    "./package.json":  "./package.json"
  },
  "peerDependencies": { "react": ">=18.2", "react-dom": ">=18.2" },
  "files": ["dist", "README.md", "LICENSE"]
}
```

Presets are also available as JS theme objects (`import { classicTheme } from 'react-tablekit'`) for the `theme` prop; CSS preset files are the zero-JS alternative.
