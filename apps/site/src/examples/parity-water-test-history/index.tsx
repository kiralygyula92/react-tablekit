import { useState } from 'react';
import { createRestDataSource, DataTable, useDataTable, type DataSource } from 'react-tablekit';
import { mockFetch } from '../../mock/ready';
import type { PagedResponse, WaterTestHistoryItem } from '../../mock/types';
import { ParityPage, useParityTheme } from '../ParityFrame';
import { waterTestColumns, type WaterTestMeta } from './columns';

const BODY_OF_WATER_ID = 'bow_0001';

/** `GET /api/pools/:id/history` with Skimmer's listing criteria as query parameters. */
const historyDataSource: DataSource<WaterTestHistoryItem> = createRestDataSource<
  WaterTestHistoryItem,
  PagedResponse<WaterTestHistoryItem>
>({
  url: `/api/pools/${BODY_OF_WATER_ID}/history`,
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
    return (await res.json()) as PagedResponse<WaterTestHistoryItem>;
  },
});

/**
 * Skimmer water-test history, 1:1 (01 §5.3): server mode, 18 columns inside a horizontal scroll,
 * chemical values at weight 600, and pinned right actions whose disabled states follow the row
 * (resend needs a `pdfId`, view report needs a `pdfUrl`).
 */
export default function ParityWaterTestHistory() {
  const { theme, toggle } = useParityTheme();
  const [message, setMessage] = useState<string | null>(null);
  const meta: WaterTestMeta = {
    onResend: (t) => setMessage(`Resending the report of ${t.date}…`),
    onViewReport: (t) => setMessage(`Opening ${t.pdfUrl ?? 'the report'}…`),
  };

  const table = useDataTable<WaterTestHistoryItem>({
    columns: waterTestColumns,
    dataSource: historyDataSource,
    getRowId: (t) => t.id,
    sortingMode: 'server',
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    theme,
    meta,
    toolbar: false,
    enableGlobalFilter: false,
    'aria-label': 'water test history table',
    emptyStateContent: 'No water tests found',
    localization: { loading: 'Loading...' },
  });

  return (
    <ParityPage>
      {toggle}
      <DataTable.Root table={table}>
        <header className="parity-header">
          <h3 className="parity-title">Water test history</h3>
        </header>
        <div className="parity-content">
          <DataTable.Container />
          <DataTable.Pagination />
        </div>
      </DataTable.Root>
      <p className="site-muted" role="status">
        {message ?? 'Pick an action on any row.'}
      </p>
    </ParityPage>
  );
}
