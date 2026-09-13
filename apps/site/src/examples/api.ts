import { createRestDataSource, type DataSource } from 'react-tablekit';
import { mockFetch } from '../mock/ready';
import type { Customer, PagedResponse, SearchCustomerRequest } from '../mock/types';

/**
 * The Skimmer customer search as a data source (10 §3.2): `{ queryCriteria, listingCriteria }` in,
 * `{ items, totalItemCount, requestCriteria }` out. The server echo is adopted by the table.
 */
export const customersDataSource: DataSource<Customer> = createRestDataSource<
  Customer,
  PagedResponse<Customer>
>({
  url: '/api/customers/search',
  method: 'POST',
  mapQuery: (q): SearchCustomerRequest => ({
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
    return (await res.json()) as PagedResponse<Customer>;
  },
});
