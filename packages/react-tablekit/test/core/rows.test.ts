import { describe, expect, it } from 'vitest';
import { createTable, csvEscape, type AnyColumnDef } from '../../src/core';
import { exportToCsv } from '../../src/utils';
import { ids, makeTable, numbered, people, type Person } from '../fixtures';

const tree: Person[] = [
  {
    id: 'a',
    name: 'A',
    age: 50,
    joined: '2020-01-01',
    active: true,
    children: [
      { id: 'a1', name: 'A1', age: 30, joined: '2020-01-01', active: true },
      { id: 'a2', name: 'A2', age: 20, joined: '2020-01-01', active: false },
    ],
  },
  { id: 'b', name: 'B', age: 40, joined: '2020-01-01', active: true },
];

describe('row selection', () => {
  it('multi selection with page and all toggles', () => {
    const table = makeTable({ enableRowSelection: true, data: numbered(25) });
    table.getRow('r1')!.toggleSelected();
    table.getRow('r2')!.toggleSelected();
    expect(table.getSelectedRowIds()).toEqual(['r1', 'r2']);
    expect(table.getIsSomePageRowsSelected()).toBe(true);
    table.toggleAllPageRowsSelected(true);
    expect(table.getIsAllPageRowsSelected()).toBe(true);
    expect(table.getSelectedCount()).toBe(10);
    table.toggleAllRowsSelected(true);
    expect(table.getSelectedCount()).toBe(25);
    expect(table.getIsAllRowsSelected()).toBe(true);
    table.toggleAllRowsSelected(false);
    expect(table.getSelectedCount()).toBe(0);
  });

  it('single selection (radio semantics, as in a picker dialog)', () => {
    const table = makeTable({ enableRowSelection: true, enableMultiRowSelection: false });
    table.getRow('p1')!.toggleSelected();
    table.getRow('p2')!.toggleSelected();
    expect(table.getSelectedRowIds()).toEqual(['p2']);
    table.getRow('p2')!.toggleSelected();
    expect(table.getSelectedRowIds()).toEqual([]);
  });

  it('disabled rows cannot be selected and select-all skips them', () => {
    const table = makeTable({ enableRowSelection: true, isRowDisabled: (r) => r.id === 'p2' });
    table.getRow('p2')!.toggleSelected(true);
    expect(table.getRow('p2')!.getIsSelected()).toBe(false);
    table.toggleAllRowsSelected(true);
    expect(table.getSelectedRowIds()).not.toContain('p2');
    expect(table.getIsAllRowsSelected()).toBe(true);
  });

  it('function form of enableRowSelection and getRowCanSelect', () => {
    const table = makeTable({
      enableRowSelection: (r) => r.original.active,
      getRowCanSelect: (r) => r.id !== 'p4',
    });
    expect(table.getRow('p2')!.getCanSelect()).toBe(false);
    expect(table.getRow('p4')!.getCanSelect()).toBe(false);
    expect(table.getRow('p1')!.getCanSelect()).toBe(true);
  });

  it('range selection between the anchor and a row', () => {
    const table = makeTable({ enableRowSelection: true });
    table.getRow('p2')!.toggleSelected(true);
    table.selectRange(table._selectionAnchor!, 'p5');
    expect(table.getSelectedRowIds()).toEqual(['p2', 'p3', 'p4', 'p5']);
  });

  it('sub-row selection cascades; parents are indeterminate when some children are selected', () => {
    const table = makeTable({
      enableRowSelection: true,
      data: tree,
      getSubRows: (p) => p.children,
    });
    table.getRow('a', true)!.toggleSelected(true);
    expect(table.getSelectedRowIds().sort()).toEqual(['a', 'a1', 'a2']);
    table.getRow('a2', true)!.toggleSelected(false);
    expect(table.getRow('a', true)!.getIsSomeSelected()).toBe(true);
    const noCascade = makeTable({
      enableRowSelection: true,
      enableSubRowSelection: false,
      data: tree,
      getSubRows: (p) => p.children,
    });
    noCascade.getRow('a', true)!.toggleSelected(true);
    expect(noCascade.getSelectedRowIds()).toEqual(['a']);
  });

  it('client "select all matching" selects every filtered row', () => {
    const table = makeTable({ enableRowSelection: true, data: numbered(30) });
    table.getColumn('name')!.setFilterValue('Row 1'); // Row 1 and Row 10–19
    table.selectAllMatching();
    expect(table.getSelectedCount()).toBe(11);
    expect(table.getIsAllMatchingSelected()).toBe(true);
    expect(table.getSelectionQuery()).toMatchObject({ mode: 'ids' });
    expect(table.getSelectedRowModel().rows).toHaveLength(11);
  });
});

