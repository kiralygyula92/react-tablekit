import { useCallback, useMemo, useState } from 'react';
import type { DataSource, TableQuery } from 'react-tablekit';

export interface LoggedRequest {
  at: string;
  reason: string;
  query: Pick<TableQuery, 'globalFilter' | 'columnFilters' | 'sorting' | 'pagination'>;
}

/** Wraps a data source so the demo can show what the "server" was asked for. */
export function useRequestLog<TData>(source: DataSource<TData>, limit = 8) {
  const [log, setLog] = useState<LoggedRequest[]>([]);

  const dataSource = useMemo<DataSource<TData>>(
    () => ({
      fetch: (query, ctx) => {
        setLog((prev) =>
          [
            {
              at: new Date().toLocaleTimeString(),
              reason: ctx.reason,
              query: {
                globalFilter: query.globalFilter,
                columnFilters: query.columnFilters,
                sorting: query.sorting,
                pagination: query.pagination,
              },
            },
            ...prev,
          ].slice(0, limit),
        );
        return source.fetch(query, ctx);
      },
      ...(source.fetchFacets ? { fetchFacets: source.fetchFacets.bind(source) } : {}),
    }),
    [source, limit],
  );

  const clear = useCallback(() => setLog([]), []);
  return { dataSource, log, clear };
}

/** Renders the request log as a definition list. */
export function RequestLog({ log, clear }: { log: LoggedRequest[]; clear: () => void }) {
  return (
    <section className="example-panel" aria-labelledby="request-log-title">
      <h2 id="request-log-title">Server requests</h2>
      {log.length === 0 ? (
        <p className="example-pending">No requests yet.</p>
      ) : (
        <>
          <button type="button" onClick={clear}>
            Clear log
          </button>
          <ol className="example-log">
            {log.map((entry, i) => (
              <li key={`${entry.at}-${String(i)}`}>
                <code>
                  {entry.at} · {entry.reason} · page {entry.query.pagination.pageIndex + 1} ·{' '}
                  {entry.query.sorting.length > 0
                    ? entry.query.sorting
                        .map((s) => `${s.id} ${s.desc ? 'desc' : 'asc'}`)
                        .join(', ')
                    : 'unsorted'}
                  {entry.query.globalFilter ? ` · q="${entry.query.globalFilter}"` : ''}
                  {entry.query.columnFilters.length > 0
                    ? ` · ${entry.query.columnFilters.map((f) => `${f.id}=${JSON.stringify(f.value)}`).join(', ')}`
                    : ''}
                </code>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
