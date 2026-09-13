import {
  Fragment,
  memo,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { Cell, Column, Header, Row, TableInstance } from '../../core/types';
import { useTableContext, useView } from '../context';
import { flexRender } from '../flexRender';
import { renderIcon } from '../renderIcon';
import { useVirtualRows } from '../hooks/useVirtualRows';
import { useInert } from '../slots/states';
import type { CellHTMLProps, DataTableProps, RowHTMLProps, RowRenderContext } from '../types';
import { warnOnce } from '../../core/utils';
import {
  cx,
  isInteractiveTarget,
  mergeProps,
  toCssSize,
  useIsomorphicLayoutEffect,
} from '../utils';
import type { ResolvedView } from '../view';
import { CardsView, useCardsLayout } from './cards';
import { headerLabel, isDisplayColumn, renderCellContent, rowClick, toggleSort } from './cells';
import { HeaderExtras as ColumnHeaderExtras, useColumnDrag } from './columnHeader';
import { useKeyboardGrid } from './keyboardGrid';
import { FilterRowView } from './filters';
import { useLayout, useTableVersion } from './layout';

type AnyTable = TableInstance<unknown>;
type AnyColumn = Column<unknown>;
type Offsets = Record<string, number>;
const opts = (table: AnyTable) => table.options as unknown as DataTableProps<unknown>;

/* ── sizing & pinning ─────────────────────────────────────────────────── */

function useSizing(table: AnyTable, view: ResolvedView) {
  return !!table.options.enableColumnResizing || view.props.tableLayout === 'fixed';
}

/** CSS width for `<col>` (B13: widths live in the colgroup so header and body agree). */
function colWidth(column: AnyColumn, px: boolean): string | undefined {
  return px ? `${column.getSize()}px` : toCssSize(column.columnDef.width);
}

/** min/max widths applied consistently to header and body cells (B13). */
function sizeStyle(column: AnyColumn, px: boolean): CSSProperties {
  const def = column.columnDef;
  if (px)
    return { width: column.getSize(), minWidth: column.getSize(), maxWidth: column.getSize() };
  const style: CSSProperties = {};
  if (def.minWidth !== undefined) style.minWidth = toCssSize(def.minWidth);
  if (def.maxWidth !== undefined) style.maxWidth = toCssSize(def.maxWidth);
  return style;
}

/**
 * Sticky offsets for pinned columns: stacked from the measured widths of the pinned header cells
 * (fallback: column sizes). A single pinned column per side always sits at 0.
 */
function usePinOffsets(
  table: AnyTable,
  tableRef: React.RefObject<HTMLTableElement | null>,
): Offsets {
  const left = table.getLeftVisibleLeafColumns();
  const right = table.getRightVisibleLeafColumns();
  const key = `${left.map((c) => c.id).join(',')}|${right.map((c) => c.id).join(',')}`;
  const [measured, setMeasured] = useState<Record<string, number>>({});

  useIsomorphicLayoutEffect(() => {
    const el = tableRef.current;
    if (!el || (left.length <= 1 && right.length <= 1)) return;
    const measure = () => {
      const widths: Record<string, number> = {};
      el.querySelectorAll<HTMLElement>('thead th[data-leaf][data-pinned]').forEach((th) => {
        const id = th.dataset.columnId;
        if (id) widths[id] = th.getBoundingClientRect().width;
      });
      setMeasured((prev) => {
        const same =
          Object.keys(widths).length === Object.keys(prev).length &&
          Object.entries(widths).every(([k, v]) => Math.abs((prev[k] ?? -1) - v) < 0.5);
        return same ? prev : widths;
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [key]);

  const offsets: Offsets = {};
  let sum = 0;
  for (const c of left) {
    offsets[c.id] = sum;
    sum += measured[c.id] ?? c.getSize();
  }
  sum = 0;
  for (let i = right.length - 1; i >= 0; i--) {
    const c = right[i] as AnyColumn;
    offsets[c.id] = sum;
    sum += measured[c.id] ?? c.getSize();
  }
  return offsets;
}

function pinAttrs(table: AnyTable, column: AnyColumn, offsets: Offsets) {
  const pinned = column.getIsPinned();
  if (!pinned) return { style: undefined, attrs: {} };
  const list =
    pinned === 'left' ? table.getLeftVisibleLeafColumns() : table.getRightVisibleLeafColumns();
  const edge =
    pinned === 'left' ? list[list.length - 1]?.id === column.id : list[0]?.id === column.id;
  return {
    style: { '--tk-pin-offset': `${offsets[column.id] ?? 0}px` } as CSSProperties,
    attrs: { 'data-pinned': pinned, 'data-pinned-edge': edge || undefined },
  };
}

const resolveFn = <C, V>(
  value: V | ((ctx: C) => V | undefined) | undefined,
  ctx: C,
): V | undefined => (typeof value === 'function' ? (value as (c: C) => V | undefined)(ctx) : value);

/* ── virtualization (05 §14) ──────────────────────────────────────────── */

/** Row height estimate per density, used when `estimateRowHeight` is not given. */
const DENSITY_ROW_HEIGHT: Record<string, number> = { compact: 36, standard: 48, comfortable: 60 };

/**
 * Whether the body virtualizes: explicit `enableRowVirtualization`, or `'auto'` above
 * `virtualizationThreshold` **rendered** rows (not the server's total). It always needs a bounded
 * height, so an unbounded table renders normally instead of collapsing to an empty window.
 */
function shouldVirtualize(table: AnyTable): boolean {
  const props = opts(table);
  if (props.maxHeight === undefined) return false;
  if (props.enableRowVirtualization === false) return false;
  const rendered = table.getRowModel().rows.length;
  if (props.enableRowVirtualization === true) return true;
  return rendered >= (props.virtualizationThreshold ?? 200);
}

/* ── Container ────────────────────────────────────────────────────────── */

/** Props of `DataTable.Container`. */
export interface ContainerProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Force the "pagination attached below" styling (normally detected automatically). */
  hasFooter?: boolean;
}

/**
 * The positioned scroll container (02 §6). It owns the overlay positioning (fixes B6), the
 * scroll-shadow flags and the bottom border/radius depending on an attached footer (fixes B5).
 */
export function Container({
  children,
  className,
  style,
  hasFooter: hasFooterProp,
}: ContainerProps) {
  const table = useTableContext();
  useTableVersion(table);
  const view = useView();
  const layout = useLayout();
  const [scroll, setScroll] = useState({ left: false, right: false });
  const hasFooter = hasFooterProp ?? layout.footerCount > 0;
  // Below the mobile breakpoint the rows can render as cards instead of a table (05 §13).
  const cards = useCardsLayout();

  useIsomorphicLayoutEffect(() => {
    const el = layout.containerRef.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 0;
      const right = Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 1;
      el.style.setProperty('--tk-container-width', `${el.clientWidth}px`);
      setScroll((s) => (s.left === left && s.right === right ? s : { left, right }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;
    ro?.observe(el);
    if (layout.tableRef.current) ro?.observe(layout.tableRef.current);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [layout.containerRef, layout.tableRef]);

  const { props, slots } = view;
  const base = {
    ref: layout.containerRef,
    className: cx('tk-container', className),
    style: {
      maxHeight: toCssSize(props.maxHeight),
      ...style,
    } as CSSProperties,
    'data-has-footer': hasFooter || undefined,
    'data-scrolled-left': scroll.left || undefined,
    'data-scrolled-right': scroll.right || undefined,
    'data-scrollable': props.maxHeight !== undefined || undefined,
    hasFooter,
    scrolledLeft: scroll.left,
    scrolledRight: scroll.right,
  };
  const merged = view.slot(
    'Container',
    { hasFooter, scrolledLeft: scroll.left, scrolledRight: scroll.right },
    base,
  ) as typeof base;
  return (
    <slots.Container {...merged}>
      {children ?? (
        <>
          {cards ? <CardsView /> : <TableElement />}
          <LoadingOverlay />
        </>
      )}
    </slots.Container>
  );
}

/* ── Table ────────────────────────────────────────────────────────────── */

/** `DataTable.Table`: `<table>` with colgroup, head, body and optional footer. */
export function TableElement({ className, style }: { className?: string; style?: CSSProperties }) {
  const table = useTableContext();
  useTableVersion(table);
  const view = useView();
  const layout = useLayout();
  const headRef = useRef<HTMLTableSectionElement | null>(null);
  const offsets = usePinOffsets(table, layout.tableRef);
  const px = useSizing(table, view);
  const { props, slots, t } = view;
  const columns = table.getVisibleLeafColumns();
  const headerGroups = table.getHeaderGroups();
  const status = table.getDataStatus();
  const busy = status.loading || status.fetching;

  // The overlay starts at the bottom of the header: measured with a ResizeObserver (fixes B11).
  // The container is an ancestor, so its ref is attached *after* this layout effect runs on mount:
  // read it lazily. The ResizeObserver's initial callback (after commit) then sets the value.
  useIsomorphicLayoutEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const update = () => {
      const container = layout.containerRef.current ?? head.closest<HTMLElement>('.tk-container');
      container?.style.setProperty('--tk-head-height', `${head.offsetHeight}px`);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(head);
    return () => ro.disconnect();
  }, [layout.containerRef]);

  if (
    process.env.NODE_ENV !== 'production' &&
    !props['aria-label'] &&
    !props['aria-labelledby'] &&
    !props.caption
  ) {
    warnOnce(
      'Give every table an accessible name: `aria-label`, `aria-labelledby` or `caption` (04 §2.5).',
    );
  }

  const paginated = table.options.enablePagination !== false;
  const rowCount = table.getRowCount();
  // Tree data or grouping give rows a depth, which is exposed as `aria-level`.
  const hierarchical = !!table.options.getSubRows || table.getState().grouping.length > 0;
  const footers =
    props.enableColumnFooters ??
    columns.some(
      (c) => c.columnDef.footer !== undefined || c.columnDef.aggregationFn !== undefined,
    );

  const keyboard = useKeyboardGrid(table, view, layout.tableRef);
  const base = {
    ...keyboard,
    ref: layout.tableRef,
    className: cx('tk-table', className),
    style: {
      minWidth: toCssSize(props.minWidth),
      tableLayout:
        props.tableLayout === 'fixed' || table.options.enableColumnResizing ? 'fixed' : undefined,
      width: table.options.enableColumnResizing ? table.getTotalSize() : undefined,
      ...style,
    } as CSSProperties,
    'aria-label': props['aria-label'],
    'aria-labelledby': props['aria-labelledby'],
    'aria-rowcount': paginated ? (rowCount < 0 ? -1 : rowCount + headerGroups.length) : undefined,
    'aria-busy': busy || undefined,
    // Row ARIA states are conditional on the table's role (ARIA 1.2, axe `aria-conditional-attr`):
    // `aria-selected` needs a grid, and `aria-level` on hierarchical rows needs a treegrid.
    // A virtualized body is a grid too, so the real totals reach screen readers (05 §14).
    role: hierarchical
      ? 'treegrid'
      : table.options.enableRowSelection || shouldVirtualize(table)
        ? 'grid'
        : undefined,
    id: view.id,
    layout: 'table' as const,
  };

  return (
    <slots.Table {...(view.slot('Table', { layout: 'table' }, base) as typeof base)}>
      {props.caption !== undefined && (
        <caption className={props.showCaption ? 'tk-caption' : 'tk-visually-hidden'}>
          {props.caption}
        </caption>
      )}
      <colgroup>
        {columns.map((c) => {
          const width = colWidth(c, px);
          return <col key={c.id} style={width ? { width } : undefined} />;
        })}
      </colgroup>
      <TableHead headRef={headRef} offsets={offsets} px={px} />
      <TableBody offsets={offsets} px={px} />
      {footers && <TableFoot offsets={offsets} px={px} />}
      {status.loading && table.getRowModel().rows.length === 0 && (
        <caption className="tk-visually-hidden">{t('loading')}</caption>
      )}
    </slots.Table>
  );
}

/* ── Head ─────────────────────────────────────────────────────────────── */

function TableHead({
  headRef,
  offsets,
  px,
}: {
  headRef: React.RefObject<HTMLTableSectionElement | null>;
  offsets: Offsets;
  px: boolean;
}) {
  const table = useTableContext();
  const view = useView();
  const { slots, props } = view;
  const groups = table.getHeaderGroups();
  const drag = useColumnDrag(table, view);
  const base = {
    ref: headRef,
    className: 'tk-head',
    'data-sticky': props.enableStickyHeader || undefined,
  };
  return (
    <slots.Head {...(view.slot('Head', {}, base) as typeof base)}>
      {groups.map((group) => {
        const rowBase = { className: 'tk-header-row', headerGroup: group };
        return (
          <slots.HeaderRow
            key={group.id}
            {...(view.slot('HeaderRow', { headerGroup: group }, rowBase) as typeof rowBase)}
          >
            {group.headers.map((header) =>
              header.rowSpan === 0 ? null : (
                <HeaderCellView
                  key={header.id}
                  header={header}
                  offsets={offsets}
                  px={px}
                  depth={groups.length}
                  dragProps={
                    table.options.enableColumnOrdering === true && !header.isPlaceholder
                      ? drag.headerProps(header.column)
                      : undefined
                  }
                />
              ),
            )}
          </slots.HeaderRow>
        );
      })}
      {props.filterDisplayMode === 'row' && table.options.enableColumnFilters !== false && (
        <FilterRowView table={table} />
      )}
    </slots.Head>
  );
}

function HeaderCellView({
  header,
  offsets,
  px,
  dragProps,
}: {
  header: Header<unknown>;
  offsets: Offsets;
  px: boolean;
  depth: number;
  dragProps?: Record<string, unknown> | undefined;
}) {
  const table = useTableContext();
  const view = useView();
  const { slots, t } = view;
  const column = header.column;
  const isLeaf = column.columns.length === 0;
  const canSort = isLeaf && column.getCanSort();
  const isSorted = column.getIsSorted();
  const sortIndex = column.getSortIndex();
  const multiSorted = table.getState().sorting.length > 1;
  const isPinned = column.getIsPinned();
  const pin = pinAttrs(table, column, offsets);
  const def = column.columnDef;
  const align = def.headerAlign ?? column.getAlign();
  const hctx = header.getContext();

  const onSort = (e: React.MouseEvent | React.KeyboardEvent) =>
    void toggleSort(view, table, column, e);
  const label = headerLabel(header, view);
  const direction = isSorted;
  const sortDescription =
    isSorted && sortIndex > 0
      ? `${t(isSorted === 'asc' ? 'sortedAscending' : 'sortedDescending')}, ${t('sortPriority', { index: sortIndex + 1 })}`
      : undefined;

  const content = (
    <span className="tk-header-cell__content">
      {canSort ? (
        <slots.SortButton
          {...(view.slot(
            'SortButton',
            { direction, index: sortIndex, column },
            {
              className: 'tk-sort-button',
              onClick: onSort,
              direction,
              index: multiSorted ? sortIndex : -1,
              column,
            },
          ) as {
            className: string;
            onClick: typeof onSort;
            direction: typeof direction;
            index: number;
            column: AnyColumn;
          })}
        >
          <span className="tk-header-cell__label">{label}</span>
          <slots.SortIcon
            direction={direction}
            index={multiSorted ? sortIndex : -1}
            className="tk-sort-icon"
          />
        </slots.SortButton>
      ) : (
        <span className="tk-header-cell__label">{label}</span>
      )}
      {def.headerTooltip !== undefined && def.headerTooltip !== null && (
        <slots.Tooltip content={def.headerTooltip as ReactNode}>
          <span
            className="tk-header-tooltip"
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focusable so keyboard users can reveal the tooltip
            tabIndex={0}
            role="img"
            aria-label={typeof def.headerTooltip === 'string' ? def.headerTooltip : undefined}
          >
            {renderIcon(view.icons.info)}
          </span>
        </slots.Tooltip>
      )}
    </span>
  );

  const base = {
    className: cx('tk-header-cell', resolveFn(def.headerClassName, hctx)),
    style: {
      ...(isLeaf ? sizeStyle(column, px) : undefined),
      ...pin.style,
      ...resolveFn(def.headerStyle, hctx),
    },
    scope: header.colSpan > 1 ? 'colgroup' : 'col',
    colSpan: header.colSpan > 1 ? header.colSpan : undefined,
    rowSpan: header.rowSpan > 1 ? header.rowSpan : undefined,
    'aria-sort':
      isSorted && sortIndex === 0
        ? isSorted === 'asc'
          ? ('ascending' as const)
          : ('descending' as const)
        : undefined,
    'aria-description': sortDescription,
    'data-column-id': column.id,
    'data-leaf': isLeaf || header.isPlaceholder || undefined,
    'data-sortable': canSort || undefined,
    'data-sorted': isSorted || undefined,
    'data-align': align,
    'data-display': isDisplayColumn(column) || undefined,
    ...pin.attrs,
    ...dragProps,
    header,
    column,
    isSorted,
    sortIndex,
    isPinned,
    canSort,
    onSort,
  };
  const merged = view.slot(
    'HeaderCell',
    { header, column, isSorted, sortIndex, isPinned, canSort, onSort },
    base,
  ) as typeof base;
  return (
    <slots.HeaderCell {...merged}>
      {content}
      <HeaderExtras header={header} />
    </slots.HeaderCell>
  );
}

/**
 * Column actions menu and resize handle. `_headerExtras` replaces them wholesale; otherwise the
 * built-in implementation renders whatever the column allows (05 §9, §11).
 */
function HeaderExtras({ header }: { header: Header<unknown> }) {
  const extras = useView().props._headerExtras as ((h: Header<unknown>) => ReactNode) | undefined;
  if (extras) return <>{extras(header)}</>;
  return <ColumnHeaderExtras header={header} />;
}

/* ── Body ─────────────────────────────────────────────────────────────── */

function TableBody({ offsets, px }: { offsets: Offsets; px: boolean }) {
  const table = useTableContext();
  const view = useView();
  const { slots, props } = view;
  const layout = useLayout();
  const status = table.getDataStatus();
  const columns = table.getVisibleLeafColumns();
  const colSpan = Math.max(1, columns.length);
  const top = table.getTopRows();
  const bottom = table.getBottomRows();
  const center = table.getCenterRows();
  // Memoized because the virtualizer's size estimate closes over it (the engine's models are stable).
  const rows = useMemo(() => [...top, ...center, ...bottom], [top, center, bottom]);
  const blocking =
    status.fetching && rows.length > 0 && props.loadingOverlayBlocksInteraction !== false;
  const inertRef = useInert<HTMLTableSectionElement>(blocking);

  const virtualized = shouldVirtualize(table);
  const density = table.getState().density;
  const estimateRowHeight = props.estimateRowHeight;
  const estimateSize = useCallback(
    (index: number) => {
      if (typeof estimateRowHeight === 'function') {
        const row = rows[index];
        return row ? estimateRowHeight(row) : (DENSITY_ROW_HEIGHT[density] ?? 48);
      }
      return estimateRowHeight ?? DENSITY_ROW_HEIGHT[density] ?? 48;
    },
    [estimateRowHeight, rows, density],
  );
  const getScrollElement = useCallback(() => layout.containerRef.current, [layout.containerRef]);
  const virtual = useVirtualRows({
    count: virtualized ? rows.length : 0,
    getScrollElement,
    estimateSize,
    overscan: props.overscan ?? 8,
    dynamic: true,
  });
  if (
    process.env.NODE_ENV !== 'production' &&
    props.enableRowVirtualization === true &&
    props.maxHeight === undefined &&
    rows.length > 0
  ) {
    warnOnce(
      'Row virtualization needs a bounded height: set `maxHeight` (05 §14). Rendering every row instead.',
    );
  }

  let content: ReactNode;
  if (status.error !== undefined && status.error !== null && rows.length === 0) {
    const retry = () => void view.handle('onRefresh', {}, () => table.refresh());
    content = props.renderErrorState ? (
      <tr className="tk-state-row">
        <td className="tk-state" colSpan={colSpan}>
          {props.renderErrorState({ error: status.error, retry, table })}
        </td>
      </tr>
    ) : (
      <slots.ErrorState
        {...(view.slot(
          'ErrorState',
          { error: status.error, retry, colSpan },
          { error: status.error, retry, colSpan },
        ) as { error: unknown; retry: () => void; colSpan: number })}
      />
    );
  } else if (status.loading && rows.length === 0) {
    if (props.renderEmptyState) {
      content = (
        <tr className="tk-state-row">
          <td className="tk-state" data-state="loading" colSpan={colSpan}>
            {props.renderEmptyState({ reason: 'loading', table })}
          </td>
        </tr>
      );
    } else if (props.loadingDisplay === 'skeleton') {
      content = (
        <slots.SkeletonRows
          table={table}
          rowCount={props.skeletonRowCount ?? Math.min(table.getState().pagination.pageSize, 20)}
          columns={columns}
        />
      );
    } else {
      content = (
        <slots.LoadingRow
          {...(view.slot('LoadingRow', { colSpan }, { table, colSpan }) as {
            table: AnyTable;
            colSpan: number;
          })}
        />
      );
    }
  } else if (rows.length === 0) {
    const filtered = table.getActiveFilterCount() > 0;
    const reason =
      props.emptyStateContent !== undefined && props.emptyStateContent !== null
        ? 'custom'
        : filtered
          ? 'noResults'
          : 'noRows';
    const onClearFilters = filtered
      ? () => void view.handle('onClearFilters', {}, () => table.clearAllFilters())
      : undefined;
    const custom = props.renderEmptyState
      ? props.renderEmptyState({ reason, table })
      : reason === 'custom'
        ? props.emptyStateContent
        : undefined;
    const base = { reason, onClearFilters, colSpan } as const;
    content = (
      <slots.EmptyState {...(view.slot('EmptyState', base, base) as typeof base)}>
        {custom}
      </slots.EmptyState>
    );
  } else {
    const rowSelectionEnabled = !!table.options.enableRowSelection;
    const { pageIndex, pageSize } = table.getState().pagination;
    const headerRows = table.getHeaderGroups().length;
    const paginated = table.options.enablePagination !== false;
    const renderKey = `${table.getQuery().globalFilter}|${pageIndex}`;
    const visible = virtualized ? virtual.virtualRows.map((v) => v.index) : rows.map((_, i) => i);
    const body = visible.map((index) => {
      const row = rows[index]!;
      return (
        <BodyRow
          key={row.id}
          row={row}
          table={table}
          index={index}
          measureElement={virtualized ? virtual.measureElement : undefined}
          cells={row.getVisibleCells()}
          isSelected={row.getIsSelected()}
          isExpanded={row.getIsExpanded()}
          isDisabled={row.getIsDisabled()}
          isPinned={row.getIsPinned()}
          childrenLoading={table.getRowChildrenStatus(row.id).loading}
          ariaRowIndex={paginated ? headerRows + pageIndex * pageSize + index + 1 : undefined}
          selectionEnabled={rowSelectionEnabled}
          offsets={offsets}
          px={px}
          view={view}
          meta={table.options.meta}
          density={table.getState().density}
          renderKey={renderKey}
        />
      );
    });
    // Spacer rows stand in for the rows that are not rendered, so the scrollbar stays honest.
    content = virtualized ? (
      <>
        {virtual.before > 0 && (
          <tr aria-hidden="true" className="tk-virtual-spacer" style={{ height: virtual.before }} />
        )}
        {body}
        {virtual.after > 0 && (
          <tr aria-hidden="true" className="tk-virtual-spacer" style={{ height: virtual.after }} />
        )}
      </>
    ) : (
      body
    );
  }

  const base = { ref: inertRef, className: 'tk-body', 'data-blocked': blocking || undefined, rows };
  return <slots.Body {...(view.slot('Body', { rows }, base) as typeof base)}>{content}</slots.Body>;
}

interface BodyRowProps {
  row: Row<unknown>;
  table: AnyTable;
  index: number;
  cells: Cell<unknown>[];
  isSelected: boolean;
  isExpanded: boolean;
  isDisabled: boolean;
  isPinned: false | 'top' | 'bottom';
  childrenLoading: boolean;
  ariaRowIndex: number | undefined;
  selectionEnabled: boolean;
  offsets: Offsets;
  px: boolean;
  view: ResolvedView;
  meta: unknown;
  density: string;
  renderKey: string;
  /** Set while virtualized: measures the rendered row (05 §14). */
  measureElement?: ((element: HTMLElement | null) => void) | undefined;
}

const shallowOffsetsEqual = (a: Offsets, b: Offsets) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

/** A memoized body row (02 §5): re-renders only when its own state, columns, view or meta change. */
const BodyRow = memo(
  function BodyRow(p: BodyRowProps) {
    const {
      row,
      table: t,
      index,
      cells,
      isSelected,
      isExpanded,
      isDisabled,
      isPinned,
      ariaRowIndex,
      selectionEnabled,
      offsets,
      px,
      view,
      measureElement,
    } = p;
    const { slots, props } = view;
    const firstDataColumn = cells.find((c) => !isDisplayColumn(c.column))?.column.id;
    const treeColumn = props.treeColumnId ?? firstDataColumn;
    const clickable = !!(props.onRowClick ?? props.selectOnRowClick ?? props.expandOnRowClick);

    const renderCell = (cell: Cell<unknown>, overrides?: Partial<CellHTMLProps>): ReactNode => {
      const column = cell.column;
      const def = column.columnDef;
      const ctx = cell.getContext();
      const pin = pinAttrs(t, column, offsets);
      const asHeader = props.firstColumnAsRowHeader !== false && column.id === firstDataColumn;
      const isTree =
        column.id === treeColumn &&
        (row.depth > 0 ||
          t.options.getSubRows !== undefined ||
          t.options.dataSource?.fetchChildren !== undefined);
      const base = {
        className: cx('tk-cell', resolveFn(def.cellClassName, ctx)),
        style: {
          ...sizeStyle(column, px),
          ...pin.style,
          ...(isTree ? ({ '--tk-depth': row.depth } as CSSProperties) : undefined),
          ...resolveFn(def.cellStyle, ctx),
        },
        as: asHeader ? ('th' as const) : ('td' as const),
        scope: asHeader ? 'row' : undefined,
        'data-column-id': column.id,
        'data-align': column.getAlign(),
        'data-valign': def.verticalAlign,
        'data-wrap': def.noWrap === false || undefined,
        'data-nowrap': def.noWrap === true || undefined,
        'data-tree': isTree || undefined,
        'data-display': isDisplayColumn(column) || undefined,
        ...pin.attrs,
        onClick: props.onCellClick
          ? (e: React.MouseEvent) => props.onCellClick?.(cell, e)
          : undefined,
        cell,
        column,
        row,
        isPinned: column.getIsPinned(),
      };
      const withDef = def.getCellProps ? mergeProps(base, def.getCellProps(cell)) : base;
      const merged = view.slot(
        'Cell',
        { cell, column, row, isPinned: base.isPinned },
        overrides ? mergeProps(withDef, overrides) : withDef,
      );
      return (
        <slots.Cell key={cell.id} {...(merged as typeof base)}>
          {renderCellContent(cell, view)}
        </slots.Cell>
      );
    };

    const rowBase: RowHTMLProps & Record<string, unknown> = {
      className: cx('tk-row', props.getRowClassName?.(row)),
      style: props.getRowStyle?.(row),
      ...(measureElement ? { ref: measureElement, 'data-index': index } : {}),
      'data-row-id': row.id,
      'data-selected': isSelected || undefined,
      'data-expanded': isExpanded || undefined,
      'data-disabled': isDisabled || undefined,
      'data-depth': row.depth,
      'data-grouped': row.getIsGrouped() || undefined,
      'data-pinned': isPinned || undefined,
      'data-clickable': (clickable && !isDisabled) || undefined,
      'data-striped': index % 2 === 1 || undefined,
      // B8: aria-selected only when selection is enabled; no checkbox role on rows.
      'aria-selected': selectionEnabled ? isSelected : undefined,
      'aria-rowindex': ariaRowIndex,
      'aria-disabled': isDisabled || undefined,
      'aria-level': t.options.getSubRows || row.getIsGrouped() ? row.depth + 1 : undefined,
      tabIndex: props.onRowClick && props.enableKeyboardNavigation ? -1 : undefined,
      onClick: clickable
        ? (e: React.MouseEvent<HTMLTableRowElement>) => {
            if (isDisabled || isInteractiveTarget(e.target, e.currentTarget)) return;
            void rowClick(view, t, row, e);
          }
        : undefined,
      onDoubleClick: props.onRowDoubleClick
        ? (e: React.MouseEvent<HTMLTableRowElement>) =>
            void view.handle('onRowDoubleClick', { row, event: e }, (ctx) =>
              props.onRowDoubleClick?.(ctx.row, ctx.event),
            )
        : undefined,
      onContextMenu: props.onRowContextMenu
        ? (e: React.MouseEvent) => props.onRowContextMenu?.(row, e)
        : undefined,
      onMouseEnter: props.onRowMouseEnter
        ? (e: React.MouseEvent) => props.onRowMouseEnter?.(row, e)
        : undefined,
      onMouseLeave: props.onRowMouseLeave
        ? (e: React.MouseEvent) => props.onRowMouseLeave?.(row, e)
        : undefined,
    };
    const withGetter = props.getRowProps
      ? mergeProps(rowBase, props.getRowProps(row, t) as Record<string, unknown>)
      : rowBase;
    const slotCtx = { row, isSelected, isExpanded, isDisabled, depth: row.depth, index };
    const rowProps = view.slot('Row', slotCtx, withGetter) as RowHTMLProps;

    const renderDetail = () => (
      <DetailRowView row={row} open={isExpanded} colSpan={cells.length} view={view} table={t} />
    );
    const defaultRender = (overrides?: {
      rowProps?: Partial<RowHTMLProps>;
      children?: ReactNode;
    }) => (
      <Fragment key={row.id}>
        <slots.Row
          {...(overrides?.rowProps
            ? (mergeProps(
                rowProps as Record<string, unknown>,
                overrides.rowProps as Record<string, unknown>,
              ) as RowHTMLProps)
            : rowProps)}
          {...slotCtx}
        >
          {overrides?.children ?? cells.map((c) => renderCell(c))}
        </slots.Row>
        {renderDetail()}
      </Fragment>
    );

    if (props.renderRow) {
      const ctx: RowRenderContext<unknown> = {
        row,
        table: t,
        index,
        rowProps,
        cells,
        renderCell,
        defaultRender,
        renderDetailPanel: renderDetail,
      };
      return <>{props.renderRow(ctx)}</>;
    }
    return defaultRender();
  },
  (a, b) =>
    a.row === b.row &&
    a.table === b.table &&
    a.index === b.index &&
    a.cells === b.cells &&
    a.isSelected === b.isSelected &&
    a.isExpanded === b.isExpanded &&
    a.isDisabled === b.isDisabled &&
    a.isPinned === b.isPinned &&
    a.childrenLoading === b.childrenLoading &&
    a.ariaRowIndex === b.ariaRowIndex &&
    a.selectionEnabled === b.selectionEnabled &&
    a.px === b.px &&
    a.view === b.view &&
    a.meta === b.meta &&
    a.density === b.density &&
    a.renderKey === b.renderKey &&
    shallowOffsetsEqual(a.offsets, b.offsets),
);

/** Collapsible detail row (05 §6.1): lazy, optional keepMounted, animated with grid rows. */
function DetailRowView({
  row,
  open,
  colSpan,
  view,
  table,
}: {
  row: Row<unknown>;
  open: boolean;
  colSpan: number;
  view: ResolvedView;
  table: AnyTable;
}) {
  const props = opts(table);
  const render = props.renderDetailPanel ?? props.renderSubComponent;
  const settings = {
    lazy: true,
    keepMounted: false,
    animate: true,
    fullWidth: true,
    ...view.props.detailPanelProps,
  };
  const [mounted, setMounted] = useState(open || !settings.lazy);
  const [visible, setVisible] = useState(open && !settings.animate);
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizes with timers / animation frames
      setMounted(true);
      if (!settings.animate) {
        setVisible(true);
        return;
      }
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    if (!settings.keepMounted) {
      const timer = setTimeout(() => setMounted(false), settings.animate ? 220 : 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, settings.animate, settings.keepMounted]);

  if (!render || row.getIsGrouped() || (!mounted && !open)) return null;
  const { slots } = view;
  const base = {
    className: 'tk-detail-row',
    id: `${view.id}-detail-${row.id}`,
    'data-open': open || undefined,
    hidden: !open && !visible ? true : undefined,
    row,
    open,
  };
  const panelBase = {
    className: 'tk-detail-panel',
    'data-open': visible || undefined,
    'data-animate': settings.animate || undefined,
    'data-full-width': settings.fullWidth || undefined,
    row,
    open: visible,
  };
  return (
    <slots.DetailRow {...(view.slot('DetailRow', { row, open }, base) as typeof base)}>
      <td colSpan={colSpan} className="tk-detail-cell">
        <slots.DetailPanel
          {...(view.slot('DetailPanel', { row, open: visible }, panelBase) as typeof panelBase)}
        >
          <div className="tk-detail-panel__inner">
            {mounted || open ? render({ row, table }) : null}
          </div>
        </slots.DetailPanel>
      </td>
    </slots.DetailRow>
  );
}

/* ── Foot ─────────────────────────────────────────────────────────────── */

function TableFoot({ offsets, px }: { offsets: Offsets; px: boolean }) {
  const table = useTableContext();
  const view = useView();
  const { slots, props } = view;
  const leaves = table.getLeafHeaders();
  const group = table.getFooterGroups()[0];
  if (!group) return null;
  const scope = table.options.footerAggregationScope ?? 'filtered';
  const rows = scope === 'page' ? table.getRowModel().rows : table.getFilteredRowModel().flatRows;
  const leafRows = rows.filter((r) => !r.getIsGrouped());
  const base = { className: 'tk-foot', 'data-sticky': props.enableStickyFooter || undefined };
  return (
    <slots.Foot {...(view.slot('Foot', {}, base) as typeof base)}>
      <slots.FooterRow className="tk-footer-row" headerGroup={group}>
        {leaves.map((header) => {
          const column = header.column;
          const def = column.columnDef;
          const pin = pinAttrs(table, column, offsets);
          let content: ReactNode = null;
          if (def.footer !== undefined) content = flexRender(def.footer, header.getContext());
          else {
            const agg = column.getAggregationFn();
            if (agg) {
              const v = agg(column.id, leafRows, rows);
              content =
                typeof v === 'number' ? view.formatters.number(v, view.locale) : (v as ReactNode);
            }
          }
          const cellBase = {
            className: 'tk-footer-cell',
            style: { ...sizeStyle(column, px), ...pin.style },
            'data-column-id': column.id,
            'data-align': column.getAlign(),
            ...pin.attrs,
            header,
          };
          return (
            <slots.FooterCell
              key={header.id}
              {...(view.slot('FooterCell', { header }, cellBase) as typeof cellBase)}
            >
              {content}
            </slots.FooterCell>
          );
        })}
      </slots.FooterRow>
    </slots.Foot>
  );
}

/* ── Overlay ──────────────────────────────────────────────────────────── */

/**
 * `DataTable.LoadingOverlay`: shown while refetching with rows on screen, after
 * `loadingOverlayDelayMs` (05 §17). Positioned inside the container below the header (B6, B11).
 */
export function LoadingOverlay() {
  const table = useTableContext();
  useTableVersion(table);
  const view = useView();
  const status = table.getDataStatus();
  const hasRows = table.getRowModel().rows.length > 0;
  const active = status.fetching || (status.loading && hasRows);
  const delay = view.props.loadingOverlayDelayMs ?? 150;
  const [visible, setVisible] = useState(active && delay <= 0);
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizes with timers / animation frames
      setVisible(false);
      return;
    }
    if (delay <= 0) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);
  const blocking = view.props.loadingOverlayBlocksInteraction !== false;
  const base = { className: 'tk-overlay', table, visible: visible && active, blocking };
  return (
    <view.slots.LoadingOverlay
      {...(view.slot('LoadingOverlay', { visible: base.visible, blocking }, base) as typeof base)}
    />
  );
}

/**
 * Dismissible error banner shown above the rows when a refetch fails with stale data (03 §8).
 */
export function ErrorBannerPart() {
  const table = useTableContext();
  useTableVersion(table);
  const view = useView();
  const status = table.getDataStatus();
  const [dismissed, setDismissed] = useState<unknown>(undefined);
  const hasRows = table.getRowModel().rows.length > 0;
  if (status.error === undefined || status.error === null || !hasRows || dismissed === status.error)
    return null;
  const retry = () => void view.handle('onRefresh', {}, () => table.refresh());
  const base = {
    error: status.error,
    retry,
    dismiss: () => setDismissed(status.error),
    className: 'tk-error-banner',
  };
  return <view.slots.ErrorBanner {...(view.slot('ErrorBanner', base, base) as typeof base)} />;
}
