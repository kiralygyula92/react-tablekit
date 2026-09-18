import { handlerMeta } from 'react-tablekit/meta';

/*
 * The handlers reference as data, with no React in it. The page renders it as a table, and the
 * Markdown surface (`scripts/build-machine-surface.mjs`) writes the same rows into `llms-full.md`,
 * so the two cannot drift. The handler names come from the package; what each one receives and
 * does by default is written here.
 */

/** Context and default behaviour per handler; the names come from the package. */
const DETAILS: Record<string, { context: string; behaviour: string }> = {
  onSortToggle: {
    context: '{ column, desc?, multi, event }',
    behaviour: 'column.toggleSorting(desc, multi)',
  },
  onGlobalFilterInput: {
    context: '{ value, event }',
    behaviour: 'setGlobalFilter(value), debounced',
  },
  onColumnFilterChange: {
    context: '{ column, value, operator }',
    behaviour: 'column.setFilterValue(…)',
  },
  onClearFilters: { context: '{}', behaviour: 'clearAllFilters()' },
  onPageChange: {
    context: "{ pageIndex, reason: 'button' | 'keyboard' | 'infinite' }",
    behaviour: 'setPageIndex',
  },
  onPageSizeChange: { context: '{ pageSize }', behaviour: 'setPageSize' },
  onRowClick: {
    context: '{ row, event }',
    behaviour: 'selection / expansion per options, then the onRowClick prop',
  },
  onRowDoubleClick: { context: '{ row, event }', behaviour: 'the onRowDoubleClick prop' },
  onRowSelect: {
    context: '{ row, value, range, event }',
    behaviour: 'row.toggleSelected (range-aware)',
  },
  onSelectAll: {
    context: "{ value, scope: 'page' | 'all' }",
    behaviour: 'toggleAllPageRowsSelected / toggleAllRowsSelected',
  },
  onRowExpand: { context: '{ row, value }', behaviour: 'row.toggleExpanded, plus lazy children' },
  onColumnResize: { context: '{ column, size }', behaviour: 'setColumnSizing' },
  onColumnMove: { context: '{ columnId, toIndex }', behaviour: 'moveColumn' },
  onColumnPin: { context: '{ column, position }', behaviour: 'column.pin' },
  onColumnHide: { context: '{ column, visible }', behaviour: 'column.toggleVisibility' },
  onExport: { context: '{ scope, format }', behaviour: 'CSV generation and download' },
  onRefresh: { context: '{}', behaviour: 'table.refresh()' },
  onHotkey: { context: '{ key, event }', behaviour: 'focuses and selects the search input' },
  onCellActivate: {
    context: '{ cell, event }',
    behaviour: 'activates the focused cell (keyboard grid)',
  },
};

export interface HandlerRow {
  name: string;
  context: string;
  behaviour: string;
}

/** One row per handler the package exports, in the package's order. */
export const handlerRows: HandlerRow[] = handlerMeta.map((h) => ({
  name: h.name,
  context: DETAILS[h.name]?.context ?? '—',
  behaviour: DETAILS[h.name]?.behaviour ?? '—',
}));

/** How a handler is installed: wrap the default, and call `next` to keep it. */
export const HANDLERS_EXAMPLE = `<DataTable
  handlers={{
    onPageChange: async (ctx, next) => {
      if (await confirmLeave()) return next(ctx);
    },
  }}
/>`;
