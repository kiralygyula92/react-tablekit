# 04: API Reference (Source of Truth for Names and Signatures)

Everything here is public API and must be documented with TSDoc in source, because TypeDoc generates the API site from it. Defaults are given in `// default:` comments. *(v1.x)* marks APIs that may ship after 1.0 but whose names are reserved now.

---

## 1. Exports

```ts
// react-tablekit
export { DataTable } from './react/DataTable';              // all-in-one + compound parts
export { useDataTable, useTableState, useDataSource, useTableSlots,
         useVirtualRows, useDetailPanelData, useRouterSync, useTableContext } from './react/hooks';
export { TableThemeProvider, TableLocaleProvider, TableDefaultsProvider } from './react/providers';
export { createColumnHelper, createRestDataSource, createLocalDataSource,
         defineColumns, getPageItems, exportToCsv } from './utils';
export { sortingFns, filterFns, aggregationFns } from './core/fns';
export { classicTheme, lightTheme, darkTheme, compactTheme, createTheme } from './themes';
export { en as defaultLocalization } from './locales/en';
export { ActionButton, RowActionsMenu, Tooltip, Checkbox, Chip, ChipList,
         TruncatedText, MultiLineList, TwoLineText } from './react/components'; // cell building blocks
export * from './types';

// react-tablekit/core (no React)
export { createTable, memo, functionalUpdate, getPageItems, sortingFns, filterFns, aggregationFns };
export type * from './core/types';
```

## 2. `<DataTable>` props

`DataTableProps<TData>` = `TableOptions<TData>` (engine options, §4) + `DataTableViewProps<TData>` (render options below).

### 2.1 Data

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `TData[]` | `[]` | Rows (client mode), or the current page (controlled server mode). Ignored when `dataSource` is set |
| `columns` | `ColumnDef<TData, any>[]` | required | Column definitions (§3) |
| `getRowId` | `(row: TData, index: number, parent?: Row<TData>) => string` | index-based | **Strongly recommended.** Used for keys, selection and expansion |
| `getSubRows` | `(row: TData, index: number) => TData[] \| undefined` | none | Tree data (client) |
| `dataSource` | `DataSource<TData>` | none | Server adapter (03 §5). Implies `dataMode="server"` |
| `rowCount` | `number` | derived | Total rows in server mode (`-1` = unknown) |
| `pageCount` | `number` | derived | Alternative to `rowCount` |
| `loading` | `boolean` | `false` | Initial load (no data yet) |
| `fetching` | `boolean` | `false` | Refetch with existing data (overlay) |
| `error` | `unknown` | none | Shows the error state/banner |

### 2.2 Data modes (03)

| Prop | Type | Default |
|---|---|---|
| `dataMode` | `'client' \| 'server'` | `'client'` (or `'server'` if `dataSource`) |
| `paginationMode`, `sortingMode`, `filterMode`, `searchMode`, `groupingMode`, `facetingMode` | `'client' \| 'server'` | inherit from `dataMode` |
| `manualPagination`, `manualSorting`, `manualFiltering`, `manualGrouping`, `manualFaceting` | `boolean` | derived from modes |
| `paginationType` | `'offset' \| 'cursor'` | `'offset'` |
| `onQueryChange` | `(query: TableQuery, change: QueryChange) => void` | none |
| `searchDebounceMs` / `filterDebounceMs` | `number` | `300` / `300` |
| `searchMinLength` | `number` | `0` |
| `resetPageOn` | `Array<'globalFilter' \| 'columnFilters' \| 'sorting' \| 'grouping' \| 'pageSize'>` | all |
| `keepPreviousData` | `boolean` | `true` |
| `fetchOnMount` | `boolean` | `true` |
| `refetchInterval` | `number` | none |
| `refetchOnWindowFocus` | `boolean` | `false` |
| `onError` | `(error: unknown, query: TableQuery) => void` | none |
| `acknowledgePageLocalSorting` / `acknowledgePageLocalFiltering` | `boolean` | `false` |

### 2.3 State (controlled/uncontrolled; 02 §4.4)

| Prop | Type |
|---|---|
| `state` | `Partial<TableState>` |
| `initialState` | `Partial<TableState>` |
| `onStateChange` | `(updater: Updater<TableState>) => void` (fires for any slice) |
| `onSortingChange`, `onColumnFiltersChange`, `onGlobalFilterChange`, `onPaginationChange`, `onRowSelectionChange`, `onExpandedChange`, `onGroupingChange`, `onColumnVisibilityChange`, `onColumnOrderChange`, `onColumnPinningChange`, `onColumnSizingChange`, `onRowPinningChange`, `onDensityChange` | `(updater: Updater<Slice>) => void` |
| `autoResetPageIndex`, `autoResetExpanded`, `autoResetSelection` | `boolean` |
| `syncState` | see 03 §7 |

