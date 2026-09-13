import { createColumnHelper, DataTable } from 'react-tablekit';
import { slotMeta } from 'react-tablekit/meta';
import { useDocumentTitle } from '../../layout/useDocumentTitle';

type Slot = (typeof slotMeta)[number];
const col = createColumnHelper<Slot>();

const columns = [
  col.accessor('name', { header: 'Slot' }),
  col.accessor('element', {
    header: 'Default element',
    cell: ({ getValue }) => <code>&lt;{getValue()}&gt;</code>,
  }),
];

/** `/api/slots`: every replaceable component, read from the package's runtime slot registry. */
export function ApiSlotsPage() {
  useDocumentTitle('Slots');
  return (
    <article className="site-prose site-prose--wide">
      <h1>Slots</h1>
      <p className="site-lead">
        Every part of the table is a replaceable slot. Pass <code>slots</code> to swap one, or
        <code> slotProps</code> / <code>classNames</code> / <code>styles</code> to adjust the
        default. This list comes from the package&apos;s own registry, so it cannot drift from the
        implementation.
      </p>
      <DataTable<Slot>
        aria-label="Slots"
        data={slotMeta}
        columns={columns}
        getRowId={(s) => s.name}
        searchPlaceholder="Filter slots"
        enablePagination={false}
        enableStickyHeader
        maxHeight={520}
      />
    </article>
  );
}
