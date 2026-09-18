import { createColumnHelper, DataTable } from 'react-tablekit';
import { HANDLERS_EXAMPLE, handlerRows, type HandlerRow } from './handlerDetails';
import { UsedBy } from './UsedBy';

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
        <code>{HANDLERS_EXAMPLE}</code>
      </pre>
      <DataTable<HandlerRow>
        aria-label="Handlers"
        data={handlerRows}
        columns={columns}
        getRowId={(h) => h.name}
        searchPlaceholder="Filter handlers"
        enablePagination={false}
      />
    </>
  );
}
