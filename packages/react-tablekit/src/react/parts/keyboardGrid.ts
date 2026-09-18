import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { TableInstance } from '../../core/types';
import type { ResolvedView } from '../view';

type AnyTable = TableInstance<unknown>;

/** Selector for the cells that take part in grid navigation. */
const CELL = 'th[data-column-id], td[data-column-id]';
/** Focusable content inside a cell (Enter moves into it, Escape comes back). */
const INTERACTIVE =
  'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

interface Position {
  row: number;
  col: number;
}

const cellsOfRow = (row: HTMLTableRowElement) => [...row.querySelectorAll<HTMLElement>(CELL)];

/** Every navigable row of the grid: the header rows first, then the body. */
function gridRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return [
    ...table.querySelectorAll<HTMLTableRowElement>('thead > tr'),
    ...table.querySelectorAll<HTMLTableRowElement>('tbody > tr'),
  ].filter((row) => cellsOfRow(row).length > 0);
}

function focusCell(table: HTMLTableElement, position: Position, roving: boolean): Position | null {
  const rows = gridRows(table);
  const row = rows[Math.max(0, Math.min(position.row, rows.length - 1))];
  if (!row) return null;
  const cells = cellsOfRow(row);
  const cell = cells[Math.max(0, Math.min(position.col, cells.length - 1))];
  if (!cell) return null;
  if (roving) {
    // Roving tabindex: exactly one cell is tabbable, so Tab leaves the grid (APG data grid).
    for (const other of table.querySelectorAll<HTMLElement>(CELL)) other.tabIndex = -1;
  }
  cell.tabIndex = 0;
  cell.focus();
  return { row: rows.indexOf(row), col: cells.indexOf(cell) };
}

/**
 * WAI-ARIA "Data Grid" keyboard navigation. Returns the props for the table element; it
 * is only active when `enableKeyboardNavigation` is set.
 */
export function useKeyboardGrid(
  table: AnyTable,
  view: ResolvedView,
  tableRef: React.RefObject<HTMLTableElement | null>,
) {
  const enabled = view.props.enableKeyboardNavigation === true;
  const position = useRef<Position>({ row: 0, col: 0 });
  const inside = useRef(false);

  // One cell must be tabbable so the grid can be entered with Tab.
  useEffect(() => {
    const el = tableRef.current;
    if (!enabled || !el) return;
    const cells = el.querySelectorAll<HTMLElement>(CELL);
    if (cells.length === 0) return;
    if (![...cells].some((cell) => cell.tabIndex === 0)) {
      const rows = gridRows(el);
      const first = rows[position.current.row] ?? rows[0];
      const cell = first ? cellsOfRow(first)[position.current.col] : undefined;
      (cell ?? cells[0])!.tabIndex = 0;
    }
  });

  const move = useCallback(
    (next: Position) => {
      const el = tableRef.current;
      if (!el) return;
      const moved = focusCell(el, next, true);
      if (moved) position.current = moved;
    },
    [tableRef],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTableElement>) => {
      if (!enabled) return;
      const el = tableRef.current;
      if (!el) return;
      const target = event.target as HTMLElement;
      const cell = target.closest<HTMLElement>(CELL);

      // Focus is inside a cell's interactive content: only Escape brings it back to the cell.
      if (inside.current || (cell && target !== cell)) {
        if (event.key === 'Escape' && cell) {
          inside.current = false;
          cell.focus();
          event.preventDefault();
        }
        return;
      }
      if (!cell) return;

      const rows = gridRows(el);
      const rowEl = cell.closest('tr');
      const rowIndex = rowEl ? rows.indexOf(rowEl) : 0;
      const cells = rowEl ? cellsOfRow(rowEl) : [];
      const colIndex = cells.indexOf(cell);
      const current = { row: rowIndex, col: colIndex };
      position.current = current;

      const pageSize = Math.max(1, table.getState().pagination.pageSize);
      const rowId = rowEl?.dataset.rowId;
      const row = rowId === undefined ? undefined : table.getRow(rowId);

      switch (event.key) {
        case 'ArrowRight':
          move({ ...current, col: current.col + 1 });
          break;
        case 'ArrowLeft':
          // On a collapsible row, ← collapses before it moves (APG).
          if (row?.getIsExpanded()) {
            void view.handle('onRowExpand', { row, value: false }, (ctx) =>
              ctx.row.toggleExpanded(ctx.value),
            );
          } else {
            move({ ...current, col: current.col - 1 });
          }
          break;
        case 'ArrowDown':
          move({ ...current, row: current.row + 1 });
          break;
        case 'ArrowUp':
          move({ ...current, row: current.row - 1 });
          break;
        case 'Home':
          move(event.ctrlKey || event.metaKey ? { row: 0, col: 0 } : { ...current, col: 0 });
          break;
        case 'End':
          move(
            event.ctrlKey || event.metaKey
              ? { row: rows.length - 1, col: Number.MAX_SAFE_INTEGER }
              : { ...current, col: Number.MAX_SAFE_INTEGER },
          );
          break;
        case 'PageDown':
          move({ ...current, row: current.row + pageSize });
          break;
        case 'PageUp':
          move({ ...current, row: current.row - pageSize });
          break;
        case 'Enter': {
          const interactive = cell.querySelector<HTMLElement>(INTERACTIVE);
          if (interactive) {
            // A header's sort button or a row action: activate it and stay in the grid.
            if (cell.tagName === 'TH' && cell.closest('thead')) interactive.click();
            else {
              inside.current = true;
              interactive.focus();
            }
          } else if (row) {
            void view.handle(
              'onCellActivate',
              { cell: row.getAllCells()[current.col]!, event },
              () => undefined,
            );
          }
          break;
        }
        case ' ':
          if (row?.getCanSelect()) {
            void view.handle(
              'onRowSelect',
              { row, value: !row.getIsSelected(), range: event.shiftKey, event },
              (ctx) => {
                if (ctx.range && table._selectionAnchor)
                  table.selectRange(table._selectionAnchor, ctx.row.id, ctx.value);
                else ctx.row.toggleSelected(ctx.value);
              },
            );
          } else {
            return;
          }
          break;
        case 'a':
        case 'A':
          if (!(event.ctrlKey || event.metaKey) || !table.options.enableRowSelection) return;
          void view.handle('onSelectAll', { value: true, scope: 'page' }, (ctx) =>
            table.options.selectAllMode === 'all'
              ? table.toggleAllRowsSelected(ctx.value)
              : table.toggleAllPageRowsSelected(ctx.value),
          );
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    [enabled, tableRef, table, view, move],
  );

  if (!enabled) return {};
  return { onKeyDown, 'data-keyboard-grid': true as const };
}