### 2.4 Feature flags (table level; each has a column-level counterpart where it makes sense)

| Prop | Default | Notes |
|---|---|---|
| `enableSorting` | `true` | |
| `enableMultiSort` | `true` | Shift+click adds a sort |
| `maxMultiSortColCount` | `3` | |
| `enableSortingRemoval` | `true` | The cycle asc → desc → none |
| `sortDescFirst` | `false` | Per column auto: numbers/dates start desc when `'auto'` |
| `isMultiSortEvent` | `(e) => e.shiftKey` | |
| `enableGlobalFilter` | `true` | Shows the search input when a toolbar is rendered |
| `enableColumnFilters` | `true` | |
| `enableFilters` | `true` | Master switch |
| `filterDisplayMode` | `'panel'` | `'panel' \| 'popover' \| 'row' \| 'none'` |
| `showActiveFilterChips` | `true` | |
| `enableFacetedValues` | `true` | |
| `enablePagination` | `true` | |
| `enableRowSelection` | `false` | `boolean \| (row) => boolean` |
| `enableMultiRowSelection` | `true` | `false` = single (radio semantics) |
| `enableSubRowSelection` | `true` | |
| `selectAllMode` | `'page'` | `'page' \| 'all'` |
| `selectOnRowClick` | `false` | |
| `enableRangeSelection` | `true` | Shift+click range when `enableMultiRowSelection` |
| `clearSelectionOnQueryChange` | `false` client / `true` server | |
| `enableExpanding` | auto | `true` if `getSubRows`, `renderDetailPanel` or `getRowCanExpand` is set |
| `expandOnRowClick` | `false` | |
| `expandMode` | `'multiple'` | `'single'` = accordion |
| `paginateExpandedRows` | `true` | |
| `enableGrouping` | `false` | |
| `enableColumnPinning` | `true` | Allows pinning via column menu. Column `pin` works regardless |
| `enableRowPinning` | `false` | |
| `enableColumnResizing` | `false` | |
| `columnResizeMode` | `'onChange'` | `'onChange' \| 'onEnd'` |
| `columnResizeDirection` | `'ltr'` | |
| `enableColumnOrdering` | `false` | Drag and drop in the header / columns menu |
| `enableHiding` | `true` | Columns menu visibility toggles |
| `enableDensityToggle` | `false` | |
| `enableColumnActions` | `false` | Per-header "⋮" menu (sort, pin, hide, filter, group, autosize) |
| `enableRowVirtualization` | `'auto'` | `boolean \| 'auto'` |
| `virtualizationThreshold` | `200` | |
| `enableColumnVirtualization` | `false` | *(v1.x)* |
| `enableKeyboardNavigation` | `false` | Grid-style arrow-key navigation (05 §15) |
| `enableEditing` | `false` | *(v1.x)* |
| `enableExport` | `false` | Toolbar export button |
| `enableRowNumbers` | `false` | Adds `#` display column |
| `enableStickyHeader` | `false` | |
| `enableStickyFooter` | `false` | |
| `enableColumnFooters` | auto | `true` if any column defines `footer` or `aggregationFn` |
| `enableHover` | `true` (`false` in classic) | Row hover background |
| `enableStriped` | `false` | |

### 2.5 Layout and display

