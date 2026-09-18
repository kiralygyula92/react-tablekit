import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TableQuery } from '../../src/core';
import { createColumnHelper, createRestDataSource, defineColumns } from '../../src/utils';

const query: TableQuery = {
  pagination: { pageIndex: 2, pageSize: 10 },
  sorting: [{ id: 'LastName', desc: true }],
  globalFilter: 'smi',
  columnFilters: [{ id: 'status', value: ['a', 'b'] }],
  grouping: [],
};
const signal = new AbortController().signal;

afterEach(() => vi.unstubAllGlobals());

describe('createRestDataSource', () => {
  it('POSTs the mapped query as JSON and maps the result (paged contract)', async () => {
    const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [{ id: 1 }], totalItemCount: 235 }), { status: 200 }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const ds = createRestDataSource<
      { id: number },
      { items: { id: number }[]; totalItemCount: number }
    >({
      url: '/api/customers/search',
      method: 'POST',
      headers: { authorization: 'Bearer x' },
      mapQuery: (q) => ({
        queryCriteria: q.globalFilter,
        listingCriteria: { pageNumber: q.pagination.pageIndex, pageSize: q.pagination.pageSize },
      }),
      mapResult: (json) => ({ rows: json.items, rowCount: json.totalItemCount }),
    });
    const result = await ds.fetch(query, { signal, reason: 'refresh' });
    expect(result).toEqual({ rows: [{ id: 1 }], rowCount: 235 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/customers/search');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'content-type': 'application/json',
      authorization: 'Bearer x',
    });
    expect(JSON.parse(init.body as string)).toEqual({
      queryCriteria: 'smi',
      listingCriteria: { pageNumber: 2, pageSize: 10 },
    });
  });

  it('GET encodes the mapped query as search params (objects as JSON)', async () => {
    const fetchMock = vi.fn((_url: string) => Promise.resolve(new Response('[]', { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);
    const ds = createRestDataSource<unknown, unknown[]>({
      url: '/api/items?tenant=1',
      mapQuery: (q) => ({
        page: q.pagination.pageIndex,
        q: q.globalFilter,
        filters: q.columnFilters,
        none: undefined,
      }),
      mapResult: (json) => ({ rows: json }),
    });
    await ds.fetch(query, { signal, reason: 'pagination' });
    const url = fetchMock.mock.calls[0]![0];
    expect(url.startsWith('/api/items?tenant=1&page=2&q=smi&filters=')).toBe(true);
    expect(url).not.toContain('none');
  });

  it('rejects non-2xx responses', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('nope', { status: 500, statusText: 'Server Error' })),
    );
    const ds = createRestDataSource({
      url: '/x',
      mapQuery: () => ({}),
      mapResult: () => ({ rows: [] }),
    });
    await expect(ds.fetch(query, { signal, reason: 'refresh' })).rejects.toThrow('500');
  });

  it('uses a custom fetcher (API client / ky / axios)', async () => {
    const fetcher = vi.fn((req: { body: unknown }) => Promise.resolve({ items: [req.body] }));
    const ds = createRestDataSource<unknown, { items: unknown[] }>({
      url: '/x',
      mapQuery: (q) => q.globalFilter,
      mapResult: (json) => ({ rows: json.items }),
      fetcher,
    });
    await expect(ds.fetch(query, { signal, reason: 'refresh' })).resolves.toEqual({
      rows: ['smi'],
    });
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/x', method: 'GET', signal }),
    );
  });
});

describe('createColumnHelper', () => {
  it('builds accessor, display and group definitions', () => {
    interface Customer {
      id: string;
      displayName: { companyName?: string };
    }
    const col = createColumnHelper<Customer>();
    const columns = defineColumns<Customer>([
      col.accessor('displayName.companyName', { header: 'Company' }),
      col.accessor((c) => c.id.length, { id: 'len' }),
      col.display({ id: 'actions' }),
      col.group({ header: 'Group', columns: [col.accessor('id', {})] }),
    ]);
    expect(columns[0]).toMatchObject({ accessorKey: 'displayName.companyName', header: 'Company' });
    expect(typeof (columns[1] as { accessorFn: unknown }).accessorFn).toBe('function');
    expect(columns[2]).toEqual({ id: 'actions' });
    expect((columns[3] as { columns: unknown[] }).columns).toHaveLength(1);
  });
});
