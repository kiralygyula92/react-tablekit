import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DataTable, decodeState, encodeState } from '../../src';
import type { TableInstance, TableState } from '../../src/core';
import { numbered, people, personColumns, renderTable, type Person } from './helpers';

const search = () => window.location.search;

afterEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

describe('URL state encoding', () => {
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
