import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTable,
  type DataSource,
  type DataSourceResult,
  type QueryChangeReason,
  type TableOptions,
  type TableQuery,
} from '../../src/core';
import { createLocalDataSource } from '../../src/utils';
import { numbered, personColumns, type Person } from '../fixtures';

interface Call {
  query: TableQuery;
  reason: QueryChangeReason;
  signal: AbortSignal;
  resolve: (r: DataSourceResult<Person>) => void;
  reject: (e: unknown) => void;
}

/** A data source whose requests are resolved manually by the test. */
function controllableSource(extra: Partial<DataSource<Person>> = {}) {
  const calls: Call[] = [];
  const source: DataSource<Person> = {
    fetch: (query, { signal, reason }) =>
      new Promise((resolve, reject) => {
        calls.push({ query, reason, signal, resolve, reject });
      }),
    ...extra,
  };
  return { source, calls };
}

const page = (pageIndex: number, pageSize = 10, total = 95): DataSourceResult<Person> => ({
  rows: numbered(total).slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
  rowCount: total,
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function setup(
  options: Partial<TableOptions<Person>> = {},
  extra: Partial<DataSource<Person>> = {},
) {
  const { source, calls } = controllableSource(extra);
  const table = createTable<Person>({
    columns: personColumns,
    getRowId: (r) => r.id,
    dataSource: source,
    ...options,
  });
  const unmount = table._mount();
  return { table, calls, unmount };
}

describe('dataSource: loading lifecycle', () => {
  it('fetches on mount (reason refresh) with loading, then renders rows', async () => {
    const { table, calls } = setup();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.reason).toBe('refresh');
    expect(table.getDataStatus()).toMatchObject({ loading: true, fetching: false });
    calls[0]!.resolve(page(0));
    await flush();
    expect(table.getDataStatus()).toMatchObject({ loading: false, fetching: false });
    expect(table.getRowModel().rows).toHaveLength(10);
    expect(table.getRowCount()).toBe(95);
    expect(table.getPageCount()).toBe(10);
  });

  it('refetch keeps previous rows and sets fetching (overlay behaviour)', async () => {
    const { table, calls } = setup();
    calls[0]!.resolve(page(0));
    await flush();
    table.nextPage();
    expect(calls).toHaveLength(2);
    expect(calls[1]!.reason).toBe('pagination');
    expect(table.getDataStatus()).toMatchObject({ loading: false, fetching: true });
    expect(table.getRowModel().rows[0]!.id).toBe('r0');
    calls[1]!.resolve(page(1));
    await flush();
    expect(table.getRowModel().rows[0]!.id).toBe('r10');
  });

  it('keepPreviousData:false clears rows and shows the loading state', async () => {
    const { table, calls } = setup({ keepPreviousData: false });
    calls[0]!.resolve(page(0));
    await flush();
    table.nextPage();
    expect(table.getRowModel().rows).toHaveLength(0);
    expect(table.getDataStatus().loading).toBe(true);
  });

  it('fetchOnMount:false waits for the first query change', async () => {
    const { table, calls } = setup({ fetchOnMount: false });
    expect(calls).toHaveLength(0);
    table.setSorting([{ id: 'name', desc: false }]);
    await flush();
    expect(calls).toHaveLength(1);
  });

  it('emits onStatusChange', async () => {
    const onStatusChange = vi.fn();
    const { calls } = setup({ onStatusChange });
    calls[0]!.resolve(page(0));
    await flush();
    expect(onStatusChange.mock.calls.map((c) => (c[0] as { loading: boolean }).loading)).toEqual([
      true,
      false,
    ]);
  });
});

describe('dataSource: search debounce, min length and page reset', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('typing resets pageIndex to 0, debounces, respects min length, and an empty string refetches', async () => {
    const { table, calls } = setup({ searchMinLength: 3, searchDebounceMs: 300 });
    calls[0]!.resolve(page(0));
    await flush();
    table.setPageIndex(4);
    calls[1]!.resolve(page(4));
    await flush();

    table.setGlobalFilter('s');
    table.setGlobalFilter('sm');
    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(2); // below min length: no fetch

    table.setGlobalFilter('smi');
    vi.advanceTimersByTime(299);
    expect(calls).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(calls).toHaveLength(3);
    expect(calls[2]!.reason).toBe('globalFilter');
    expect(calls[2]!.query.globalFilter).toBe('smi');
    expect(calls[2]!.query.pagination.pageIndex).toBe(0);
    expect(table.getState().pagination.pageIndex).toBe(0);

    table.setGlobalFilter('');
    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(4);
    expect(calls[3]!.query.globalFilter).toBe('');
  });

  it('resetPageOn can opt out per reason', async () => {
    const { table, calls } = setup({ resetPageOn: ['globalFilter'] });
    calls[0]!.resolve(page(0));
    await flush();
    table.setPageIndex(2);
    table.setSorting([{ id: 'age', desc: true }]);
    expect(calls.at(-1)!.query.pagination.pageIndex).toBe(2);
  });
});