| Prop | Type | Default | Description |
|---|---|---|---|
| `layout` | `'table' \| 'grid'` | `'table'` (auto `'grid'` when virtualized) | Semantic `<table>` or div grid |
| `tableLayout` | `'auto' \| 'fixed'` | `'auto'` | CSS `table-layout` |
| `minWidth` | `number \| string` | `650` in classic, `undefined` otherwise | Table min-width |
| `maxHeight` | `number \| string` | none | Scroll container max-height (enables inner scroll) |
| `maxWidth` | `number \| string \| ResponsiveValue` | `'100%'` | |
| `density` | `'compact' \| 'standard' \| 'comfortable'` | `'standard'` | Also a state slice |
| `bordered` | `'outer' \| 'rows' \| 'all' \| 'none'` | `'outer'` + rows | |
| `firstColumnAsRowHeader` | `boolean` | `true` | First cell rendered as `<th scope="row">` |
| `noWrap` | `boolean` | `true` | `white-space: nowrap` in cells |
| `loadingDisplay` | `'text' \| 'skeleton' \| 'spinner'` | `'skeleton'` | Initial-load visual |
| `skeletonRowCount` | `number` | `pageSize` | |
| `loadingOverlayBlocksInteraction` | `boolean` | `true` | |
| `disablePaginationWhileFetching` | `boolean` | `true` | |
| `toolbar` | `boolean \| 'top' \| 'bottom' \| 'both'` | `'top'` if any toolbar feature is enabled, else `false` | |
| `toolbarActions` | `ReactNode \| (table) => ReactNode` | none | Custom buttons at the toolbar end |
| `renderToolbarStart` / `renderToolbarEnd` | `(table) => ReactNode` | none | Full toolbar area overrides |
| `searchPlaceholder` | `string` | from localization | |
| `searchHotkey` | `string \| false` | `false` | e.g. `'mod+k'` (scoped per table); classic demo uses `'mod+k'` and shows the `Ctrl+K` chip |
| `showSearchHotkeyHint` | `boolean` | `true` when `searchHotkey` | |
| `pagination` (display) | `PaginationDisplayOptions` | see below | |
| `renderEmptyState` | `(ctx: { reason, table }) => ReactNode` | none | |
| `emptyStateContent` | `ReactNode` | none | Shortcut for a static empty state (e.g. a precondition message) |
| `renderErrorState` | `(ctx: { error, retry, table }) => ReactNode` | none | |
| `caption` | `ReactNode` | none | Visually hidden `<caption>` (a11y) unless `showCaption` |
| `aria-label` / `aria-labelledby` | `string` | none | Applied to `<table>`. **One of them is required** (dev warning otherwise) |
| `id` | `string` | auto (`useId`) | Base id for aria relationships |
| `dir` | `'ltr' \| 'rtl'` | inherit | |
| `responsive` | `ResponsiveOptions` | see 05 §13 | Breakpoints, mobile layout, auto-pinning |

`PaginationDisplayOptions`:

```ts
interface PaginationDisplayOptions {
  variant?: PaginationVariant | ResponsiveValue<PaginationVariant>; // default { base: 'compact', md: 'numbered' }
  position?: 'bottom' | 'top' | 'both';                            // default 'bottom'
  pageSizeOptions?: number[] | false;                               // default false (classic) / [10, 25, 50, 100]
  showRowRange?: boolean;                                           // "11–20 of 235"; default false (classic) / true
  showFirstLast?: boolean | ResponsiveValue<boolean>;               // default { base: true, md: false } in classic
  showPrevNextLabels?: boolean | ResponsiveValue<boolean>;          // default { base: false, md: true }
  siblingCount?: number;                                            // default 1
  boundaryCount?: number;                                           // default 2
  pageItemsAlgorithm?: 'classic' | 'stable' | ((args: PageItemsArgs) => PageItem[]); // default 'classic'
  hideOnSinglePage?: boolean;                                       // default true
  align?: 'space-between' | 'center' | 'start' | 'end';             // default 'space-between'
}
type PaginationVariant = 'numbered' | 'compact' | 'simple' | 'loadMore' | 'infinite' | 'none';
type PageItem = { type: 'page'; index: number; selected: boolean } | { type: 'ellipsis'; key: string };
```

### 2.6 Row-level customization

| Prop | Type | Description |
|---|---|---|
| `getRowProps` | `(row: Row<TData>, table) => RowHTMLProps` | Extra props per `<tr>` (className, style, data-*, events) |
| `getRowClassName` | `(row) => string \| undefined` | |
| `getRowStyle` | `(row) => CSSProperties \| undefined` | |
| `getRowCanExpand` | `(row) => boolean` | |
| `getRowCanSelect` | `(row) => boolean` | Alias of the function form of `enableRowSelection` |
| `isRowDisabled` | `(row) => boolean` | Disabled rows: dimmed, not selectable/clickable, `aria-disabled` |
| `renderRow` | `(ctx: RowRenderContext<TData>) => ReactNode` | **Full row override.** `ctx.defaultRender()` renders the default row. See 06 §4 |
| `renderDetailPanel` | `(ctx: { row, table }) => ReactNode` | Collapsible content under a row |
| `detailPanelProps` | `{ lazy?: boolean /*true*/; keepMounted?: boolean /*false*/; animate?: boolean /*true*/; fullWidth?: boolean /*true*/ }` | |
| `renderRowActions` | `(ctx: { row, table }) => ReactNode` | Creates the built-in `actions` display column |
| `rowActionsColumn` | `Partial<ColumnDef<TData>>` | Override the actions column (`header`, `size`, `pin` (default `'right'`), `align` (default `'right'`)) |
| `positionActionsColumn` | `'first' \| 'last'` | Default `'last'` |
| `positionExpandColumn` | `'first' \| 'last' \| 'none'` | Default `'first'`; `'none'` to use your own toggle |
| `positionSelectionColumn` | `'first' \| 'last'` | Default `'first'` |
| `onRowClick` | `(row, event) => void` | Sets a pointer cursor and makes the row focusable when `enableKeyboardNavigation` |
| `onRowDoubleClick`, `onRowContextMenu`, `onRowMouseEnter`, `onRowMouseLeave` | `(row, event) => void` | |
| `onCellClick` | `(cell, event) => void` | |
| `renderSubComponent` | alias of `renderDetailPanel` | (familiarity alias; documented as an alias) |

