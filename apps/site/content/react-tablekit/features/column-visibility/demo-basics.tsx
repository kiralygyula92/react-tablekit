import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(80);

/**
 * Column power features: drag a header to reorder, drag its right edge (or focus it
 * and press ←/→, Shift for 50px) to resize, and use the “⋮” menu on any header to sort, filter,
 * pin, hide or autosize that column. The Columns button toggles visibility.
 */
export default function ColumnFeaturesExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      enableColumnResizing
      enableColumnOrdering
      enableColumnActions
      enableHiding
      columnResizeMode="onChange"
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
