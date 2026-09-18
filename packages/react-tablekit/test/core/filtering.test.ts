import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { filterFns, fuzzyScore, type AnyColumnDef } from '../../src/core';
import { ids, makeTable, type Person } from '../fixtures';

describe('global search', () => {
  it('is case- and diacritic-insensitive', () => {
    const table = makeTable();
    table.setGlobalFilter('ALVAREZ');
    expect(ids(table.getRowModel().rows)).toEqual(['p4']);
    table.setGlobalFilter('zoe');
    expect(ids(table.getRowModel().rows)).toEqual(['p1']);
  });

  it('multi-word queries AND across words by default (any column per word)', () => {
    const table = makeTable();
    table.setGlobalFilter('austin clark');
    expect(ids(table.getRowModel().rows)).toEqual(['p3']);
  });

  it("supports 'any-word' and 'phrase'", () => {
    const any = makeTable({ globalFilterMatch: 'any-word' });
    any.setGlobalFilter('miami zoe');
    expect(ids(any.getRowModel().rows)).toEqual(['p1', 'p4']);
    const phrase = makeTable({ globalFilterMatch: 'phrase' });
    phrase.setGlobalFilter('carl clark');
    expect(ids(phrase.getRowModel().rows)).toEqual(['p3']);
    phrase.setGlobalFilter('clark carl');
    expect(phrase.getRowModel().rows).toHaveLength(0);
  });

  it('matches getSearchValue → format → String(value), and skips enableGlobalFilter:false', () => {
    const table = makeTable({
      columns: [
        { accessorKey: 'name', enableGlobalFilter: false },
        { accessorKey: 'age', format: (v) => (v == null ? '' : `${String(v)} years`) },
        { accessorKey: 'city', getSearchValue: (p) => `town:${p.city ?? ''}` },
      ] as AnyColumnDef<Person>[],
    });
    table.setGlobalFilter('zoe');
    expect(table.getRowModel().rows).toHaveLength(0);
    table.setGlobalFilter('42 years');
    expect(ids(table.getRowModel().rows)).toEqual(['p4']);
    table.setGlobalFilter('town:miami');
    expect(ids(table.getRowModel().rows)).toEqual(['p4']);
  });

  it('regex-special characters are matched literally', () => {
    const table = makeTable({
      data: [{ id: 'x', name: 'a+b (c)', age: 1, joined: '2020-01-01', active: true }],
    });
    table.setGlobalFilter('+b (');
    expect(table.getRowModel().rows).toHaveLength(1);
  });

  it('manual global filtering passes rows through', () => {
    const table = makeTable({ searchMode: 'server' });
    table.setGlobalFilter('zoe');
    expect(table.getRowModel().rows).toHaveLength(6);
    expect(table.getQuery().globalFilter).toBe('zoe');
  });
});

describe('debounce + min length', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('state updates immediately, the query after searchDebounceMs', () => {
    const onQueryChange = vi.fn();
    const table = makeTable({ searchDebounceMs: 300, onQueryChange });
    table.setGlobalFilter('zo');
    table.setGlobalFilter('zoe');
    expect(table.getState().globalFilter).toBe('zoe');
    expect(table.getQuery().globalFilter).toBe('');
    expect(table.getRowModel().rows).toHaveLength(6);
    vi.advanceTimersByTime(299);
    expect(onQueryChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange.mock.calls[0]![1]).toMatchObject({ reason: 'globalFilter' });
    expect(ids(table.getRowModel().rows)).toEqual(['p1']);
  });

  it('respects searchMinLength; an empty query always applies', () => {
    const onQueryChange = vi.fn();
    const table = makeTable({ searchDebounceMs: 300, searchMinLength: 3, onQueryChange });
    table.setGlobalFilter('zo');
    vi.advanceTimersByTime(300);
    expect(onQueryChange).not.toHaveBeenCalled();
    table.setGlobalFilter('zoe');
    vi.advanceTimersByTime(300);
    expect(table.getQuery().globalFilter).toBe('zoe');
    table.setGlobalFilter('zo');
    vi.advanceTimersByTime(300);
    expect(table.getQuery().globalFilter).toBe('zoe');
    table.setGlobalFilter('');
    vi.advanceTimersByTime(300);
    expect(table.getQuery().globalFilter).toBe('');
    expect(onQueryChange).toHaveBeenCalledTimes(2);
  });

  it('text column filters are debounced by filterDebounceMs; select filters apply immediately', () => {
    const table = makeTable({
      filterDebounceMs: 200,
      columns: [{ accessorKey: 'name' }, { accessorKey: 'city', filterVariant: 'select' }],
    });
    table.getColumn('name')!.setFilterValue('bob');
    expect(table.getRowModel().rows).toHaveLength(6);
    vi.advanceTimersByTime(200);
    expect(ids(table.getRowModel().rows)).toEqual(['p2']);
    table.getColumn('name')!.setFilterValue(undefined);
    table.getColumn('city')!.setFilterValue('Miami');
    expect(ids(table.getRowModel().rows)).toEqual(['p4']);
  });

  it('flushQuery applies pending debounced changes', () => {
    const table = makeTable({ searchDebounceMs: 300 });
    table.setGlobalFilter('zoe');
    table.flushQuery();
    expect(table.getQuery().globalFilter).toBe('zoe');
  });
});

