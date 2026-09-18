import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { Column, Header, TableInstance } from '../../core/types';
import { useTableContext, useView } from '../context';
import { renderIcon } from '../renderIcon';
import type { DataTableProps } from '../types';
import type { ResolvedView } from '../view';
import { FilterControlPart } from './filters';

type AnyTable = TableInstance<unknown>;
type AnyColumn = Column<unknown>;

const props = (table: AnyTable) => table.options as unknown as DataTableProps<unknown>;

/* ── resize handle ────────────────────────────────────────────────────── */

/** Keyboard steps of the resize handle. */
const STEP = 10;
const BIG_STEP = 50;

function ResizeHandle({ column }: { column: AnyColumn }) {
  const table = useTableContext();
  const view = useView();
  const startRef = useRef<{ x: number; size: number } | null>(null);
  const isResizing = column.getIsResizing();
  const mode = table.options.columnResizeMode ?? 'onChange';

  const apply = (size: number) => {
    const next = Math.round(size);
    void view.handle('onColumnResize', { column, size: next }, (ctx) => {
      table.setColumnSizing((prev) => ({ ...prev, [ctx.column.id]: ctx.size }));
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    // Not implemented in every environment (jsdom, older Safari); dragging works without it.
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    startRef.current = { x: event.clientX, size: column.getSize() };
    table.setColumnSizingInfo({
      isResizingColumn: column.id,
      startOffset: event.clientX,
      startSize: column.getSize(),
      deltaOffset: 0,
    });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const start = startRef.current;
    if (!start) return;
    const delta = event.clientX - start.x;
    table.setColumnSizingInfo((info) => ({ ...info, deltaOffset: delta }));
    // `onEnd` only shows the guide line; `onChange` resizes live.
    if (mode === 'onChange') apply(start.size + delta);
  };

  const finish = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const start = startRef.current;
    startRef.current = null;
    if (start && mode === 'onEnd') apply(start.size + (event.clientX - start.x));
    table.setColumnSizingInfo({
      isResizingColumn: false,
      startOffset: null,
      startSize: null,
      deltaOffset: null,
    });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    const step = event.shiftKey ? BIG_STEP : STEP;
    if (event.key === 'ArrowLeft') apply(column.getSize() - step);
    else if (event.key === 'ArrowRight') apply(column.getSize() + step);
    else if (event.key === 'Enter' || event.key === ' ') column.resetSize();
    else return;
    event.preventDefault();
  };

  const base = {
    className: 'tk-resize-handle',
    column,
    isResizing,
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    'aria-label': view.t('resizeColumn'),
    'aria-valuenow': Math.round(column.getSize()),
    tabIndex: 0,
    'data-resizing': isResizing || undefined,
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onKeyDown,
    onDoubleClick: () => {
      table.autosizeColumn(column.id);
    },
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
    },
  };
  return (
    <view.slots.ResizeHandle
      // eslint-disable-next-line react-hooks/refs -- view.slot only merges props; it never reads refs during render
      {...(view.slot('ResizeHandle', { column, isResizing }, base) as typeof base)}
    />
  );
}

/* ── column actions menu ──────────────────────────────────────────────── */

