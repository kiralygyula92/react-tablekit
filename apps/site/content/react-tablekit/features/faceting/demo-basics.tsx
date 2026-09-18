import { createLocalDataSource, DataTable } from 'react-tablekit';
import { generatePeople } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';
import { RequestLog, useRequestLog } from '@/demo-support/requestLog';

const people = generatePeople(400);
const source = createLocalDataSource(people, {
  columns: peopleColumns,
  getRowId: (p) => p.id,
  latencyMs: [200, 450],
});

/**
 * Server filtering and faceting: filters and the search are serialized into the query,
 * and the option lists plus their counts are loaded lazily through `dataSource.fetchFacets`, so
 * the browser never sees the full dataset.
 */
export default function FiltersServerExample() {
  const { dataSource, log, clear } = useRequestLog(source);
  return (
    <div className="example-stack">
      <DataTable
        aria-label="People (server filtering)"
        columns={peopleColumns}
        dataSource={dataSource}
        getRowId={(p) => p.id}
        dataMode="server"
        showActiveFilterChips
        showFacetCounts
        searchDebounceMs={300}
        searchMinLength={2}
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
      <RequestLog log={log} clear={clear} />
    </div>
  );
}