describe('column filters', () => {
  it('text variant honours operators', () => {
    const table = makeTable();
    const name = table.getColumn('name')!;
    name.setFilterValue('item', 'startsWith');
    expect(ids(table.getRowModel().rows)).toEqual(['p5', 'p6']);
    name.setFilterValue('2', 'endsWith');
    expect(ids(table.getRowModel().rows)).toEqual(['p6']);
    name.setFilterValue('item', 'notContains');
    expect(table.getRowModel().rows).toHaveLength(4);
  });

  it('empty / notEmpty keep a valueless filter', () => {
    const table = makeTable();
    table.getColumn('city')!.setFilterValue('', 'empty');
    expect(ids(table.getRowModel().rows)).toEqual(['p5']);
    table.getColumn('city')!.setFilterValue('', 'notEmpty');
    expect(table.getRowModel().rows).toHaveLength(5);
  });

  it('autoRemove drops empty values', () => {
    const table = makeTable();
    table.getColumn('name')!.setFilterValue('x');
    expect(table.getState().columnFilters).toHaveLength(1);
    table.getColumn('name')!.setFilterValue('');
    expect(table.getState().columnFilters).toHaveLength(0);
    expect(table.getColumn('name')!.getIsFiltered()).toBe(false);
  });

  it('range (number default), number operators, boolean, date range, multiSelect', () => {
    const table = makeTable({
      columns: [
        { accessorKey: 'age', type: 'number' },
        { accessorKey: 'active', type: 'boolean' },
        { accessorKey: 'joined', type: 'date' },
        { accessorKey: 'city', filterVariant: 'multiSelect' },
        { id: 'age2', accessorFn: (p) => p.age, filterVariant: 'number' },
      ] as AnyColumnDef<Person>[],
    });
    expect(table.getColumn('age')!.getFilterVariant()).toBe('range');
    table.getColumn('age')!.setFilterValue([30, 50]);
    expect(ids(table.getRowModel().rows)).toEqual(['p1', 'p4']);
    table.getColumn('age')!.setFilterValue([null, null]);
    expect(table.getState().columnFilters).toHaveLength(0);

    table.getColumn('age2')!.setFilterValue(25, 'gt');
    expect(ids(table.getRowModel().rows)).toEqual(['p1', 'p4', 'p6']);
    table.getColumn('age2')!.setFilterValue(undefined);

    table.getColumn('active')!.setFilterValue(false);
    expect(ids(table.getRowModel().rows)).toEqual(['p2', 'p5']);
    table.getColumn('active')!.setFilterValue(null);

    table.getColumn('joined')!.setFilterValue(['2020-01-01', '2021-12-31']);
    expect(ids(table.getRowModel().rows)).toEqual(['p1', 'p2']);
    table.getColumn('joined')!.setFilterValue(undefined);

    table.getColumn('city')!.setFilterValue(['Austin', 'Miami']);
    expect(ids(table.getRowModel().rows)).toEqual(['p2', 'p3', 'p4']);
    table.getColumn('city')!.setFilterValue(['Austin'], 'notIn');
    expect(ids(table.getRowModel().rows)).toEqual(['p1', 'p4', 'p5', 'p6']);
  });

  it('date variant: on / before / after (day precision)', () => {
    const table = makeTable({ columns: [{ accessorKey: 'joined', filterVariant: 'date' }] });
    table.getColumn('joined')!.setFilterValue('2020-01-15', 'on');
    expect(ids(table.getRowModel().rows)).toEqual(['p2']);
    table.getColumn('joined')!.setFilterValue('2020-01-15', 'before');
    expect(ids(table.getRowModel().rows)).toEqual(['p4', 'p6']);
  });

  it('custom filterFn from the registry (with autoRemove)', () => {
    const phone = Object.assign(
      (row: { getValue(id: string): unknown }, id: string, value: unknown) =>
        String(row.getValue(id)).startsWith(String(value)),
      { autoRemove: (v: unknown) => !v },
    );
    const table = makeTable({
      filterFns: { prefix: phone },
      columns: [{ accessorKey: 'name', filterFn: 'prefix' as never }],
    });
    table.getColumn('name')!.setFilterValue('item');
    expect(ids(table.getRowModel().rows)).toEqual(['p5', 'p6']);
  });

  it('clearAllFilters clears filters and search; getActiveFilterCount counts both', () => {
    const table = makeTable();
    table.getColumn('city')!.setFilterValue('a');
    table.setGlobalFilter('b');
    expect(table.getActiveFilterCount()).toBe(2);
    table.clearAllFilters();
    expect(table.getActiveFilterCount()).toBe(0);
    expect(table.getRowModel().rows).toHaveLength(6);
  });

  it('filter serialization in server mode: ids are mapped to filterServerKey', () => {
    const table = makeTable({
      dataMode: 'server',
      columns: [{ accessorKey: 'city', filterServerKey: 'City', filterVariant: 'select' }],
    });
    table.getColumn('city')!.setFilterValue('Miami', 'equals');
    expect(table.getQuery().columnFilters).toEqual([
      { id: 'City', value: 'Miami', operator: 'equals' },
    ]);
    expect(table.getRowModel().rows).toHaveLength(6);
  });
});

