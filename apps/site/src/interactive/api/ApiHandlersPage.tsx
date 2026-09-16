import { createColumnHelper, DataTable } from 'react-tablekit';
import { handlerMeta } from 'react-tablekit/meta';
import { UsedBy } from './UsedBy';

/** Context and default behaviour per handler (06 §5); the names come from the package. */
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

interface HandlerRow {
  name: string;
  context: string;
  behaviour: string;
}

const data: HandlerRow[] = handlerMeta.map((h) => ({
  name: h.name,
  context: DETAILS[h.name]?.context ?? '—',
  behaviour: DETAILS[h.name]?.behaviour ?? '—',
}));

const col = createColumnHelper<HandlerRow>();
const columns = [
  col.accessor('name', { header: 'Handler' }),
  col.accessor('context', {
    header: 'Context',
    cell: ({ getValue }) => <code>{getValue()}</code>,
  }),
  col.accessor('behaviour', { header: 'Default behaviour' }),
];

/** `/api/handlers`: every interaction middleware. */
export function ApiHandlersPage() {
  return (
    <>
      <UsedBy symbol="TableHandlers" />
      <pre className="site-code">
        <code>{`<DataTable
  handlers={{
    onPageChange: async (ctx, next) => {
      if (await confirmLeave()) return next(ctx);
    },
  }}
/>`}</code>
      </pre>
      <DataTable<HandlerRow>
        aria-label="Handlers"
        data={data}
        columns={columns}
        getRowId={(h) => h.name}
        searchPlaceholder="Filter handlers"
        enablePagination={false}
      />
    </>
  );
}
