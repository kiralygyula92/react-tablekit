import { createColumnHelper, createLocalDataSource, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { RequestLog, useRequestLog } from '@/demo-support/requestLog';

const col = createColumnHelper<DemoPerson>();

/** The server sorts by its own field names, mapped with `sortServerKey`. */
const columns = [
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name',
    sortServerKey: 'last_name',
  }),
  col.accessor('email', { header: 'Email', enableSorting: false }),
  col.accessor('department', { header: 'Department', sortServerKey: 'department_code' }),
  col.accessor('age', { header: 'Age', type: 'number', sortServerKey: 'age_years' }),
  col.accessor('joined', { header: 'Joined', type: 'date', sortServerKey: 'joined_at' }),
];

const people = generatePeople(120);
const source = createLocalDataSource(people, {
  columns,
  getRowId: (p) => p.id,
  latencyMs: [150, 350],
});

/**
 * Manual (server) sorting: the table emits `sorting` using each column's `sortServerKey`, and the
 * simulated server maps those keys back to its data. Shift+click adds a second sort column.
 */
export default function ServerSortingExample() {
  const { dataSource, log, clear } = useRequestLog(source);
  return (
    <div className="example-stack">
      <DataTable
        aria-label="People (server sorting)"
        columns={columns}
        dataSource={dataSource}
        getRowId={(p) => p.id}
        manualSorting
        manualPagination
        enableMultiSort
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
      <RequestLog log={log} clear={clear} />
    </div>
  );
}
