import { createColumnHelper, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';

const data = generatePeople(40);
const col = createColumnHelper<DemoPerson>();

/**
 * Row pinning (05 §12). A pinned row stays visible while the rows around it are sorted, filtered
 * and paged away — the comparison row you keep referring back to.
 */
const columns = [
  col.display({
    id: 'pin',
    header: '',
    size: 96,
    static: true,
    cell: ({ row }) => (
      <button type="button" onClick={() => row.pin(row.getIsPinned() ? false : 'top')}>
        {row.getIsPinned() ? 'Unpin' : 'Pin'}
      </button>
    ),
  }),
  col.accessor((p) => `${p.firstName} ${p.lastName}`, { id: 'name', header: 'Name' }),
  col.accessor('department', { header: 'Department' }),
  col.accessor('age', { header: 'Age', type: 'number' }),
  col.accessor('city', { header: 'City' }),
];

export default function RowPinningExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={columns}
      getRowId={(p) => p.id}
      enableRowPinning
      enableStickyHeader
      maxHeight={420}
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
