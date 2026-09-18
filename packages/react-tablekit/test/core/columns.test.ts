import { describe, expect, it } from 'vitest';
import { createTable, type AnyColumnDef, type Breakpoint } from '../../src/core';
import { lightThemeForTests } from '../themeFixture';
import { makeTable, people, type Person } from '../fixtures';

const withBreakpoint = (bp: Breakpoint) => ({
  _renderContext: { breakpoint: bp, theme: lightThemeForTests },
});

describe('column model', () => {
  it('supports accessorKey (with dot paths), accessorFn and display columns', () => {
    const table = createTable<Person>({
      data: people,
      columns: [
        { accessorKey: 'address.city' },
        { id: 'initial', accessorFn: (p) => p.name[0] },
        { id: 'actions' },
      ],
      getRowId: (p) => p.id,
    });
    const row = table.getRow('p1')!;
    expect(row.getValue('address.city')).toBe('Budapest');
    expect(table.getRow('p3')!.getValue('address.city')).toBeUndefined();
    expect(row.getValue('initial')).toBe('Z');
    expect(row.getValue('actions')).toBeUndefined();
    expect(table.getColumn('actions')!.accessorFn).toBeUndefined();
  });

  it('caches accessor values per row', () => {
    let calls = 0;
    const table = createTable<Person>({
      data: people,
      columns: [{ id: 'x', accessorFn: (p) => (calls++, p.age) }],
      getRowId: (p) => p.id,
    });
    const row = table.getRow('p1')!;
    row.getValue('x');
    row.getValue('x');
    expect(calls).toBe(1);
  });

  it('builds multi-row header groups with placeholders and spans', () => {
    const table = createTable<Person>({
      data: people,
      columns: [
        { accessorKey: 'name' },
        {
          id: 'details',
          header: 'Details',
          columns: [{ accessorKey: 'age' }, { accessorKey: 'city' }],
        },
      ],
    });
    const groups = table.getHeaderGroups();
    expect(groups).toHaveLength(2);
    const [top, bottom] = groups;
    expect(top!.headers.map((h) => [h.column.id, h.colSpan, h.rowSpan, h.isPlaceholder])).toEqual([
      ['name', 1, 2, true],
      ['details', 2, 1, false],
    ]);
    expect(bottom!.headers.map((h) => [h.column.id, h.rowSpan])).toEqual([
      ['name', 0],
      ['age', 1],
      ['city', 1],
    ]);
    expect(top!.headers[1]!.subHeaders.map((h) => h.column.id)).toEqual(['age', 'city']);
    expect(table.getLeafHeaders().map((h) => h.column.id)).toEqual(['name', 'age', 'city']);
  });

  it('humanized id is the column id for a string header', () => {
    const table = createTable<Person>({
      data: [],
      columns: [{ header: 'Just text', cell: 'x' } as AnyColumnDef<Person>],
    });
    expect(table.getAllLeafColumns()[0]!.id).toBe('Just text');
  });

  it('detects column types and default alignment', () => {
    const table = makeTable({
      columns: [{ accessorKey: 'name' }, { accessorKey: 'age' }, { accessorKey: 'joined' }],
    });
    expect(table.getColumn('name')!.getType()).toBe('text');
    expect(table.getColumn('age')!.getType()).toBe('number');
    expect(table.getColumn('age')!.getAlign()).toBe('right');
    expect(table.getColumn('joined')!.getType()).toBe('date');
  });

  it('columnDefaults are merged into every column (columns win)', () => {
    const table = makeTable({
      columnDefaults: { enableSorting: false, size: 99 },
      columns: [{ accessorKey: 'name', size: 200 }, { accessorKey: 'age' }],
    });
    expect(table.getColumn('age')!.getSize()).toBe(99);
    expect(table.getColumn('name')!.getSize()).toBe(200);
    expect(table.getColumn('name')!.getCanSort()).toBe(false);
  });
});

