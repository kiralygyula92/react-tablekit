# 06: Customization and Override System

Everything a consumer can see or trigger can be replaced, extended or intercepted, and the default implementation stays reachable so overrides can **wrap** it instead of re-implementing it.

## 0. Override levels (from lightest to heaviest)

| Level | Mechanism | Use it for |
|---|---|---|
| 1 | **Theme tokens** (07) | Colours, spacing, radii, fonts, shadows |
| 2 | **`classNames` / `styles`** per slot | Utility classes (Tailwind), one-off style tweaks |
| 3 | **`slotProps`** per slot | Extra attributes, event handlers, aria, data-* |
| 4 | **Column / row render props** (`cell`, `header`, `renderRow`, `renderDetailPanel`, …) | Content |
| 5 | **`handlers`** middleware | Changing or augmenting behaviour of interactions |
| 6 | **Function registries** (`sortingFns`, `filterFns`, `aggregationFns`, `getPageItems`) | Algorithms |
| 7 | **`slots`** (component replacement) | A different component for a part (e.g. MUI/Chakra buttons) |
| 8 | **Composable parts** / headless hooks | A completely different layout or markup |

Precedence (highest wins): column-level > `<DataTable>` props > `<TableDefaultsProvider>` > theme preset defaults > library defaults. `slotProps`, `classNames` and `styles` from all levels are **merged** (classNames are concatenated, styles are shallow-merged, and event handlers are **chained**: the user's handler runs first and can call `event.preventTablekitDefault()` to skip the internal one).

---

## 1. Slots

### 1.1 Slot names

| Slot | Default element | Receives (besides its HTML props) |
|---|---|---|
| `Root` | `div.tk-root` | `table` |
| `Toolbar` | `div.tk-toolbar` | `table` |
| `SearchInput` | `input[type=search]` wrapper | `value, onChange, onClear, placeholder, hotkeyHint, inputRef` |
| `FiltersButton` | `button` | `activeCount, open, onToggle` |
| `FilterPanel` | `div.tk-filter-panel` | `columns, table, open, onApply, onClearAll` |
| `FilterControl` | variant-specific input | `column, variant, value, setValue, operator, setOperator, options, loading` |
| `ActiveFilterChips` | `div` | `filters, onRemove, onClearAll` |
| `FilterChip` | `Chip` | `label, color, textColor, onRemove` |
| `ColumnsButton` / `ColumnsMenu` | `button` / popover | `columns, table` |
| `DensityButton` | `button` | `density, setDensity` |
| `ExportButton` | `button` + menu | `onExport(scope)`, `progress` |
| `SelectionBar` | `div` | `selectedCount, totalCount, onSelectAllMatching, onClear, bulkActions` |
| `Container` | `div.tk-container` | `hasFooter, scrolledLeft, scrolledRight` |
| `Table` | `table.tk-table` | `layout` |
| `Head` / `HeaderRow` / `HeaderCell` | `thead` / `tr` / `th` | `header, column, isSorted, sortIndex, isPinned, canSort, onSort` |
| `SortButton` / `SortIcon` | `button` / `svg` | `direction: false \| 'asc' \| 'desc'`, `index` |
| `ColumnActionsButton` / `ColumnActionsMenu` | `button` / menu | `column, items` |
| `ResizeHandle` | `span[role=separator]` | `column, isResizing, onPointerDown, onKeyDown` |
| `FilterRow` / `FilterRowCell` | `tr` / `th` | `column` |
| `Body` | `tbody` | `rows` |
| `Row` | `tr.tk-row` | `row, isSelected, isExpanded, isDisabled, depth, index` |
| `Cell` | `td.tk-cell` / `th` | `cell, column, row, isPinned` |
| `SelectionCheckbox` | `Checkbox` | `checked, indeterminate, disabled, onChange, row?` (header when `row` is undefined) |
| `ExpandButton` | `button` | `expanded, canExpand, loading, onToggle, row` |
| `DetailRow` / `DetailPanel` | `tr` / `div` | `row, open` |
| `GroupRow` / `GroupCell` | `tr` / `td` | `row, groupingColumn, value, count` |
| `Foot` / `FooterRow` / `FooterCell` | `tfoot` / `tr` / `td` | `header` |
| `LoadingRow` / `SkeletonRows` / `LoadingOverlay` / `Spinner` | | `table` |
| `EmptyState` | `tr > td[colSpan]` | `reason, onClearFilters` |
| `ErrorState` / `ErrorBanner` | | `error, retry, dismiss` |
| `Pagination` | `nav.tk-pagination` | `variant, pageIndex, pageCount, pageSize, rowCount, items, canPrev, canNext, goTo, next, prev, first, last, setPageSize, disabled` |
| `PageButton` / `PrevButton` / `NextButton` / `FirstButton` / `LastButton` / `Ellipsis` | `button` / `span` | `index, selected, disabled` |
| `PageSizeSelect` | `select` | `value, options, onChange` |
| `RowRange` | `span` | `from, to, total` |
| `LoadMoreButton` | `button` | `remaining, loading, onLoadMore` |
| `Card` | `article` (cards layout) | `row` |
| `Tooltip` | tooltip | `content, placement, children` |
| `Menu` / `MenuItem` / `Popover` | | a generic primitive used by all menus |
| `Checkbox` / `Button` / `IconButton` / `Select` / `TextInput` / `Chip` | primitives | These primitive slots let the whole table adopt a design system by overriding ~6 components |

### 1.2 Slot contract

```ts
type SlotComponent<P> = React.ComponentType<P & SlotBaseProps>;
interface SlotBaseProps {
  className?: string;          // already merged (default tk-* classes + user classes)
  style?: React.CSSProperties;
  'data-*'?: string;            // state attributes (data-sorted, data-selected, ...)
  ref?: React.Ref<any>;         // slots MUST forward refs to their DOM root
}
```

- Every slot receives **fully computed props**: the default classes, aria attributes, event handlers and state. A replacement that spreads `{...props}` onto its root keeps all behaviour.
- Inside a slot, `useTableSlots()` returns the **default** implementations, so a replacement can wrap them:

```tsx
const MyHeaderCell: TableSlots<Customer>['HeaderCell'] = (props) => {
  const { HeaderCell: Default } = useTableSlots().defaults;
  return <Default {...props} className={cx(props.className, 'my-header')}>{props.children}<InfoIcon/></Default>;
};
<DataTable slots={{ HeaderCell: MyHeaderCell }} />
```

### 1.3 `slotProps`, `classNames`, `styles`

```tsx
<DataTable
  slotProps={{
    row: ({ row }) => ({ 'data-status': row.original.status, onMouseEnter: () => prefetch(row.id) }),
    headerCell: ({ column }) => ({ title: column.id }),
    pagination: { 'aria-label': 'Customer pages' },
    searchInput: { autoFocus: true },
  }}
  classNames={{
    root: 'shadow-sm',
    row: ({ row }) => (row.original.overdue ? 'bg-red-50' : undefined),
    cell: ({ column }) => (column.id === 'amount' ? 'tabular-nums' : undefined),
  }}
  styles={{ container: { maxHeight: 400 }, headerCell: { textTransform: 'uppercase' } }}
/>
```

The keys are the slot names in camelCase (`headerCell`, `pageButton`, …). Each function form receives the slot's context (the same object slots receive, minus the HTML props).

## 2. Column-level overrides

```tsx
col.accessor('email', {
  header: ({ column }) => <span>Email <Badge>{column.getFacetedUniqueValues().size}</Badge></span>,
  cell: ({ getValue, row, table }) => <a href={`mailto:${getValue()}`}>{getValue()}</a>,
  footer: ({ table }) => `${table.getRowCount()} contacts`,
  cellClassName: ({ row }) => row.original.bounced ? 'text-red' : undefined,
  getCellProps: ({ row }) => ({ title: row.original.email }),
  renderFilter: ({ value, setValue }) => <DomainPicker value={value} onChange={setValue} />,
  meta: { exportHeader: 'E-mail address' },
});
```

## 3. Header overrides

- `column.header` for the content.
- `slots.HeaderCell` for the whole cell.
- `slots.SortIcon` / `icons.sortAsc` etc. for the icons.
- `renderColumnActionsMenuItems({ column, table, defaultItems, closeMenu })` to edit the menu.
- `headerTooltip` and `headerShort` for the common cases.

## 4. Row overrides

### 4.1 Prop getters (additive)
`getRowProps(row)`, `getRowClassName(row)` and `getRowStyle(row)` add attributes, classes or styles to the default row.

### 4.2 `renderRow` (full override, with the default available)

```ts
interface RowRenderContext<TData> {
  row: Row<TData>; table: TableInstance<TData>; index: number;
  rowProps: RowHTMLProps;                 // computed default props (className, aria, handlers, style)
  cells: Cell<TData, unknown>[];          // visible cells in order (pinning applied)
  renderCell(cell: Cell<TData, unknown>, overrides?: Partial<CellHTMLProps>): ReactNode; // default cell
  defaultRender(overrides?: { rowProps?: Partial<RowHTMLProps>; children?: ReactNode }): ReactNode;
  renderDetailPanel(): ReactNode | null;  // default detail row (if expanded)
}
```

Examples:

```tsx
// 1. Insert a full-width warning row after certain rows, keeping the default row
renderRow={({ row, defaultRender, table }) => (
  <>
    {defaultRender()}
    {row.original.hasAlert && (
      <tr className="tk-row tk-row--alert"><td colSpan={table.getVisibleLeafColumns().length}>⚠ {row.original.alert}</td></tr>
    )}
  </>
)}

// 2. Replace the row's content entirely (e.g. a merged "section header" row)
renderRow={({ row, rowProps, table, defaultRender }) =>
  row.original.kind === 'section'
    ? <tr {...rowProps}><th colSpan={table.getVisibleLeafColumns().length} scope="colgroup">{row.original.title}</th></tr>
    : defaultRender()}
```

`renderRow` must return `<tr>` elements in table layout, or `role="row"` elements in grid layout. A dev warning is shown if it doesn't. With virtualization, rows returned by `renderRow` are measured.

### 4.3 Collapsible content
`renderDetailPanel` (05 §6.1), `slots.DetailPanel`, `slots.ExpandButton`, `icons.expand/collapse`.

## 5. Handler middleware (behaviour overrides)

Every user interaction dispatches through a named handler. A handler override receives the context and a `next` function that runs the default behaviour (or the next middleware):

```ts
type Handler<Ctx> = (ctx: Ctx, next: (ctxOverride?: Partial<Ctx>) => void | Promise<void>) => void | Promise<void>;
```

- Call `next()` to proceed with the default behaviour.
- Call `next({ ...modified })` to proceed with modified input.
- Don't call `next` to cancel.
- The handler can be `async` (for example, to confirm first).

| Handler | Context | Default behaviour |
|---|---|---|
| `onSortToggle` | `{ column, desc?, multi, event }` | `column.toggleSorting(desc, multi)` |
| `onGlobalFilterInput` | `{ value, event }` | `setGlobalFilter(value)` (debounced) |
| `onColumnFilterChange` | `{ column, value, operator }` | `column.setFilterValue(...)` |
| `onClearFilters` | `{}` | `clearAllFilters()` |
| `onPageChange` | `{ pageIndex, reason: 'button' \| 'keyboard' \| 'infinite' }` | `setPageIndex` |
| `onPageSizeChange` | `{ pageSize }` | `setPageSize` |
| `onRowClick` | `{ row, event }` | toggles selection/expansion per options, then calls `onRowClick` prop |
| `onRowDoubleClick` | `{ row, event }` | the prop callback |
| `onRowSelect` | `{ row, value, range, event }` | `row.toggleSelected` (+ range) |
| `onSelectAll` | `{ value, scope: 'page' \| 'all' }` | `toggleAll…` |
| `onRowExpand` | `{ row, value }` | `row.toggleExpanded` (+ lazy fetch children) |
| `onColumnResize` | `{ column, size }` | `setColumnSizing` |
| `onColumnMove` | `{ columnId, toIndex }` | `moveColumn` |
| `onColumnPin` | `{ column, position }` | `column.pin` |
| `onColumnHide` | `{ column, visible }` | `column.toggleVisibility` |
| `onExport` | `{ scope, format }` | CSV generation + download |
| `onRefresh` | `{}` | `table.refresh()` |
| `onHotkey` | `{ key, event }` | per the key map |
| `onCellActivate` | `{ cell, event }` | keyboard Enter behaviour |

Example uses:

```tsx
handlers={{
  // Track analytics, then run the default
  onSortToggle: (ctx, next) => { track('sort', ctx.column.id); next(); },
  // Only allow sorting by one column in server mode, even with Shift
  onSortToggle: (ctx, next) => next({ multi: false }),
  // Confirm before changing page while there are unsaved edits
  onPageChange: async (ctx, next) => { if (!dirty || await confirm('Discard?')) next(); },
  // Row click navigates instead of selecting
  onRowClick: ({ row }) => navigate(`/customers/${row.id}`),   // no next() → default selection skipped
}}
```

Handlers compose: `TableDefaultsProvider` handlers wrap the library defaults, and prop handlers wrap the provider handlers.

## 6. Function registries

```tsx
<DataTable
  sortingFns={{ priority: (a, b, columnId) => rank(a.getValue(columnId)) - rank(b.getValue(columnId)) }}
  filterFns={{ phone: Object.assign((row, id, value) => normalizePhone(row.getValue(id)).includes(normalizePhone(value)),
                                    { autoRemove: (v: string) => !v }) }}
  aggregationFns={{ weightedAvg: (columnId, leafRows) => /* ... */ 0 }}
  pagination={{ pageItemsAlgorithm: ({ pageIndex, pageCount }) => /* custom PageItem[] */ [] }}
/>
// then reference them by name in columns: sortingFn: 'priority', filterFn: 'phone'
```

The registries are typed via module augmentation, so string names autocomplete:

```ts
declare module 'react-tablekit' {
  interface SortingFnRegistry { priority: SortingFn<any>; }
  interface FilterFnRegistry { phone: FilterFn<any>; }
}
```

## 7. Icons

`icons: Partial<TableIcons>` with keys: `sortAsc, sortDesc, sortNone, filter, filterActive, search, clear, columns, density, export, expand, collapse, expandAll, collapseAll, dragHandle, pinLeft, pinRight, unpin, hide, more, first, prev, next, last, check, indeterminate, spinner, error, info, close, chevronDown`. Each is a `ReactNode` or a `ComponentType<{ className?: string; 'aria-hidden'?: boolean }>`. The defaults are in-house inline SVGs (16px, `currentColor`).

The classic preset maps `prev`/`next` to arrow icons (MUI `ArrowBack`/`ArrowForward`-like) for parity.

## 8. Localization and formatting

```ts
interface TableLocalization {
  // toolbar & search
  search: string; searchPlaceholder: string; clearSearch: string; searchHotkeyHint: string; // "{key}"
  filters: string; filtersActive: string /* "{count} filters" */; clearAllFilters: string; applyFilters: string;
  columns: string; showAll: string; hideAll: string; resetColumns: string; density: string;
  densityCompact: string; densityStandard: string; densityComfortable: string;
  export: string; exportPage: string; exportAll: string; exportSelected: string; copyToClipboard: string;
  // header
  sortAscending: string; sortDescending: string; clearSort: string; sortedAscending: string; sortedDescending: string;
  sortPriority: string /* "priority {index}" */; columnActions: string; pinLeft: string; pinRight: string; unpin: string;
  hideColumn: string; groupBy: string; ungroup: string; autosize: string; resetSize: string; resizeColumn: string;
  // body
  noRows: string; noResults: string; loading: string; loaded: string; errorTitle: string; retry: string; dismiss: string;
  expandRow: string; collapseRow: string; expandAll: string; collapseAll: string;
  selectRow: string; selectAllOnPage: string; selectAll: string; deselectAll: string;
  selectedCount: string /* "{count} selected" */; selectAllMatching: string /* "Select all {total} matching" */;
  clearSelection: string; rowActions: string; groupedBy: string;
  // pagination
  pagination: string; previous: string; next: string; first: string; last: string; page: string /* "Page {page}" */;
  pageOf: string /* "Page {page} of {count}" */; rowsPerPage: string; rowRange: string /* "{from}–{to} of {total}" */;
  many: string; loadMore: string /* "Load more ({remaining} remaining)" */;
  // filters
  operators: Record<FilterOperator, string>; any: string; yes: string; no: string; min: string; max: string;
  from: string; to: string; datePresets: Record<string, string>;
  // announcements
  announceSort: string; announcePage: string; announceResults: string; announceMove: string; announceSelection: string;
}
```

- Interpolation uses `{name}`. Plurals: any string can be a function `(vars) => string` for complex plural rules.
- `formatters`: `number(value, column)`, `date(value, column)`, `rowRange(from, to, total)`, `page(n)` (default `Intl` using `locale`).
- `locale?: string` (default `navigator.language` on the client and `'en-US'` on the server).
- Shipped locales: `en` (default), `hu`, `de`, `es` (examples; community-extensible).
- **i18next integration** (Skimmer): wrap once with `<TableLocaleProvider localization={useTablekitI18n()} />`, where the hook maps keys to `t('table.*')`. The docs show this recipe.

## 9. Composable parts (layout freedom)

```tsx
const table = useDataTable({ data, columns, dataSource, ... });

<DataTable.Root table={table}>
  <PageHeader>
    <h3>All Customers</h3>
    <DataTable.Search />                       {/* in the page header, like Skimmer */}
    <Button onClick={add}>Add customer</Button>
  </PageHeader>
  <DataTable.ActiveFilterChips />
  <DataTable.Container>
    <DataTable.Table />                        {/* head + body + foot with slots */}
    <DataTable.LoadingOverlay />
  </DataTable.Container>
  <DataTable.Pagination />
</DataTable.Root>
```

Each part reads the instance from context (or accepts `table` explicitly) and honours `slots`/`slotProps` passed to `Root`.

## 10. Headless (Level 4) example

```tsx
const table = useDataTable({ data, columns, enableRowSelection: true });
return (
  <div role="grid" aria-rowcount={table.getRowCount()}>
    {table.getRowModel().rows.map((row) => (
      <Card key={row.id} selected={row.getIsSelected()} onClick={() => row.toggleSelected()}>
        {row.getVisibleCells().map((cell) => <Field key={cell.id} label={cell.column.id}>{flexRender(cell)}</Field>)}
      </Card>
    ))}
    <MyPager page={table.getState().pagination.pageIndex} items={table.getPageItems()} onChange={table.setPageIndex} />
  </div>
);
```

`flexRender(cellOrHeader)` renders the column's `cell`/`header` definition with the correct context.

## 11. Design-system adapters

The primitive slots (`Button`, `IconButton`, `Checkbox`, `Select`, `TextInput`, `Chip`, `Tooltip`, `Menu`, `Popover`, `Spinner`) are the whole integration surface. An adapter is just a `slots` object:

```ts
// (v1.x) react-tablekit-mui: export const muiSlots: Partial<TableSlots<any>> = { Button: MuiButtonAdapter, ... }
<TableDefaultsProvider value={{ slots: muiSlots, theme: classicTheme }}>
```

The docs must include a worked example that re-skins the primitives with plain Tailwind classes, to prove the surface is sufficient.
