import { DataTable, useDataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(60);

/**
 * The same table, taken apart. `useDataTable` builds the instance and
 * `DataTable.Root` shares it; every part below can be moved, wrapped or left out.
 * Here the search sits in the page header and pagination is above the table.
 */
export default function ComposableLayoutExample() {
  const table = useDataTable<DemoPerson>({
    'aria-label': 'People',
    data,
    columns: peopleColumns,
    getRowId: (p) => p.id,
    enableRowSelection: true,
    enableHiding: true,
    initialState: { pagination: { pageIndex: 0, pageSize: 6 } },
  });

  return (
    <DataTable.Root table={table}>
      <header className="demo-page-header">
        <h3>Team directory</h3>
        <DataTable.Search />
        <DataTable.ColumnsButton />
      </header>
      <DataTable.SelectionBar />
      <DataTable.Pagination />
      <DataTable.Container />
    </DataTable.Root>
  );
}