### 2.7 Customization system (06)

| Prop | Type |
|---|---|
| `slots` | `Partial<TableSlots<TData>>` |
| `slotProps` | `Partial<TableSlotProps<TData>>` (each value is an object or `(ctx) => object`) |
| `classNames` | `Partial<Record<SlotName, string \| ((ctx) => string \| undefined)>>` |
| `styles` | `Partial<Record<SlotName, CSSProperties \| ((ctx) => CSSProperties \| undefined)>>` |
| `handlers` | `Partial<TableHandlers<TData>>` (middleware) |
| `icons` | `Partial<TableIcons>` |
| `localization` | `Partial<TableLocalization>` (deep-partial) |
| `formatters` | `Partial<TableFormatters>` (number, date, rowRange, pageLabel) |
| `sortingFns`, `filterFns`, `aggregationFns` | `Record<string, Fn>`: registries extending the built-ins |
| `columnDefaults` | `Partial<ColumnDef<TData>>`: merged into every column |
| `displayColumnDefs` | `Partial<Record<'select' \| 'expand' \| 'actions' \| 'rowNumber' \| 'drag', Partial<ColumnDef<TData>>>>` |
| `unstyled` | `boolean`: drops theme CSS classes (structural only) |

### 2.8 Theming (07)

| Prop | Type | Description |
|---|---|---|
| `theme` | `TableTheme \| DeepPartial<TableTheme>` | Tokens (merged over the provider/default) |
| `colorScheme` | `'light' \| 'dark' \| 'auto'` | `'auto'` follows `prefers-color-scheme` |
| `className` / `style` | root | |

### 2.9 Additional feature options (referenced in 03/05/07)

| Prop | Type | Default | Spec |
|---|---|---|---|
| `meta` | `TableMeta<TData>` | none | §10; available as `table.options.meta` |
| `locale` | `string` | `navigator.language` / `'en-US'` (SSR) | 06 §8 |
| `darkTheme` | `TableTheme` | `darkTheme` | Used when `colorScheme` resolves to dark |
| `stickyActions` | `boolean` | `false` | Convenience alias: pins the actions column right (05 §8) |
| `globalFilterMatch` | `'all-words' \| 'any-word' \| 'phrase'` | `'all-words'` | 05 §2 |
| `highlightSearchMatches` | `boolean` | `false` | 05 §2 |
| `filterApplyMode` | `'instant' \| 'manual'` | `'instant'` | 05 §3.1 |
| `multiSelectDisplay` | `'list' \| 'autocomplete'` | `'list'` | 05 §3.3 (also per column) |
| `showFacetCounts` | `boolean` | `true` | 05 §3.4 |
| `datePresets` | `{ id: string; label: string; range: () => [Date, Date] }[]` | built-ins | 05 §3.3 |
| `scrollToTopOnPageChange` | `boolean` | `true` | 05 §4.5 |
| `showSelectionBar` | `boolean` | `true` when multi-select | 05 §5 |
| `renderBulkActions` | `(ctx: { table; selectedRows; selectionQuery }) => ReactNode` | none | 05 §5 |
| `enableExpandAll` | `boolean` | `true` in multiple mode | 05 §6.3 |
| `treeColumnId` | `string` | first visible data column | 05 §6.2 |
| `filterFromLeafRows` / `maxLeafRowFilterDepth` | `boolean` / `number` | `false` / `Infinity` | 05 §6.2 |
| `groupedColumnMode` | `'reorder' \| 'remove' \| false` | `'reorder'` | 05 §7 |
| `footerAggregationScope` | `'page' \| 'filtered'` | `'filtered'` | 05 §7 |
| `keepPinnedRows` | `boolean` | `true` | 05 §12 |
| `renderColumnActionsMenuItems` | `(ctx: { column; table; defaultItems; closeMenu }) => ReactNode` | none | 05 §11 |
| `loadingOverlayDelayMs` | `number` | `150` (`0` in classic) | 05 §17 |
| `exportMode` | `'page' \| 'all'` | `'page'` | 03 §6 |
| `exportChunkSize` / `exportMaxRows` | `number` | `1000` / `10000` | 05 §20 |
| `onExport` | `(query: TableQuery, scope: 'page' \| 'all' \| 'selected') => void \| Promise<void>` | none | Delegate export to a backend |
| `onExportFile` | `(blob: Blob, fileName: string) => void` | download | 05 §20 |
| `rowNumberMode` | `'absolute' \| 'relative'` | `'absolute'` | 05 §23 |
| `estimateRowHeight` | `number \| ((row) => number)` | by density | 05 §14 |
| `onStatusChange` | `(status: DataStatus) => void` | none | 03 §5.1 |
| `dedupeMs` | `number` | `0` | 03 §5.1 |

