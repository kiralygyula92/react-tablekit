import { describe, expect, it } from 'vitest';
import { createTable, sortingFns, type AnyColumnDef } from '../../src/core';
import { ids, makeTable, type Person } from '../fixtures';

const names = (table: ReturnType<typeof makeTable>) =>
  table.getRowModel().rows.map((r) => r.getValue<string>('name'));

describe('sorting cycle (05 §1)', () => {
  it('asc → desc → none', () => {
    const table = makeTable();
    const col = table.getColumn('city')!;
    expect(col.getNextSortingOrder()).toBe('asc');
    col.toggleSorting();
    expect(col.getIsSorted()).toBe('asc');
    col.toggleSorting();
    expect(col.getIsSorted()).toBe('desc');
    col.toggleSorting();
    expect(col.getIsSorted()).toBe(false);
  });

  it('desc → asc → none with sortDescFirst', () => {
    const table = makeTable({ sortDescFirst: true });
    const col = table.getColumn('city')!;
    col.toggleSorting();
    expect(col.getIsSorted()).toBe('desc');
    col.toggleSorting();
    expect(col.getIsSorted()).toBe('asc');
    col.toggleSorting();
    expect(col.getIsSorted()).toBe(false);
  });

  it('no "none" step when enableSortingRemoval is false', () => {
    const table = makeTable({ enableSortingRemoval: false });
    const col = table.getColumn('city')!;
    col.toggleSorting();
    col.toggleSorting();
    col.toggleSorting();
    expect(col.getIsSorted()).toBe('asc');
  });

  it("sortDescFirst: 'auto' starts numbers and dates descending", () => {
    const table = createTable<Person>({
      data: [],
      columns: [
        { accessorKey: 'age', type: 'number', sortDescFirst: 'auto' },
        { accessorKey: 'name', sortDescFirst: 'auto' },
      ],
    });
    expect(table.getColumn('age')!.getFirstSortDir()).toBe('desc');
    expect(table.getColumn('name')!.getFirstSortDir()).toBe('asc');
  });

  it('a plain click replaces a multi-sort list', () => {
    const table = makeTable();
    table.setSorting([
      { id: 'city', desc: false },
      { id: 'age', desc: true },
    ]);
    table.getColumn('name')!.toggleSorting();
    expect(table.getState().sorting).toEqual([{ id: 'name', desc: false }]);
  });
});

describe('multi-sort', () => {
  it('adds, toggles and removes columns within the list', () => {
    const table = makeTable();
    table.getColumn('city')!.toggleSorting(undefined, true);
    table.getColumn('age')!.toggleSorting(undefined, true);
    expect(table.getState().sorting).toEqual([
      { id: 'city', desc: false },
      { id: 'age', desc: false },
    ]);
    table.getColumn('city')!.toggleSorting(undefined, true);
    expect(table.getState().sorting[0]).toEqual({ id: 'city', desc: true });
    table.getColumn('city')!.toggleSorting(undefined, true);
    expect(table.getState().sorting).toEqual([{ id: 'age', desc: false }]);
    expect(table.getColumn('age')!.getSortIndex()).toBe(0);
  });

  it('respects maxMultiSortColCount by dropping the oldest', () => {
    const table = makeTable({ maxMultiSortColCount: 2 });
    for (const id of ['name', 'age', 'city']) table.getColumn(id)!.toggleSorting(undefined, true);
    expect(table.getState().sorting.map((s) => s.id)).toEqual(['age', 'city']);
  });

  it('is ignored when enableMultiSort is false', () => {
    const table = makeTable({ enableMultiSort: false });
    table.getColumn('name')!.toggleSorting(undefined, true);
    table.getColumn('age')!.toggleSorting(undefined, true);
    expect(table.getState().sorting).toEqual([{ id: 'age', desc: false }]);
  });

  it('sorts by multiple columns in priority order', () => {
    const table = makeTable({
      initialState: {
        sorting: [
          { id: 'city', desc: false },
          { id: 'age', desc: true },
        ],
      },
    });
    // Austin: p2 (25) before p3 (null age → last in either direction); no city (p5) sorts last.
    expect(ids(table.getRowModel().rows)).toEqual(['p2', 'p3', 'p6', 'p1', 'p4', 'p5']);
  });
});

