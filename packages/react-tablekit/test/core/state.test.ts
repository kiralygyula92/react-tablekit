import { describe, expect, it, vi } from 'vitest';
import {
  functionalUpdate,
  getDefaultTableState,
  memo,
  type SortingState,
  type Updater,
} from '../../src/core';
import { makeTable } from '../fixtures';

describe('functionalUpdate', () => {
  it('returns values as-is and applies functions', () => {
    expect(functionalUpdate(3, 1)).toBe(3);
    expect(functionalUpdate((n: number) => n + 1, 1)).toBe(2);
  });
});

describe('memo', () => {
  it('recomputes only when a dependency changes (shallow)', () => {
    let a = 1;
    const b = { x: 1 };
    const compute = vi.fn((x: number, y: { x: number }) => x + y.x);
    const get = memo(() => [a, b], compute);
    expect(get()).toBe(2);
    expect(get()).toBe(2);
    expect(compute).toHaveBeenCalledTimes(1);
    a = 2;
    expect(get()).toBe(3);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('calls onChange on recomputation (not the first run)', () => {
    let a = 1;
    const onChange = vi.fn();
    const get = memo(
      () => [a],
      (x) => x,
      { onChange },
    );
    get();
    expect(onChange).not.toHaveBeenCalled();
    a = 2;
    get();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('state: uncontrolled', () => {
  it('seeds from initialState and library defaults', () => {
    const table = makeTable({ initialState: { pagination: { pageIndex: 1, pageSize: 2 } } });
    expect(table.getState().pagination).toEqual({ pageIndex: 1, pageSize: 2 });
    expect(table.getState().density).toBe('standard');
    expect(getDefaultTableState().pagination).toEqual({ pageIndex: 0, pageSize: 10 });
  });

  it('merges the object slices of initialState with the defaults', () => {
    const table = makeTable({
      initialState: { columnPinning: { left: ['name'] }, pagination: { pageSize: 5 } },
    });
    expect(table.getState().columnPinning).toEqual({ left: ['name'], right: [] });
    expect(table.getState().pagination).toEqual({ pageIndex: 0, pageSize: 5 });
  });

  it('updates internal state and notifies subscribers', () => {
    const table = makeTable();
    const listener = vi.fn();
    table.subscribe(listener);
    table.setDensity('compact');
    expect(table.getState().density).toBe('compact');
    expect(listener).toHaveBeenCalled();
  });

  it('does not notify when the value is unchanged', () => {
    const table = makeTable();
    const listener = vi.fn();
    table.subscribe(listener);
    table.setDensity('standard');
    expect(listener).not.toHaveBeenCalled();
  });

  it('"notified uncontrolled": on*Change fires with the updater and internal state still updates', () => {
    const onSortingChange = vi.fn<(u: Updater<SortingState>) => void>();
    const table = makeTable({ onSortingChange });
    table.getColumn('name')!.toggleSorting();
    expect(onSortingChange).toHaveBeenCalledTimes(1);
    const updater = onSortingChange.mock.calls[0]![0];
    expect(typeof updater).toBe('function');
    expect(functionalUpdate(updater, [])).toEqual([{ id: 'name', desc: false }]);
    expect(table.getState().sorting).toEqual([{ id: 'name', desc: false }]);
  });
});

describe('state: controlled', () => {
  it('state.x wins over internal state and is not mutated by setters', () => {
    const onPaginationChange = vi.fn();
    const table = makeTable({
      state: { pagination: { pageIndex: 0, pageSize: 2 } },
      onPaginationChange,
    });
    table.nextPage();
    expect(onPaginationChange).toHaveBeenCalledTimes(1);
    expect(table.getState().pagination.pageIndex).toBe(0);
    table.setOptions((o) => ({ ...o, state: { pagination: { pageIndex: 1, pageSize: 2 } } }));
    expect(table.getState().pagination.pageIndex).toBe(1);
    expect(table.getRowModel().rows.map((r) => r.id)).toEqual(['p3', 'p4']);
  });

  it('onStateChange receives a whole-state updater for any slice', () => {
    const onStateChange = vi.fn();
    const table = makeTable({ onStateChange });
    table.setGlobalFilter('x');
    const updater = onStateChange.mock.calls[0]![0] as (s: object) => { globalFilter: string };
    expect(updater(table.initialState).globalFilter).toBe('x');
  });

  it('getState is referentially stable while nothing changes', () => {
    const state = { density: 'compact' as const };
    const table = makeTable({ state });
    expect(table.getState()).toBe(table.getState());
  });
});

describe('reset', () => {
  it('reset() restores initialState; resetX(true) restores the library default', () => {
    const table = makeTable({ initialState: { density: 'comfortable' } });
    table.setDensity('compact');
    table.setGlobalFilter('abc');
    table.reset();
    expect(table.getState().density).toBe('comfortable');
    expect(table.getState().globalFilter).toBe('');
    table.setSorting([{ id: 'age', desc: true }]);
    table.resetSorting();
    expect(table.getState().sorting).toEqual([]);
    table.setPagination({ pageIndex: 0, pageSize: 3 });
    table.resetPagination(true);
    expect(table.getState().pagination).toEqual({ pageIndex: 0, pageSize: 10 });
  });

  it('setState updates several slices and fires their callbacks', () => {
    const onDensityChange = vi.fn();
    const table = makeTable({ onDensityChange });
    table.setState((s) => ({ ...s, density: 'compact', globalFilter: 'z' }));
    expect(table.getState().density).toBe('compact');
    expect(onDensityChange).toHaveBeenCalledTimes(1);
  });

  it('toggleDensity cycles compact → standard → comfortable', () => {
    const table = makeTable({ initialState: { density: 'compact' } });
    table.toggleDensity();
    expect(table.getState().density).toBe('standard');
    table.toggleDensity();
    expect(table.getState().density).toBe('comfortable');
    table.toggleDensity();
    expect(table.getState().density).toBe('compact');
  });
});

describe('data modes', () => {
  it('dataMode server sets every manual flag but not manualExpanding', () => {
    const table = makeTable({ dataMode: 'server', acknowledgePageLocalSorting: true });
    const o = table.options;
    expect([
      o.manualPagination,
      o.manualSorting,
      o.manualFiltering,
      o.manualGrouping,
      o.manualFaceting,
    ]).toEqual([true, true, true, true, true]);
    expect(o.manualExpanding).toBeUndefined();
  });

  it('per-feature modes win over dataMode; searchMode overrides filterMode for search only', () => {
    const table = makeTable({
      dataMode: 'server',
      sortingMode: 'client',
      searchMode: 'client',
      acknowledgePageLocalSorting: true,
      acknowledgePageLocalFiltering: true,
    });
    expect(table.options.manualSorting).toBe(false);
    expect(table.options.manualFiltering).toBe(true);
    expect(table.options.manualGlobalFiltering).toBe(false);
  });

  it('warns in dev about page-local sorting in hybrid mode unless acknowledged', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    makeTable({ paginationMode: 'server', filterMode: 'server' });
    expect(warn.mock.calls.some((c) => String(c[0]).includes('acknowledgePageLocalSorting'))).toBe(
      true,
    );
    warn.mockRestore();
  });

  it('throws in dev for server grouping + client pagination', () => {
    expect(() => makeTable({ groupingMode: 'server', enableGrouping: true })).toThrow(
      /not supported/,
    );
  });

  it('a dataSource implies server mode', () => {
    const table = makeTable({ dataSource: { fetch: () => Promise.resolve({ rows: [] }) } });
    expect(table.options.manualPagination).toBe(true);
  });
});
