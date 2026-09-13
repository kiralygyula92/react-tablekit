import { useMemo, useState } from 'react';
import { createLocalDataSource, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';
import { peopleColumns } from '../columns';

type StateName = 'loading' | 'skeleton' | 'refetching' | 'empty' | 'noResults' | 'error';

const people = generatePeople(40);

/**
 * Every data state (03 §8, 05 §17): the first load as text or skeleton rows, the refetch overlay
 * that keeps the rows readable, the two empty states (no data at all vs nothing matching the
 * filters) and the error state with Retry.
 */
export default function StatesExample() {
  const [state, setState] = useState<StateName>('skeleton');

  const dataSource = useMemo(() => {
    const rows = state === 'empty' ? [] : people;
    return createLocalDataSource(rows, {
      columns: peopleColumns,
      getRowId: (p: DemoPerson) => p.id,
      // "Loading" states never resolve, so the demo can hold them still.
      latencyMs:
        state === 'loading' || state === 'skeleton' ? 100_000 : state === 'refetching' ? 1_500 : 0,
      failRate: state === 'error' ? 1 : 0,
    });
  }, [state]);

  return (
    <div className="example-stack">
      <div className="example-controls">
        <label>
          <span>State</span>
          <select value={state} onChange={(e) => setState(e.target.value as StateName)}>
            <option value="skeleton">First load — skeleton rows</option>
            <option value="loading">First load — “Loading…” row</option>
            <option value="refetching">Refetch — blocking overlay</option>
            <option value="empty">Empty — no rows at all</option>
            <option value="noResults">Empty — nothing matches the search</option>
            <option value="error">Error — with Retry</option>
          </select>
        </label>
        {state === 'noResults' && (
          <p className="site-muted">Search for something that cannot match, e.g. “zzzz”.</p>
        )}
        {state === 'refetching' && (
          <p className="site-muted">Change the page to see the overlay.</p>
        )}
      </div>
      <DataTable<DemoPerson>
        key={state}
        aria-label="People"
        columns={peopleColumns}
        dataSource={dataSource}
        getRowId={(p) => p.id}
        loadingDisplay={state === 'loading' ? 'text' : 'skeleton'}
        initialState={{
          pagination: { pageIndex: 0, pageSize: 8 },
          ...(state === 'noResults' ? { globalFilter: 'zzzz-nobody' } : {}),
        }}
      />
    </div>
  );
}
