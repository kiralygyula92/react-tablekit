import { useState } from 'react';
import { createRestDataSource, DataTable, useDataTable, type DataSource } from 'react-tablekit';
import { mockFetch } from '../../mock/ready';
import type { PagedResponse, Reading } from '../../mock/types';
import { ShowcasePage, useShowcaseTheme } from '../ShowcaseFrame';
import { readingColumns, type ReadingsMeta } from './columns';

const ASSET_ID = 'as_0001';

/** `GET /api/assets/:id/readings` with the listing criteria as query parameters. */
const readingsDataSource: DataSource<Reading> = createRestDataSource<
  Reading,
  PagedResponse<Reading>
>({
  url: `/api/assets/${ASSET_ID}/readings`,
  method: 'GET',
  mapQuery: (q) => ({
    pageNumber: q.pagination.pageIndex,
    pageSize: q.pagination.pageSize,
    ...(q.sorting[0] ? { sortColumn: q.sorting[0].id, ascending: !q.sorting[0].desc } : {}),
  }),
  mapResult: (r) => ({
    rows: r.items,
    rowCount: r.totalItemCount,
    query: {
      pagination: {
        pageIndex: r.requestCriteria.pageNumber,
        pageSize: r.requestCriteria.pageSize,
      },
    },
  }),
  // The mock server is a service worker, so requests go through `mockFetch`; a GET carries the
  // mapped query as search params.
  fetcher: async (req) => {
    const params = new URLSearchParams(
      Object.entries(req.body as Record<string, string | number | boolean>).map(([k, v]) => [
        k,
        String(v),
      ]),
    );
    const res = await mockFetch(`${req.url}?${params.toString()}`, {
      method: req.method,
      signal: req.signal,
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return (await res.json()) as PagedResponse<Reading>;
  },
});

/**
 * A deliberately wide table: 18 columns inside a horizontal scroll, sorted on the server, with
 * pinned right actions whose disabled states follow the row — "Resend" needs a report id and
 * "View report" needs a URL, and plenty of rows have neither.
 */
export default function ShowcaseReadings() {
  const { theme, toggle } = useShowcaseTheme();
  const [message, setMessage] = useState<string | null>(null);
  const meta: ReadingsMeta = {
    onResend: (r) => setMessage(`Resending the report of ${r.date}…`),
    onViewReport: (r) => setMessage(`Opening ${r.reportUrl ?? 'the report'}…`),
  };

  const table = useDataTable<Reading>({
    columns: readingColumns,
    dataSource: readingsDataSource,
    getRowId: (r) => r.id,
    sortingMode: 'server',
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    theme,
    meta,
    toolbar: false,
    enableGlobalFilter: false,
    'aria-label': 'reading history table',
    emptyStateContent: 'No readings found',
    localization: { loading: 'Loading...' },
  });

  return (
    <ShowcasePage>
      {toggle}
      <DataTable.Root table={table}>
        <header className="showcase-header">
          <h3 className="showcase-title">Reading history</h3>
        </header>
        <div className="showcase-content">
          <DataTable.Container />
          <DataTable.Pagination />
        </div>
      </DataTable.Root>
      <p className="site-muted" role="status">
        {message ?? 'Pick an action on any row.'}
      </p>
    </ShowcasePage>
  );
}
