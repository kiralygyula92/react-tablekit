import { createColumnHelper, DataTable, type SortingFn } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';

const data = generatePeople(60);
const col = createColumnHelper<DemoPerson>();

/** Seniority is an order, not an alphabet: "active" before "invited" before "suspended". */
const STATUS_ORDER: Record<DemoPerson['status'], number> = {
  active: 0,
  invited: 1,
  suspended: 2,
};

const byStatus: SortingFn<DemoPerson> = (rowA, rowB) =>
  STATUS_ORDER[rowA.original.status] - STATUS_ORDER[rowB.original.status];

const columns = [
  // `alphanumeric` is the natural comparator: "Room 2" sorts before "Room 10".
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name',
    sortingFn: 'alphanumeric',
  }),
  // Locale-aware, so "Ávila" lands next to "Avila" rather than after "Z".
  col.accessor('city', {
    header: 'City',
    sortingFn: 'text',
    // Rows with no city go last in both directions, instead of bubbling to the top.
    sortUndefined: 'last',
  }),
  col.accessor('department', { header: 'Department' }),
  // A custom comparator for a domain order no built-in can know.
  col.accessor('status', { header: 'Status', sortingFn: byStatus }),
  // Money and dates are almost always most-interesting-first on the first click.
  col.accessor('salary', { header: 'Salary', type: 'number', sortDescFirst: true }),
  col.accessor('joined', { header: 'Joined', type: 'date', sortDescFirst: true }),
  col.accessor('age', { header: 'Age', type: 'number' }),
];

/**
 * Client sorting. Click a header to sort, click again to reverse, and a third time to
 * clear it. Hold Shift and click to add a second and third column; the badge on each header
 * shows its priority, and the whole thing is one comparison chain.
 */
export default function ClientSortingExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={columns}
      getRowId={(p) => p.id}
      enableSorting
      enableMultiSort
      initialState={{
        sorting: [{ id: 'status', desc: false }],
        pagination: { pageIndex: 0, pageSize: 8 },
      }}
    />
  );
}
