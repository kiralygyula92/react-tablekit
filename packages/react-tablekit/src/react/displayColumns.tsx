import { useMemo } from 'react';
import type { AnyColumnDef, CellContext, HeaderContext, Row, TableInstance } from '../core/types';
import {
  ActionsHeader,
  ExpandAllHeader,
  ExpandCell,
  RowNumberCell,
  RowNumberHeader,
  SelectAllHeader,
  SelectCell,
} from './parts/displayCells';
import type { DataTableProps } from './types';

/** Ids of the auto-inserted display columns (05 §5, §6.3, §23; 04 §2.6). */
export const DISPLAY_COLUMN_IDS = {
  select: 'tk-select',
  expand: 'tk-expand',
  rowNumber: 'tk-row-number',
  actions: 'tk-actions',
} as const;

/** Display cells are row-type agnostic (Row/Table are invariant in TData). */
const asAny = <TData,>(t: TableInstance<TData>) => t as unknown as TableInstance<unknown>;
const asAnyRow = <TData,>(r: Row<TData>) => r as unknown as Row<unknown>;

const DISPLAY_BASE = {
  enableSorting: false,
  enableColumnFilter: false,
  enableGlobalFilter: false,
  enableHiding: false,
  enableOrdering: false,
  enableResizing: false,
  enableColumnActions: false,
  enableExport: false,
  enableGrouping: false,
} as const;

/**
 * Adds the display columns implied by the options. Their renderers read callbacks such as
 * `renderRowActions` from `table.options` at render time, so passing inline functions does not
 * rebuild the column model.
 */
export function useDisplayColumns<TData>(options: DataTableProps<TData>): AnyColumnDef<TData>[] {
  const columns = options.columns;
  const selection = !!options.enableRowSelection;
  const expansion =
    options.enableExpanding !== false &&
    options.positionExpandColumn !== 'none' &&
    !!(
      options.getSubRows ??
      options.renderDetailPanel ??
      options.renderSubComponent ??
      options.getRowCanExpand ??
      options.dataSource?.fetchChildren
    );
  const rowNumbers = !!options.enableRowNumbers;
  const actions = !!options.renderRowActions;
  const {
    displayColumnDefs,
    rowActionsColumn,
    positionActionsColumn,
    positionExpandColumn,
    positionSelectionColumn,
    stickyActions,
  } = options;

  return useMemo(() => {
    const cols = columns ?? [];
    if (!selection && !expansion && !rowNumbers && !actions) return cols;
    const leading: AnyColumnDef<TData>[] = [];
    const trailing: AnyColumnDef<TData>[] = [];
    if (selection) {
      const def = {
        ...DISPLAY_BASE,
        id: DISPLAY_COLUMN_IDS.select,
        header: (ctx: HeaderContext<TData, unknown>) => (
          <SelectAllHeader table={asAny(ctx.table)} />
        ),
        cell: (ctx: CellContext<TData, unknown>) => (
          <SelectCell row={asAnyRow(ctx.row)} table={asAny(ctx.table)} />
        ),
        width: 48,
        size: 48,
        align: 'center',
        ...displayColumnDefs?.select,
      } as AnyColumnDef<TData>;
      (positionSelectionColumn === 'last' ? trailing : leading).push(def);
    }
    if (expansion) {
      const def = {
        ...DISPLAY_BASE,
        id: DISPLAY_COLUMN_IDS.expand,
        header: (ctx: HeaderContext<TData, unknown>) => (
          <ExpandAllHeader table={asAny(ctx.table)} />
        ),
        cell: (ctx: CellContext<TData, unknown>) => (
          <ExpandCell row={asAnyRow(ctx.row)} table={asAny(ctx.table)} />
        ),
        width: 48,
        size: 48,
        align: 'center',
        ...displayColumnDefs?.expand,
      } as AnyColumnDef<TData>;
      (positionExpandColumn === 'last' ? trailing : leading).push(def);
    }
    if (rowNumbers) {
      leading.push({
        ...DISPLAY_BASE,
        id: DISPLAY_COLUMN_IDS.rowNumber,
        header: () => <RowNumberHeader />,
        cell: (ctx: CellContext<TData, unknown>) => (
          <RowNumberCell row={asAnyRow(ctx.row)} table={asAny(ctx.table)} />
        ),
        width: 56,
        size: 56,
        align: 'right',
        ...displayColumnDefs?.rowNumber,
      } as AnyColumnDef<TData>);
    }
    if (actions) {
      const def = {
        ...DISPLAY_BASE,
        id: DISPLAY_COLUMN_IDS.actions,
        header: () => <ActionsHeader />,
        cell: (ctx: CellContext<TData, unknown>) =>
          (ctx.table.options as DataTableProps<TData>).renderRowActions?.({
            row: ctx.row,
            table: ctx.table,
          }) ?? null,
        align: 'right',
        static: true,
        pin: stickyActions === false ? false : 'right',
        ...displayColumnDefs?.actions,
        ...rowActionsColumn,
      } as AnyColumnDef<TData>;
      (positionActionsColumn === 'first' ? leading : trailing).push(def);
    }
    return [...leading, ...cols, ...trailing];
  }, [
    columns,
    selection,
    expansion,
    rowNumbers,
    actions,
    displayColumnDefs,
    rowActionsColumn,
    positionActionsColumn,
    positionExpandColumn,
    positionSelectionColumn,
    stickyActions,
  ]);
}
