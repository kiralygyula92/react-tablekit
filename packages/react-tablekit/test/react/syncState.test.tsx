import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable, decodeState, encodeState, useRouterSync, useSyncState } from '../../src';
import { createTable, type TableInstance, type TableState } from '../../src/core';
import { numbered, people, personColumns, renderTable, type Person } from './helpers';

const search = () => window.location.search;

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

describe('URL state encoding', () => {
  it.each(['NaN', 'Infinity', '-1', '0', '2.5', ''])(
    'ignores invalid pagination values from shared URLs: %s',
    (value) => {
      expect(decodeState(`?tk.page=${value}&tk.size=${value}`).pagination).toEqual({
        pageIndex: 0,
        pageSize: 10,
      });
    },
  );

  it('uses the compact, documented spelling', () => {
    const state: Partial<TableState> = {
      pagination: { pageIndex: 1, pageSize: 25 },
      sorting: [
        { id: 'name', desc: false },
        { id: 'date', desc: true },
      ],
      globalFilter: 'smith',
      columnFilters: [{ id: 'status', value: ['active', 'pending'] }],
    };
    const params = encodeState(state, ['pagination', 'sorting', 'globalFilter', 'columnFilters']);
    expect(decodeURIComponent(params.toString())).toBe(
      'tk.page=2&tk.size=25&tk.sort=name.asc,date.desc&tk.q=smith&tk.f.status=active,pending',
    );
  });

  it('round-trips every supported slice', () => {
    const state: Partial<TableState> = {
      pagination: { pageIndex: 3, pageSize: 50 },
      sorting: [{ id: 'joined', desc: true }],
      globalFilter: 'zoë',
      columnFilters: [
        { id: 'age', value: [20, 40] },
        { id: 'active', value: true },
        { id: 'city', value: 'Budapest' },
      ],
      grouping: ['city'],
      density: 'compact',
      columnVisibility: { age: false, city: true },
      columnOrder: ['name', 'age'],
      columnPinning: { left: ['name'], right: ['actions'] },
    };
    const keys = Object.keys(state) as (keyof TableState)[];
    const decoded = decodeState(`?${encodeState(state, keys).toString()}`);

    expect(decoded.pagination).toEqual({ pageIndex: 3, pageSize: 50 });
    expect(decoded.sorting).toEqual([{ id: 'joined', desc: true }]);
    expect(decoded.globalFilter).toBe('zoë');
    expect(decoded.columnFilters).toEqual([
      { id: 'age', value: [20, 40] },
      { id: 'active', value: true },
      { id: 'city', value: 'Budapest' },
    ]);
    expect(decoded.grouping).toEqual(['city']);
    expect(decoded.density).toBe('compact');
    // Only hidden columns travel in the URL.
    expect(decoded.columnVisibility).toEqual({ age: false });
    expect(decoded.columnOrder).toEqual(['name', 'age']);
    expect(decoded.columnPinning).toEqual({ left: ['name'], right: ['actions'] });
  });
});