### 2.10 Refs and instance access

```tsx
const ref = useRef<DataTableHandle<Customer>>(null);
<DataTable ref={ref} ... />
ref.current.table      // TableInstance
ref.current.focus()    // focuses the table (first focusable cell)
ref.current.scrollToRow(id, { align: 'start' | 'center' | 'end' })
ref.current.scrollToTop()
```

Also available: `tableRef?: (table: TableInstance<TData>) => void` (callback) and `<DataTable table={externalTable}>` to render an instance created with `useDataTable`.

## 3. `ColumnDef<TData, TValue>`

```ts
type ColumnDef<TData, TValue = unknown> =
  | AccessorKeyColumnDef<TData, TValue>   // { accessorKey: DeepKeys<TData> }
  | AccessorFnColumnDef<TData, TValue>    // { id: string; accessorFn: (row, index) => TValue }
  | DisplayColumnDef<TData>               // { id: string } no value (actions, custom)
  | GroupColumnDef<TData>;                // { id?: string; header; columns: ColumnDef[] }
```

`TValue` is inferred by `createColumnHelper`, and `cell`/`format` receive it narrowed. That makes
`ColumnDef<TData>` — which defaults `TValue` to `unknown` — the wrong type to annotate a mixed
array with: a helper-built column is not assignable to it. Annotate with `AnyColumnDef<TData>`,
which is what `columns` accepts:

```ts
import type { AnyColumnDef } from 'react-tablekit';

export const columns: AnyColumnDef<Person>[] = [
  col.accessor('name', { header: 'Name' }),
  col.accessor('score', { header: 'Score', format: (v) => v.toFixed(1) }), // v is number
];
```

Letting the array infer (no annotation) works too; the annotation only matters when the columns
live in their own module and the type has to be written down.