describe('column visibility', () => {
  it('defaultHidden, toggling and the hideable flag', () => {
    const table = makeTable({
      columns: [
        { accessorKey: 'name', enableHiding: false },
        { accessorKey: 'age', defaultHidden: true },
        { accessorKey: 'city' },
      ],
    });
    expect(table.getVisibleLeafColumns().map((c) => c.id)).toEqual(['name', 'city']);
    table.getColumn('age')!.toggleVisibility();
    expect(table.getColumn('age')!.getIsVisible()).toBe(true);
    table.getColumn('name')!.toggleVisibility(false);
    expect(table.getColumn('name')!.getIsVisible()).toBe(true);
    table.toggleAllColumnsVisible(false);
    expect(table.getVisibleLeafColumns().map((c) => c.id)).toEqual(['name']);
    expect(table.getIsSomeColumnsVisible()).toBe(true);
    expect(table.getIsAllColumnsVisible()).toBe(false);
  });

  it('hideBelow / hideAbove are responsive and not part of state', () => {
    const cols: AnyColumnDef<Person>[] = [
      { accessorKey: 'name' },
      { accessorKey: 'age', hideBelow: 'md' },
      { accessorKey: 'city', hideAbove: 'sm' },
    ];
    const mobile = makeTable({ columns: cols, ...withBreakpoint('sm') });
    expect(mobile.getVisibleLeafColumns().map((c) => c.id)).toEqual(['name', 'city']);
    const desktop = makeTable({ columns: cols, ...withBreakpoint('lg') });
    expect(desktop.getVisibleLeafColumns().map((c) => c.id)).toEqual(['name', 'age']);
    expect(desktop.getColumn('city')!.getIsVisible()).toBe(true);
  });
});

describe('column ordering', () => {
  it('applies columnOrder, lockPosition and moveColumn', () => {
    const table = makeTable({
      enableColumnOrdering: true,
      columns: [
        { accessorKey: 'name' },
        { accessorKey: 'age' },
        { accessorKey: 'city', lockPosition: 'first' },
        { accessorKey: 'joined' },
      ],
    });
    expect(table.getVisibleLeafColumns().map((c) => c.id)).toEqual([
      'city',
      'name',
      'age',
      'joined',
    ]);
    table.setColumnOrder(['joined', 'age']);
    expect(table.getVisibleLeafColumns().map((c) => c.id)).toEqual([
      'city',
      'joined',
      'age',
      'name',
    ]);
    table.moveColumn('name', 1);
    expect(table.getVisibleLeafColumns().map((c) => c.id)).toEqual([
      'city',
      'name',
      'joined',
      'age',
    ]);
    expect(table.getColumn('city')!.getCanOrder()).toBe(false);
  });
});