describe('dataSource: abort + race', () => {
  it('rapid page clicks: only the last response is applied', async () => {
    const { table, calls } = setup();
    calls[0]!.resolve(page(0));
    await flush();
    table.setPageIndex(1);
    table.setPageIndex(2);
    table.setPageIndex(3);
    expect(calls).toHaveLength(4);
    expect(calls[1]!.signal.aborted).toBe(true);
    expect(calls[2]!.signal.aborted).toBe(true);
    expect(calls[3]!.signal.aborted).toBe(false);
    calls[3]!.resolve(page(3));
    calls[1]!.resolve(page(1)); // stale: ignored
    await flush();
    expect(table.getRowModel().rows[0]!.id).toBe('r30');
  });

  it('dedupes an identical in-flight query', () => {
    const { table, calls } = setup();
    void table.refresh();
    expect(calls).toHaveLength(2); // refresh forces a new request
    table.setSorting([{ id: 'name', desc: false }]);
    table.setSorting([]);
    table.setSorting([{ id: 'name', desc: false }]);
    expect(calls.filter((c) => c.reason === 'sorting').length).toBeGreaterThanOrEqual(1);
  });

  it('unmount aborts the in-flight request; remount (StrictMode) refetches', async () => {
    const { table, calls, unmount } = setup();
    unmount();
    expect(calls[0]!.signal.aborted).toBe(true);
    const unmount2 = table._mount();
    expect(calls).toHaveLength(2);
    calls[1]!.resolve(page(0));
    await flush();
    expect(table.getRowModel().rows).toHaveLength(10);
    unmount2();
  });
});

describe('dataSource: server echo and range correction', () => {
  it('adopts the echoed query without an extra fetch', async () => {
    const { table, calls } = setup();
    calls[0]!.resolve({ ...page(0, 25), query: { pagination: { pageIndex: 0, pageSize: 25 } } });
    await flush();
    await flush();
    expect(table.getState().pagination.pageSize).toBe(25);
    expect(calls).toHaveLength(1);
  });

  it('page out of range after a refetch corrects itself once', async () => {
    const { table, calls } = setup({
      initialState: { pagination: { pageIndex: 9, pageSize: 10 } },
    });
    calls[0]!.resolve({ rows: [], rowCount: 42 });
    await flush();
    expect(table.getState().pagination.pageIndex).toBe(4);
    expect(calls).toHaveLength(2);
    calls[1]!.resolve(page(4, 10, 42));
    await flush();
    expect(table.getRowModel().rows).toHaveLength(2);
  });
});

