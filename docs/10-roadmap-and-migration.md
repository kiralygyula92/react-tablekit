# 10: Roadmap, Definition of Done, and Migration Guide

## 1. Milestones (build in this order)

Each milestone ends with all CI gates green (09 §5) and a short progress report listing its checklist.

### M0: Scaffold
- [ ] A pnpm monorepo with `packages/react-tablekit` and `apps/site` (02 §1), TypeScript strict configs, ESLint/Prettier, Vitest, Playwright, tsup, size-limit, Changesets and the CI workflow.
- [ ] The site shell: routing, layout, theme toggle, an empty examples gallery, and a placeholder API page.
- [ ] Mock data generator + MSW mock server (08 §7) with the Skimmer customer contract.
- [ ] ADR-001 (architecture) and ADR-002 (own engine) written.
**Accept when:** `pnpm build && pnpm test && pnpm e2e` pass on an empty library that exports a `version` constant; the site deploys.

### M1: Core engine + basic rendering + classic parity (Customer List)
- [ ] Core: store, column model (accessorKey/accessorFn/display/group), core row model, `getRowId`, state controlled/uncontrolled, `memo`, updater.
- [ ] Features: Pagination (client + manual), Sorting (client + manual), ColumnVisibility (basic), ColumnPinning (left/right, stacked offsets, responsive `pin`), Density.
- [ ] React: `useDataTable`, `<DataTable>` with slots infrastructure (all slot names registered, defaults for the ones used so far), `slotProps`/`classNames`/`styles` merging, `<colgroup>` widths.
- [ ] States: `loading` (text + skeleton), `fetching` overlay (ResizeObserver header height, blocking), empty, error.
- [ ] Pagination UI: `numbered`, `compact`, `simple`; `getPageItems` classic + stable; hideOnSinglePage with the container border fix.
- [ ] Theme: tokens, `light` + `classic` presets, CSS layers.
- [ ] Cell building blocks: `ActionButton`, `Tooltip`, `TwoLineText`, `MultiLineList`, `Chip`, `ChipList`, `TruncatedText`.
- [ ] Server mode (controlled style, 03 §4) + the `dataSource` adapter (03 §5) with debounce/min length/abort/race/page reset/server echo.
- [ ] `<DataTable.Search/>` composable part with the scoped hotkey + hint chip.
- [ ] Example: `parity-customer-list`, `basic`, `pagination-variants`, `client-vs-server`.
**Accept when:** the Customer List parity page matches the references (09 §3) at 1440 and 390 widths; the B1, B2, B4, B5, B6, B7, B8, B9, B10, B11, B13 and B16 regression tests pass.

### M2: Search, filtering, faceting, toolbar
- [ ] GlobalFilter (client/server, highlight, match modes), ColumnFilters (all variants), Faceting (client + `fetchFacets`), active filter chips, filter panel/popover/row modes, the toolbar layout + composable toolbar parts, Columns menu, density toggle.
- [ ] Localization system + `en`, `hu`, `de`, `es`; formatters; the pseudo-locale test.
- [ ] Examples: `global-search`, `filters-*`, `server-sorting`, `hybrid-mode`, `localization`, `parity-pool-list`.
**Accept when:** client/server equivalence property tests pass for search + filters + sort + pagination; Pool List parity is locked.

### M3: Selection, expansion, collapsible rows, tree data
- [ ] RowSelection (single/multi/range/cascade/disabled, page/all, server exclusion model, selection bar + bulk actions).
- [ ] Expanding: detail panels (lazy, keepMounted, animation, fullWidth sticky), tree data (client + lazy `fetchChildren`), expand column/all, single mode.
- [ ] `renderRow` with `defaultRender`, `getRowProps`, disabled rows, row events.
- [ ] Handler middleware for every handler in 06 §5.
- [ ] Examples: `row-selection`, `detail-panels`, `tree-data`, `tree-lazy-server`, `row-overrides`, `handlers-middleware`, `parity-body-of-water-selection`, `parity-water-test-history`.
**Accept when:** all four parity pages are locked; B8, B14, B18 and B19 regressions pass.

