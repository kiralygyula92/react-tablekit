import { describe, expect, it, vi } from 'vitest';
import { createTable, type TableFeature } from '../../src/core';
import { lightThemeForTests } from '../themeFixture';
import { makeTable, people, type Person } from '../fixtures';

describe('cells and contexts', () => {
  it('cell context carries value, formatted value and row state; it is stable while unchanged', () => {
    const table = makeTable({
      enableRowSelection: true,
      columns: [{ accessorKey: 'age', format: (v) => `${String(v)}y` }],
      _renderContext: { breakpoint: 'md', theme: lightThemeForTests },
    });
    const cell = table.getRow('p1')!.getVisibleCells()[0]!;
    const ctx = cell.getContext();
    expect(ctx.getValue()).toBe(31);
    expect(ctx.formattedValue).toBe('31y');
    expect(ctx.isSelected).toBe(false);
    expect(ctx.breakpoint).toBe('md');
    expect(cell.getContext()).toBe(ctx);
    table.getRow('p1')!.toggleSelected();
    expect(cell.getContext()).not.toBe(ctx);
    expect(cell.getContext().isSelected).toBe(true);
    expect(cell.renderValue()).toBe(31);
    expect(table.getRow('p3')!.renderValue('age')).toBeNull();
  });

  it('cells of group rows report grouped / aggregated / placeholder', () => {
    const table = makeTable({
      enableGrouping: true,
      columns: [
        { accessorKey: 'city' },
        { accessorKey: 'age', aggregationFn: 'sum' },
        { accessorKey: 'name' },
      ],
      initialState: { grouping: ['city'] },
    });
    const groupRow = table.getRowModel().rows[0]!;
    const [city, age, name] = groupRow.getAllCells();
    expect(city!.getIsGrouped()).toBe(true);
    expect(age!.getIsAggregated()).toBe(true);
    expect(name!.getIsAggregated()).toBe(false);
    groupRow.toggleExpanded();
    const leaf = table.getRowModel().rows[1]!;
    expect(leaf.getAllCells()[0]!.getIsPlaceholder()).toBe(false);
    expect(groupRow.getUniqueValues('city')).toEqual(['Budapest']);
  });

  it('formatValue defaults: dates, arrays, objects, null', () => {
    const table = createTable<{ d: Date; a: string[]; o: object; n: null }>({
      data: [{ d: new Date(2020, 0, 2), a: ['x', 'y'], o: {}, n: null }],
      columns: [
        { accessorKey: 'd' },
        { accessorKey: 'a' },
        { accessorKey: 'o' },
        { accessorKey: 'n' },
      ],
      locale: 'en-US',
    });
    const row = table.getCoreRowModel().rows[0]!;
    expect(table.getColumn('d')!.formatValue(row.getValue('d'), row.original)).toBe('1/2/2020');
    expect(table.getColumn('a')!.formatValue(row.getValue('a'), row.original)).toBe('x, y');
    expect(table.getColumn('o')!.formatValue(row.getValue('o'), row.original)).toBe('');
    expect(table.getColumn('n')!.formatValue(null, row.original)).toBe('');
  });

  it('getParentRows / getLeafRows on trees', () => {
    const table = makeTable({
      data: [{ ...people[0]!, children: [{ ...people[1]!, children: [people[2]!] }] }],
      getSubRows: (p) => p.children,
    });
    const deep = table.getRow('p3', true)!;
    expect(deep.getParentRows().map((r) => r.id)).toEqual(['p1', 'p2']);
    expect(
      table
        .getRow('p1')!
        .getLeafRows()
        .map((r) => r.id),
    ).toEqual(['p2', 'p3']);
    expect(deep.getIsAllParentsExpanded()).toBe(false);
  });
});

