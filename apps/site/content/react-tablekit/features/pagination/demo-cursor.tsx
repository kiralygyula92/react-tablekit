import { createLocalDataSource, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';
import { RequestLog, useRequestLog } from '@/demo-support/requestLog';

const people = generatePeople(500);
// The local data source answers with `nextCursor` / `prevCursor`, like a cursor API.
const source = createLocalDataSource(people, {
  columns: peopleColumns,
  getRowId: (p) => p.id,
  latencyMs: [150, 350],
});

/**
 * Cursor pagination (03 §6): the server returns opaque cursors instead of a page count, so the
 * numbered variant is unavailable and the table shows “of many”. Next and Previous follow the
 * cursors the server sent, and the request log shows them.
 */
export default function CursorPaginationExample() {
  const { dataSource, log, clear } = useRequestLog(source);
  return (
    <div className="example-stack">
      <DataTable<DemoPerson>
        aria-label="People"
        columns={peopleColumns}
        dataSource={dataSource}
        getRowId={(p) => p.id}
        paginationType="cursor"
        pagination={{ variant: 'simple', showRowRange: true }}
        initialState={{ pagination: { pageIndex: 0, pageSize: 10, cursor: null } }}
      />
      <RequestLog log={log} clear={clear} />
    </div>
  );
}