Common fields:

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | `accessorKey` | Required for `accessorFn`/display/group columns |
| `accessorKey` | `DeepKeys<TData>` | none | Dot paths supported (`'billingAddress.city'`) |
| `accessorFn` | `(row: TData, index: number) => TValue` | none | |
| `header` | `ReactNode \| ((ctx: HeaderContext) => ReactNode)` | `id` humanized | |
| `headerShort` | `ReactNode \| ResponsiveValue<ReactNode>` | none | E.g. e.g. `{ base: 'Svc', sm: undefined }` |
| `headerTooltip` | `ReactNode` | none | Info icon with tooltip in the header |
| `cell` | `ReactNode \| ((ctx: CellContext<TData, TValue>) => ReactNode)` | formatted value | |
| `footer` | `ReactNode \| ((ctx: HeaderContext) => ReactNode)` | none | |
| `meta` | `ColumnMeta` (module-augmentable interface) | none | Free-form, typed via declaration merging |
| `align` | `'left' \| 'center' \| 'right'` | `'left'`; `'right'` for `type: 'number'` | Header + cells |
| `headerAlign` | same | `align` | |
| `verticalAlign` | `'top' \| 'middle' \| 'bottom'` | `'middle'` | |
| `type` | `'text' \| 'number' \| 'date' \| 'datetime' \| 'boolean' \| 'custom'` | auto | Drives default align, format, sort, filter variant |
| `format` | `(value: TValue, row: TData) => string` | by `type` | Display + search + export string |
| `renderFallbackValue` | `ReactNode` | `'-'` in classic, `'—'` default | Shown for `null`/`undefined`/`''` |
| **Sizing** | | | |
| `size` | `number` (px) | `150` | Used when resizing is enabled / fixed layout |
| `width` | `number \| string` | none | CSS width, supports `'15%'` |
| `minSize` / `minWidth` | `number` / `number \| string` | `40` / none | |
| `maxSize` / `maxWidth` | `number` / `number \| string` | none | |
| `grow` | `boolean \| number` | none | Flex-grow share in grid layout |
| **Static / locked flags** | | | |
| `pin` | `'left' \| 'right' \| false \| ResponsiveValue<'left'\|'right'\|false>` | `false` | **Static (frozen) column.** Responsive example: `{ base: 'right', md: false }` |
| `lockPin` | `boolean` | `false` | The user can't unpin/repin via the UI |
| `enableHiding` | `boolean` | `true` | `false` = always visible (not in the columns menu) |
| `enableOrdering` | `boolean` | `true` | `false` = can't be dragged; others can't be dropped before/after a locked column at the edge |
| `lockPosition` | `'first' \| 'last' \| false` | `false` | Pins the column's *order* position (unlike `pin`, it doesn't stick while scrolling) |
| `enableResizing` | `boolean` | `true` | |
| `static` | `boolean` | `false` | **Shortcut:** `lockPin + enableHiding:false + enableOrdering:false + enableResizing:false + enableColumnActions:false`. Combine with `pin` for a frozen, locked column |
| **Sorting** | | | |
| `enableSorting` | `boolean` | table value | Whether the column can be sorted |
| `sortingFn` | `SortingFnName \| SortingFn<TData>` | auto | |
| `sortValue` | `(row: TData) => unknown` | accessor value | Overrides the value used for sorting |
| `sortDescFirst` | `boolean \| 'auto'` | table value | |
| `sortUndefined` | `'first' \| 'last' \| false \| 1 \| -1` | `'last'` | |
| `invertSorting` | `boolean` | `false` | For ranks/"lower is better" |
| `sortServerKey` | `string` | `id` | Name sent to the server in `sorting[].id` (maps `customerName` → `LastName`) |
| **Filtering** | | | |
| `enableColumnFilter` | `boolean` | table value | |
| `enableGlobalFilter` | `boolean` | `true` for accessor columns | |
| `filterVariant` | `'text' \| 'select' \| 'multiSelect' \| 'number' \| 'range' \| 'rangeSlider' \| 'date' \| 'dateRange' \| 'boolean' \| 'custom'` | by `type` | |
| `filterFn` | `FilterFnName \| FilterFn<TData>` | by variant | |
| `filterOperators` | `FilterOperator[]` | by variant | Operators offered in the UI |
| `filterOptions` | `FilterOption[] \| ((ctx) => FilterOption[] \| Promise<FilterOption[]>)` | faceted | `FilterOption = { value; label; color?: string; textColor?: string; icon?: ReactNode; count?: number }` |
| `filterServerKey` | `string` | `id` | |
| `renderFilter` | `(ctx: FilterRenderContext) => ReactNode` | none | Custom filter input |
| `getSearchValue` | `(row: TData) => string` | `format(value)` | What global search matches against |
| `filterPlaceholder` | `string` | localized | |
| **Grouping / aggregation** | | | |
| `enableGrouping` | `boolean` | table value | |
| `getGroupingValue` | `(row: TData) => unknown` | accessor | |
| `aggregationFn` | `AggregationFnName \| AggregationFn<TData>` | none | `sum \| min \| max \| extent \| mean \| median \| unique \| uniqueCount \| count` |
| `aggregatedCell` | `(ctx) => ReactNode` | formatted | |
| `groupedCell` | `(ctx) => ReactNode` | value + count | |
| **Cell-level props / style** | | | |
| `getCellProps` | `(cell) => TdHTMLProps` | none | |
| `cellClassName` / `headerClassName` | `string \| ((ctx) => string)` | none | |
| `cellStyle` / `headerStyle` | `CSSProperties \| ((ctx) => CSSProperties)` | none | |
| `noWrap` | `boolean` | table `noWrap` | |
| `truncate` | `boolean \| { lines?: number; tooltip?: boolean }` | `false` | Ellipsis with an optional tooltip of the full value |
| **Visibility / responsive** | | | |
| `hideBelow` / `hideAbove` | `Breakpoint` | none | Responsive hiding (not in state; purely presentational) |
| `defaultHidden` | `boolean` | `false` | Initial visibility |
| `enableColumnActions` | `boolean` | table value | |
| `enableExport` | `boolean` | `true` | |
| `exportValue` | `(row: TData) => string \| number` | `format(value)` | |
| **Editing** *(v1.x)* | `enableEditing`, `editVariant`, `renderEditCell`, `validate`, `editOptions` | | |

`CellContext<TData, TValue>`:

```ts
interface CellContext<TData, TValue> {
  table: TableInstance<TData>; row: Row<TData>; column: Column<TData, TValue>; cell: Cell<TData, TValue>;
  getValue(): TValue; renderValue(): TValue | null; formattedValue: string;
  isSelected: boolean; isExpanded: boolean; isPinned: false | 'left' | 'right';
  density: Density; theme: ResolvedTableTheme; breakpoint: Breakpoint;
}
```

`createColumnHelper<TData>()` provides type-inferring builders:

```ts
const col = createColumnHelper<Customer>();
const columns = [
  col.accessor('displayName.companyName', { header: 'Company name', renderFallbackValue: '-' }),
  col.accessor((r) => r.sites?.length ?? 0, { id: 'siteCount', type: 'number' }),
  col.display({ id: 'actions', cell: ({ row }) => <ActionButton ... />, pin: 'right', static: true }),
  col.group({ header: 'Contact', columns: [/* ... */] }),
];
```

## 4. `TableOptions<TData>` (engine, used by `useDataTable` / `createTable`)

This is every non-view prop from §2, plus:

| Option | Type | Description |
|---|---|---|
| `_features` | `TableFeature<TData>[]` | Advanced: custom features |
| `debugTable` / `debugRows` / `debugColumns` | `boolean` | Dev timing logs |
| `defaultColumn` | alias of `columnDefaults` | |
| `renderFallbackValue` | `unknown` | Table-wide fallback |
| `globalFilterFn` | `FilterFnName \| FilterFn` | Default `'includesString'` |
| `getColumnCanGlobalFilter` | `(column) => boolean` | |
| `mergeOptions` | `(defaults, options) => options` | |

## 5. `TableInstance<TData>` API

Grouped by feature. All setters accept an `Updater`.

```ts
// core
getState(): TableState; setState(u); reset(); options; setOptions(u);
getAllColumns(); getAllLeafColumns(); getVisibleLeafColumns(); getColumn(id);
getHeaderGroups(); getLeftHeaderGroups(); getCenterHeaderGroups(); getRightHeaderGroups(); getFooterGroups();
getCoreRowModel(); getRowModel(); getPrePaginationRowModel(); getRow(id, searchAll?);
getRowCount(); getPageCount();
getQuery(): TableQuery;

// data source
refresh(): Promise<void>; invalidate(); getDataStatus(); updateRow(id, u); removeRow(id); insertRow(row, index?);

// sorting
setSorting(u); resetSorting(); getSortedRowModel();
// column: getCanSort(); getIsSorted(): false|'asc'|'desc'; getSortIndex(); toggleSorting(desc?, multi?); clearSorting(); getNextSortingOrder();

// filtering / search
setGlobalFilter(u); resetGlobalFilter(); setColumnFilters(u); resetColumnFilters(); getFilteredRowModel();
clearAllFilters(); getActiveFilterCount();
// column: getCanFilter(); getFilterValue(); setFilterValue(u); getIsFiltered(); getFilterIndex();
//         getFacetedUniqueValues(): Map<unknown, number>; getFacetedMinMaxValues(); loadFacets(): Promise<void>;

// pagination
setPagination(u); setPageIndex(u); setPageSize(u); resetPagination();
nextPage(); previousPage(); firstPage(); lastPage();
getCanNextPage(); getCanPreviousPage(); getPageItems(opts?): PageItem[];

// selection
setRowSelection(u); resetRowSelection(); toggleAllRowsSelected(v?); toggleAllPageRowsSelected(v?);
getIsAllRowsSelected(); getIsSomeRowsSelected(); getIsAllPageRowsSelected(); getIsSomePageRowsSelected();
getSelectedRowModel(); getSelectedRowIds(); getSelectionQuery(); selectAllMatching(); getSelectedCount();

// expansion
setExpanded(u); resetExpanded(); toggleAllRowsExpanded(v?); getIsAllRowsExpanded(); getIsSomeRowsExpanded(); getExpandedRowModel();

// grouping
setGrouping(u); resetGrouping(); getGroupedRowModel();
// column: getCanGroup(); getIsGrouped(); toggleGrouping();

// columns
setColumnVisibility(u); toggleAllColumnsVisible(v?); setColumnOrder(u); moveColumn(id, toIndex);
setColumnPinning(u); getIsSomeColumnsPinned(pos?); setColumnSizing(u); resetColumnSizing(); autosizeColumn(id); autosizeAllColumns();
// column: getIsVisible(); toggleVisibility(); getCanHide(); getIsPinned(); pin(pos); getCanPin();
//         getStart(pos?); getAfter(pos?); getSize(); resetSize(); getCanResize(); getIsResizing(); getResizeHandler();

// row pinning
setRowPinning(u); getTopRows(); getCenterRows(); getBottomRows();

// density
setDensity(u); toggleDensity();

// export
exportCsv(opts?: { fileName?; scope?: 'page' | 'all' | 'selected'; columns?: string[]; delimiter?; bom? }): Promise<string>;
copyToClipboard(opts?): Promise<void>;

// focus / scroll (React layer adds these)
focusCell(rowId, columnId); scrollToRow(rowId, opts?);
```

## 6. Hooks