### M4: Column power features + large data
- [ ] Column sizing/resizing (keyboard too), ordering (pointer DnD + menu), the column actions menu, static/locked columns, sticky header/footer, row pinning.
- [ ] Row virtualization (fixed + dynamic), `layout: 'grid'`, infinite pagination, cursor pagination.
- [ ] Examples: `column-*`, `sticky-header-footer`, `virtualization-100k`, `infinite-scroll`, `cursor-pagination`.
**Accept when:** the performance budgets (09 §4) are met; axe is clean with virtualization.

### M5: Grouping, aggregation, export, persistence, keyboard grid
- [ ] Grouping (client + server rows), aggregation fns, footers.
- [ ] Export (CSV page/all/selected, clipboard, server chunked).
- [ ] `syncState` URL + storage with migrations; `useRouterSync`.
- [ ] Keyboard grid navigation (05 §15); live-region announcements complete.
- [ ] Responsive cards layout.
- [ ] Examples: `grouping-aggregation`, `export`, `url-sync`, `keyboard-navigation`, `responsive-cards`, `states`.

### M6: Theming completeness + docs site
- [ ] `dark`, `compact` and `minimal` presets; `colorScheme: 'auto'`; the unstyled mode + Tailwind recipe.
- [ ] Theme editor; playground; the API docs pipeline (TypeDoc + runtime meta); every guide page from 08 §1; search.
- [ ] Remaining examples (`slots-*`, `theming-*`, `composable-layout`, `headless`, `react-query-recipe`, `cell-building-blocks`, `density`, `column-types`).
**Accept when:** every public symbol is documented; every slot, handler, token, locale key and icon appears on the API pages from metadata; the site Lighthouse score is ≥ 90.

### M7: Hardening and 1.0 release
- [ ] Cross-browser e2e; SSR smoke; bundle audits (publint, attw); tree-shaking verified.
- [ ] README, CONTRIBUTING, LICENSE, CHANGELOG; semver policy page.
- [ ] `1.0.0` published via Changesets with provenance; the docs site deployed.

### v1.x (after 1.0, names already reserved)
Inline editing (05 §22), column virtualization, row drag reordering, cell range selection/copy, the `react-tablekit-mui` adapter package, and more locales.

## 2. Definition of Done (per feature)

A feature is done when it has:

1. The core implementation, with client **and** server semantics where applicable (03 §6 matrix).
2. Public API names exactly as in 04, with TSDoc (description, `@default`, `@example`).
3. Default UI slot(s) registered with metadata. All strings are localized, all visuals are tokenized, and state is exposed via data attributes.
4. Handler(s) routed through the middleware where there is user interaction.
5. Keyboard and screen-reader support per 05 §15–16.
6. Unit, component, a11y and (where visual) screenshot tests, plus a regression test for any related 01 §10 bug.
7. A demo example page and a guide section; the playground controls updated.
8. A changeset entry.

## 3. Migration guide: Skimmer `TableConfig` → `react-tablekit`

### 3.1 Concept mapping

