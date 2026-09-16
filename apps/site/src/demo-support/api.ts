import { createRestDataSource, type DataSource } from 'react-tablekit';
import { mockFetch } from '@/mock/ready';
import type { Account, PagedResponse, SearchAccountRequest } from '@/mock/types';

/**
 * The account search as a data source: `{ queryCriteria, listingCriteria }` in,
 * `{ items, totalItemCount, requestCriteria }` out. The table adopts the server's echo of the
 * request, so a page the server corrected wins over the one the table asked for.
 */
export const accountsDataSource: DataSource<Account> = createRestDataSource<
  Account,
  PagedResponse<Account>
>({
  url: '/api/accounts/search',
  method: 'POST',
  mapQuery: (q): SearchAccountRequest => ({
    queryCriteria: q.globalFilter,
    listingCriteria: {
      pageNumber: q.pagination.pageIndex,
      pageSize: q.pagination.pageSize,
      ...(q.sorting[0] ? { sortColumn: q.sorting[0].id, ascending: !q.sorting[0].desc } : {}),
    },
  }),
  mapResult: (r) => ({
    rows: r.items,
    rowCount: r.totalItemCount,
    query: {
      pagination: { pageIndex: r.requestCriteria.pageNumber, pageSize: r.requestCriteria.pageSize },
    },
  }),
  fetcher: async (req) => {
    const res = await mockFetch(req.url, {
      method: req.method,
      headers: { 'content-type': 'application/json', ...req.headers },
      body: JSON.stringify(req.body),
      signal: req.signal,
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return (await res.json()) as PagedResponse<Account>;
  },
});