describe('syncState', () => {
  it('preserves application query parameters, other tables, hashes and history state', () => {
    const historyState = { key: 'route-key', idx: 3, usr: { selectedTab: 'people' } };
    window.history.replaceState(historyState, '', '/?view=all&tag=a&tag=b&other.q=keep#results');
    let table!: TableInstance<Person>;
    renderTable({
      toolbar: false,
      syncState: { url: {} },
      tableRef: (instance) => {
        table = instance;
      },
    });
    act(() => table.setGlobalFilter('Ada'));
    const params = new URLSearchParams(search());
    expect(params.get('view')).toBe('all');
    expect(params.getAll('tag')).toEqual(['a', 'b']);
    expect(params.get('other.q')).toBe('keep');
    expect(params.get('tk.q')).toBe('Ada');
    expect(window.location.hash).toBe('#results');
    expect(window.history.state).toEqual(historyState);

    act(() => table.setGlobalFilter(''));
    expect(new URLSearchParams(search()).has('tk.q')).toBe(false);
    expect(new URLSearchParams(search()).get('view')).toBe('all');
  });

  it('merges router updates with only the configured state slices', () => {
    let currentSearch = '?view=all&custom.q=old&custom.page=3&other.q=keep';
    const table = createTable({ data: people, columns: personColumns });
    renderHook(() =>
      useRouterSync(
        table,
        {
          getSearch: () => currentSearch,
          setSearch: (next) => {
            currentSearch = next;
          },
        },
        { url: { prefix: 'custom', keys: ['globalFilter'] } },
      ),
    );
    act(() => table.setGlobalFilter('new'));
    expect(new URLSearchParams(currentSearch).get('view')).toBe('all');
    expect(new URLSearchParams(currentSearch).get('custom.page')).toBe('3');
    expect(new URLSearchParams(currentSearch).get('other.q')).toBe('keep');
    expect(new URLSearchParams(currentSearch).get('custom.q')).toBe('new');
    act(() => table.setGlobalFilter(''));
    expect(new URLSearchParams(currentSearch).has('custom.q')).toBe(false);
  });

  it('continues rendering and synchronizing the URL when the storage getter is denied', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage is disabled', 'SecurityError');
    });
    expect(() =>
      renderTable({ toolbar: false, syncState: { url: {}, storage: { key: 'people' } } }),
    ).not.toThrow();
    expect(new URLSearchParams(search()).get('tk.size')).toBe('10');
  });

  it('writes the URL as the state changes', async () => {
    const user = userEvent.setup();
    renderTable({
      toolbar: false,
      data: numbered(40),
      syncState: { url: {} },
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(search()).toContain('tk.page=2');
    });
  });

  it('restores from the URL on mount, and the URL wins over storage', async () => {
    localStorage.setItem(
      'people',
      JSON.stringify({ version: 0, state: { density: 'comfortable' } }),
    );
    window.history.replaceState(null, '', '/?tk.q=item&tk.page=1');

    const { container } = render(
      <DataTable<Person>
        aria-label="People"
        data={people}
        columns={personColumns}
        getRowId={(p) => p.id}
        searchDebounceMs={0}
        toolbar={false}
        syncState={{ url: {}, storage: { key: 'people', keys: ['density'] } }}
      />,
    );

    // From the URL: the search was applied.
    await waitFor(() => {
      expect(container.querySelectorAll('tbody tr.tk-row').length).toBeLessThan(people.length);
    });
    // From storage: the density slice it owns.
    expect(container.querySelector('.tk-root')).toHaveAttribute('data-density', 'comfortable');
  });

  it('persists to storage and migrates an older payload', async () => {
    localStorage.setItem('tbl', JSON.stringify({ version: 1, state: { density: 'comfortable' } }));
    let table!: TableInstance<Person>;
    const { container } = renderTable({
      toolbar: false,
      syncState: {
        storage: {
          key: 'tbl',
          version: 2,
          keys: ['density'],
          migrate: (old) => ({
            density:
              (old as { density: string }).density === 'comfortable' ? 'compact' : 'standard',
          }),
        },
      },
      tableRef: (t) => {
        table = t;
      },
    });
    // The v1 payload was migrated to v2 on restore.
    expect(container.querySelector('.tk-root')).toHaveAttribute('data-density', 'compact');

    act(() => {
      table.setDensity('comfortable');
    });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('tbl')!)).toEqual({
        version: 2,
        state: { density: 'comfortable' },
      });
    });
  });

  it('drops a stored payload with no migration', () => {
    localStorage.setItem('old', JSON.stringify({ version: 0, state: { density: 'compact' } }));
    const { container } = renderTable({
      toolbar: false,
      syncState: { storage: { key: 'old', version: 3, keys: ['density'] } },
    });
    expect(container.querySelector('.tk-root')).toHaveAttribute('data-density', 'standard');
  });
});

describe('syncState: what a link may restore', () => {
  /** Mounts a table with a page-size selector and returns the page size it settled on. */
  const restoredPageSize = async (query: string, pageSizeOptions: number[] | false = [10, 25]) => {
    window.history.replaceState(null, '', `/?${query}`);
    let instance: TableInstance<Person> | undefined;
    render(
      <DataTable<Person>
        aria-label="People"
        data={numbered(200)}
        columns={personColumns}
        getRowId={(p) => p.id}
        toolbar={false}
        pagination={{ pageSizeOptions }}
        syncState={{ url: {} }}
        tableRef={(t) => {
          instance = t;
        }}
      />,
    );
    await waitFor(() => {
      expect(instance).toBeDefined();
    });
    return instance!.getState().pagination.pageSize;
  };

  it('restores a page size the table offers', async () => {
    expect(await restoredPageSize('tk.size=25')).toBe(25);
  });

  it('ignores a page size the table does not offer', async () => {
    expect(await restoredPageSize('tk.size=50')).toBe(10);
  });

  it('ignores a page size crafted to render or request everything', async () => {
    expect(await restoredPageSize('tk.size=100000000')).toBe(10);
  });

  it('allows a table with no list of sizes a generous ceiling, and no more', () => {
    const run = (size: number) => {
      window.history.replaceState(null, '', `/?tk.size=${size}`);
      const table = createTable<Person>({
        data: numbered(20),
        columns: personColumns,
        getRowId: (p) => p.id,
      });
      renderHook(() => {
        useSyncState(table, { url: {} });
      });
      return table.getState().pagination.pageSize;
    };
    expect(run(500)).toBe(500);
    expect(run(5000)).toBe(10);
  });

  it('ignores a density that does not exist', () => {
    expect(decodeState('?tk.density=evil').density).toBeUndefined();
    expect(decodeState('?tk.density=compact').density).toBe('compact');
  });
});
