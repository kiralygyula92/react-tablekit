import type { Breakpoint, ResolvedTableTheme, ResponsiveValue } from '../themes/types';

export type { Breakpoint, ResponsiveValue } from '../themes/types';

/* ────────────────────────────────────────────────────────────────────────────
 * Generic helpers
 * ──────────────────────────────────────────────────────────────────────────── */

/** A new value, or a function of the previous value. Every setter accepts one. */
export type Updater<T> = T | ((old: T) => T);

/** Change callback used by every controlled state slice. */
export type OnChangeFn<T> = (updater: Updater<T>) => void;

type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date;
type PrevDepth = [never, 0, 1, 2, 3, 4];

/**
 * Dot-separated paths into `T` (up to 4 levels), e.g. `'billingAddress.city'`.
 * Arrays are not traversed.
 */
export type DeepKeys<T, D extends number = 4> = [D] extends [never]
  ? never
  : T extends Primitive | readonly unknown[]
    ? never
    : T extends object
      ? {
          [K in keyof T & string]:
            | K
            | (NonNullable<T[K]> extends Primitive | readonly unknown[]
                ? never
                : `${K}.${DeepKeys<NonNullable<T[K]>, PrevDepth[D]>}`);
        }[keyof T & string]
      : never;

/** The value type at a `DeepKeys` path; optional links on the way make the result optional. */
export type DeepValue<T, K> = K extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? DeepValue<NonNullable<T[Head]>, Rest> | (undefined extends T[Head] ? undefined : never)
    : never
  : K extends keyof T
    ? T[K]
    : never;

/**
 * Anything a view layer can render. `react-tablekit` renders these as React nodes; the core
 * treats them as opaque values.
 */
export type Renderable = string | number | boolean | bigint | null | undefined | object;

/** A static renderable, or a function of the render context returning one. */
export type ColumnTemplate<TProps> = Renderable | ((props: TProps) => Renderable);

/* ────────────────────────────────────────────────────────────────────────────
 * State
 * ──────────────────────────────────────────────────────────────────────────── */

/** One entry of the sorting state (the order of the array is the multi-sort priority). */
export interface ColumnSort {
  id: string;
  desc: boolean;
}
/** Multi-column sorting, in priority order. */
export type SortingState = ColumnSort[];

/** Operators understood by the built-in filter variants. */
export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'empty'
  | 'notEmpty'
  | 'in'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'neq'
  | 'between'
  | 'on'
  | 'before'
  | 'after';

/** One active column filter. `value` is JSON-serializable for built-in variants. */
export interface ColumnFilter {
  id: string;
  value: unknown;
  operator?: FilterOperator;
}
/** All active column filters. */
export type ColumnFiltersState = ColumnFilter[];

/** Pagination state. `cursor` is used by cursor pagination. */
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
  cursor?: string | null;
}

/**
 * Selected row ids. May include ids that are not on the current page.
 *
 * **"Select all matching" (exclusion model):** `{ __all: true }` means every row that
 * matches the current query is selected; ids mapped to `false` are the exceptions.
 */
export type RowSelectionState = Record<string, boolean>;

/** `true` = every row expanded, otherwise row id → expanded. */
export type ExpandedState = true | Record<string, boolean>;

/** Grouped column ids, outermost first. */
export type GroupingState = string[];

/** Pinned column ids per side, in display order. */
export interface ColumnPinningState {
  left: string[];
  right: string[];
}

/** Column id → visible. Missing ids are visible. */
export type VisibilityState = Record<string, boolean>;

/** Column ids in display order. Missing ids keep their definition order after the listed ones. */
export type ColumnOrderState = string[];

/** Column id → width in px (only used when resizing or with a fixed layout). */
export type ColumnSizingState = Record<string, number>;

/** Transient information about an in-progress column resize. */
export interface ColumnSizingInfoState {
  isResizingColumn: string | false;
  startOffset: number | null;
  startSize: number | null;
  deltaOffset: number | null;
}

/** Pinned row ids per side. */
export interface RowPinningState {
  top: string[];
  bottom: string[];
}

/** Row density. Scales cell padding. */
export type Density = 'compact' | 'standard' | 'comfortable';