| Hook | Signature | Purpose |
|---|---|---|
| `useDataTable` | `(options: TableOptions<TData>) => TableInstance<TData>` | Create and subscribe |
| `useTableState` | `(table, selector, isEqual?) => T` | Slice subscription |
| `useTableContext` | `() => TableInstance` | Inside slots |
| `useDataSource` | `(ds, opts) => DataSourceState` | Headless server mode |
| `useTableSlots` | `() => ResolvedSlots` | Inside custom slots, to render other defaults |
| `useVirtualRows` | `(opts) => { virtualRows, totalSize, measureElement, scrollToIndex }` | Headless virtualization |
| `useDetailPanelData` | `(row, loader) => { data, loading, error }` | Lazy per-row panel data, cached by row id |
| `useRouterSync` | `(table, { getSearch, setSearch }) => void` | Router integration |
| `useBreakpoint` | `() => Breakpoint` | Uses theme breakpoints |

## 7. Providers

- `<TableDefaultsProvider value={Partial<DataTableProps<any>>}>`: app-wide defaults (e.g. `theme={classicTheme}`, `localization`, `icons`, `pagination`). Props always win over the provider, and the provider wins over library defaults. Nested providers are merged.
- `<TableThemeProvider theme colorScheme>`: theme tokens only.
- `<TableLocaleProvider localization formatters>`: strings only (wire `i18next` here once).

## 8. Utilities

| Utility | Description |
|---|---|
| `createColumnHelper<T>()` | Typed column builders |
| `defineColumns<T>(cols)` | Identity with inference (for column arrays outside components) |
| `createRestDataSource` / `createLocalDataSource` | 03 §5.3 |
| `getPageItems({ pageIndex, pageCount, siblingCount, boundaryCount, algorithm })` | Pure pagination item generator (05 §4.4) |
| `exportToCsv(rows, columns, opts)` | Standalone CSV |
| `functionalUpdate(updater, old)` | |
| `sortingFns`, `filterFns`, `aggregationFns` | Built-in registries |

## 9. Cell building blocks (styled, optional)

These cover the cell layouts tables need repeatedly, so examples stay short:

| Component | Props | Reproduces |
|---|---|---|
| `ActionButton` | `icon: ReactNode; label: string (tooltip + aria-label); onClick; disabled?; tooltipPlacement?; color?: 'primary' \| 'danger' \| 'neutral'; stopPropagation? (default true)` | Icon button with a tooltip |
| `RowActionsMenu` | `actions: { label; icon?; onClick; disabled?; danger?; hidden? }[]; inlineCount?: number` | The first N are inline and the rest go in a kebab menu |
| `Tooltip` | `content; placement; delay?; children` | Dark tooltip (no dependency, portal + positioning) |
| `Checkbox` | `checked; indeterminate; onChange; disabled; aria-label` | 22px themed checkbox |
| `Chip` | `label; color?; textColor?; borderColor?; onClick?; onDelete?; size?` | |
| `ChipList` | `items; maxVisible (3); renderChip?; overflowLabel?: (n) => string` | Chips with a `+N` overflow |
| `TruncatedText` | `text; maxChars? \| lines?; tooltip? (true)` | Notes cell |
| `MultiLineList` | `items: ReactNode[]; gap?; empty?: ReactNode` | Emails/phones lists |
| `TwoLineText` | `primary; secondary; primaryWeight? (600)` | Address cell |

## 10. Type exports (non-exhaustive)

`DataTableProps, DataTableHandle, TableOptions, TableInstance, TableState, TableQuery, QueryChange, ColumnDef, AnyColumnDef, Column, Header, HeaderGroup, Row, Cell, CellContext, HeaderContext, RowRenderContext, SortingState, ColumnFiltersState, PaginationState, RowSelectionState, ExpandedState, GroupingState, ColumnPinningState, VisibilityState, ColumnSizingState, Density, Updater, DataSource, DataSourceResult, FacetResult, FilterOption, FilterOperator, FilterVariant, SortingFn, FilterFn, AggregationFn, TableSlots, TableSlotProps, SlotName, TableHandlers, HandlerContext, TableIcons, TableLocalization, TableFormatters, TableTheme, ResolvedTableTheme, Breakpoint, ResponsiveValue, PageItem, PaginationVariant, ColumnMeta, TableMeta`.

`ColumnMeta` and `TableMeta` are empty interfaces intended for **module augmentation**:

```ts
declare module 'react-tablekit' {
  interface ColumnMeta<TData, TValue> { exportHeader?: string; }
  interface TableMeta<TData> { onEditRow?: (c: TData) => void; }
}
```

`options.meta` (a `TableMeta`) is available in every render context as `table.options.meta`. This is the recommended way to pass handlers (like `onEditRow`) into column definitions without recreating columns (so the column config is not rebuilt whenever a handler changes).