| Skimmer | react-tablekit |
|---|---|
| `TableConfig.columns: TableColumnConfig[]` | `columns: ColumnDef<TData>[]` (use `createColumnHelper<TData>()`) |
| `column.id` | `id` (or `accessorKey`) |
| `column.label` | `header` |
| `column.xsLabel` | `headerShort: { base: 'Short', sm: undefined }` |
| `column.alignment` | `align` |
| `column.width` / `minWidth` | `width` / `minWidth` (the same strings work: `'15%'`, `'160px'`) |
| `column.sortable` (default true in the header) | `enableSorting` (table default `true`; set `enableSorting={false}` on the table for the server screens that don't sort) |
| `column.getSortValue` | `sortValue` |
| `column.renderCell(row, theme)` | `cell: ({ row, theme }) => …` (use `row.original`; the theme is the resolved tokens object, not MUI) |
| `column.disablePadding` | `cellStyle: { padding: 0 }` or the `tk-cell--flush` class via `cellClassName` |
| `TableConfig.stickyActions` (+ `\|\| isMobile`) | `pin: 'right'` on the actions column, or `pin: { base: 'right', md: 'right' }`; the convenience prop `stickyActions` exists |
| `TableConfig.showCheckbox` | `enableRowSelection` (+ `enableMultiRowSelection={false}` for single) |
| `EnhancedTableHead` order/orderBy/onRequestSort | `state.sorting` / `onSortingChange` (or the dataSource) |
| `CustomPagination` currentPage/totalPages/onPageChange | built-in pagination; `state.pagination` / `rowCount` |
| `ITEMS_PER_PAGE` | `initialState.pagination.pageSize` |
| `isLoadingX` / `isSearchingX` store flags | `loading` / `fetching` props (or automatic with `dataSource`) |
| "No X found" / "Loading..." per table | `localization.noRows` / `localization.loading` (or per-table `localization` overrides) |
| `CustomersSearchInput` + `useSearchInputController` | `<DataTable.Search />` with `searchDebounceMs=300`, `searchMinLength=3`, `searchHotkey="mod+k"` |
| `TableFilterToolbar` (`FilterOption {label, background, lightText}`) | a `multiSelect` filter with `multiSelectDisplay: 'autocomplete'`; options `{ value, label, color, textColor: '#fff' }` |
| `getTypographySx` / `getActionButtonSx` / `CustomTooltip` | the classic theme tokens + `ActionButton` / `Tooltip` building blocks |
| `renderAddress` / `renderEmailList` / `renderPhoneList` | `TwoLineText` / `MultiLineList` (the domain formatting functions stay in the app) |
| `PoolTags` | `ChipList` with `maxVisible={3}` and a custom `renderChip` for the per-type colours |
| handlers passed into the config factory (rebuilding columns) | `meta={{ onEditCustomer }}` on the table, read via `table.options.meta` in cells, so columns are defined **once** at module scope |

### 3.2 Customer List rewritten (reference implementation for the parity example)

```tsx
// customerColumns.tsx: module scope, created once
import { createColumnHelper, ActionButton, TwoLineText, MultiLineList } from 'react-tablekit';

declare module 'react-tablekit' {
  interface TableMeta<TData> { onEditCustomer?: (customer: TData) => void; t: (key: string) => string; }
}

const col = createColumnHelper<Customer>();

export const customerColumns = [
  col.accessor((c) => formatCustomerName(c), {
    id: 'customerName', header: ({ table }) => table.options.meta!.t('customerList.tableHeaders.customerName'),
    width: '15%', minWidth: '160px',
  }),
  col.accessor('displayName.companyName', { id: 'companyName', header: /* t(...) */ 'Company name', width: '15%', minWidth: '160px' }),
  col.accessor('billingAddress', {
    header: 'Billing address', width: '15%', minWidth: '128px',
    cell: ({ getValue }) => <TwoLineText primary={getValue()?.address1} secondary={getShortFormatAddress(getValue())} />,
    getSearchValue: (c) => c.billingAddress?.address1 ?? '',
  }),
  col.accessor((c) => c.contactInformation?.emailAddresses ?? [], {
    id: 'emails', header: 'Emails', width: '10%', minWidth: '128px',
    cell: ({ getValue }) => <MultiLineList items={getValue().map((e) => e.email)} />,
  }),
  col.accessor((c) => c.contactInformation?.phoneNumbers ?? [], {
    id: 'phones', header: 'Phones', width: '15%', minWidth: '128px',
    cell: ({ getValue }) => <MultiLineList items={formatPhoneLines(getValue())} />,
  }),
  col.accessor((c) => c.serviceLocations ?? [], {
    id: 'serviceLocations', header: 'Service locations', width: '15%', minWidth: '128px',
    cell: ({ getValue }) => <MultiLineList gap={12} items={getValue().map((s) =>
      <TwoLineText key={s.identifiers?.id} primary={s.address?.address1} secondary={getShortFormatAddress(s.address)} />)} />,
  }),
  col.accessor((c) => getCustomerBodiesOfWater(c).length, {
    id: 'bodiesOfWater', header: 'Bodies of water', type: 'number', width: '5%', minWidth: '96px',
  }),
  col.display({
    id: 'actions', header: 'Actions', align: 'right', width: '5%', minWidth: '48px',
    pin: 'right', static: true,
    cell: ({ row, table }) => (
      <ActionButton icon={<PenIcon />} label={table.options.meta!.t('customerList.tooltips.edit')}
                    onClick={() => table.options.meta!.onEditCustomer?.(row.original)} />
    ),
  }),
];
```

```tsx
// CustomerList.tsx: page
const customersDataSource = createRestDataSource<Customer>({
  fetcher: (req) => searchCustomers(req.body),           // reuse the existing API client
  mapQuery: (q) => ({ queryCriteria: q.globalFilter,
    listingCriteria: { pageNumber: q.pagination.pageIndex, pageSize: q.pagination.pageSize } }),
  mapResult: (r) => ({ rows: r.items ?? [], rowCount: r.totalItemCount ?? 0,
    query: { pagination: { pageIndex: r.requestCriteria?.pageNumber ?? 0, pageSize: r.requestCriteria?.pageSize ?? 10 } } }),
});

export default function CustomerList() {
  const { t } = useTranslation('customers');
  const table = useDataTable({
    columns: customerColumns,
    dataSource: customersDataSource,
    getRowId: (c) => c.identifiers!.id!,
    enableSorting: false,
    searchMinLength: 3,
    searchHotkey: 'mod+k',
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    meta: { t, onEditCustomer: openEditModal },
    localization: { noRows: t('customerList.noCustomersFound'), loading: t('customerList.loading'),
                    searchPlaceholder: t('customerList.searchPlaceholder') },
  });

  return (
    <DataTable.Root table={table} theme={classicTheme} aria-label="Customer list">
      <PageHeader title={t('customerList.allCustomers')}
                  center={<DataTable.Search />}
                  end={<Button onClick={openAddModal}>{t('buttons.addCustomer')}</Button>} />
      <Box sx={{ p: 5 }}><DataTable.Container /><DataTable.Pagination /></Box>
    </DataTable.Root>
  );
}
```

That is roughly 60 lines of page code instead of 326 + 202, with the same visuals and behaviour, and the bugs fixed.

### 3.3 Body-of-Water selection (client mode, single selection)

```tsx
<DataTable
  theme={classicTheme}
  aria-label="Bodies of water"
  data={selectedServiceLocation ? bodiesOfWater : []}
  columns={bodyOfWaterColumns}                   // enableSorting default true; notes/actions: enableSorting:false
  getRowId={(b) => b.id}
  enableRowSelection
  enableMultiRowSelection={false}
  selectOnRowClick
  state={{ rowSelection: selectedId ? { [selectedId]: true } : {} }}
  onRowSelectionChange={(u) => setSelectedId(firstKey(functionalUpdate(u, {})))}
  initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
  maxHeight={400}
  enableStickyHeader
  emptyStateContent={!selectedServiceLocation ? t('customerSelectionModal.pleaseSelectAServiceLocation') : undefined}
  localization={{ noRows: t('customerSelectionModal.noBodiesOfWaterFound') }}
/>
```

### 3.4 Adoption plan inside Skimmer (later, outside the scope of this new repo)

1. Publish `react-tablekit@1.0.0` (or consume it via a git/tarball/workspace link during evaluation).
2. Add `<TableDefaultsProvider value={{ theme: classicTheme, localization: useTablekitI18n() }}>` at the app root.
3. Migrate the tables one at a time in this order: Body-of-Water modal (client, smallest) → Customer List → Pool List → Pool History. Compare against the screenshots from 09 §3 after each one.
4. Delete `components/tables/*`, the table config factories, `paginationUtils.ts`, and the `TABLE_*`/`PAGINATION_*` constants once they're unused. Consider migrating `Skimmer.Portal.Web`'s copies next.