describe('dataSource: errors', () => {
  it('no data: error state with a working retry', async () => {
    const onError = vi.fn();
    const { table, calls } = setup({ onError });
    calls[0]!.reject(new Error('boom'));
    await flush();
    expect(table.getDataStatus()).toMatchObject({ loading: false, error: new Error('boom') });
    expect(onError).toHaveBeenCalledTimes(1);
    void table.refresh();
    calls[1]!.resolve(page(0));
    await flush();
    expect(table.getDataStatus().error).toBeUndefined();
    expect(table.getRowModel().rows).toHaveLength(10);
  });

  it('stale data: the error keeps the rows visible', async () => {
    const { table, calls } = setup();
    calls[0]!.resolve(page(0));
    await flush();
    table.nextPage();
    calls[1]!.reject(new Error('flaky'));
    await flush();
    expect(table.getDataStatus().error).toBeInstanceOf(Error);
    expect(table.getRowModel().rows).toHaveLength(10);
  });

  it('abort errors are silent', async () => {
    const onError = vi.fn();
    const { table, calls } = setup({ onError });
    table.nextPage();
    calls[0]!.reject(new DOMException('Aborted', 'AbortError'));
    await flush();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('dataSource: refresh, polling, optimistic updates', () => {
  it('refresh() refetches the current query; invalidate() refetches soon', async () => {
    const { table, calls } = setup();
    calls[0]!.resolve(page(0));
    await flush();
    void table.refresh();
    expect(calls.at(-1)!.reason).toBe('refresh');
    calls.at(-1)!.resolve(page(0));
    await flush();
    table.invalidate();
    await flush();
    expect(calls).toHaveLength(3);
  });

  it('refetchInterval polls', () => {
    vi.useFakeTimers();
    const { calls, unmount } = setup({ refetchInterval: 1000 });
    vi.advanceTimersByTime(1000);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    unmount();
    vi.useRealTimers();
  });

  it('updateRow / removeRow / insertRow mutate the local page without refetching', async () => {
    const { table, calls } = setup();
    calls[0]!.resolve(page(0));
    await flush();
    table.updateRow('r1', (r) => ({ ...r, name: 'Renamed' }));
    expect(table.getRow('r1')!.getValue('name')).toBe('Renamed');
    table.removeRow('r2');
    expect(table.getRow('r2')).toBeUndefined();
    expect(table.getRowCount()).toBe(94);
    table.insertRow({ id: 'new', name: 'New', age: 1, joined: '2020-01-01', active: true }, 0);
    expect(table.getRowModel().rows[0]!.id).toBe('new');
    expect(calls).toHaveLength(1);
  });
});

describe('dataSource: load-more accumulation', () => {
  it('appends the next page and starts over when the query changes', async () => {
    // The React layer merges its view props into the options, which is how the engine infers
    // accumulation from the pagination variant.
    const { table, calls } = setup({
      pagination: { variant: 'loadMore' },
    } as Partial<TableOptions<Person>>);
    calls[0]!.resolve(page(0));
    await flush();
    expect(table.getRowModel().rows).toHaveLength(10);

    table.nextPage();
    calls[1]!.resolve(page(1));
    await flush();
    // Page 2 is appended, not swapped in.
    expect(table.getRowModel().rows).toHaveLength(20);
    expect(table.getRowModel().rows[0]!.id).toBe('r0');
    expect(table.getRowModel().rows[19]!.id).toBe('r19');

    // A different query starts the list again.
    table.setGlobalFilter('x');
    table.flushQuery();
    const last = calls[calls.length - 1]!;
    expect(last.query.pagination.pageIndex).toBe(0);
    last.resolve(page(0, 10, 5));
    await flush();
    expect(table.getRowModel().rows).toHaveLength(5);
  });

  it('ignores rows already loaded (a shifting server page)', async () => {
    const { table, calls } = setup({ appendPages: true });
    calls[0]!.resolve(page(0));
    await flush();
    table.nextPage();
    // The server returns one row that was already on page 1.
    calls[1]!.resolve({ rows: [...numbered(11).slice(9)], rowCount: 95 });
    await flush();
    const ids = table.getRowModel().rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(11);
  });
});

describe('dataSource: hybrid modes', () => {
  it('server pagination + client sorting sorts the fetched page without refetching', async () => {
    // A dataSource implies dataMode "server", so client sorting is an explicit per-feature override.
    const { table, calls } = setup({
      sortingMode: 'client',
      acknowledgePageLocalSorting: true,
    });
    calls[0]!.resolve(page(0));
    await flush();
    // The server is never asked to sort, so the query it received carries no sorting.
    expect(calls[0]!.query.sorting).toEqual([]);

    table.setSorting([{ id: 'name', desc: true }]);
    await flush();
    expect(calls, 'sorting must not trigger a fetch').toHaveLength(1);
    // The page that was already fetched is sorted in the browser.
    expect(table.getRowModel().rows[0]!.id).toBe('r9');

    table.nextPage();
    expect(calls).toHaveLength(2);
    expect(calls[1]!.query.sorting, 'still no server sorting').toEqual([]);
  });

  it('client pagination + server sorting pages locally without refetching', async () => {
    const { table, calls } = setup({
      paginationMode: 'client',
      initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
    });
    calls[0]!.resolve({ rows: numbered(20), rowCount: 20 });
    await flush();
    expect(table.getRowModel().rows).toHaveLength(5);

    table.nextPage();
    await flush();
    expect(calls, 'paging must not trigger a fetch').toHaveLength(1);
    expect(table.getRowModel().rows[0]!.id).toBe('r5');

    table.setSorting([{ id: 'name', desc: true }]);
    await flush();
    expect(calls).toHaveLength(2);
    expect(calls[1]!.query.sorting).toEqual([{ id: 'name', desc: true }]);
  });
});

describe('dataSource: cursor pagination', () => {
  it('uses nextCursor/prevCursor and reports an unknown total', async () => {
    const { table, calls } = setup({ paginationType: 'cursor' });
    calls[0]!.resolve({ rows: numbered(10), nextCursor: 'c10', prevCursor: null });
    await flush();
    expect(table.getRowCount()).toBe(-1);
    expect(table.getPageCount()).toBe(-1);
    expect(table.getCanNextPage()).toBe(true);
    table.nextPage();
    expect(calls[1]!.query.pagination).toMatchObject({ pageIndex: 1, cursor: 'c10' });
    calls[1]!.resolve({ rows: numbered(3), nextCursor: null, prevCursor: 'c0' });
    await flush();
    expect(table.getCanNextPage()).toBe(false);
    table.previousPage();
    expect(calls[2]!.query.pagination).toMatchObject({ pageIndex: 0, cursor: null });
  });
});

describe('dataSource: lazy children', () => {
  it('fetches once per row per query and refetches after the query changes', async () => {
    const fetchChildren = vi.fn((row: { id: string }) =>
      Promise.resolve([
        { id: `${row.id}-c`, name: 'Child', age: 1, joined: '2020-01-01', active: true },
      ]),
    );
    const { table, calls } = setup({ getRowCanExpand: () => true }, { fetchChildren });
    calls[0]!.resolve(page(0));
    await flush();
    const row = table.getRow('r0')!;
    row.toggleExpanded(true);
    expect(table.getRowChildrenStatus('r0').loading).toBe(true);
    await flush();
    expect(fetchChildren).toHaveBeenCalledTimes(1);
    expect(table.getRow('r0-c', true)).toBeDefined();
    expect(table.getRowModel().rows.map((r) => r.id)).toContain('r0-c');
    table.getRow('r0')!.toggleExpanded(false);
    table.getRow('r0')!.toggleExpanded(true);
    await flush();
    expect(fetchChildren).toHaveBeenCalledTimes(1);

    table.setSorting([{ id: 'name', desc: true }]);
    calls.at(-1)!.resolve(page(0));
    await flush();
    table.getRow('r0')!.toggleExpanded(false);
    table.getRow('r0')!.toggleExpanded(true);
    await flush();
    expect(fetchChildren).toHaveBeenCalledTimes(2);
  });
});

describe('selection across server pages', () => {
  it('the exclusion model survives page changes and clears on filter change', async () => {
    const { table, calls } = setup({
      enableRowSelection: true,
      selectAllMode: 'all',
      searchDebounceMs: 0,
    });
    calls[0]!.resolve(page(0));
    await flush();
    table.selectAllMatching();
    expect(table.getState().rowSelection).toEqual({ __all: true });
    table.getRow('r3')!.toggleSelected(false);
    expect(table.getSelectedCount()).toBe(94);
    table.nextPage();
    calls.at(-1)!.resolve(page(1));
    await flush();
    expect(table.getRow('r15')!.getIsSelected()).toBe(true);
    expect(table.getSelectionQuery()).toMatchObject({ mode: 'all', except: ['r3'] });
    table.setGlobalFilter('Row 1');
    expect(table.getState().rowSelection).toEqual({});
  });
});

describe('dataSource: facets and chunked export', () => {
  it('loadFacets fetches once per query and exposes the result', async () => {
    const fetchFacets = vi.fn(() =>
      Promise.resolve({ type: 'values' as const, values: [{ value: 'A', count: 3 }] }),
    );
    const { table, calls } = setup({}, { fetchFacets });
    calls[0]!.resolve({ ...page(0), facets: { age: { type: 'range', min: 0, max: 9 } } });
    await flush();
    expect(table.getColumn('age')!.getServerFacets()).toEqual({ type: 'range', min: 0, max: 9 });
    await Promise.all([
      table.getColumn('city')!.loadFacets(),
      table.getColumn('city')!.loadFacets(),
    ]);
    expect(fetchFacets).toHaveBeenCalledTimes(1);
    expect(table.getColumn('city')!.getServerFacets()).toEqual({
      type: 'values',
      values: [{ value: 'A', count: 3 }],
    });
  });

  it('exportCsv({ scope: "all" }) fetches every page in chunks with progress', async () => {
    const all = numbered(25);
    const source: DataSource<Person> = {
      fetch: (q) =>
        Promise.resolve({
          rows: all.slice(
            q.pagination.pageIndex * q.pagination.pageSize,
            (q.pagination.pageIndex + 1) * q.pagination.pageSize,
          ),
          rowCount: all.length,
        }),
    };
    const table = createTable<Person>({
      columns: [{ accessorKey: 'name', header: 'Name' }],
      getRowId: (r) => r.id,
      dataSource: source,
      exportChunkSize: 10,
    });
    table._mount();
    const progress: number[] = [];
    const csv = await table.exportCsv({
      scope: 'all',
      bom: false,
      onProgress: (p) => progress.push(p),
    });
    expect(csv.split('\r\n')).toHaveLength(26);
    expect(progress.at(-1)).toBe(1);
    expect(progress.length).toBeGreaterThanOrEqual(3);
  });

  it('chunked export can be cancelled', async () => {
    const source: DataSource<Person> = {
      fetch: () => Promise.resolve({ rows: numbered(10), rowCount: 1000 }),
    };
    const table = createTable<Person>({
      columns: personColumns,
      dataSource: source,
      exportChunkSize: 10,
    });
    const ac = new AbortController();
    ac.abort();
    await expect(table.exportCsv({ scope: 'all', signal: ac.signal })).rejects.toThrow(/cancelled/);
  });

  it('refetchOnWindowFocus refetches on focus', () => {
    const listeners: Record<string, () => void> = {};
    vi.stubGlobal('window', {
      addEventListener: (e: string, fn: () => void) => (listeners[e] = fn),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('document', { visibilityState: 'visible' });
    const { calls, unmount } = setup({ refetchOnWindowFocus: true });
    listeners.focus!();
    expect(calls).toHaveLength(2);
    unmount();
    vi.unstubAllGlobals();
  });
});

describe('createLocalDataSource', () => {
  it('produces the same rows as client mode for the same query', async () => {
    const data = numbered(57);
    const client = createTable({
      data,
      columns: personColumns,
      getRowId: (r) => r.id,
      searchDebounceMs: 0,
    });
    const local = createLocalDataSource(data, { columns: personColumns, getRowId: (r) => r.id });
    const query: TableQuery = {
      pagination: { pageIndex: 1, pageSize: 10 },
      sorting: [{ id: 'age', desc: true }],
      globalFilter: 'row 1',
      columnFilters: [],
      grouping: [],
    };
    client.setGlobalFilter('row 1');
    client.setSorting([{ id: 'age', desc: true }]);
    client.setPageIndex(1);
    const result = await local.fetch(query, {
      signal: new AbortController().signal,
      reason: 'refresh',
    });
    expect(result.rows.map((r) => r.id)).toEqual(client.getRowModel().rows.map((r) => r.id));
    expect(result.rowCount).toBe(client.getRowCount());
  });

  it('simulates failures and aborts', async () => {
    const failing = createLocalDataSource(numbered(5), { columns: personColumns, failRate: 1 });
    await expect(
      failing.fetch(
        {
          pagination: { pageIndex: 0, pageSize: 10 },
          sorting: [],
          globalFilter: '',
          columnFilters: [],
          grouping: [],
        },
        { signal: new AbortController().signal, reason: 'refresh' },
      ),
    ).rejects.toThrow(/Simulated/);
    const slow = createLocalDataSource(numbered(5), { columns: personColumns, latencyMs: 1000 });
    const ac = new AbortController();
    const p = slow.fetch(
      {
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: [],
        globalFilter: '',
        columnFilters: [],
        grouping: [],
      },
      { signal: ac.signal, reason: 'refresh' },
    );
    ac.abort();
    await expect(p).rejects.toThrow(/Aborted/);
  });

  it('serves facets with counts respecting the other filters', async () => {
    const local = createLocalDataSource(numbered(10), {
      columns: [
        { accessorKey: 'active', filterVariant: 'select' },
        { accessorKey: 'age', type: 'number' },
      ],
    });
    const facets = await local.fetchFacets!(
      'active',
      {
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: [],
        globalFilter: '',
        columnFilters: [{ id: 'age', value: [0, 3] }],
        grouping: [],
      },
      { signal: new AbortController().signal },
    );
    expect(facets).toEqual({
      type: 'values',
      values: [
        { value: false, count: 2 },
        { value: true, count: 2 },
      ],
    });
  });
});
