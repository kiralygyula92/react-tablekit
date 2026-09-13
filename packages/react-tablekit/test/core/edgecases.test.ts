import { describe, expect, it, vi } from 'vitest';
import { createTable, type DataSource } from '../../src/core';
import { createLocalDataSource } from '../../src/utils';
import { ids, makeTable, numbered, people, personColumns, type Person } from '../fixtures';

describe('engine edge cases', () => {
  it('setOptions: controlled state changes sync the query in a microtask', async () => {
    const onQueryChange = vi.fn();
    const table = makeTable({ state: { sorting: [] }, onQueryChange, manualSorting: true });
    table.setOptions((o) => ({ ...o, state: { sorting: [{ id: 'name', desc: true }] } }));
    await Promise.resolve();
    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({ sorting: [{ id: 'name', desc: true }] }),
      expect.objectContaining({ reason: 'sorting' }),
    );
  });

  it('controlled sorting: the query follows the pending value before the parent re-renders', () => {
    const onSortingChange = vi.fn();
    const table = makeTable({ state: { sorting: [] }, onSortingChange, manualSorting: true });
    table.getColumn('age')!.toggleSorting();
    expect(table.getQuery().sorting).toEqual([{ id: 'age', desc: false }]);
    expect(table.getState().sorting).toEqual([]);
  });

  it('autoResetExpanded / autoResetSelection on data change when explicitly enabled', async () => {
    const table = makeTable({
      autoResetExpanded: true,
      autoResetSelection: true,
      enableRowSelection: true,
      getRowCanExpand: () => true,
    });
    table.getRow('p1')!.toggleExpanded();
    table.getRow('p1')!.toggleSelected();
    table.setOptions((o) => ({ ...o, data: [...people] }));
    await Promise.resolve();
    expect(table.getState().expanded).toEqual({});
    expect(table.getState().rowSelection).toEqual({});
  });

  it('clearSelectionOnQueryChange clears explicit selections on filter changes', () => {
    const table = makeTable({ enableRowSelection: true, clearSelectionOnQueryChange: true });
    table.getRow('p1')!.toggleSelected();
    table.setGlobalFilter('a');
    expect(table.getState().rowSelection).toEqual({});
  });

  it('server echo maps server keys back to column ids for sorting and filters', async () => {
    let resolve!: (v: unknown) => void;
    const source: DataSource<Person> = {
      fetch: () => new Promise((r) => (resolve = r as never)),
    };
    const table = createTable<Person>({
      dataSource: source,
      columns: [{ accessorKey: 'name', sortServerKey: 'LastName', filterServerKey: 'Q' }],
    });
    table._mount();
    resolve({
      rows: [],
      rowCount: 0,
      query: {
        sorting: [{ id: 'LastName', desc: true }],
        columnFilters: [{ id: 'Q', value: 'x' }],
        globalFilter: 'z',
        grouping: [],
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(table.getState().sorting).toEqual([{ id: 'name', desc: true }]);
    expect(table.getState().columnFilters).toEqual([{ id: 'name', value: 'x' }]);
    expect(table.getState().globalFilter).toBe('z');
  });

  it('manual pagination: pageCount-derived rowCount; data length without totals', () => {
    const a = createTable({
      data: numbered(5),
      columns: personColumns,
      manualPagination: true,
      pageCount: 3,
      acknowledgePageLocalSorting: true,
      acknowledgePageLocalFiltering: true,
    });
    expect(a.getRowCount()).toBe(30);
    const b = createTable({
      data: numbered(5),
      columns: personColumns,
      manualPagination: true,
      acknowledgePageLocalSorting: true,
      acknowledgePageLocalFiltering: true,
    });
    expect(b.getRowCount()).toBe(5);
    expect(b.getPageCount()).toBe(1);
  });

  it('cursor mode without a data source uses the page fill heuristic', () => {
    const table = createTable({
      data: numbered(10),
      columns: personColumns,
      dataMode: 'server',
      paginationType: 'cursor',
    });
    expect(table.getCanNextPage()).toBe(true);
    table.nextPage();
    expect(table.getState().pagination.pageIndex).toBe(1);
    table.previousPage();
    table.firstPage();
    expect(table.getState().pagination).toMatchObject({ pageIndex: 0, cursor: null });
  });

  it('lastPage / getPageItems with an unknown total', () => {
    const table = makeTable({ data: numbered(25) });
    table.lastPage();
    expect(table.getState().pagination.pageIndex).toBe(2);
  });

  it('expanding from "all" collapses one; toggling a controlled expansion', () => {
    const tree = [
      { ...people[0]!, children: [people[1]!] },
      { ...people[2]!, children: [people[3]!] },
    ];
    const table = makeTable({
      data: tree,
      getSubRows: (p) => p.children,
      initialState: { expanded: true },
    });
    table.getRow('p1')!.toggleExpanded(true);
    expect(table.getState().expanded).toBe(true);
    table.getRow('p1')!.toggleExpanded(false);
    expect(table.getState().expanded).toEqual({ p3: true });
    expect(table.getIsSomeRowsExpanded()).toBe(true);
    expect(table.getIsAllRowsExpanded()).toBe(false);
  });

  it('selection in "all" mode: deselect all, selected count and toggling rows', async () => {
    const ds = createLocalDataSource(numbered(30), {
      columns: personColumns,
      getRowId: (r) => r.id,
    });
    const table = createTable<Person>({
      dataSource: ds,
      columns: personColumns,
      getRowId: (r) => r.id,
      enableRowSelection: true,
      selectAllMode: 'all',
    });
    table._mount();
    await new Promise((r) => setTimeout(r, 0));
    table.toggleAllRowsSelected(true);
    expect(table.getIsAllRowsSelected()).toBe(true);
    table.getRow('r1')!.toggleSelected(false);
    table.getRow('r1')!.toggleSelected(true);
    expect(table.getSelectedCount()).toBe(30);
    table.toggleAllRowsSelected(false);
    expect(table.getSelectedCount()).toBe(0);
    expect(table.getIsSomeRowsSelected()).toBe(false);
  });

  it('warns about missing getRowId with selection; unknown fn names fall back', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const table = createTable<Person>({
      data: people,
      enableRowSelection: true,
      columns: [
        {
          accessorKey: 'name',
          sortingFn: 'nope' as never,
          filterFn: 'nope' as never,
          aggregationFn: 'nope' as never,
        },
        { accessorKey: 'name', id: 'name' },
      ],
    });
    expect(table.getColumn('name')!.getSortingFn()).toBeTypeOf('function');
    expect(table.getColumn('name')!.getFilterFn()).toBeTypeOf('function');
    expect(table.getColumn('name')!.getAggregationFn()).toBeUndefined();
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('getRowId'))).toBe(true);
    expect(messages.some((m) => m.includes('Duplicate column id'))).toBe(true);
    warn.mockRestore();
  });

  it('debugTable logs row-model timings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const table = makeTable({ debugTable: true, debugRows: true, debugColumns: true });
    table.getRowModel();
    table.getColumn('zzz');
    expect(warn.mock.calls.some((c) => String(c[0]).includes('ms'))).toBe(true);
    warn.mockRestore();
  });

  it('custom globalFilterFn is applied per column', () => {
    const table = makeTable({
      globalFilterFn: (row, id, value) => String(row.getValue(id)).startsWith(String(value)),
    });
    table.setGlobalFilter('item');
    expect(ids(table.getRowModel().rows)).toEqual(['p5', 'p6']);
    const named = makeTable({ globalFilterFn: 'equalsString' });
    named.setGlobalFilter('austin');
    expect(ids(named.getRowModel().rows)).toEqual(['p2', 'p3']);
  });

  it('column type detection for custom values and auto sorting fn fallbacks', () => {
    const table = createTable<{ o: { v: number }; d: Date; b: boolean; n: null }>({
      data: [{ o: { v: 1 }, d: new Date(1), b: true, n: null }],
      columns: [
        { accessorKey: 'o' },
        { accessorKey: 'd' },
        { accessorKey: 'b' },
        { accessorKey: 'n' },
        { id: 'sv', sortValue: (r) => r.d },
      ],
    });
    expect(table.getColumn('o')!.getType()).toBe('custom');
    expect(table.getColumn('d')!.getType()).toBe('date');
    expect(table.getColumn('b')!.getType()).toBe('boolean');
    expect(table.getColumn('n')!.getType()).toBe('text');
    expect(table.getColumn('sv')!.getAutoSortingFn()).toBeTypeOf('function');
    expect(table.getColumn('b')!.getFilterVariant()).toBe('boolean');
  });

  it('group columns: visibility, size and pinning of all leaves', () => {
    const table = createTable<Person>({
      data: people,
      columns: [
        {
          id: 'g',
          header: 'G',
          columns: [
            { accessorKey: 'name', size: 100 },
            { accessorKey: 'age', size: 50 },
          ],
        },
      ],
    });
    const group = table.getColumn('g')!;
    expect(group.getSize()).toBe(150);
    group.pin('left');
    expect(group.getIsPinned()).toBe('left');
    table.getColumn('name')!.toggleVisibility(false);
    table.getColumn('age')!.toggleVisibility(false);
    expect(group.getIsVisible()).toBe(false);
  });
});