/** The complete table state. Every slice can be controlled or uncontrolled. */
export interface TableState {
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
  columnSizing: ColumnSizingState;
  columnSizingInfo: ColumnSizingInfoState;
  globalFilter: string;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  grouping: GroupingState;
  expanded: ExpandedState;
  rowPinning: RowPinningState;
  rowSelection: RowSelectionState;
  pagination: PaginationState;
  density: Density;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Query
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The normalized query: everything that affects which rows the server must return.
 * `globalFilter` and text filters are already debounced and min-length gated.
 */
export interface TableQuery {
  pagination: PaginationState;
  sorting: SortingState;
  globalFilter: string;
  columnFilters: ColumnFiltersState;
  grouping: GroupingState;
  expanded?: Record<string, boolean>;
}

/** Why the query changed. */
export type QueryChangeReason =
  'pagination' | 'sorting' | 'globalFilter' | 'columnFilters' | 'grouping' | 'refresh';

/** Passed to `onQueryChange` alongside the new query. */
export interface QueryChange {
  reason: QueryChangeReason;
  previous: TableQuery;
}

/** Which query changes reset the page to 0. */
export type ResetPageReason =
  'globalFilter' | 'columnFilters' | 'sorting' | 'grouping' | 'pageSize';

/**
 * Seed state. Like `Partial<TableState>`, except that the object slices which are merged with the
 * defaults (`columnVisibility`, `columnPinning`, `pagination`) may themselves be partial, so
 * `initialState: { columnPinning: { left: ['name'] } }` is valid.
 */
export type InitialTableState = Partial<Omit<TableState, 'columnPinning' | 'pagination'>> & {
  columnPinning?: Partial<ColumnPinningState>;
  pagination?: Partial<PaginationState>;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Data source
 * ──────────────────────────────────────────────────────────────────────────── */

/** Facets for one column: option values with counts, or a numeric/date range. */
export type FacetResult =
  | { type: 'values'; values: { value: unknown; label?: string; count?: number }[] }
  | { type: 'range'; min: number | string; max: number | string };

/** What a data source's `fetch` resolves to. */
export interface DataSourceResult<TData> {
  rows: TData[];
  /** Total matching rows (offset pagination). `-1` = unknown. */
  rowCount?: number;
  /** Alternative to `rowCount`. */
  pageCount?: number;
  /** Cursor pagination. */
  nextCursor?: string | null;
  prevCursor?: string | null;
  /** The server may normalize/echo the query; the table adopts it without refetching. */
  query?: Partial<TableQuery>;
  facets?: Record<string, FacetResult>;
}

/** A server adapter. Fetch-library agnostic: return a promise and honour the signal. */
export interface DataSource<TData> {
  /** Called with the normalized query and an AbortSignal. Must resolve the page. */
  fetch(
    query: TableQuery,
    ctx: { signal: AbortSignal; reason: QueryChangeReason },
  ): Promise<DataSourceResult<TData>>;
  /** Optional: server-side facets for filter option lists/counts. */
  fetchFacets?(
    columnId: string,
    query: TableQuery,
    ctx: { signal: AbortSignal },
  ): Promise<FacetResult>;
  /** Optional: lazy children for tree rows. */
  fetchChildren?(
    row: Row<TData>,
    query: TableQuery,
    ctx: { signal: AbortSignal },
  ): Promise<TData[]>;
  /** Optional: resolve "select all matching" to ids. */
  fetchAllIds?(query: TableQuery, ctx: { signal: AbortSignal }): Promise<string[]>;
}

/** Loading status exposed by `table.getDataStatus()` and `onStatusChange`. */
export interface DataStatus {
  /** Initial load: no data yet. */
  loading: boolean;
  /** Refetch with existing data (overlay). */
  fetching: boolean;
  error: unknown;
  lastQuery: TableQuery | null;
  lastUpdated: number | null;
}

/** The result of `getSelectionQuery()`: explicit ids, or "all matching except". */
export type SelectionQuery =
  { mode: 'all'; query: TableQuery; except: string[] } | { mode: 'ids'; ids: string[] };

/* ────────────────────────────────────────────────────────────────────────────
 * Function registries
 * ──────────────────────────────────────────────────────────────────────────── */

/** Compares two rows for a column. Return <0, 0 or >0 as for `Array.prototype.sort`. */
export type SortingFn<TData> = (rowA: Row<TData>, rowB: Row<TData>, columnId: string) => number;

/** Context passed to filter functions. */
export interface FilterFnContext {
  operator?: FilterOperator | undefined;
  /** BCP-47 locale used for text comparisons. */
  locale: string;
}

/** Decides whether a row passes a column filter. */
export interface FilterFn<TData> {
  (row: Row<TData>, columnId: string, filterValue: unknown, ctx: FilterFnContext): boolean;
  /** Return `true` for values that should remove the filter (e.g. empty string). */
  autoRemove?: (value: unknown) => boolean;
  /** Pre-process the filter value once per filter pass (e.g. parse dates). */
  resolveFilterValue?: (value: unknown) => unknown;
}

/** Aggregates the leaf rows of a group (or the whole table for footers). */
export type AggregationFn<TData> = (
  columnId: string,
  leafRows: Row<TData>[],
  childRows: Row<TData>[],
) => unknown;

/** Registry of sorting functions. Augment to register custom names. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation point
export interface SortingFnRegistry {}
/** Registry of filter functions. Augment to register custom names. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation point
export interface FilterFnRegistry {}
/** Registry of aggregation functions. Augment to register custom names. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation point
export interface AggregationFnRegistry {}

/** Names of the built-in sorting functions (plus registered ones). */
export type SortingFnName =
  | 'alphanumeric'
  | 'alphanumericCaseSensitive'
  | 'text'
  | 'textCaseSensitive'
  | 'datetime'
  | 'basic'
  | 'boolean'
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- empty until augmented
  | (keyof SortingFnRegistry & string);

/** Names of the built-in filter functions (plus registered ones). */
export type FilterFnName =
  | 'includesString'
  | 'includesStringSensitive'
  | 'equalsString'
  | 'startsWith'
  | 'endsWith'
  | 'equals'
  | 'weakEquals'
  | 'arrIncludes'
  | 'arrIncludesAll'
  | 'arrIncludesSome'
  | 'inNumberRange'
  | 'inDateRange'
  | 'dateEquals'
  | 'before'
  | 'after'
  | 'empty'
  | 'notEmpty'
  | 'fuzzy'
  | 'text'
  | 'number'
  | 'date'
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- empty until augmented
  | (keyof FilterFnRegistry & string);

/** Names of the built-in aggregation functions (plus registered ones). */
export type AggregationFnName =
  | 'sum'
  | 'min'
  | 'max'
  | 'extent'
  | 'mean'
  | 'median'
  | 'unique'
  | 'uniqueCount'
  | 'count'
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- empty until augmented
  | (keyof AggregationFnRegistry & string);

/* ────────────────────────────────────────────────────────────────────────────
 * Columns
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Free-form column metadata. Augment it to type your own keys:
 * `declare module 'react-tablekit' { interface ColumnMeta<TData, TValue> { exportHeader?: string } }`
 */
// @ts-expect-error -- the type parameters exist so augmentations can use them
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type -- augmentation point
export interface ColumnMeta<TData, TValue> {}

/**
 * Free-form table metadata (`table.options.meta`). The recommended way to pass handlers into
 * column definitions without recreating columns.
 */
// @ts-expect-error -- the type parameter exists so augmentations can use it
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type -- augmentation point
export interface TableMeta<TData> {}

/** Horizontal alignment of header and cells. */
export type ColumnAlign = 'left' | 'center' | 'right';
/** Data type of a column; drives defaults for alignment, formatting, sorting and filtering. */
export type ColumnType = 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'custom';
/** Built-in filter UI variants. */
export type FilterVariant =
  | 'text'
  | 'select'
  | 'multiSelect'
  | 'number'
  | 'range'
  | 'rangeSlider'
  | 'date'
  | 'dateRange'
  | 'boolean'
  | 'custom';
/** Pin side of a column. */
export type ColumnPinPosition = 'left' | 'right';

/** An option of a select-like filter. */
export interface FilterOption {
  value: unknown;
  label: string;
  /** Chip background. */
  color?: string;
  /** Chip text colour. */
  textColor?: string;
  icon?: Renderable;
  count?: number;
}

/** Context passed to `header` / `footer` templates. */
export interface HeaderContext<TData, TValue> {
  table: TableInstance<TData>;
  header: Header<TData, TValue>;
  column: Column<TData, TValue>;
}

/** Context passed to `cell` templates and cell-level callbacks. */
export interface CellContext<TData, TValue> {
  table: TableInstance<TData>;
  row: Row<TData>;
  column: Column<TData, TValue>;
  cell: Cell<TData, TValue>;
  /** The raw accessor value of this cell. */
  getValue(): TValue;
  /** Like `getValue`, but `null` instead of `undefined`. */
  renderValue(): TValue | null;
  /** `format(value)`, or the value as a string. */
  formattedValue: string;
  /** Whether the row is selected. */
  isSelected: boolean;
  /** Whether the row is expanded. */
  isExpanded: boolean;
  /** The side this column is pinned to, or `false`. */
  isPinned: false | ColumnPinPosition;
  /** The current row density. */
  density: Density;
  /** The resolved theme, for inline styling decisions. */
  theme: ResolvedTableTheme;
  /** The current breakpoint, for responsive rendering. */
  breakpoint: Breakpoint;
}

/** Context passed to custom filter renderers. */
export interface FilterRenderContext<TData> {
  /** The table instance. */
  table: TableInstance<TData>;
  /** The column being filtered. */
  column: Column<TData>;
  /** The current filter value. */
  value: unknown;
  /** Sets this column's filter value (`undefined` clears it). */
  setValue: (value: unknown) => void;
  /** The current operator, when the variant uses one. */
  operator: FilterOperator | undefined;
  /** Sets the comparison operator. */
  setOperator: (operator: FilterOperator) => void;
  /** The available options, from `filterOptions` or the facets. */
  options: FilterOption[];
}

/** Fields shared by every kind of column definition. */
export interface ColumnDefBase<TData, TValue = unknown> {
  /** Header content. Defaults to the humanized id. */
  header?: ColumnTemplate<HeaderContext<TData, TValue>>;
  /** Short header shown at small widths. */
  headerShort?: ResponsiveValue<Renderable>;
  /** Info tooltip content shown next to the header. */
  headerTooltip?: Renderable;
  /** Cell content. Defaults to the formatted value. */
  cell?: ColumnTemplate<CellContext<TData, TValue>>;
  /** Footer content. */
  footer?: ColumnTemplate<HeaderContext<TData, TValue>>;
  /** Free-form metadata (module-augmentable). */
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- module-augmentable
  meta?: ColumnMeta<TData, TValue>;
  /** @default `'left'`; `'right'` for `type: 'number'` */
  align?: ColumnAlign;
  /** @default the column's `align` */
  headerAlign?: ColumnAlign;
  /** @default `'middle'` */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** Data type. Drives default align, format, sort and filter variant. */
  type?: ColumnType;
  /** Display string (also used by search and export). */
  format?: (value: TValue, row: TData) => string;
  /** Shown for `null` / `undefined` / `''`. @default `'—'` (`'-'` in the classic preset) */
  renderFallbackValue?: Renderable;

  /** Width in px used with resizing / fixed layout. @default 150 */
  size?: number;
  /** CSS width; supports `'15%'` or px. */
  width?: number | string;
  /** @default 40 */
  minSize?: number;
  minWidth?: number | string;
  maxSize?: number;
  maxWidth?: number | string;
  /** Flex-grow share in grid layout. */
  grow?: boolean | number;

  /** Static (frozen) column side. Responsive: `{ base: 'right', md: false }`. */
  pin?: ResponsiveValue<ColumnPinPosition | false>;
  /** The user can't unpin/repin via the UI. */
  lockPin?: boolean;
  /** `false` = always visible (not in the columns menu). @default true */
  enableHiding?: boolean;
  /** `false` = can't be reordered. @default true */
  enableOrdering?: boolean;
  /** Keeps the column first/last in the order (does not stick while scrolling). */
  lockPosition?: 'first' | 'last' | false;
  /** @default true */
  enableResizing?: boolean;
  /**
   * Shortcut for `lockPin + enableHiding: false + enableOrdering: false + enableResizing: false +
   * enableColumnActions: false`.
   */
  static?: boolean;

  /** Whether this column can be sorted. @default the table's `enableSorting` */
  enableSorting?: boolean;
  sortingFn?: SortingFnName | SortingFn<TData>;
  /** Overrides the value used for sorting. */
  sortValue?: (row: TData) => unknown;
  sortDescFirst?: boolean | 'auto';
  /** Where null/undefined go regardless of direction. @default `'last'` */
  sortUndefined?: 'first' | 'last' | false | 1 | -1;
  /** For ranks / "lower is better". */
  invertSorting?: boolean;
  /** Name sent to the server in `sorting[].id`. @default the column id */
  sortServerKey?: string;

  enableColumnFilter?: boolean;
  /** @default `true` for accessor columns */
  enableGlobalFilter?: boolean;
  filterVariant?: FilterVariant;
  filterFn?: FilterFnName | FilterFn<TData>;
  filterOperators?: FilterOperator[];
  /** Values offered by the filter control; a function or promise loads them lazily. */
  filterOptions?:
    | FilterOption[]
    | ((ctx: {
        column: Column<TData, TValue>;
        table: TableInstance<TData>;
      }) => FilterOption[] | Promise<FilterOption[]>);
  /** Name sent to the server in `columnFilters[].id`. @default the column id */
  filterServerKey?: string;
  /** Replaces this column's filter control entirely. */
  renderFilter?: (ctx: FilterRenderContext<TData>) => Renderable;
  /** What global search matches against. @default `format(value)` */
  getSearchValue?: (row: TData) => string;
  filterPlaceholder?: string;
  multiSelectDisplay?: 'list' | 'autocomplete';

  enableGrouping?: boolean;
  /** The value rows are grouped by, when it differs from the cell value. */
  getGroupingValue?: (row: TData) => unknown;
  aggregationFn?: AggregationFnName | AggregationFn<TData>;
  aggregatedCell?: ColumnTemplate<CellContext<TData, TValue>>;
  groupedCell?: ColumnTemplate<CellContext<TData, TValue>>;

  /** Extra attributes and events for this column's cells. */
  getCellProps?: (cell: Cell<TData, TValue>) => Record<string, unknown>;
  /** Class names for this column's body cells. */
  cellClassName?: string | ((ctx: CellContext<TData, TValue>) => string | undefined);
  /** Class names for this column's header cell. */
  headerClassName?: string | ((ctx: HeaderContext<TData, TValue>) => string | undefined);
  /** Inline styles for this column's body cells. */
  cellStyle?:
    | Record<string, string | number>
    | ((ctx: CellContext<TData, TValue>) => Record<string, string | number> | undefined);
  /** Inline styles for this column's header cell. */
  headerStyle?:
    | Record<string, string | number>
    | ((ctx: HeaderContext<TData, TValue>) => Record<string, string | number> | undefined);
  /** @default the table's `noWrap` */
  noWrap?: boolean;
  /** Ellipsis, optionally clamped to N lines, with a tooltip of the full value. */
  truncate?: boolean | { lines?: number; tooltip?: boolean };

  hideBelow?: Breakpoint;
  hideAbove?: Breakpoint;
  /** Initial visibility. */
  defaultHidden?: boolean;
  enableColumnActions?: boolean;
  /** @default true */
  enableExport?: boolean;
  /** The value written to CSV, when it differs from what is displayed. */
  exportValue?: (row: TData) => string | number;
}

/** A column reading `row[accessorKey]` (dot paths supported). */
export interface AccessorKeyColumnDef<TData, TValue = unknown> extends ColumnDefBase<
  TData,
  TValue
> {
  accessorKey: DeepKeys<TData> | (string & {});
  id?: string;
  accessorFn?: never;
  columns?: never;
}

/** A column computing its value with a function. */
export interface AccessorFnColumnDef<TData, TValue = unknown> extends ColumnDefBase<TData, TValue> {
  id: string;
  /** Computes this column's value from the row. */
  accessorFn: (row: TData, index: number) => TValue;
  accessorKey?: never;
  columns?: never;
}

/** A column without a value (actions, custom content). */
export interface DisplayColumnDef<TData, TValue = unknown> extends ColumnDefBase<TData, TValue> {
  id: string;
  accessorKey?: never;
  accessorFn?: never;
  columns?: never;
}

/** A header group spanning several child columns. */
export interface GroupColumnDef<TData, TValue = unknown> extends ColumnDefBase<TData, TValue> {
  id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- child value types are heterogeneous
  columns: ColumnDef<TData, any>[];
  accessorKey?: never;
  accessorFn?: never;
}

/** A column definition. `TValue` is inferred by `createColumnHelper`. */
export type ColumnDef<TData, TValue = unknown> =
  | AccessorKeyColumnDef<TData, TValue>
  | AccessorFnColumnDef<TData, TValue>
  | DisplayColumnDef<TData, TValue>
  | GroupColumnDef<TData, TValue>;

/** Any column definition regardless of its value type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the value type is erased on purpose
export type AnyColumnDef<TData> = ColumnDef<TData, any>;

/** A resolved column. */
export interface Column<TData, TValue = unknown> {
  id: string;
  depth: number;
  /** The definition after `columnDefaults` were merged in. */
  columnDef: ColumnDef<TData, TValue>;
  /** Child columns (group columns only). */
  columns: Column<TData>[];
  parent: Column<TData> | undefined;
  /** `undefined` for display and group columns. */
  accessorFn: ((row: TData, index: number) => TValue) | undefined;
  /** This column and every descendant, depth-first. */
  getFlatColumns(): Column<TData>[];
  /** The leaf columns under this one (itself, when it has no children). */
  getLeafColumns(): Column<TData>[];
  /** Resolved data type (explicit or auto-detected). */
  getType(): ColumnType;
  /** Resolved horizontal alignment (numbers default to `'right'`). */
  getAlign(): ColumnAlign;
  /** The string used for display/search/export. */
  formatValue(value: unknown, row: TData): string;

  // visibility
  /** Whether the column is currently rendered. */
  getIsVisible(): boolean;
  /** Whether the user may hide it (`enableHiding`). */
  getCanHide(): boolean;
  /** Shows or hides the column; toggles when no value is given. */
  toggleVisibility(value?: boolean): void;
  // pinning
  /** The side this column is pinned to, or `false`. */
  getIsPinned(): false | ColumnPinPosition;
  /** Whether the user may pin it (`enableColumnPinning`). */
  getCanPin(): boolean;
  /** Pins the column to a side, or unpins it with `false`. */
  pin(position: ColumnPinPosition | false): void;
  /** Position within its pinned group. */
  getPinnedIndex(): number;
  /** Offset in px from the start of its pinned side (sticky positioning). */
  getStart(position?: ColumnPinPosition): number;
  /** Offset in px from the end of its pinned side. */
  getAfter(position?: ColumnPinPosition): number;
  // sizing
  /** Current width in px (used when resizing is enabled). */
  getSize(): number;
  /** Restores the column's defined width. */
  resetSize(): void;
  /** Whether the user may resize it (`enableColumnResizing`). */
  getCanResize(): boolean;
  /** Whether a resize drag is in progress on this column. */
  getIsResizing(): boolean;
  // ordering
  /** Position among the visible leaf columns. */
  getIndex(): number;
  /** Whether the user may reorder it (`enableColumnOrdering`). */
  getCanOrder(): boolean;
  // sorting
  /** Whether the user may sort by it (`enableSorting`). */
  getCanSort(): boolean;
  /** The current sort direction, or `false` when unsorted. */
  getIsSorted(): false | 'asc' | 'desc';
  /** Position in the multi-sort list (`-1` when unsorted). */
  getSortIndex(): number;
  /** What the next click on the header will do. */
  getNextSortingOrder(): false | 'asc' | 'desc';
  /** The direction the first click applies (`sortDescFirst`). */
  getFirstSortDir(): 'asc' | 'desc';
  /** The comparator inferred from the column's values. */
  getAutoSortingFn(): SortingFn<TData>;
  /** The comparator actually used (explicit `sortingFn`, or the inferred one). */
  getSortingFn(): SortingFn<TData>;
  /** Sorts by this column; `multi` adds it to the sort list instead of replacing it. */
  toggleSorting(desc?: boolean, multi?: boolean): void;
  /** Removes this column from the sort list. */
  clearSorting(): void;
  // filtering
  /** Whether the column can be filtered (`enableColumnFilter`). */
  getCanFilter(): boolean;
  /** Whether the global search looks at this column (`enableGlobalFilter`). */
  getCanGlobalFilter(): boolean;
  /** The filter control to render (explicit `filterVariant`, or inferred from the type). */
  getFilterVariant(): FilterVariant;
  /** The filter predicate in use. */
  getFilterFn(): FilterFn<TData> | undefined;
  /** The active filter value, or `undefined`. */
  getFilterValue(): unknown;
  /** The active filter operator, when the variant supports one. */
  getFilterOperator(): FilterOperator | undefined;
  /** Sets (or clears, with `undefined`) this column's filter. */
  setFilterValue(updater: Updater<unknown>, operator?: FilterOperator): void;
  /** Whether a filter is active on this column. */
  getIsFiltered(): boolean;
  /** Position in the active filter list (`-1` when not filtered). */
  getFilterIndex(): number;
  // faceting
  /** Rows used to compute this column's facets (every other column's filters applied). */
  getFacetedRowModel(): RowModel<TData>;
  /** Distinct values with their counts, for select and multi-select filters. */
  getFacetedUniqueValues(): Map<unknown, number>;
  /** Smallest and largest value, for range filters. */
  getFacetedMinMaxValues(): [number, number] | undefined;
  /** Server facets (from `result.facets` or `fetchFacets`), if loaded. */
  getServerFacets(): FacetResult | undefined;
  /** Requests this column's facets from the data source (server faceting). */
  loadFacets(): Promise<void>;
  // grouping
  /** Whether the column may be grouped by (`enableGrouping`). */
  getCanGroup(): boolean;
  /** Whether rows are currently grouped by this column. */
  getIsGrouped(): boolean;
  /** Position in the grouping list (`-1` when not grouped). */
  getGroupedIndex(): number;
  /** Adds or removes this column from the grouping list. */
  toggleGrouping(): void;
  /** The aggregation used for this column's cells in group rows. */
  getAggregationFn(): AggregationFn<TData> | undefined;
}

/** One header cell (multi-row headers supported). */
export interface Header<TData, TValue = unknown> {
  id: string;
  index: number;
  depth: number;
  column: Column<TData, TValue>;
  headerGroup: HeaderGroup<TData>;
  colSpan: number;
  rowSpan: number;
  /** Placeholder cells fill the space above leaf columns in multi-row headers. */
  isPlaceholder: boolean;
  subHeaders: Header<TData>[];
  /** Every leaf header under this one. */
  getLeafHeaders(): Header<TData>[];
  /** The context object passed to `header` renderers. */
  getContext(): HeaderContext<TData, TValue>;
  /** Width in px of this header (the sum of its leaf columns for a group header). */
  getSize(): number;
  /** Offset in px from the start of its pinned side (sticky positioning). */
  getStart(position?: ColumnPinPosition): number;
}

/** One header row. */
export interface HeaderGroup<TData> {
  id: string;
  depth: number;
  headers: Header<TData>[];
}

/** One cell of a row. */
export interface Cell<TData, TValue = unknown> {
  id: string;
  row: Row<TData>;
  column: Column<TData, TValue>;
  /** The raw accessor value. */
  getValue(): TValue;
  /** The value for rendering: like `getValue`, but `null` instead of `undefined`. */
  renderValue(): TValue | null;
  /** The context object passed to `cell` renderers. */
  getContext(): CellContext<TData, TValue>;
  /** Whether this is the grouping cell of a group row (it shows the value and the count). */
  getIsGrouped(): boolean;
  /** Whether this cell shows an aggregate of the group's rows. */
  getIsAggregated(): boolean;
  /** Whether this cell is blank because another column groups the row. */
  getIsPlaceholder(): boolean;
}

/** A row. Accessor values are cached per row. */
export interface Row<TData> {
  id: string;
  index: number;
  depth: number;
  original: TData;
  subRows: Row<TData>[];
  parentId: string | undefined;
  /** The parent row in tree data, or `undefined` at the top level. */
  getParentRow(): Row<TData> | undefined;
  /** Every ancestor, outermost first. */
  getParentRows(): Row<TData>[];
  /** Every descendant leaf row (itself, when it has no children). */
  getLeafRows(): Row<TData>[];
  /** The accessor value of one column, cached per row. */
  getValue<TValue = unknown>(columnId: string): TValue;
  /** Like `getValue`, but `null` instead of `undefined` (for rendering). */
  renderValue<TValue = unknown>(columnId: string): TValue | null;
  /** The distinct values of one column across this row and its sub-rows (faceting). */
  getUniqueValues<TValue = unknown>(columnId: string): TValue[];
  /** A cell per defined column, hidden ones included. */
  getAllCells(): Cell<TData>[];
  /** The cells that are rendered, in display order. */
  getVisibleCells(): Cell<TData>[];
  /** The visible cells of the left-pinned columns. */
  getLeftVisibleCells(): Cell<TData>[];
  /** The visible cells of the unpinned columns. */
  getCenterVisibleCells(): Cell<TData>[];
  /** The visible cells of the right-pinned columns. */
  getRightVisibleCells(): Cell<TData>[];
  // selection
  /** Whether this row is selected. */
  getIsSelected(): boolean;
  /** Whether some, but not all, of its sub-rows are selected (indeterminate). */
  getIsSomeSelected(): boolean;
  /** Whether every sub-row is selected. */
  getIsAllSubRowsSelected(): boolean;
  /** Whether this row may be selected (`enableRowSelection`). */
  getCanSelect(): boolean;
  /** Whether it takes part in multi-selection and range selection. */
  getCanMultiSelect(): boolean;
  /** Whether selecting it cascades to its sub-rows (`enableSubRowSelection`). */
  getCanSelectSubRows(): boolean;
  /** Selects or deselects the row; toggles when no value is given. */
  toggleSelected(value?: boolean, opts?: { selectChildren?: boolean }): void;
  // expansion
  /** Whether the row is expanded. */
  getIsExpanded(): boolean;
  /** Whether it can expand: it has sub-rows, a detail panel, or lazy children. */
  getCanExpand(): boolean;
  /** Whether every ancestor is expanded, i.e. this row is actually visible. */
  getIsAllParentsExpanded(): boolean;
  /** Expands or collapses the row; toggles when no value is given. */
  toggleExpanded(value?: boolean): void;
  // grouping
  /** Whether this is a group row rather than a data row. */
  getIsGrouped(): boolean;
  groupingColumnId: string | undefined;
  groupingValue: unknown;
  /** Aggregated values of a group row, by column id. */
  _groupingValuesCache: Record<string, unknown>;
  // pinning
  /** Whether the row is pinned above or below the scrolling rows. */
  getIsPinned(): false | 'top' | 'bottom';
  /** Whether the user may pin it (`enableRowPinning`). */
  getCanPin(): boolean;
  /** Pins the row to the top or bottom, or unpins it with `false`. */
  pin(position: 'top' | 'bottom' | false): void;
  // disabled
  /** Whether the row is disabled: it ignores clicks and cannot be selected. */
  getIsDisabled(): boolean;
}

/** A row model: the rows at one pipeline stage. */
export interface RowModel<TData> {
  rows: Row<TData>[];
  flatRows: Row<TData>[];
  rowsById: Record<string, Row<TData>>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Options
 * ──────────────────────────────────────────────────────────────────────────── */

/** `'client'`: the engine computes it. `'server'`: the server does; the engine passes rows through. */
export type DataMode = 'client' | 'server';

/** A pluggable feature (advanced; `options._features`). */
export interface TableFeature<TData> {
  /** Identifies the feature (used in warnings). */
  name: string;
  /** Option defaults this feature contributes, merged under the user's options. */
  getDefaultOptions?(table: TableInstance<TData>): Partial<TableOptions<TData>>;
  /** State slices this feature seeds when the table is created. */
  getInitialState?(initial: Partial<TableState>): Partial<TableState>;
  /** Adds methods or properties to the instance. */
  createTable?(table: TableInstance<TData>): void;
  /** Adds methods or properties to every column. */
  createColumn?(column: Column<TData>, table: TableInstance<TData>): void;
  /** Adds methods or properties to every header. */
  createHeader?(header: Header<TData>, table: TableInstance<TData>): void;
  /** Adds methods or properties to every row. */
  createRow?(row: Row<TData>, table: TableInstance<TData>): void;
  /** Adds methods or properties to every cell. */
  createCell?(
    cell: Cell<TData>,
    row: Row<TData>,
    column: Column<TData>,
    table: TableInstance<TData>,
  ): void;
}

/** Engine options. `DataTableProps` adds view-only props on top. */
export interface TableOptions<TData> {
  /** Rows (client mode), or the current page (controlled server mode). @default [] */
  data?: TData[];
  columns: AnyColumnDef<TData>[];
  /** Strongly recommended; used for keys, selection and expansion. @default index-based */
  getRowId?: (row: TData, index: number, parent?: Row<TData>) => string;
  /** Tree data (client mode). */
  getSubRows?: (row: TData, index: number) => TData[] | undefined;
  /** Server adapter. Implies `dataMode: 'server'`. */
  dataSource?: DataSource<TData>;
  /** Total rows in server mode (`-1` = unknown). */
  rowCount?: number;
  pageCount?: number;
  /** Initial load (no data yet). */
  loading?: boolean;
  /** Refetch with existing data (overlay). */
  fetching?: boolean;
  error?: unknown;

  /** @default `'client'` (`'server'` when `dataSource` is set) */
  dataMode?: DataMode;
  paginationMode?: DataMode;
  sortingMode?: DataMode;
  filterMode?: DataMode;
  searchMode?: DataMode;
  groupingMode?: DataMode;
  facetingMode?: DataMode;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  manualGrouping?: boolean;
  manualFaceting?: boolean;
  manualExpanding?: boolean;
  /** @default `'offset'` */
  paginationType?: 'offset' | 'cursor';
  /**
   * Append each fetched page to the previous ones instead of replacing them. Inferred
   * from a `loadMore` / `infinite` pagination variant; set it explicitly for a custom UI.
   */
  appendPages?: boolean;
  /** Called whenever the normalized query changes, with the reason. */
  onQueryChange?: (query: TableQuery, change: QueryChange) => void;
  /** @default 300 */
  searchDebounceMs?: number;
  /** @default 300 */
  filterDebounceMs?: number;
  /** @default 0 */
  searchMinLength?: number;
  /** @default every reason */
  resetPageOn?: ResetPageReason[];
  /** @default true */
  keepPreviousData?: boolean;
  /** @default true */
  fetchOnMount?: boolean;
  refetchInterval?: number;
  /** @default false */
  refetchOnWindowFocus?: boolean;
  /** Called when a data-source request fails, for logging or a toast. */
  onError?: (error: unknown, query: TableQuery) => void;
  acknowledgePageLocalSorting?: boolean;
  acknowledgePageLocalFiltering?: boolean;
  /** Called whenever the loading/fetching/error status changes. */
  onStatusChange?: (status: DataStatus) => void;
  /** @default 0 (in-flight only) */
  dedupeMs?: number;

  state?: Partial<TableState>;
  initialState?: InitialTableState;
  onStateChange?: OnChangeFn<TableState>;
  onSortingChange?: OnChangeFn<SortingState>;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  onGlobalFilterChange?: OnChangeFn<string>;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onExpandedChange?: OnChangeFn<ExpandedState>;
  onGroupingChange?: OnChangeFn<GroupingState>;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  onColumnOrderChange?: OnChangeFn<ColumnOrderState>;
  onColumnPinningChange?: OnChangeFn<ColumnPinningState>;
  onColumnSizingChange?: OnChangeFn<ColumnSizingState>;
  onColumnSizingInfoChange?: OnChangeFn<ColumnSizingInfoState>;
  onRowPinningChange?: OnChangeFn<RowPinningState>;
  onDensityChange?: OnChangeFn<Density>;
  /** @default true in client mode, false with manual pagination */
  autoResetPageIndex?: boolean;
  /** @default true */
  autoResetExpanded?: boolean;
  /** @default false */
  autoResetSelection?: boolean;

  /** @default true */
  enableSorting?: boolean;
  /** @default true */
  enableMultiSort?: boolean;
  /** @default 3 */
  maxMultiSortColCount?: number;
  /** @default true */
  enableSortingRemoval?: boolean;
  /** @default false */
  sortDescFirst?: boolean;
  /** Decides whether a click adds to the sort list. @default Shift+click */
  isMultiSortEvent?: (event: unknown) => boolean;
  /** @default true */
  enableGlobalFilter?: boolean;
  /** @default true */
  enableColumnFilters?: boolean;
  /** Master switch for all filtering. @default true */
  enableFilters?: boolean;
  /** @default true */
  enableFacetedValues?: boolean;
  /** @default `'all-words'` */
  globalFilterMatch?: 'all-words' | 'any-word' | 'phrase';
  /** @default `'includesString'` */
  globalFilterFn?: FilterFnName | FilterFn<TData>;
  /** Decides per column whether the global search looks at it. */
  getColumnCanGlobalFilter?: (column: Column<TData>) => boolean;
  /** @default false */
  filterFromLeafRows?: boolean;
  /** @default Infinity */
  maxLeafRowFilterDepth?: number;
  /** @default true */
  enablePagination?: boolean;
  /** @default false */
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  /** Alias of the function form of `enableRowSelection`. */
  getRowCanSelect?: (row: Row<TData>) => boolean;
  /** `false` = single selection. @default true */
  enableMultiRowSelection?: boolean | ((row: Row<TData>) => boolean);
  /** @default true */
  enableSubRowSelection?: boolean | ((row: Row<TData>) => boolean);
  /** @default `'page'` */
  selectAllMode?: 'page' | 'all';
  /** @default false client / true server */
  clearSelectionOnQueryChange?: boolean;
  /** Auto when `getSubRows`, `renderDetailPanel` or `getRowCanExpand` is set. */
  enableExpanding?: boolean;
  /** Decides per row whether it can expand (lazy children that are not loaded yet). */
  getRowCanExpand?: (row: Row<TData>) => boolean;
  /** @default `'multiple'` */
  expandMode?: 'multiple' | 'single';
  /** @default true */
  paginateExpandedRows?: boolean;
  /** @default false */
  enableGrouping?: boolean;
  /** @default `'reorder'` */
  groupedColumnMode?: 'reorder' | 'remove' | false;
  /** @default true */
  enableColumnPinning?: boolean;
  /** @default false */
  enableRowPinning?: boolean | ((row: Row<TData>) => boolean);
  /** @default true */
  keepPinnedRows?: boolean;
  /** @default false */
  enableColumnResizing?: boolean;
  /** @default `'onChange'` */
  columnResizeMode?: 'onChange' | 'onEnd';
  /** @default `'ltr'` */
  columnResizeDirection?: 'ltr' | 'rtl';
  /** @default false */
  enableColumnOrdering?: boolean;
  /** @default true */
  enableHiding?: boolean;
  /** @default false */
  enableColumnActions?: boolean;
  /** Disabled rows are dimmed, not selectable/clickable. */
  isRowDisabled?: (row: Row<TData>) => boolean;
  /** Convenience alias: pins the actions column right. */
  stickyActions?: boolean;
  /** @default `'filtered'` */
  footerAggregationScope?: 'page' | 'filtered';

  /** Merged into every column. */
  columnDefaults?: Partial<ColumnDefBase<TData>>;
  /** Alias of `columnDefaults`. */
  defaultColumn?: Partial<ColumnDefBase<TData>>;
  /** Table-wide fallback for empty values. */
  renderFallbackValue?: Renderable;
  sortingFns?: Record<string, SortingFn<TData>>;
  filterFns?: Record<string, FilterFn<TData>>;
  aggregationFns?: Record<string, AggregationFn<TData>>;
  /** BCP-47 locale for collation/formatting. @default `navigator.language` / `'en-US'` */
  locale?: string;
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- module-augmentable
  meta?: TableMeta<TData>;
  /** Advanced: custom features. */
  _features?: TableFeature<TData>[];
  debugTable?: boolean;
  debugRows?: boolean;
  debugColumns?: boolean;
  /** Advanced: customizes how new options are merged into the instance on each render. */
  mergeOptions?: (
    defaults: TableOptions<TData>,
    options: Partial<TableOptions<TData>>,
  ) => TableOptions<TData>;
  /** @internal Supplied by the view layer: current theme and breakpoint. */
  _renderContext?: { theme: ResolvedTableTheme; breakpoint: Breakpoint };
  /** @internal Set by the view layer for `renderDetailPanel`. */
  _hasDetailPanel?: boolean;
  /** Server facets in controlled server mode (with `manualFaceting`), by column id. */
  facets?: Record<string, FacetResult>;
  /** Rows per chunk for server "export all". @default 1000 */
  exportChunkSize?: number;
  /** Cap for server "export all". @default 10000 */
  exportMaxRows?: number;
}

/** Options after defaults and mode aliases were resolved. */
export type ResolvedTableOptions<TData> = TableOptions<TData> & {
  data: TData[];
  manualPagination: boolean;
  manualSorting: boolean;
  manualFiltering: boolean;
  manualGlobalFiltering: boolean;
  manualGrouping: boolean;
  manualFaceting: boolean;
  locale: string;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Instance
 * ──────────────────────────────────────────────────────────────────────────── */

/** Options for `getPageItems`. */
export interface PageItemsArgs {
  pageIndex: number;
  pageCount: number;
  siblingCount?: number;
  boundaryCount?: number;
  /**
   * How the page items are laid out: `'classic'` (MUI-like) or `'stable'` (a constant number of
   * slots, so the bar never shifts), or your own function. @default 'classic'
   */
  algorithm?:
    'classic' | 'stable' | ((args: Required<Omit<PageItemsArgs, 'algorithm'>>) => PageItem[]);
}

/** One item of a pagination bar. */
export type PageItem =
  { type: 'page'; index: number; selected: boolean } | { type: 'ellipsis'; key: string };

/** CSV export options. */
export interface ExportCsvOptions {
  fileName?: string;
  scope?: 'page' | 'all' | 'selected';
  /** Column ids to export. @default every exportable visible column */
  columns?: string[];
  /** @default `','` */
  delimiter?: string;
  /** Prepend a UTF-8 BOM (for Excel). @default true */
  bom?: boolean;
  /**
   * Prefix fields that a spreadsheet would run as a formula — starting with `=`, `+`, `-` or `@` —
   * with `'`, so Excel, Sheets and LibreOffice show them as text (CSV injection). Plain numbers are
   * left alone. Also applies to copying to the clipboard. Turn it off only for data you trust.
   * @default true
   */
  escapeFormulas?: boolean;
  /** Called with progress (0–1) during server chunked export. */
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

/** The table instance. All setters accept an `Updater`. */
export interface TableInstance<TData> {
  // core
  options: ResolvedTableOptions<TData>;
  initialState: TableState;
  /** The current state: internal slices merged with any controlled ones. */
  getState(): TableState;
  /** Replaces the whole state. Controlled slices are reported through their `on*Change`. */
  setState(updater: Updater<TableState>): void;
  /** Replaces the options (the React layer calls this on every render). */
  setOptions(updater: Updater<TableOptions<TData>>): void;
  /** Subscribes to state changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Restores every state slice to `initialState`. */
  reset(): void;
  /** The top-level columns, group columns included. */
  getAllColumns(): Column<TData>[];
  /** Every column, flattened across group levels. */
  getAllFlatColumns(): Column<TData>[];
  /** Every leaf column (group columns excluded). */
  getAllLeafColumns(): Column<TData>[];
  /** The leaf columns that are rendered, in display order. */
  getVisibleLeafColumns(): Column<TData>[];
  /** The visible leaf columns pinned to the left. */
  getLeftVisibleLeafColumns(): Column<TData>[];
  /** The visible leaf columns that are not pinned. */
  getCenterVisibleLeafColumns(): Column<TData>[];
  /** The visible leaf columns pinned to the right. */
  getRightVisibleLeafColumns(): Column<TData>[];
  /** Looks up a column by id. */
  getColumn(id: string): Column<TData> | undefined;
  /** One entry per header row (more than one with grouped columns). */
  getHeaderGroups(): HeaderGroup<TData>[];
  /** Header groups restricted to the left-pinned columns. */
  getLeftHeaderGroups(): HeaderGroup<TData>[];
  /** Header groups restricted to the unpinned columns. */
  getCenterHeaderGroups(): HeaderGroup<TData>[];
  /** Header groups restricted to the right-pinned columns. */
  getRightHeaderGroups(): HeaderGroup<TData>[];
  /** Footer rows, mirroring the header groups. */
  getFooterGroups(): HeaderGroup<TData>[];
  /** The leaf headers of the last header row. */
  getLeafHeaders(): Header<TData>[];
  /** Stage 1: the rows built from `data`, before any filtering. */
  getCoreRowModel(): RowModel<TData>;
  /** Stage 2: after the global search and column filters. */
  getFilteredRowModel(): RowModel<TData>;
  /** Stage 3: after grouping (group rows inserted). */
  getGroupedRowModel(): RowModel<TData>;
  /** Stage 4: after sorting. */
  getSortedRowModel(): RowModel<TData>;
  /** Stage 5: after expansion (sub-rows of expanded rows included). */
  getExpandedRowModel(): RowModel<TData>;
  /** The rows that pagination will slice. */
  getPrePaginationRowModel(): RowModel<TData>;
  /** Stage 6: the current page. */
  getPaginationRowModel(): RowModel<TData>;
  /** The rows to render: the end of the pipeline. */
  getRowModel(): RowModel<TData>;
  /** Looks up a row by id; `searchAll` also searches rows outside the current page. */
  getRow(id: string, searchAll?: boolean): Row<TData> | undefined;
  /** Total matching rows: the server's count in server mode (`-1` = unknown). */
  getRowCount(): number;
  /** Number of pages, derived from the row count and page size. */
  getPageCount(): number;
  /** The normalized query, with server keys applied. */
  getQuery(): TableQuery;
  /** Applies pending debounced query changes immediately. */
  flushQuery(): void;
  /** Resolved breakpoint from the view layer (`'lg'` without one). */
  getBreakpoint(): Breakpoint;

  // data source
  /** Refetches the current query. */
  refresh(): Promise<void>;
  /** Marks the data stale so the next mount or focus refetches it. */
  invalidate(): void;
  /** Loading, fetching, error and last-updated flags of the data source. */
  getDataStatus(): DataStatus;
  /** Optimistically updates one loaded row. */
  updateRow(id: string, updater: Updater<TData>): void;
  /** Optimistically removes one loaded row. */
  removeRow(id: string): void;
  /** Optimistically inserts a row at `index` (0 by default). */
  insertRow(row: TData, index?: number): void;
  /** Cursor pagination: the next/previous cursors from the last result. */
  getCursors(): { next: string | null | undefined; prev: string | null | undefined };

  // sorting
  /** Replaces the sort list. */
  setSorting(updater: Updater<SortingState>): void;
  /** Clears sorting, or restores `initialState` with `true`. */
  resetSorting(defaultState?: boolean): void;

  // filtering / search
  /** Sets the global search term (debounced before it reaches the query). */
  setGlobalFilter(updater: Updater<string>): void;
  /** Clears the search, or restores `initialState` with `true`. */
  resetGlobalFilter(defaultState?: boolean): void;
  /** Replaces every column filter. */
  setColumnFilters(updater: Updater<ColumnFiltersState>): void;
  /** Clears the column filters, or restores `initialState` with `true`. */
  resetColumnFilters(defaultState?: boolean): void;
  /** Clears the search and every column filter at once. */
  clearAllFilters(): void;
  /** How many filters are active, the global search included. */
  getActiveFilterCount(): number;
  /** The rows the global search sees (column filters applied). */
  getGlobalFacetedRowModel(): RowModel<TData>;

  // pagination
  /** Replaces the whole pagination slice. */
  setPagination(updater: Updater<PaginationState>): void;
  /** Goes to a page (0-based); clamped to the available range. */
  setPageIndex(updater: Updater<number>): void;
  /** Changes the page size, keeping the first visible row where possible. */
  setPageSize(updater: Updater<number>): void;
  /** Returns to page 1, or restores `initialState` with `true`. */
  resetPagination(defaultState?: boolean): void;
  /** Advances one page, if there is one. */
  nextPage(): void;
  /** Goes back one page, if there is one. */
  previousPage(): void;
  /** Jumps to the first page. */
  firstPage(): void;
  /** Jumps to the last page (offset pagination only). */
  lastPage(): void;
  /** Whether a next page exists (cursor-aware). */
  getCanNextPage(): boolean;
  /** Whether a previous page exists. */
  getCanPreviousPage(): boolean;
  /** The page buttons and ellipses to render for the current page. */
  getPageItems(opts?: Omit<PageItemsArgs, 'pageIndex' | 'pageCount'>): PageItem[];

  // selection
  /** Replaces the selection (ids, or the `__all` exclusion model in server mode). */
  setRowSelection(updater: Updater<RowSelectionState>): void;
  /** Clears the selection, or restores `initialState` with `true`. */
  resetRowSelection(defaultState?: boolean): void;
  /** Selects or deselects every selectable row in the dataset. */
  toggleAllRowsSelected(value?: boolean): void;
  /** Selects or deselects every selectable row on the current page. */
  toggleAllPageRowsSelected(value?: boolean): void;
  /** Whether every selectable row is selected. */
  getIsAllRowsSelected(): boolean;
  /** Whether some, but not all, rows are selected (indeterminate). */
  getIsSomeRowsSelected(): boolean;
  /** Whether every selectable row on this page is selected. */
  getIsAllPageRowsSelected(): boolean;
  /** Whether some, but not all, rows on this page are selected. */
  getIsSomePageRowsSelected(): boolean;
  /** The selected rows that are currently loaded. */
  getSelectedRowModel(): RowModel<TData>;
  /** The ids of the selected rows. */
  getSelectedRowIds(): string[];
  /** What to send to a server for a bulk action: ids, or the query plus exclusions. */
  getSelectionQuery(): SelectionQuery;
  /** Selects every row matching the current query, including rows not yet loaded. */
  selectAllMatching(): void;
  /** Whether "select all matching" is active with no exclusions. */
  getIsAllMatchingSelected(): boolean;
  /** How many rows are selected (the server total when selecting all matching). */
  getSelectedCount(): number;
  /** Selects/deselects every selectable row between two rows (inclusive) in display order. */
  selectRange(fromRowId: string, toRowId: string, value?: boolean): void;

  // expansion
  /** Replaces the expansion state (`true` expands every row). */
  setExpanded(updater: Updater<ExpandedState>): void;
  /** Collapses everything, or restores `initialState` with `true`. */
  resetExpanded(defaultState?: boolean): void;
  /** Expands or collapses every expandable row. */
  toggleAllRowsExpanded(value?: boolean): void;
  /** Whether every expandable row is expanded. */
  getIsAllRowsExpanded(): boolean;
  /** Whether at least one row is expanded. */
  getIsSomeRowsExpanded(): boolean;
  /** Whether anything can expand at all (sub-rows, detail panels or lazy children). */
  getCanSomeRowsExpand(): boolean;
  /** Lazy children state for a row (server `fetchChildren`). */
  getRowChildrenStatus(rowId: string): { loading: boolean; error: unknown };

  // grouping
  /** Replaces the grouping columns (multi-level, outermost first). */
  setGrouping(updater: Updater<GroupingState>): void;
  /** Removes all grouping, or restores `initialState` with `true`. */
  resetGrouping(defaultState?: boolean): void;

  // columns
  /** Replaces the visibility map (missing ids are visible). */
  setColumnVisibility(updater: Updater<VisibilityState>): void;
  /** Shows every column again, or restores `initialState` with `true`. */
  resetColumnVisibility(defaultState?: boolean): void;
  /** Shows or hides every hideable column. */
  toggleAllColumnsVisible(value?: boolean): void;
  /** Whether every column is visible. */
  getIsAllColumnsVisible(): boolean;
  /** Whether at least one column is visible. */
  getIsSomeColumnsVisible(): boolean;
  /** Replaces the display order (ids; unlisted columns keep their defined order). */
  setColumnOrder(updater: Updater<ColumnOrderState>): void;
  /** Restores the defined order, or `initialState` with `true`. */
  resetColumnOrder(defaultState?: boolean): void;
  /** Moves a column to a position among the visible leaf columns. */
  moveColumn(id: string, toIndex: number): void;
  /** Replaces the pinned column ids per side. */
  setColumnPinning(updater: Updater<ColumnPinningState>): void;
  /** Unpins everything, or restores `initialState` with `true`. */
  resetColumnPinning(defaultState?: boolean): void;
  /** Whether anything is pinned (optionally on one side). */
  getIsSomeColumnsPinned(position?: ColumnPinPosition): boolean;
  /** Pinning as actually rendered: state plus locked, static and responsive pins. */
  getEffectiveColumnPinning(): ColumnPinningState;
  /** Replaces the per-column widths in px. */
  setColumnSizing(updater: Updater<ColumnSizingState>): void;
  /** Updates the in-progress resize (drag offsets). */
  setColumnSizingInfo(updater: Updater<ColumnSizingInfoState>): void;
  /** Restores the defined widths, or `initialState` with `true`. */
  resetColumnSizing(defaultState?: boolean): void;
  /** Total width in px of the visible leaf columns. */
  getTotalSize(): number;
  /** Sizes one column to its content; pass a measured width to skip measuring. */
  autosizeColumn(id: string, measuredWidth?: number): void;
  /** Sizes every resizable column to its content. */
  autosizeAllColumns(measure?: (columnId: string) => number | undefined): void;

  // row pinning
  /** Replaces the pinned row ids per side. */
  setRowPinning(updater: Updater<RowPinningState>): void;
  /** Unpins every row, or restores `initialState` with `true`. */
  resetRowPinning(defaultState?: boolean): void;
  /** Rows pinned to the top, in display order. */
  getTopRows(): Row<TData>[];
  /** The unpinned rows of the current page. */
  getCenterRows(): Row<TData>[];
  /** Rows pinned to the bottom. */
  getBottomRows(): Row<TData>[];

  // density
  /** Sets the row density. */
  setDensity(updater: Updater<Density>): void;
  /** Cycles compact → standard → comfortable. */
  toggleDensity(): void;

  // export
  /** Builds CSV text for the requested scope (server exports fetch in chunks). */
  exportCsv(opts?: ExportCsvOptions): Promise<string>;
  /** Copies the same CSV to the clipboard. */
  copyToClipboard(opts?: ExportCsvOptions): Promise<void>;

  // focus / scroll: provided by the React layer (no-ops in core)
  /** Moves focus to one cell (no-op without the React layer). */
  focusCell(rowId: string, columnId: string): void;
  /** Scrolls a row into view (no-op without the React layer). */
  scrollToRow(rowId: string, opts?: { align?: 'start' | 'center' | 'end' }): void;

  /** @internal */
  _features: TableFeature<TData>[];
  /** @internal Resolves a sorting fn by name. */
  _getSortingFn(name: string): SortingFn<TData> | undefined;
  /** @internal Resolves a filter fn by name. */
  _getFilterFn(name: string): FilterFn<TData> | undefined;
  /** @internal Resolves an aggregation fn by name. */
  _getAggregationFn(name: string): AggregationFn<TData> | undefined;
  /** @internal Starts data fetching / timers. Called by the view layer on mount. */
  _mount(): () => void;
  /** @internal The debounced query with column ids (not server keys). */
  _getInternalQuery(): TableQuery;
  /** @internal Filters a row model, optionally ignoring one column's filter (faceting). */
  _filterRows(model: RowModel<TData>, excludeColumnId?: string): RowModel<TData>;
  /** @internal Server facets for a column. */
  _getServerFacets(columnId: string): FacetResult | undefined;
  /** @internal Loads server facets for a column. */
  _loadFacets(columnId: string): Promise<void>;
  /** @internal Increments on every notification; a cheap `useSyncExternalStore` snapshot. */
  _getVersion(): number;
  /** @internal Last row toggled by the user (range selection anchor). */
  _selectionAnchor: string | undefined;
  /** @internal View-layer hooks (focus, scroll). */
  _view: {
    focusCell?: ((rowId: string, columnId: string) => void) | undefined;
    scrollToRow?:
      ((rowId: string, opts?: { align?: 'start' | 'center' | 'end' }) => void) | undefined;
  };
}
