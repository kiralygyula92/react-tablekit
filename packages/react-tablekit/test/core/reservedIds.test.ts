import { describe, expect, it } from 'vitest';
import { createTable } from '../../src/core';

describe('row and column IDs that match object prototype properties', () => {
  it.each(['__proto__', 'constructor', 'toString'])('reads and sizes a column named %s', (id) => {
    const table = createTable({
      data: [{ value: 'hello' }],
      columns: [{ id, accessorFn: (row) => row.value, size: 120 }],
    });
    const row = table.getCoreRowModel().rows[0]!;
    expect(row.getValue(id)).toBe('hello');
    expect(row.getUniqueValues(id)).toEqual(['hello']);
    expect(table.getColumn(id)!.getSize()).toBe(120);
    table.setGlobalFilter('hello');
    table.flushQuery();
    expect(table.getFilteredRowModel().rows).toHaveLength(1);
  });

  it('keeps special row IDs as own entries and missing IDs undefined', () => {
    const table = createTable({
      data: [{ id: '__proto__', value: 'hello' }],
      columns: [{ accessorKey: 'value' }],
      getRowId: (row) => row.id,
    });
    const model = table.getRowModel();
    expect(Object.hasOwn(model.rowsById, '__proto__')).toBe(true);
    expect(table.getRow('__proto__')?.original.value).toBe('hello');
    expect(table.getRow('toString')).toBeUndefined();
  });

  it('selects and deselects rows named __proto__ individually and through select-all', () => {
    const table = createTable({
      data: [{ id: '__proto__' }],
      columns: [{ accessorKey: 'id' }],
      getRowId: (row) => row.id,
      enableRowSelection: true,
    });
    const row = table.getRow('__proto__')!;
    expect(row.getIsSelected()).toBe(false);
    row.toggleSelected(true);
    expect(row.getIsSelected()).toBe(true);
    row.toggleSelected(false);
    expect(row.getIsSelected()).toBe(false);
    table.toggleAllRowsSelected(true);
    expect(row.getIsSelected()).toBe(true);
  });

  it('does not consider inherited expansion entries expanded', () => {
    const table = createTable({
      data: [{ id: 'constructor' }],
      columns: [{ accessorKey: 'id' }],
      getRowId: (row) => row.id,
      getRowCanExpand: () => true,
    });
    expect(table.getIsAllRowsExpanded()).toBe(false);
  });
});