describe('faceting', () => {
  it('unique values and min/max respect the other filters but not their own', () => {
    const table = makeTable();
    const city = table.getColumn('city')!;
    expect(city.getFacetedUniqueValues().get('Austin')).toBe(2);
    table.getColumn('active')!.setFilterValue(true);
    expect(city.getFacetedUniqueValues().get('Austin')).toBe(1);
    city.setFilterValue('Budapest');
    expect(city.getFacetedUniqueValues().get('Austin')).toBe(1);
    expect(table.getColumn('age')!.getFacetedMinMaxValues()).toEqual([31, 57]);
  });

  it('counts array values per element', () => {
    const table = makeTable({ columns: [{ accessorKey: 'tags' }] });
    const tags = table.getColumn('tags')!.getFacetedUniqueValues();
    expect(tags.get('a')).toBe(2);
    expect(tags.get('b')).toBe(2);
  });
});

describe('tree filtering', () => {
  const tree: Person[] = [
    {
      id: 'root',
      name: 'Root',
      age: 1,
      joined: '2020-01-01',
      active: true,
      children: [
        { id: 'child-a', name: 'Alpha', age: 2, joined: '2020-01-01', active: true },
        { id: 'child-b', name: 'Beta', age: 3, joined: '2020-01-01', active: true },
      ],
    },
  ];

  it('filters from the root by default; filterFromLeafRows keeps matching ancestors', () => {
    const root = makeTable({ data: tree, getSubRows: (p) => p.children });
    root.setGlobalFilter('beta');
    expect(root.getFilteredRowModel().flatRows).toHaveLength(0);
    const leaf = makeTable({ data: tree, getSubRows: (p) => p.children, filterFromLeafRows: true });
    leaf.setGlobalFilter('beta');
    expect(ids(leaf.getFilteredRowModel().flatRows)).toEqual(['root', 'child-b']);
  });

  it('does not restore rejected children when only their parent matches', () => {
    const table = makeTable({
      data: tree,
      getSubRows: (p) => p.children,
      filterFromLeafRows: true,
    });
    table.setGlobalFilter('root');
    expect(ids(table.getFilteredRowModel().flatRows)).toEqual(['root']);
  });

  it('preserves children below the configured leaf-filter depth', () => {
    const table = makeTable({
      data: tree,
      getSubRows: (p) => p.children,
      filterFromLeafRows: true,
      maxLeafRowFilterDepth: 0,
    });
    table.setGlobalFilter('root');
    expect(ids(table.getFilteredRowModel().flatRows)).toEqual(['root', 'child-a', 'child-b']);
    table.setGlobalFilter('beta');
    expect(table.getFilteredRowModel().flatRows).toEqual([]);
  });
});

describe('filterFns / fuzzy', () => {
  it('fuzzy scores in-order characters', () => {
    expect(fuzzyScore('Zoë Adams', 'zdm')).toBeGreaterThan(0);
    expect(fuzzyScore('Zoë Adams', 'xyz')).toBe(0);
    expect(fuzzyScore('abc', 'abc')).toBeGreaterThan(fuzzyScore('axbxc', 'abc'));
  });

  it('exposes every built-in name from the spec', () => {
    for (const name of [
      'includesString',
      'includesStringSensitive',
      'equalsString',
      'startsWith',
      'endsWith',
      'equals',
      'weakEquals',
      'arrIncludes',
      'arrIncludesAll',
      'arrIncludesSome',
      'inNumberRange',
      'inDateRange',
      'dateEquals',
      'before',
      'after',
      'empty',
      'notEmpty',
      'fuzzy',
    ]) {
      expect(filterFns).toHaveProperty(name);
    }
  });
});
