import type { Cell, CellContext, Column, Row, TableInstance } from './types';
import { lightTheme } from '../themes';
import { toText } from './text';
import { fold, memo } from './utils';

/** Internal fields carried by every row (not part of the public `Row` contract). */
export interface RowInternals<TData> extends Row<TData> {
  _table: TableInstance<TData>;
  _valuesCache: Record<string, unknown>;
  _uniqueValuesCache: Record<string, unknown[]>;
  _searchCache: Record<string, string>;
  _foldedSearchCache: Record<string, string>;
  _sortCache: Record<string, unknown>;
  _cellsMemo?: () => Cell<TData>[];
  _visibleCellsMemo?:
    | (() => {
        all: Cell<TData>[];
        left: Cell<TData>[];
        center: Cell<TData>[];
        right: Cell<TData>[];
      })
    | undefined;
  _leafRows?: Row<TData>[] | undefined;
  _locale: string;
  _getSortValue(columnId: string): unknown;
  _getSearchValue(columnId: string): string;
  _getFoldedSearchValue(columnId: string): string;
}

type AnyRow = RowInternals<unknown>;

/** Builds the per-table prototype shared by every row (keeps rows small for 100k datasets). */
export function createRowPrototype<TData>(table: TableInstance<TData>): object {
  const proto = {
    get _locale() {
      return table.options.locale;
    },
    getValue(this: AnyRow, columnId: string) {
      if (columnId in this._valuesCache) return this._valuesCache[columnId];
      const column = table.getColumn(columnId);
      const value = column?.accessorFn
        ? column.accessorFn(this.original as TData, this.index)
        : undefined;
      this._valuesCache[columnId] = value;
      return value;
    },
    renderValue(this: AnyRow, columnId: string) {
      const value = this.getValue(columnId);
      return value === undefined || value === null || value === '' ? null : value;
    },
    getUniqueValues(this: AnyRow, columnId: string) {
      if (columnId in this._uniqueValuesCache) return this._uniqueValuesCache[columnId];
      const value = this.getValue(columnId);
      const unique: unknown[] = Array.isArray(value) ? (value as unknown[]) : [value];
      this._uniqueValuesCache[columnId] = unique;
      return unique;
    },
    _getSortValue(this: AnyRow, columnId: string) {
      if (columnId in this._sortCache) return this._sortCache[columnId];
      const column = table.getColumn(columnId);
      const def = column?.columnDef;
      const value =
        def?.sortValue && !this.getIsGrouped()
          ? def.sortValue(this.original as TData)
          : this.getValue(columnId);
      this._sortCache[columnId] = value;
      return value;
    },
    _getSearchValue(this: AnyRow, columnId: string) {
      if (columnId in this._searchCache) return this._searchCache[columnId]!;
      const column = table.getColumn(columnId);
      let text: string;
      if (column?.columnDef.getSearchValue && !this.getIsGrouped()) {
        text = column.columnDef.getSearchValue(this.original as TData);
      } else {
        const value = this.getValue(columnId);
        text = column ? column.formatValue(value, this.original as TData) : toText(value);
      }
      this._searchCache[columnId] = text;
      return text;
    },
    _getFoldedSearchValue(this: AnyRow, columnId: string) {
      if (columnId in this._foldedSearchCache) return this._foldedSearchCache[columnId]!;
      const folded = fold(this._getSearchValue(columnId));
      this._foldedSearchCache[columnId] = folded;
      return folded;
    },
    getParentRow(this: AnyRow) {
      return this.parentId === undefined ? undefined : table.getRow(this.parentId, true);
    },
    getParentRows(this: AnyRow) {
      const parents: Row<TData>[] = [];
      let current = this.getParentRow() as Row<TData> | undefined;
      while (current) {
        parents.unshift(current);
        current = current.getParentRow();
      }
      return parents;
    },
    getLeafRows(this: AnyRow) {
      if (this._leafRows) return this._leafRows;
      const leaves: Row<unknown>[] = [];
      const walk = (rows: Row<unknown>[]) => {
        for (const r of rows) {
          leaves.push(r);
          if (r.subRows.length) walk(r.subRows);
        }
      };
      walk(this.subRows);
      this._leafRows = leaves;
      return leaves;
    },
    getAllCells(this: AnyRow) {
      this._cellsMemo ??= memo(
        () => [table.getAllLeafColumns()],
        (columns) =>
          columns.map((column) => createCell(table, this as unknown as Row<TData>, column)),
      ) as unknown as () => Cell<unknown>[];
      return this._cellsMemo();
    },
    _getVisibleCellSections(this: AnyRow) {
      this._visibleCellsMemo ??= memo(
        () => [
          this.getAllCells(),
          table.getLeftVisibleLeafColumns(),
          table.getCenterVisibleLeafColumns(),
          table.getRightVisibleLeafColumns(),
        ],
        (cells, left, center, right) => {
          const byId = new Map(cells.map((c) => [c.column.id, c]));
          const pick = (cols: Column<TData>[]) =>
            cols.map((c) => byId.get(c.id)).filter((c): c is Cell<unknown> => !!c);
          const l = pick(left);
          const m = pick(center);
          const r = pick(right);
          return { all: [...l, ...m, ...r], left: l, center: m, right: r };
        },
      ) as unknown as AnyRow['_visibleCellsMemo'];
      return this._visibleCellsMemo!();
    },
    getVisibleCells(this: AnyRow & { _getVisibleCellSections(): { all: Cell<unknown>[] } }) {
      return this._getVisibleCellSections().all;
    },
    getLeftVisibleCells(this: AnyRow & { _getVisibleCellSections(): { left: Cell<unknown>[] } }) {
      return this._getVisibleCellSections().left;
    },
    getCenterVisibleCells(
      this: AnyRow & { _getVisibleCellSections(): { center: Cell<unknown>[] } },
    ) {
      return this._getVisibleCellSections().center;
    },
    getRightVisibleCells(this: AnyRow & { _getVisibleCellSections(): { right: Cell<unknown>[] } }) {
      return this._getVisibleCellSections().right;
    },
    getIsGrouped(this: AnyRow) {
      return this.groupingColumnId !== undefined;
    },
    getIsDisabled(this: AnyRow) {
      return table.options.isRowDisabled?.(this as unknown as Row<TData>) ?? false;
    },
  };
  return proto;
}

