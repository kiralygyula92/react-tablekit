import { useMemo, useState } from 'react';
import {
  createLocalDataSource,
  DataTable,
  useDataTable,
  type SortingState,
  type TableInstance,
} from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(500, 7);

/**
 * The same dataset twice: the left table computes everything in the browser; the right
 * one sends each query to `createLocalDataSource`, which simulates a server (latency, abort) with
 * the engine's own filter/sort functions. Identical interactions give identical rows.
 */
export default function ClientVsServerExample() {
  const [latency, setLatency] = useState(400);
  const server = useMemo(
    () =>
      createLocalDataSource(data, {
        columns: peopleColumns,
        getRowId: (p) => p.id,
        latencyMs: [latency / 2, latency],
      }),
    [latency],
  );

  const common = {
    columns: peopleColumns,
    getRowId: (p: DemoPerson) => p.id,
    toolbar: false as const,
    searchDebounceMs: 300,
  };
  const client = useDataTable<DemoPerson>({ ...common, data, 'aria-label': 'Client mode' });
  const remote = useDataTable<DemoPerson>({
    ...common,
    dataSource: server,
    'aria-label': 'Server mode',
    loadingDisplay: 'skeleton',
  });

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const apply = (fn: (t: TableInstance<DemoPerson>) => void) => {
    fn(client);
    fn(remote);
  };
  const sorting: SortingState = sort
    ? [{ id: sort.replace(/^-/, ''), desc: sort.startsWith('-') }]
    : [];

  const clientIds = client
    .getRowModel()
    .rows.map((r) => r.id)
    .join();
  const serverIds = remote
    .getRowModel()
    .rows.map((r) => r.id)
    .join();
  const status = remote.getDataStatus();
  const identical = !status.fetching && !status.loading && clientIds === serverIds;

  return (
    <div className="example-stack">
      <div className="example-controls" role="group" aria-label="Shared controls">
        <label>
          Search both
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              apply((t) => t.setGlobalFilter(e.target.value));
            }}
          />
        </label>
        <label>
          Sort both
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              const s: SortingState = e.target.value
                ? [{ id: e.target.value.replace(/^-/, ''), desc: e.target.value.startsWith('-') }]
                : [];
              apply((t) => t.setSorting(s));
            }}
          >
            <option value="">Unsorted</option>
            <option value="name">Name ↑</option>
            <option value="-age">Age ↓</option>
            <option value="salary">Salary ↑</option>
          </select>
        </label>
        <button type="button" onClick={() => apply((t) => t.nextPage())}>
          Next page (both)
        </button>
        <button
          type="button"
          onClick={() =>
            apply((t) => {
              t.setSorting(sorting);
              t.setGlobalFilter(search);
              t.setPageIndex(client.getState().pagination.pageIndex);
            })
          }
        >
          Sync controls
        </button>
        <label>
          Server latency: {latency}ms
          <input
            type="range"
            min={0}
            max={2000}
            step={100}
            value={latency}
            onChange={(e) => setLatency(Number(e.target.value))}
          />
        </label>
        <output
          aria-live="polite"
          data-testid="equivalence"
          className={identical ? 'example-ok' : 'example-pending'}
        >
          {identical ? 'Identical rows ✓' : 'Waiting for the server…'}
        </output>
      </div>
      <div className="example-columns">
        <section aria-label="Client mode table">
          <h2>Client mode</h2>
          <DataTable table={client} />
        </section>
        <section aria-label="Server mode table">
          <h2>Server mode (simulated)</h2>
          <DataTable table={remote} />
        </section>
      </div>
    </div>
  );
}