describe('expansion', () => {
  it('flattens expanded sub-rows into the row model', () => {
    const table = makeTable({ data: tree, getSubRows: (p) => p.children });
    expect(ids(table.getRowModel().rows)).toEqual(['a', 'b']);
    table.getRow('a')!.toggleExpanded();
    expect(ids(table.getRowModel().rows)).toEqual(['a', 'a1', 'a2', 'b']);
    expect(table.getRow('a1')!.depth).toBe(1);
    expect(table.getRow('a1')!.getParentRow()!.id).toBe('a');
    table.toggleAllRowsExpanded(false);
    expect(table.getIsSomeRowsExpanded()).toBe(false);
  });

  it('expand all, collapse one from "all"', () => {
    const table = makeTable({ data: tree, getSubRows: (p) => p.children });
    table.toggleAllRowsExpanded(true);
    expect(table.getState().expanded).toBe(true);
    expect(table.getIsAllRowsExpanded()).toBe(true);
    table.getRow('a')!.toggleExpanded(false);
    expect(table.getRow('a')!.getIsExpanded()).toBe(false);
  });

  it('single expand mode collapses the others (accordion)', () => {
    const table = makeTable({ expandMode: 'single', getRowCanExpand: () => true });
    table.getRow('p1')!.toggleExpanded();
    table.getRow('p2')!.toggleExpanded();
    expect(table.getState().expanded).toEqual({ p2: true });
  });

  it('getRowCanExpand / detail panels / sorting inside parents', () => {
    const table = makeTable({
      data: tree,
      getSubRows: (p) => p.children,
      initialState: { sorting: [{ id: 'age', desc: false }], expanded: true },
    });
    expect(ids(table.getRowModel().rows)).toEqual(['b', 'a', 'a2', 'a1']);
    expect(table.getRow('b')!.getCanExpand()).toBe(false);
    const panels = makeTable({ _hasDetailPanel: true });
    expect(panels.getRow('p1')!.getCanExpand()).toBe(true);
  });

  it('paginateExpandedRows:false paginates parents and then expands', () => {
    const data = [...tree, ...numbered(3)];
    const table = makeTable({
      data,
      getSubRows: (p) => p.children,
      paginateExpandedRows: false,
      initialState: { expanded: true, pagination: { pageIndex: 0, pageSize: 2 } },
    });
    expect(ids(table.getRowModel().rows)).toEqual(['a', 'a1', 'a2', 'b']);
  });
});