describe('custom features (_features)', () => {
  it('calls every hook', () => {
    const hooks = { table: vi.fn(), column: vi.fn(), row: vi.fn(), cell: vi.fn(), header: vi.fn() };
    const feature: TableFeature<Person> = {
      name: 'probe',
      getDefaultOptions: () => ({ enableSorting: false }),
      getInitialState: () => ({ density: 'compact' }),
      createTable: hooks.table,
      createColumn: hooks.column,
      createRow: hooks.row,
      createCell: hooks.cell,
      createHeader: hooks.header,
    };
    const table = makeTable({ _features: [feature] });
    expect(table.options.enableSorting).toBe(false);
    expect(table.getState().density).toBe('compact');
    table.getRowModel().rows[0]!.getVisibleCells();
    table.getHeaderGroups();
    expect(hooks.table).toHaveBeenCalledTimes(1);
    expect(hooks.column).toHaveBeenCalled();
    expect(hooks.row).toHaveBeenCalled();
    expect(hooks.cell).toHaveBeenCalled();
    expect(hooks.header).toHaveBeenCalled();
  });
});

describe('misc table APIs', () => {
  it('getRow searches pre-pagination rows on request', () => {
    const table = makeTable({ initialState: { pagination: { pageIndex: 0, pageSize: 2 } } });
    expect(table.getRow('p5')).toBeUndefined();
    expect(table.getRow('p5', true)!.id).toBe('p5');
  });

  it('view hooks are no-ops until the view layer installs them', () => {
    const table = makeTable();
    expect(() => table.focusCell('p1', 'name')).not.toThrow();
    const scrollToRow = vi.fn();
    table._view.scrollToRow = scrollToRow;
    table.scrollToRow('p1', { align: 'center' });
    expect(scrollToRow).toHaveBeenCalledWith('p1', { align: 'center' });
  });

  it('warns when updateRow is used without a data source', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    makeTable().updateRow('p1', (p) => p);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('copyToClipboard writes TSV via the Clipboard API', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText }, language: 'en-US' });
    await makeTable({ columns: [{ accessorKey: 'name', header: 'Name' }] }).copyToClipboard();
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^Name\r\nZoë Adams/));
    vi.unstubAllGlobals();
  });

  it('autosizeAllColumns applies measured widths to resizable columns', () => {
    const table = makeTable({ enableColumnResizing: true });
    table.autosizeAllColumns((id) => (id === 'name' ? 321 : undefined));
    expect(table.getColumn('name')!.getSize()).toBe(321);
  });

  it('getIsSomeColumnsPinned', () => {
    const table = makeTable();
    expect(table.getIsSomeColumnsPinned()).toBe(false);
    table.getColumn('age')!.pin('right');
    expect(table.getIsSomeColumnsPinned('right')).toBe(true);
    expect(table.getIsSomeColumnsPinned('left')).toBe(false);
    expect(table.getColumn('age')!.getPinnedIndex()).toBe(0);
  });

  it('toggleGrouping on a column', () => {
    const table = makeTable({ enableGrouping: true });
    const city = table.getColumn('city')!;
    expect(city.getCanGroup()).toBe(true);
    city.toggleGrouping();
    expect(city.getIsGrouped()).toBe(true);
    expect(city.getGroupedIndex()).toBe(0);
    city.toggleGrouping();
    expect(table.getState().grouping).toEqual([]);
  });

  it('clearSorting on a column', () => {
    const table = makeTable({
      initialState: {
        sorting: [
          { id: 'age', desc: false },
          { id: 'name', desc: false },
        ],
      },
    });
    table.getColumn('age')!.clearSorting();
    expect(table.getState().sorting).toEqual([{ id: 'name', desc: false }]);
  });

  it('server facets from options.facets in controlled server mode', () => {
    const table = makeTable({
      dataMode: 'server',
      facets: { city: { type: 'values', values: [{ value: 'X', count: 1 }] } },
    });
    expect(table.getColumn('city')!.getServerFacets()).toEqual({
      type: 'values',
      values: [{ value: 'X', count: 1 }],
    });
  });
});