function ColumnActions({ column }: { column: AnyColumn }) {
  const table = useTableContext();
  const view = useView();
  const [open, setOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const close = () => setOpen(false);
  const { t, icons, slots } = view;

  const item = (key: string, label: string, onClick: () => void, icon?: ReactNode) => (
    <slots.MenuItem
      key={key}
      icon={icon}
      onClick={() => {
        close();
        onClick();
      }}
    >
      {label}
    </slots.MenuItem>
  );

  const pinned = column.getIsPinned();
  const defaultItems: ReactNode[] = [
    ...(column.getCanSort()
      ? [
          item(
            'sort-asc',
            t('sortAscending'),
            () => column.toggleSorting(false),
            renderIcon(icons.sortAsc),
          ),
          item(
            'sort-desc',
            t('sortDescending'),
            () => column.toggleSorting(true),
            renderIcon(icons.sortDesc),
          ),
          ...(column.getIsSorted()
            ? [item('sort-clear', t('clearSort'), () => column.clearSorting())]
            : []),
        ]
      : []),
    // "Filter…" opens this column's own control in a popover, in any display mode.
    ...(column.getCanFilter()
      ? [
          item('filter', t('filterColumn'), () => {
            setFilterOpen(true);
          }),
        ]
      : []),
    ...(column.getCanGroup()
      ? [
          item('group', column.getIsGrouped() ? t('ungroup') : t('groupBy'), () =>
            column.toggleGrouping(),
          ),
        ]
      : []),
    ...(column.getCanPin()
      ? [
          ...(pinned === 'left'
            ? []
            : [item('pin-left', t('pinLeft'), () => pinColumn(view, column, 'left'))]),
          ...(pinned === 'right'
            ? []
            : [item('pin-right', t('pinRight'), () => pinColumn(view, column, 'right'))]),
          ...(pinned ? [item('unpin', t('unpin'), () => pinColumn(view, column, false))] : []),
        ]
      : []),
    ...(column.getCanHide()
      ? [
          item(
            'hide',
            t('hideColumn'),
            () =>
              void view.handle('onColumnHide', { column, visible: false }, (ctx) =>
                ctx.column.toggleVisibility(ctx.visible),
              ),
          ),
        ]
      : []),
    ...(column.getCanResize()
      ? [
          item('autosize', t('autosize'), () => {
            table.autosizeColumn(column.id);
          }),
          item('reset-size', t('resetSize'), () => {
            column.resetSize();
          }),
        ]
      : []),
  ];

  const custom = props(table).renderColumnActionsMenuItems;
  const items = custom ? custom({ column, table, defaultItems, closeMenu: close }) : defaultItems;

  const buttonBase = {
    ref: anchorRef,
    column,
    className: 'tk-column-actions',
    'aria-label': `${view.t('columnActions')}: ${column.id}`,
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      setOpen((o) => !o);
    },
  };
  return (
    <>
      <slots.ColumnActionsButton
        // eslint-disable-next-line react-hooks/refs -- view.slot only merges props; it never reads refs during render
        {...(view.slot('ColumnActionsButton', { column }, buttonBase) as typeof buttonBase)}
      >
        {renderIcon(icons.more)}
      </slots.ColumnActionsButton>
      <slots.Menu open={open} onClose={close} anchorRef={anchorRef} label={view.t('columnActions')}>
        <slots.ColumnActionsMenu column={column} items={items} onClose={close} />
      </slots.Menu>
      <slots.Popover
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        anchorRef={anchorRef}
        label={t('filterColumn')}
        placement="bottom-start"
      >
        <FilterControlPart column={column} table={table} />
      </slots.Popover>
    </>
  );
}

function pinColumn(view: ResolvedView, column: AnyColumn, position: 'left' | 'right' | false) {
  void view.handle('onColumnPin', { column, position }, (ctx) => {
    ctx.column.pin(ctx.position);
  });
}

/* ── ordering by pointer drag ─────────────────────────────────────────── */

/** Drag state shared by the header cells of one table. */
export interface ColumnDragState {
  dragging: string | null;
  over: string | null;
}

export function useColumnDrag(table: AnyTable, view: ResolvedView) {
  const [state, setState] = useState<ColumnDragState>({ dragging: null, over: null });

  const move = (fromId: string, toId: string) => {
    const columns = table.getVisibleLeafColumns();
    const from = columns.findIndex((c) => c.id === fromId);
    const to = columns.findIndex((c) => c.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    void view.handle('onColumnMove', { columnId: fromId, toIndex: to }, (ctx) => {
      table.moveColumn(ctx.columnId, ctx.toIndex);
      const column = table.getColumn(ctx.columnId);
      view.announce(
        view.t('announceMove', {
          column:
            typeof column?.columnDef.header === 'string' ? column.columnDef.header : ctx.columnId,
          position: ctx.toIndex + 1,
          count: columns.length,
        }),
      );
    });
  };

  return {
    state,
    /** Props for a draggable header cell. */
    headerProps(column: AnyColumn) {
      if (!column.getCanOrder()) return {};
      return {
        draggable: true,
        'data-dragging': state.dragging === column.id || undefined,
        'data-drag-over': state.over === column.id || undefined,
        onDragStart: (event: React.DragEvent) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', column.id);
          setState({ dragging: column.id, over: null });
        },
        onDragOver: (event: React.DragEvent) => {
          if (!state.dragging || state.dragging === column.id) return;
          event.preventDefault();
          setState((s) => (s.over === column.id ? s : { ...s, over: column.id }));
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault();
          const fromId = state.dragging ?? event.dataTransfer.getData('text/plain');
          setState({ dragging: null, over: null });
          if (fromId) move(fromId, column.id);
        },
        onDragEnd: () => {
          setState({ dragging: null, over: null });
        },
      };
    },
    move,
  };
}

/* ── the header extras hook used by TableView ─────────────────────────── */

/**
 * Renders the per-header column actions menu and resize handle. `DataTable` installs
 * it as `_headerExtras`, so custom layouts get the same behaviour for free.
 */
export function HeaderExtras({ header }: { header: Header<unknown> }) {
  const table = useTableContext();
  const column = header.column;
  const showActions = table.options.enableColumnActions === true && !header.isPlaceholder;
  const showResize = column.getCanResize() && !header.isPlaceholder;
  if (!showActions && !showResize) return null;
  return (
    <span className="tk-header-extras">
      {showActions && <ColumnActions column={column} />}
      {showResize && <ResizeHandle column={column} />}
    </span>
  );
}