describe('column pinning', () => {
  const pinCols: AnyColumnDef<Person>[] = [
    { accessorKey: 'name', pin: 'left', size: 120 },
    { accessorKey: 'age', size: 80 },
    { accessorKey: 'city', size: 100 },
    { accessorKey: 'joined', pin: 'right', size: 90 },
    { id: 'actions', pin: 'right', size: 48, static: true },
  ];

  it('any column, any count, both sides', () => {
    const table = makeTable({ columns: pinCols });
    table.getColumn('age')!.pin('left');
    expect(table.getLeftVisibleLeafColumns().map((c) => c.id)).toEqual(['name', 'age']);
    expect(table.getCenterVisibleLeafColumns().map((c) => c.id)).toEqual(['city']);
    expect(table.getRightVisibleLeafColumns().map((c) => c.id)).toEqual(['joined', 'actions']);
    expect(table.getVisibleLeafColumns().map((c) => c.id)).toEqual([
      'name',
      'age',
      'city',
      'joined',
      'actions',
    ]);
  });

  it('stacks offsets from the pinned widths', () => {
    const table = makeTable({ columns: pinCols });
    table.getColumn('age')!.pin('left');
    expect(table.getColumn('name')!.getStart('left')).toBe(0);
    expect(table.getColumn('age')!.getStart('left')).toBe(120);
    expect(table.getColumn('actions')!.getAfter('right')).toBe(0);
    expect(table.getColumn('joined')!.getAfter('right')).toBe(48);
  });

  it('static / lockPin columns cannot be unpinned', () => {
    const table = makeTable({ columns: pinCols });
    expect(table.getColumn('actions')!.getCanPin()).toBe(false);
    table.setColumnPinning({ left: [], right: [] });
    expect(table.getColumn('actions')!.getIsPinned()).toBe('right');
    expect(table.getColumn('joined')!.getIsPinned()).toBe(false);
    table.resetColumnPinning();
    expect(table.getColumn('joined')!.getIsPinned()).toBe('right');
  });

  it("responsive pin: { base: 'right', md: false } (pinned on desktop, released on mobile)", () => {
    const cols: AnyColumnDef<Person>[] = [
      { accessorKey: 'name' },
      { id: 'actions', pin: { base: 'right', md: false } },
    ];
    expect(
      makeTable({ columns: cols, ...withBreakpoint('sm') })
        .getColumn('actions')!
        .getIsPinned(),
    ).toBe('right');
    expect(
      makeTable({ columns: cols, ...withBreakpoint('md') })
        .getColumn('actions')!
        .getIsPinned(),
    ).toBe(false);
    expect(
      makeTable({ columns: cols, ...withBreakpoint('xs') })
        .getColumn('actions')!
        .getCanPin(),
    ).toBe(false);
  });

  it('stickyActions pins the actions column right', () => {
    const table = makeTable({
      stickyActions: true,
      columns: [{ accessorKey: 'name' }, { id: 'actions' }],
    });
    expect(table.getColumn('actions')!.getIsPinned()).toBe('right');
  });

  it('the selection column follows left pins', () => {
    const table = makeTable({
      columns: [{ id: 'tk-select' }, { accessorKey: 'name', pin: 'left' }, { accessorKey: 'age' }],
    });
    expect(table.getLeftVisibleLeafColumns().map((c) => c.id)).toEqual(['tk-select', 'name']);
    table.getColumn('name')!.pin(false);
    expect(table.getLeftVisibleLeafColumns()).toEqual([]);
  });

  it('row cells are split into pinned sections', () => {
    const table = makeTable({ columns: pinCols });
    const row = table.getRow('p1')!;
    expect(row.getLeftVisibleCells().map((c) => c.column.id)).toEqual(['name']);
    expect(row.getRightVisibleCells().map((c) => c.column.id)).toEqual(['joined', 'actions']);
    expect(row.getVisibleCells()).toHaveLength(5);
  });
});

describe('column sizing', () => {
  it('uses size, px widths, min/max and state', () => {
    const table = makeTable({
      columns: [
        { accessorKey: 'name' },
        { accessorKey: 'age', width: '80px' },
        { accessorKey: 'city', width: '15%' },
        { accessorKey: 'joined', size: 10, minSize: 60 },
      ],
      enableColumnResizing: true,
    });
    expect(table.getColumn('name')!.getSize()).toBe(150);
    expect(table.getColumn('age')!.getSize()).toBe(80);
    expect(table.getColumn('city')!.getSize()).toBe(150);
    expect(table.getColumn('joined')!.getSize()).toBe(60);
    table.setColumnSizing({ name: 222 });
    expect(table.getColumn('name')!.getSize()).toBe(222);
    table.getColumn('name')!.resetSize();
    expect(table.getColumn('name')!.getSize()).toBe(150);
    table.autosizeColumn('age', 133.4);
    expect(table.getColumn('age')!.getSize()).toBe(133);
    expect(table.getTotalSize()).toBe(150 + 133 + 150 + 60);
    expect(table.getColumn('name')!.getCanResize()).toBe(true);
  });
});