describe('sorting functions (B18)', () => {
  it('text sorting is locale-aware and case/diacritic-insensitive', () => {
    const table = makeTable({ initialState: { sorting: [{ id: 'name', desc: false }] } });
    expect(names(table)).toEqual([
      'Ann Álvarez',
      'bob brown',
      'Carl Clark',
      'item2',
      'item10',
      'Zoë Adams',
    ]);
  });

  it('alphanumeric sorts naturally ("item2" < "item10")', () => {
    const table = makeTable({
      columns: [{ accessorKey: 'name', sortingFn: 'alphanumeric' }],
      initialState: { sorting: [{ id: 'name', desc: false }] },
    });
    const n = names(table);
    expect(n.indexOf('item2')).toBeLessThan(n.indexOf('item10'));
  });

  it('datetime sorts ISO strings chronologically', () => {
    const table = makeTable({ initialState: { sorting: [{ id: 'joined', desc: false }] } });
    expect(ids(table.getRowModel().rows)).toEqual(['p6', 'p4', 'p2', 'p1', 'p3', 'p5']);
  });

  it('boolean sorts false before true', () => {
    const table = makeTable({ initialState: { sorting: [{ id: 'active', desc: false }] } });
    expect(table.getRowModel().rows.map((r) => r.getValue('active'))).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
    ]);
  });

  it('auto-detects the sorting function from values', () => {
    const table = createTable<{ v: unknown }>({
      data: [{ v: 3 }, { v: 1 }],
      columns: [{ accessorKey: 'v', id: 'v' }],
    });
    expect(table.getColumn('v')!.getSortingFn()).toBe(sortingFns.basic);
  });

  it('is stable: ties keep their original order', () => {
    const table = makeTable({ initialState: { sorting: [{ id: 'active', desc: false }] } });
    const trues = table
      .getRowModel()
      .rows.filter((r) => r.getValue('active'))
      .map((r) => r.id);
    expect(trues).toEqual(['p1', 'p3', 'p4', 'p6']);
  });

  it('B18 regression: mixed and null values sort by a typed, locale-aware comparator', () => {
    // Skimmer compared with `<`/`>`: nulls landed anywhere and "Zoë" sorted after "z".
    const asc = makeTable({ initialState: { sorting: [{ id: 'age', desc: false }] } });
    const desc = makeTable({ initialState: { sorting: [{ id: 'age', desc: true }] } });
    const ages = (t: ReturnType<typeof makeTable>) =>
      t.getRowModel().rows.map((r) => r.getValue<number | null>('age'));
    expect(ages(asc)).toEqual([25, 25, 31, 42, 57, null]);
    // `sortUndefined: 'last'` keeps nulls last in both directions, never first.
    expect(ages(desc)).toEqual([57, 42, 31, 25, 25, null]);
  });

  it('does not mutate the input data', () => {
    const data = [
      { id: 'b', name: 'b' },
      { id: 'a', name: 'a' },
    ];
    const copy = [...data];
    const table = createTable({
      data,
      columns: [{ accessorKey: 'name' }],
      getRowId: (r) => r.id,
      initialState: { sorting: [{ id: 'name', desc: false }] },
    });
    table.getRowModel();
    expect(data).toEqual(copy);
  });
});

describe('sortUndefined', () => {
  const table = (sortUndefined: 'first' | 'last' | 1 | -1, desc: boolean) =>
    makeTable({
      columns: [{ accessorKey: 'age', type: 'number', sortUndefined }],
      initialState: { sorting: [{ id: 'age', desc }] },
    });
  const firstAndLast = (t: ReturnType<typeof makeTable>) => {
    const rows = ids(t.getRowModel().rows);
    return [rows[0], rows[rows.length - 1]];
  };

  it("'last' puts nulls last in both directions", () => {
    expect(firstAndLast(table('last', false))[1]).toBe('p3');
    expect(firstAndLast(table('last', true))[1]).toBe('p3');
  });

  it("'first' puts nulls first in both directions", () => {
    expect(firstAndLast(table('first', false))[0]).toBe('p3');
    expect(firstAndLast(table('first', true))[0]).toBe('p3');
  });

  it('numeric values flip with the direction', () => {
    expect(firstAndLast(table(1, false))[1]).toBe('p3');
    expect(firstAndLast(table(1, true))[0]).toBe('p3');
    expect(firstAndLast(table(-1, false))[0]).toBe('p3');
  });

  it("defaults to 'last'", () => {
    const t = makeTable({ initialState: { sorting: [{ id: 'age', desc: true }] } });
    expect(ids(t.getRowModel().rows).at(-1)).toBe('p3');
  });
});

describe('sortValue, invertSorting, custom registry', () => {
  it('sortValue overrides the value used for sorting (Skimmer getSortValue)', () => {
    const table = makeTable({
      columns: [{ accessorKey: 'name', sortValue: (p) => p.name.length }],
      initialState: { sorting: [{ id: 'name', desc: false }] },
    });
    expect(names(table)[0]).toBe('item2');
  });

  it('invertSorting reverses the comparison', () => {
    const table = makeTable({
      columns: [{ accessorKey: 'age', type: 'number', invertSorting: true }],
      initialState: { sorting: [{ id: 'age', desc: false }] },
    });
    expect(ids(table.getRowModel().rows)[0]).toBe('p6');
  });

  it('resolves sortingFn names from the table registry', () => {
    const table = makeTable({
      sortingFns: {
        byLength: (a, b, id) => String(a.getValue(id)).length - String(b.getValue(id)).length,
      },
      columns: [{ accessorKey: 'name', sortingFn: 'byLength' as never }],
      initialState: { sorting: [{ id: 'name', desc: true }] },
    });
    expect(names(table)[0]).toBe('Ann Álvarez');
  });

  it('display columns and enableSorting:false columns cannot sort', () => {
    const table = makeTable({
      columns: [
        { accessorKey: 'name', enableSorting: false },
        { id: 'actions' },
        { accessorKey: 'age' },
      ] as AnyColumnDef<Person>[],
    });
    expect(table.getColumn('name')!.getCanSort()).toBe(false);
    expect(table.getColumn('actions')!.getCanSort()).toBe(false);
    expect(table.getColumn('age')!.getCanSort()).toBe(true);
  });

  it('a column-level enableSorting:true wins over the table-level false', () => {
    const table = makeTable({
      enableSorting: false,
      columns: [{ accessorKey: 'name', enableSorting: true }, { accessorKey: 'age' }],
    });
    expect(table.getColumn('name')!.getCanSort()).toBe(true);
    expect(table.getColumn('age')!.getCanSort()).toBe(false);
  });
});

describe('server sorting', () => {
  it('manual sorting passes rows through and the query uses sortServerKey', () => {
    const table = makeTable({
      manualSorting: true,
      columns: [{ accessorKey: 'name', sortServerKey: 'LastName' }, { accessorKey: 'age' }],
    });
    table.getColumn('name')!.toggleSorting(true);
    expect(ids(table.getRowModel().rows)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(table.getQuery().sorting).toEqual([{ id: 'LastName', desc: true }]);
    expect(table.getState().sorting).toEqual([{ id: 'name', desc: true }]);
  });
});
