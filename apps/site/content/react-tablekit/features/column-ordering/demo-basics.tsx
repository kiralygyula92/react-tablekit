import { createColumnHelper, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';

const data = generatePeople(40);
const col = createColumnHelper<DemoPerson>();

const columns = [
  // The row's identity: it must stay first and must not be hideable, or the table
  // becomes a grid of anonymous values.
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name',
    lockPosition: 'first',
    enableHiding: false,
    enableOrdering: false,
  }),
  col.accessor('email', { header: 'Email' }),
  col.accessor('department', { header: 'Department' }),
  col.accessor('status', { header: 'Status' }),
  col.accessor('city', { header: 'City' }),
  col.accessor('age', { header: 'Age', type: 'number' }),
  col.accessor('joined', { header: 'Joined', type: 'date' }),
  col.accessor('remote', { header: 'Remote', type: 'boolean' }),
];

/**
 * Ordering and visibility. Drag a header to move a column, or use the Columns button
 * to show and hide them. Both are personal preferences rather than something you would share
 * in a link, so they persist to `localStorage` instead of the URL. Reload and the layout you
 * arranged is still there.
 */
export default function ColumnOrderingVisibilityExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={columns}
      getRowId={(p) => p.id}
      enableColumnOrdering
      enableHiding
      enableColumnActions
      enableDensityToggle
      syncState={{ storage: { key: 'react-tablekit:column-layout-demo', version: 1 } }}
      initialState={{
        columnVisibility: { joined: false },
        pagination: { pageIndex: 0, pageSize: 8 },
      }}
    />
  );
}