/** Creates a row object on the table's shared prototype. */
export function createRow<TData>(
  proto: object,
  table: TableInstance<TData>,
  id: string,
  original: TData,
  index: number,
  depth: number,
  subRows: Row<TData>[] = [],
  parentId?: string,
): Row<TData> {
  const row = Object.create(proto) as RowInternals<TData>;
  row.id = id;
  row.index = index;
  row.depth = depth;
  row.original = original;
  row.subRows = subRows;
  row.parentId = parentId;
  row.groupingColumnId = undefined;
  row.groupingValue = undefined;
  row._groupingValuesCache = {};
  row._table = table;
  row._valuesCache = {};
  row._uniqueValuesCache = {};
  row._searchCache = {};
  row._foldedSearchCache = {};
  row._sortCache = {};
  for (const feature of table._features) feature.createRow?.(row, table);
  return row;
}

/** Creates a cell. Cells are created lazily (per row, on first access) and memoized. */
export function createCell<TData>(
  table: TableInstance<TData>,
  row: Row<TData>,
  column: Column<TData>,
): Cell<TData> {
  let context: { ctx: CellContext<TData, unknown>; key: string } | undefined;
  const cell: Cell<TData> = {
    id: `${row.id}_${column.id}`,
    row,
    column,
    getValue: () => row.getValue(column.id),
    renderValue: () => row.renderValue(column.id),
    getIsGrouped: () => row.getIsGrouped() && row.groupingColumnId === column.id,
    getIsPlaceholder: () => !cell.getIsGrouped() && column.getIsGrouped() && row.getIsGrouped(),
    getIsAggregated: () =>
      row.getIsGrouped() &&
      !cell.getIsGrouped() &&
      !cell.getIsPlaceholder() &&
      !!column.getAggregationFn(),
    getContext: () => {
      // Stable context objects (02 §7 rule 4): reused while their inputs are unchanged.
      const state = table.getState();
      const render = table.options._renderContext;
      const isSelected = row.getIsSelected();
      const isExpanded = row.getIsExpanded();
      const isPinned = column.getIsPinned();
      const key = `${String(isSelected)}|${String(isExpanded)}|${String(isPinned)}|${state.density}|${render?.breakpoint ?? ''}`;
      if (context?.key === key && context.ctx.theme === render?.theme) return context.ctx;
      const value = row.getValue(column.id);
      const ctx: CellContext<TData, unknown> = {
        table,
        row,
        column,
        cell,
        getValue: () => row.getValue(column.id),
        renderValue: () => row.renderValue(column.id),
        formattedValue: column.formatValue(value, row.original),
        isSelected,
        isExpanded,
        isPinned,
        density: state.density,
        theme: render?.theme ?? lightTheme,
        breakpoint: table.getBreakpoint(),
      };
      context = { ctx, key };
      return ctx;
    },
  };
  for (const feature of table._features) feature.createCell?.(cell, row, column, table);
  return cell;
}
