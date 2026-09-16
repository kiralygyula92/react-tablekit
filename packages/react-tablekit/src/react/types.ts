import type {
  ComponentPropsWithRef,
  ComponentType,
  CSSProperties,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';
import type {
  AnyColumnDef,
  Breakpoint,
  Cell,
  Column,
  ColumnDefBase,
  ColumnPinPosition,
  Density,
  FilterOperator,
  FilterOption,
  FilterVariant,
  Header,
  HeaderGroup,
  PageItem,
  PageItemsArgs,
  ResponsiveValue,
  Row,
  SelectionQuery,
  TableInstance,
  TableOptions,
  TableQuery,
  TableState,
} from '../core/types';
import type { TableIcons } from '../icons';
import type { TableFormatters, TableLocalization } from '../locales/types';
import type { DeepPartial, TableTheme } from '../themes/types';

/* ────────────────────────────────────────────────────────────────────────────
 * Display options
 * ──────────────────────────────────────────────────────────────────────────── */

/** Pagination UI variants (05 §4.1). */
export type PaginationVariant =
  'numbered' | 'compact' | 'simple' | 'loadMore' | 'infinite' | 'none';

/** Pagination display options (04 §2.5). */
export interface PaginationDisplayOptions {
  /** @default `{ base: 'compact', md: 'numbered' }` */
  variant?: ResponsiveValue<PaginationVariant>;
  /** @default 'bottom' */
  position?: 'bottom' | 'top' | 'both';
  /** @default `[10, 25, 50, 100]` (`false` in classic) */
  pageSizeOptions?: number[] | false;
  /** "11–20 of 235". @default true (`false` in classic) */
  showRowRange?: boolean;
  /** @default `{ base: true, md: false }` */
  showFirstLast?: ResponsiveValue<boolean>;
  /** @default `{ base: false, md: true }` */
  showPrevNextLabels?: ResponsiveValue<boolean>;
  /** @default 1 */
  siblingCount?: number;
  /** @default 2 */
  boundaryCount?: number;
  /** @default 'classic' */
  pageItemsAlgorithm?: PageItemsArgs['algorithm'];
  /** @default true */
  hideOnSinglePage?: boolean;
  /** @default 'space-between' */
  align?: 'space-between' | 'center' | 'start' | 'end';
}

/** Options for the compact variant, used on small screens. */
export interface CompactPaginationOptions {
  /** @default 0 */
  siblingCount?: number;
  /** @default 2 */
  boundaryCount?: number;
  /** @default 'stable' (MUI-style) */
  pageItemsAlgorithm?: PageItemsArgs['algorithm'];
}

/** Responsive behaviour (05 §13). */
export interface ResponsiveOptions<TData> {
  breakpoints?: Partial<Record<Breakpoint, number>>;
  /** Below this breakpoint the table is "mobile". @default 'md' */
  mobileBreakpoint?: Breakpoint;
  /** @default 'scroll' */
  mobileLayout?: 'scroll' | 'cards';
  /** Columns shown in the card layout (default: every visible column). */
  cardColumns?: string[];
  /** Replaces the whole card in the mobile cards layout. */
  renderCard?: (ctx: { row: Row<TData>; table: TableInstance<TData> }) => ReactNode;
  /** Breakpoint used during SSR. @default 'lg' */
  ssrBreakpoint?: Breakpoint;
}

/** Why an empty/loading/error state is shown. */
export type EmptyReason = 'loading' | 'noRows' | 'noResults' | 'error' | 'custom';

/** `syncState` (03 §7). */
export interface SyncStateOptions {
  url?: { keys?: (keyof TableState)[]; prefix?: string; mode?: 'push' | 'replace' };
  storage?: {
    key: string;
    keys?: (keyof TableState)[];
    storage?: Storage;
    version?: number;
    migrate?: (old: unknown, version: number) => Partial<TableState>;
  };
}

/** Props added to each `<tr>` by `getRowProps`. */
export type RowHTMLProps = ComponentPropsWithRef<'tr'> &
  Record<`data-${string}`, string | number | boolean | undefined>;
/** Props added to each cell. */
export type CellHTMLProps = ComponentPropsWithRef<'td'> &
  Record<`data-${string}`, string | number | boolean | undefined>;

/** Full row override context (06 §4.2). */
export interface RowRenderContext<TData> {
  row: Row<TData>;
  table: TableInstance<TData>;
  index: number;
  /** Computed default props (className, aria, handlers, style). */
  rowProps: RowHTMLProps;
  /** Visible cells in order (pinning applied). */
  cells: Cell<TData>[];
  /** Renders a default cell. */
  renderCell(cell: Cell<TData>, overrides?: Partial<CellHTMLProps>): ReactNode;
  /** Renders the default row. */
  defaultRender(overrides?: { rowProps?: Partial<RowHTMLProps>; children?: ReactNode }): ReactNode;
  /** Renders the default detail row (if expanded). */
  renderDetailPanel(): ReactNode;
}

/** A date range preset for `dateRange` filters. */
export interface DatePreset {
  id: string;
  label: string;
  /** Computes the preset's date range when it is chosen. */
  range: () => [Date, Date];
}

/** One row action for `RowActionsMenu`. */
export interface RowAction {
  label: string;
  icon?: ReactNode;
  /** Runs when the action is chosen. */
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Slots (06 §1)
 * ──────────────────────────────────────────────────────────────────────────── */

type Html<T extends keyof React.JSX.IntrinsicElements> = Omit<
  ComponentPropsWithRef<T>,
  'onChange' | 'onToggle'
> &
  Record<`data-${string}`, string | number | boolean | undefined>;

/** A popover/menu placement. */
export type Placement =
  'top' | 'bottom' | 'left' | 'right' | 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** Props of every slot, by slot name. Each slot also gets `className`/`style` already merged. */
export interface SlotPropsMap<TData> {
  /** The outermost wrapper; carries the theme variables and `data-*` state. */
  Root: Html<'div'> & { table: TableInstance<TData> };
  /** The toolbar row above the table. */
  Toolbar: Html<'div'> & { table: TableInstance<TData> };
  /** The global search box, with its clear button and hotkey hint. */
  SearchInput: {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    placeholder: string;
    label: string;
    clearLabel: string;
    hotkeyHint: string | undefined;
    inputRef: Ref<HTMLInputElement>;
    className?: string | undefined;
    style?: CSSProperties | undefined;
    icon?: ReactNode | undefined;
  } & Omit<Html<'input'>, 'value' | 'onChange' | 'placeholder'>;
  /** Toolbar button that toggles the filter section; shows the active filter count. */
  FiltersButton: Html<'button'> & { activeCount: number; open: boolean; onToggle: () => void };
  /** The filter section: one control per filterable column. */
  FilterPanel: Html<'div'> & {
    columns: Column<TData>[];
    table: TableInstance<TData>;
    open: boolean;
    onApply: () => void;
    onClearAll: () => void;
  };
  /** One column's filter input, chosen by its variant. */
  FilterControl: {
    column: Column<TData>;
    variant: FilterVariant;
    value: unknown;
    setValue: (value: unknown) => void;
    operator: FilterOperator | undefined;
    setOperator: (operator: FilterOperator) => void;
    options: FilterOption[];
    loading: boolean;
    table: TableInstance<TData>;
    id: string;
    label: string;
    className?: string | undefined;
    style?: CSSProperties | undefined;
  };
  /** The row of chips summarising the active filters. */
  ActiveFilterChips: Html<'div'> & {
    filters: {
      id: string;
      label: string;
      color?: string | undefined;
      textColor?: string | undefined;
    }[];
    onRemove: (id: string) => void;
    onClearAll: () => void;
  };
  /** One active-filter chip, with its remove button. */
  FilterChip: Html<'span'> & {
    label: ReactNode;
    color?: string | undefined;
    textColor?: string | undefined;
    onRemove?: () => void | undefined;
    removeLabel: string;
  };
  /** Toolbar button that opens the column visibility menu. */
  ColumnsButton: Html<'button'> & { columns: Column<TData>[]; table: TableInstance<TData> };
  /** The column visibility menu itself. */
  ColumnsMenu: Html<'div'> & {
    columns: Column<TData>[];
    table: TableInstance<TData>;
    onClose: () => void;
  };
  /** Toolbar button cycling compact → standard → comfortable. */
  DensityButton: Html<'button'> & { density: Density; setDensity: (d: Density) => void };
  /** Toolbar export button; `progress` is set while a chunked server export runs. */
  ExportButton: Html<'button'> & {
    onExport: (scope: 'page' | 'all' | 'selected' | 'clipboard') => void;
    progress: number | null;
  };
  /** Bar shown above the table while rows are selected. */
  SelectionBar: Html<'div'> & {
    selectedCount: number;
    totalCount: number;
    allMatchingSelected: boolean;
    onSelectAllMatching: (() => void) | undefined;
    onClear: () => void;
    bulkActions: ReactNode;
    table: TableInstance<TData>;
  };
  /** The positioned scroll container that owns the overlay and the scroll shadows. */
  Container: Html<'div'> & { hasFooter: boolean; scrolledLeft: boolean; scrolledRight: boolean };
  /** The `<table>` element (or the grid wrapper in `layout: 'grid'`). */
  Table: Html<'table'> & { layout: 'table' | 'grid' };
  /** The `<thead>`. */
  Head: Html<'thead'>;
  /** One header row; there is more than one with grouped columns. */
  HeaderRow: Html<'tr'> & { headerGroup: HeaderGroup<TData> };
  /** One header cell, including its sort state and pinning. */
  HeaderCell: Html<'th'> & {
    header: Header<TData>;
    column: Column<TData>;
    isSorted: false | 'asc' | 'desc';
    sortIndex: number;
    isPinned: false | ColumnPinPosition;
    canSort: boolean;
    onSort: (event: React.MouseEvent | React.KeyboardEvent) => void;
  };
  /** The clickable header label that toggles sorting. */
  SortButton: Html<'button'> & {
    direction: false | 'asc' | 'desc';
    index: number;
    column: Column<TData>;
  };
  /** The sort indicator; `index` is the multi-sort priority (`-1` when single). */
  SortIcon: {
    direction: false | 'asc' | 'desc';
    index: number;
    className?: string | undefined;
    style?: CSSProperties | undefined;
  };
  /** The per-header "⋮" button. */
  ColumnActionsButton: Html<'button'> & { column: Column<TData> };
  /** The per-header actions menu (sort, filter, pin, hide, autosize…). */
  ColumnActionsMenu: Html<'div'> & { column: Column<TData>; items: ReactNode; onClose: () => void };
  /** The drag handle on a header's trailing edge. */
  ResizeHandle: Html<'span'> & { column: Column<TData>; isResizing: boolean };
  /** The second header row used by `filterDisplayMode: 'row'`. */
  FilterRow: Html<'tr'>;
  /** One cell of the filter row. */
  FilterRowCell: Html<'th'> & { column: Column<TData> };
  /** The `<tbody>`. */
  Body: Html<'tbody'> & { rows: Row<TData>[] };
  /** One body row, with its selection, expansion and depth state. */
  Row: Html<'tr'> & {
    row: Row<TData>;
    isSelected: boolean;
    isExpanded: boolean;
    isDisabled: boolean;
    depth: number;
    index: number;
  };
  /** One body cell; `as` is `'th'` for the row-header column. */
  Cell: Html<'td'> & {
    cell: Cell<TData>;
    column: Column<TData>;
    row: Row<TData>;
    isPinned: false | ColumnPinPosition;
    as?: 'td' | 'th' | undefined;
  };
  /** The row (or header) selection control; `type` is `'radio'` in single-selection mode. */
  SelectionCheckbox: {
    checked: boolean;
    indeterminate: boolean;
    disabled: boolean;
    onChange: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
    row?: Row<TData> | undefined;
    label: string;
    type?: 'checkbox' | 'radio' | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
  };
  /** The expand/collapse toggle; `loading` is set while lazy children are fetched. */
  ExpandButton: Html<'button'> & {
    expanded: boolean;
    canExpand: boolean;
    loading: boolean;
    onToggle: () => void;
    row: Row<TData>;
  };
  /** The full-width row that holds a detail panel. */
  DetailRow: Html<'tr'> & { row: Row<TData>; open: boolean };
  /** The detail panel's content wrapper. */
  DetailPanel: Html<'div'> & { row: Row<TData>; open: boolean };
  /** A group row: the grouped value, its count and the aggregates. */
  GroupRow: Html<'tr'> & {
    row: Row<TData>;
    groupingColumn: Column<TData>;
    value: unknown;
    count: number;
  };
  /** The grouping cell of a group row (value, count and toggle). */
  GroupCell: Html<'td'> & {
    row: Row<TData>;
    groupingColumn: Column<TData>;
    value: unknown;
    count: number;
  };
  /** The `<tfoot>`. */
  Foot: Html<'tfoot'>;
  /** One footer row. */
  FooterRow: Html<'tr'> & { headerGroup: HeaderGroup<TData> };
  /** One footer cell, rendering the column footer or its aggregate. */
  FooterCell: Html<'td'> & { header: Header<TData> };
  /** The single "Loading…" row shown on the first load. */
  LoadingRow: Html<'tr'> & { table: TableInstance<TData>; colSpan: number };
  /** Placeholder rows shown on the first load when `loadingDisplay: 'skeleton'`. */
  SkeletonRows: {
    table: TableInstance<TData>;
    rowCount: number;
    columns: Column<TData>[];
    className?: string | undefined;
    style?: CSSProperties | undefined;
  };
  /** The refetch overlay: covers the body from below the header. */
  LoadingOverlay: Html<'div'> & {
    table: TableInstance<TData>;
    visible: boolean;
    blocking: boolean;
  };
  /** The busy indicator used by the overlay and the buttons. */
  Spinner: {
    size?: number | string | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
    label?: string | undefined;
  };
  /** The "no rows" / "no results" row; `reason` says which. */
  EmptyState: Html<'tr'> & {
    reason: EmptyReason;
    onClearFilters: (() => void) | undefined;
    colSpan: number;
  };
  /** The error row shown when loading failed and there is nothing to show. */
  ErrorState: Html<'tr'> & { error: unknown; retry: () => void; colSpan: number };
  /** The dismissible banner shown when a refetch failed but stale rows remain. */
  ErrorBanner: Html<'div'> & { error: unknown; retry: () => void; dismiss: () => void };
  /** The pagination bar; every control below is a slot of its own. */
  Pagination: Html<'nav'> & {
    variant: PaginationVariant;
    pageIndex: number;
    pageCount: number;
    pageSize: number;
    rowCount: number;
    items: PageItem[];
    canPrev: boolean;
    canNext: boolean;
    goTo: (pageIndex: number) => void;
    next: () => void;
    prev: () => void;
    first: () => void;
    last: () => void;
    setPageSize: (size: number) => void;
    disabled: boolean;
  };
  /** One numbered page button. */
  PageButton: Html<'button'> & { index: number; selected: boolean };
  /** The "previous page" control. */
  PrevButton: Html<'button'> & { showLabel: boolean };
  /** The "next page" control. */
  NextButton: Html<'button'> & { showLabel: boolean };
  /** The "first page" control. */
  FirstButton: Html<'button'>;
  /** The "last page" control. */
  LastButton: Html<'button'>;
  /** The gap marker between distant page numbers. */
  Ellipsis: Html<'span'>;
  /** The rows-per-page control. */
  PageSizeSelect: {
    value: number;
    options: number[];
    onChange: (size: number) => void;
    label: string;
    disabled?: boolean | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
  };
  /** The "11–20 of 235" summary. */
  RowRange: Html<'span'> & { from: number; to: number; total: number };
  /** The load-more button of the `loadMore` and `infinite` variants. */
  LoadMoreButton: Html<'button'> & { remaining: number; loading: boolean; onLoadMore: () => void };
  /** One card in the mobile cards layout. */
  Card: Html<'article'> & { row: Row<TData> };
  /** The tooltip wrapper used by truncated text and header hints. */
  Tooltip: {
    content: ReactNode;
    placement?: Placement | undefined;
    delay?: number | undefined;
    children: ReactElement;
  };
  /** The menu primitive behind every dropdown (columns, density, export, column actions). */
  Menu: Html<'div'> & {
    open: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    placement?: Placement | undefined;
    label: string;
  };
  /** One menu entry. */
  MenuItem: Html<'button'> & {
    icon?: ReactNode | undefined;
    danger?: boolean | undefined;
    checked?: boolean | undefined;
    role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | undefined;
  };
  /** The popover primitive used by filters and the column menu. */
  Popover: Html<'div'> & {
    open: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    placement?: Placement | undefined;
    label: string;
  };
  /** Primitive: checkbox (or radio). Override it to adopt a design system everywhere at once. */
  Checkbox: {
    checked: boolean;
    indeterminate?: boolean | undefined;
    disabled?: boolean | undefined;
    onChange: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
    'aria-label'?: string | undefined;
    type?: 'checkbox' | 'radio' | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
    id?: string | undefined;
    name?: string | undefined;
  };
  /** Primitive: text button. */
  Button: Html<'button'> & {
    variant?: 'outlined' | 'text' | 'contained' | undefined;
    size?: 'small' | 'medium' | undefined;
    startIcon?: ReactNode | undefined;
    endIcon?: ReactNode | undefined;
  };
  /** Primitive: icon-only button; `label` is its accessible name. */
  IconButton: Html<'button'> & {
    label: string;
    color?: 'primary' | 'danger' | 'neutral' | undefined;
    size?: 'small' | 'medium' | undefined;
  };
  /** Primitive: select. */
  Select: Omit<Html<'select'>, 'value'> & {
    value: string;
    options: { value: string; label: string }[];
    onValueChange: (value: string) => void;
  };
  /** Primitive: text input. */
  TextInput: Omit<Html<'input'>, 'value'> & {
    value: string;
    onValueChange: (value: string) => void;
  };
  Chip: Html<'span'> & {
    label: ReactNode;
    color?: string | undefined;
    textColor?: string | undefined;
    borderColor?: string | undefined;
    onDelete?: () => void | undefined;
    deleteLabel?: string | undefined;
    size?: 'small' | 'medium' | undefined;
  };
}

/** A slot name (PascalCase). */
export type SlotName = keyof SlotPropsMap<unknown>;
/** The key used by `slotProps` / `classNames` / `styles` (camelCase slot name). */
export type SlotKey = Uncapitalize<SlotName>;

/** Replaceable components for every part of the table (06 §1). */
export type TableSlots<TData> = { [K in SlotName]: ComponentType<SlotPropsMap<TData>[K]> };

/** Context passed to function forms of `slotProps` / `classNames` / `styles`. */
export type SlotContext<TData, K extends SlotName> = Omit<
  SlotPropsMap<TData>[K],
  'className' | 'style' | 'children' | 'ref'
> & { table: TableInstance<TData> };

type SlotValue<TData, K extends SlotName, V> = V | ((ctx: SlotContext<TData, K>) => V | undefined);

/** Extra props per slot (object or function of the slot context). */
export type TableSlotProps<TData> = {
  [K in SlotName as Uncapitalize<K>]?: SlotValue<
    TData,
    K,
    Partial<SlotPropsMap<TData>[K]> & Record<string, unknown>
  >;
};
/** Extra class names per slot. */
export type TableClassNames<TData> = {
  [K in SlotName as Uncapitalize<K>]?: SlotValue<TData, K, string>;
};
/** Extra inline styles per slot. */
export type TableStyles<TData> = {
  [K in SlotName as Uncapitalize<K>]?: SlotValue<TData, K, CSSProperties>;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Handlers (06 §5)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Middleware: call `next()` to run the default (optionally with modified input); skip it to cancel. */
export type Handler<Ctx> = (
  ctx: Ctx,
  next: (ctxOverride?: Partial<Ctx>) => void | Promise<void>,
) => void | Promise<void>;

/** Context of each handler. */
export interface HandlerContexts<TData> {
  onSortToggle: {
    column: Column<TData>;
    desc?: boolean | undefined;
    multi: boolean;
    event: unknown;
  };
  onGlobalFilterInput: { value: string; event: unknown };
  onColumnFilterChange: {
    column: Column<TData>;
    value: unknown;
    operator?: FilterOperator | undefined;
  };
  onClearFilters: Record<string, never>;
  onPageChange: { pageIndex: number; reason: 'button' | 'keyboard' | 'infinite' };
  onPageSizeChange: { pageSize: number };
  onRowClick: { row: Row<TData>; event: React.MouseEvent };
  onRowDoubleClick: { row: Row<TData>; event: React.MouseEvent };
  onRowSelect: { row: Row<TData>; value: boolean; range: boolean; event: unknown };
  onSelectAll: { value: boolean; scope: 'page' | 'all' };
  onRowExpand: { row: Row<TData>; value: boolean };
  onColumnResize: { column: Column<TData>; size: number };
  onColumnMove: { columnId: string; toIndex: number };
  onColumnPin: { column: Column<TData>; position: ColumnPinPosition | false };
  onColumnHide: { column: Column<TData>; visible: boolean };
  onExport: { scope: 'page' | 'all' | 'selected' | 'clipboard'; format: 'csv' };
  onRefresh: Record<string, never>;
  onHotkey: { key: string; event: KeyboardEvent };
  onCellActivate: { cell: Cell<TData>; event: React.KeyboardEvent };
}

/** Interaction middleware for every handler name. */
export type TableHandlers<TData> = {
  [K in keyof HandlerContexts<TData>]: Handler<HandlerContexts<TData>[K]>;
};
/** Handler context by name. */
export type HandlerContext<
  TData,
  K extends keyof HandlerContexts<TData>,
> = HandlerContexts<TData>[K];

/* ────────────────────────────────────────────────────────────────────────────
 * DataTable props
 * ──────────────────────────────────────────────────────────────────────────── */

/** View-only props (04 §2). */
export interface DataTableViewProps<TData> {
  // layout & display
  /** @default 'table' (auto 'grid' when virtualized) */
  layout?: 'table' | 'grid';
  /** @default 'auto' */
  tableLayout?: 'auto' | 'fixed';
  /** Table min-width. @default 650 in classic */
  minWidth?: number | string;
  /** Scroll container max-height (enables inner scroll). */
  maxHeight?: number | string;
  /** @default '100%' */
  maxWidth?: ResponsiveValue<number | string>;
  /** @default 'outer' + row dividers */
  bordered?: 'outer' | 'rows' | 'all' | 'none';
  /**
   * The surface the table sits on.
   *
   * `'card'` wraps the table and its pagination in one bordered, filled panel. `'plain'` removes
   * that panel: the table stands directly on the page and the pagination becomes a separate block
   * beneath it, which is what you want when the page already provides the surface.
   *
   * @default 'card'
   * @example
   * <DataTable surface="plain" data={rows} columns={columns} />
   */
  surface?: 'card' | 'plain';
  /**
   * Round the table's outer corners. The radius itself is the `--tk-radius` token, so this is a
   * switch rather than a measurement.
   *
   * @default true on a card, false on a plain surface
   */
  rounded?: boolean;
  /** First data cell rendered as `<th scope="row">`. @default true */
  firstColumnAsRowHeader?: boolean;
  /** `white-space: nowrap` in cells. @default true */
  noWrap?: boolean;
  /** @default 'skeleton' ('text' in classic) */
  loadingDisplay?: 'text' | 'skeleton' | 'spinner';
  /** @default pageSize */
  skeletonRowCount?: number;
  /** @default true */
  loadingOverlayBlocksInteraction?: boolean;
  /** @default true */
  disablePaginationWhileFetching?: boolean;
  /** @default 150 (0 in classic) */
  loadingOverlayDelayMs?: number;
  /** @default 'top' when any toolbar feature is enabled */
  toolbar?: boolean | 'top' | 'bottom' | 'both';
  /** Custom content for the end of the toolbar (e.g. an "Add customer" button). */
  toolbarActions?: ReactNode | ((table: TableInstance<TData>) => ReactNode);
  /** Replaces the leading toolbar group (search, filters, chips). */
  renderToolbarStart?: (table: TableInstance<TData>) => ReactNode;
  /** Replaces the trailing toolbar group (density, columns, export). */
  renderToolbarEnd?: (table: TableInstance<TData>) => ReactNode;
  searchPlaceholder?: string;
  /**
   * Wraps global-search matches in `<mark class="tk-highlight">` in text cells rendered by the
   * default cell renderer (05 §2). @default false
   */
  highlightSearchMatches?: boolean;
  /** e.g. `'mod+k'`, scoped to this table. @default false */
  searchHotkey?: string | false;
  showSearchHotkeyHint?: boolean;
  pagination?: PaginationDisplayOptions;
  compactPagination?: CompactPaginationOptions;
  /** Replaces the empty state; `reason` distinguishes "no rows" from "no results". */
  renderEmptyState?: (ctx: { reason: EmptyReason; table: TableInstance<TData> }) => ReactNode;
  /** Shortcut for a static empty state (e.g. a precondition message). */
  emptyStateContent?: ReactNode;
  /** Replaces the error state shown when loading failed with no rows to fall back on. */
  renderErrorState?: (ctx: {
    error: unknown;
    retry: () => void;
    table: TableInstance<TData>;
  }) => ReactNode;
  /** Visually hidden unless `showCaption`. */
  caption?: ReactNode;
  showCaption?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Base id for aria relationships. @default useId() */
  id?: string;
  dir?: 'ltr' | 'rtl';
  responsive?: ResponsiveOptions<TData>;

  // feature flags with a view component
  enableRowNumbers?: boolean;
  /** @default 'absolute' */
  rowNumberMode?: 'absolute' | 'relative';
  enableStickyHeader?: boolean;
  enableStickyFooter?: boolean;
  enableColumnFooters?: boolean;
  /** @default true (false in classic) */
  enableHover?: boolean;
  enableStriped?: boolean;
  enableKeyboardNavigation?: boolean;
  enableDensityToggle?: boolean;
  enableExport?: boolean;
  /** @default 'panel' */
  filterDisplayMode?: 'panel' | 'popover' | 'row' | 'none';
  /** @default true */
  showActiveFilterChips?: boolean;
  /** @default 'instant' */
  filterApplyMode?: 'instant' | 'manual';
  /** @default 'list' */
  multiSelectDisplay?: 'list' | 'autocomplete';
  /** @default true */
  showFacetCounts?: boolean;
  datePresets?: DatePreset[];
  /** @default true */
  scrollToTopOnPageChange?: boolean;
  /** @default true with multi-selection */
  showSelectionBar?: boolean;
  /** Buttons shown in the selection bar while rows are selected. */
  renderBulkActions?: (ctx: {
    table: TableInstance<TData>;
    selectedRows: Row<TData>[];
    selectionQuery: SelectionQuery;
  }) => ReactNode;
  /** @default true in multiple expand mode */
  enableExpandAll?: boolean;
  treeColumnId?: string;
  /** Adds to, reorders or replaces the entries of a column's actions menu. */
  renderColumnActionsMenuItems?: (ctx: {
    column: Column<TData>;
    table: TableInstance<TData>;
    defaultItems: ReactNode[];
    closeMenu: () => void;
  }) => ReactNode;
  /** @default 'page' */
  exportMode?: 'page' | 'all';
  /** Delegates the export to your backend instead of generating CSV in the browser. */
  onExport?: (query: TableQuery, scope: 'page' | 'all' | 'selected') => void | Promise<void>;
  /** Takes over saving the generated file (a custom download, a share sheet…). */
  onExportFile?: (blob: Blob, fileName: string) => void;
  exportFileName?: string;
  /** Row height estimate for virtualization, in px. @default by density */
  estimateRowHeight?: number | ((row: Row<TData>) => number);
  /** @default 'auto' */
  enableRowVirtualization?: boolean | 'auto';
  /** @default 200 */
  virtualizationThreshold?: number;
  /** @default 8 */
  overscan?: number;
  selectOnRowClick?: boolean;
  /** @default true */
  enableRangeSelection?: boolean;
  expandOnRowClick?: boolean;
  syncState?: SyncStateOptions;

  // rows
  /** Extra attributes and events for each `<tr>`. */
  getRowProps?: (row: Row<TData>, table: TableInstance<TData>) => Partial<RowHTMLProps>;
  /** Extra class names per row. */
  getRowClassName?: (row: Row<TData>) => string | undefined;
  /** Inline styles per row. */
  getRowStyle?: (row: Row<TData>) => CSSProperties | undefined;
  /** Replaces or wraps the whole row; call `defaultRender()` to keep the default markup. */
  renderRow?: (ctx: RowRenderContext<TData>) => ReactNode;
  /** Collapsible content rendered in a full-width row under the expanded row. */
  renderDetailPanel?: (ctx: { row: Row<TData>; table: TableInstance<TData> }) => ReactNode;
  /** Alias of `renderDetailPanel`. */
  renderSubComponent?: (ctx: { row: Row<TData>; table: TableInstance<TData> }) => ReactNode;
  detailPanelProps?: {
    lazy?: boolean;
    keepMounted?: boolean;
    animate?: boolean;
    fullWidth?: boolean;
  };
  /** Action buttons for each row; they go into an auto-inserted actions column. */
  renderRowActions?: (ctx: { row: Row<TData>; table: TableInstance<TData> }) => ReactNode;
  rowActionsColumn?: Partial<ColumnDefBase<TData>> & { id?: string };
  /** @default 'last' */
  positionActionsColumn?: 'first' | 'last';
  /** @default 'first' */
  positionExpandColumn?: 'first' | 'last' | 'none';
  /** @default 'first' */
  positionSelectionColumn?: 'first' | 'last';
  /** Called when a row is clicked (clicks on interactive content are ignored). */
  onRowClick?: (row: Row<TData>, event: React.MouseEvent) => void;
  /** Called on a double click anywhere in the row. */
  onRowDoubleClick?: (row: Row<TData>, event: React.MouseEvent) => void;
  /** Called on a right click / long press, for a custom context menu. */
  onRowContextMenu?: (row: Row<TData>, event: React.MouseEvent) => void;
  /** Called when the pointer enters the row. */
  onRowMouseEnter?: (row: Row<TData>, event: React.MouseEvent) => void;
  /** Called when the pointer leaves the row. */
  onRowMouseLeave?: (row: Row<TData>, event: React.MouseEvent) => void;
  /** Called when a single cell is clicked. */
  onCellClick?: (cell: Cell<TData>, event: React.MouseEvent) => void;

  // customization (06)
  slots?: Partial<TableSlots<TData>>;
  slotProps?: TableSlotProps<TData>;
  classNames?: TableClassNames<TData>;
  styles?: TableStyles<TData>;
  handlers?: Partial<TableHandlers<TData>>;
  icons?: Partial<TableIcons>;
  localization?: Partial<TableLocalization>;
  formatters?: Partial<TableFormatters>;
  displayColumnDefs?: Partial<
    Record<'select' | 'expand' | 'actions' | 'rowNumber' | 'drag', Partial<ColumnDefBase<TData>>>
  >;
  /** Drops the visual theme (structural CSS only). */
  unstyled?: boolean;

  // theming (07)
  theme?: TableTheme | DeepPartial<TableTheme>;
  /** @default 'light' */
  colorScheme?: 'light' | 'dark' | 'auto';
  darkTheme?: TableTheme;
  className?: string;
  style?: CSSProperties;

  // instance access
  /** Receives the table instance, for imperative access from outside the component. */
  tableRef?: (table: TableInstance<TData>) => void;
}

/** `<DataTable>` props: engine options + view props (04 §2). */
export type DataTableProps<TData> = Omit<TableOptions<TData>, 'columns'> &
  DataTableViewProps<TData> & {
    /** Column definitions. Required unless `table` is given. */
    columns?: AnyColumnDef<TData>[];
    /** Render an instance created with `useDataTable`. */
    table?: TableInstance<TData>;
  };

/** The imperative handle of `<DataTable ref>` (04 §2.10). */
export interface DataTableHandle<TData> {
  /** The underlying table instance. */
  table: TableInstance<TData>;
  /** Moves focus into the table (its first interactive cell, or the container). */
  focus(): void;
  /** Scrolls one row into view. */
  scrollToRow(id: string, opts?: { align?: 'start' | 'center' | 'end' }): void;
  /** Scrolls the table's scroll container back to the top. */
  scrollToTop(): void;
}
