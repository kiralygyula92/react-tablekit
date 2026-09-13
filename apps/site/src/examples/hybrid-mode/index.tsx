import { createLocalDataSource, DataTable } from 'react-tablekit';
import { generatePeople } from '../../mock/data/people';
import { peopleColumns } from '../columns';
import { RequestLog, useRequestLog } from '../requestLog';

const people = generatePeople(300);
const source = createLocalDataSource(people, {
  columns: peopleColumns,
  getRowId: (p) => p.id,
  latencyMs: [150, 300],
});

/**
 * Hybrid mode (03 §1.2): the server paginates, the browser sorts the page it was given. That sorts
 * only the current page, which is why the engine warns unless you acknowledge it with
 * `acknowledgePageLocalSorting`. Sorting here never triggers a request — watch the log.
 */
export default function HybridModeExample() {
  const { dataSource, log, clear } = useRequestLog(source);
  return (
    <div className="example-stack">
      <DataTable
        aria-label="People (hybrid mode)"
        columns={peopleColumns}
        dataSource={dataSource}
        getRowId={(p) => p.id}
        sortingMode="client"
        acknowledgePageLocalSorting
        initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
      />
      <RequestLog log={log} clear={clear} />
    </div>
  );
}