describe('grouping and aggregation', () => {
  it('groups rows with aggregates and expandable group rows', () => {
    const table = makeTable({
      enableGrouping: true,
      columns: [
        { accessorKey: 'city', enableGrouping: true },
        { accessorKey: 'age', aggregationFn: 'sum' },
        { accessorKey: 'name', aggregationFn: 'count' },
      ] as AnyColumnDef<Person>[],
      initialState: { grouping: ['city'] },
    });
    const groups = table.getRowModel().rows;
    expect(groups.map((g) => g.id)).toEqual([
      'group:city:Budapest',
      'group:city:Austin',
      'group:city:Miami',
      'group:city:undefined',
    ]);
    const budapest = groups[0]!;
    expect(budapest.getIsGrouped()).toBe(true);
    expect(budapest.getValue('city')).toBe('Budapest');
    expect(budapest.getValue('age')).toBe(31 + 57);
    expect(budapest.getValue('name')).toBe(2);
    expect(budapest.getLeafRows()).toHaveLength(2);
    budapest.toggleExpanded();
    expect(
      table
        .getRowModel()
        .rows.map((r) => r.id)
        .slice(0, 3),
    ).toEqual(['group:city:Budapest', 'p1', 'p6']);
    expect(table.getVisibleLeafColumns()[0]!.id).toBe('city');
  });

  it("groupedColumnMode 'remove' hides grouped columns", () => {
    const table = makeTable({
      enableGrouping: true,
      groupedColumnMode: 'remove',
      initialState: { grouping: ['city'] },
    });
    expect(table.getVisibleLeafColumns().map((c) => c.id)).not.toContain('city');
  });

  it('every built-in aggregation function works', () => {
    const agg = (fn: string) =>
      createTable<Person>({
        data: people,
        columns: [{ accessorKey: 'active' }, { accessorKey: 'age', aggregationFn: fn as never }],
        initialState: { grouping: ['active'] },
        enableGrouping: true,
      })
        .getRowModel()
        .rows.find((r) => r.groupingValue === true)!
        .getValue('age');
    expect(agg('min')).toBe(31);
    expect(agg('max')).toBe(57);
    expect(agg('extent')).toEqual([31, 57]);
    expect(agg('mean')).toBeCloseTo((31 + 42 + 57) / 3);
    expect(agg('median')).toBe(42);
    expect(agg('uniqueCount')).toBe(4);
    expect(agg('unique')).toEqual([31, null, 42, 57]);
  });

  it('nested grouping produces nested group rows', () => {
    const table = makeTable({
      enableGrouping: true,
      initialState: { grouping: ['active', 'city'], expanded: true },
    });
    const nested = table.getRowModel().rows.find((r) => r.depth === 1 && r.getIsGrouped());
    expect(nested!.id).toMatch(/^group:active:true>group:city:/);
  });

  it('changing grouping resets expansion', () => {
    const table = makeTable({ enableGrouping: true, initialState: { grouping: ['city'] } });
    table.toggleAllRowsExpanded(true);
    table.setGrouping(['active']);
    expect(table.getState().expanded).toEqual({});
  });
});

describe('row pinning', () => {
  it('keeps pinned rows across pages and filters', () => {
    const table = makeTable({ enableRowPinning: true, data: numbered(25) });
    table.getRow('r15', true)!.pin('top');
    table.getRow('r3')!.pin('bottom');
    expect(ids(table.getTopRows())).toEqual(['r15']);
    expect(ids(table.getBottomRows())).toEqual(['r3']);
    expect(ids(table.getCenterRows())).not.toContain('r3');
    table.setGlobalFilter('Row 2');
    expect(ids(table.getTopRows())).toEqual(['r15']);
    expect(table.getRow('r15', true)!.getIsPinned()).toBe('top');
  });
});

describe('CSV export', () => {
  it('RFC 4180 quoting', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"');
  });

  it('exports visible exportable columns with BOM, meta.exportHeader and exportValue', async () => {
    const table = makeTable({
      columns: [
        { accessorKey: 'name', header: 'Name', meta: { exportHeader: 'Full name' } as never },
        { accessorKey: 'age', header: 'Age', exportValue: (p) => (p.age ?? 0) * 2 },
        { accessorKey: 'city', enableExport: false },
        { id: 'actions' },
      ] as AnyColumnDef<Person>[],
      initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
    });
    const page = await table.exportCsv();
    expect(page.startsWith('﻿')).toBe(true);
    expect(page.slice(1).split('\r\n')).toEqual(['Full name,Age', 'Zoë Adams,62', 'bob brown,50']);
    const all = await table.exportCsv({ scope: 'all', bom: false });
    expect(all.split('\r\n')).toHaveLength(7);
    table.getRow('p1')!.toggleSelected(true);
  });

  it('exportToCsv works standalone', () => {
    const csv = exportToCsv(people.slice(0, 1), [{ accessorKey: 'name', header: 'Name' }], {
      bom: false,
      delimiter: ';',
    });
    expect(csv).toBe('Name\r\nZoë Adams');
  });
});
