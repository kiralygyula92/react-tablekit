import { createColumnHelper, DataTable } from 'react-tablekit';
import { slotMeta } from 'react-tablekit/meta';
import { UsedBy } from './UsedBy';

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
  return (
    <>
      <UsedBy symbol="TableSlots" />
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
    </>
  );
}
