import { describe, expect, it, vi } from 'vitest';
import { createTable } from '../../src/core';
import { ids, makeTable, numbered, personColumns } from '../fixtures';

const table25 = (overrides = {}) =>
  makeTable({
    data: numbered(25),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    ...overrides,
  });

describe('client pagination', () => {
  it('slices the processed rows and derives the counts', () => {
    const table = table25();
    expect(table.getRowModel().rows).toHaveLength(10);
    expect(table.getRowCount()).toBe(25);
    expect(table.getPageCount()).toBe(3);
    table.lastPage();
    expect(ids(table.getRowModel().rows)).toEqual(['r20', 'r21', 'r22', 'r23', 'r24']);
  });

  it('the page count follows the page size (no hard-coded 10)', () => {
    const table = table25({ initialState: { pagination: { pageIndex: 0, pageSize: 5 } } });
    expect(table.getPageCount()).toBe(5);
    table.setPageSize(25);
    expect(table.getPageCount()).toBe(1);
  });

  it('next/previous/first/last respect the bounds', () => {
    const table = table25();
    expect(table.getCanPreviousPage()).toBe(false);
    table.previousPage();
    expect(table.getState().pagination.pageIndex).toBe(0);
    table.nextPage();
    table.nextPage();
    expect(table.getCanNextPage()).toBe(false);
    table.nextPage();
    expect(table.getState().pagination.pageIndex).toBe(2);
    table.firstPage();
    expect(table.getState().pagination.pageIndex).toBe(0);
  });

  it('setPageIndex clamps into range', () => {
    const table = table25();
    table.setPageIndex(99);
    expect(table.getState().pagination.pageIndex).toBe(2);
    table.setPageIndex(-3);
    expect(table.getState().pagination.pageIndex).toBe(0);
  });

  it('changing the page size keeps the first visible row on screen', () => {
    const table = table25();
    table.setPageIndex(2); // rows 20..24
    table.setPageSize(5);
    expect(table.getState().pagination.pageIndex).toBe(4);
    expect(ids(table.getRowModel().rows)[0]).toBe('r20');
  });

  it('getPageItems uses the current page', () => {
    const table = makeTable({ data: numbered(100) });
    table.setPageIndex(4);
    expect(table.getPageItems().find((i) => i.type === 'page' && i.selected)).toEqual({
      type: 'page',
      index: 4,
      selected: true,
    });
  });

  it('enablePagination:false shows every row as one page', () => {
    const table = table25({ enablePagination: false });
    expect(table.getRowModel().rows).toHaveLength(25);
    expect(table.getPageCount()).toBe(1);
  });
});

describe('auto page reset (client)', () => {
  it('resets to page 0 when sorting, filters or search change', () => {
    const table = table25();
    table.setPageIndex(2);
    table.getColumn('age')!.toggleSorting();
    expect(table.getState().pagination.pageIndex).toBe(0);
    table.setPageIndex(1);
    table.setGlobalFilter('Row');
    expect(table.getState().pagination.pageIndex).toBe(0);
    table.setPageIndex(1);
    table.getColumn('name')!.setFilterValue('Row');
    expect(table.getState().pagination.pageIndex).toBe(0);
  });

  it('respects autoResetPageIndex:false and resetPageOn', () => {
    const a = table25({ autoResetPageIndex: false });
    a.setPageIndex(1);
    a.getColumn('age')!.toggleSorting();
    expect(a.getState().pagination.pageIndex).toBe(1);

    const b = table25({ resetPageOn: ['globalFilter'] });
    b.setPageIndex(1);
    b.getColumn('age')!.toggleSorting();
    expect(b.getState().pagination.pageIndex).toBe(1);
  });

  it('clamps the page into range when the data shrinks', async () => {
    const table = table25();
    table.setPageIndex(2);
    table.setOptions((o) => ({ ...o, data: numbered(12) }));
    await Promise.resolve();
    expect(table.getState().pagination.pageIndex).toBe(1);
  });

  it('resets on data change only with an explicit autoResetPageIndex:true', async () => {
    const table = table25({ autoResetPageIndex: true });
    table.setPageIndex(1);
    table.setOptions((o) => ({ ...o, data: numbered(30) }));
    await Promise.resolve();
    expect(table.getState().pagination.pageIndex).toBe(0);
  });
});

describe('manual (server) pagination', () => {
  it('renders the data as the page and uses rowCount', () => {
    const onPaginationChange = vi.fn();
    const table = createTable({
      data: numbered(10),
      columns: personColumns,
      manualPagination: true,
      manualSorting: true,
      manualFiltering: true,
      rowCount: 235,
      onPaginationChange,
    });
    expect(table.getRowModel().rows).toHaveLength(10);
    expect(table.getRowCount()).toBe(235);
    expect(table.getPageCount()).toBe(24);
    table.setPageIndex(5);
    expect(onPaginationChange).toHaveBeenCalled();
    expect(table.getQuery().pagination.pageIndex).toBe(5);
  });

  it('unknown total (rowCount -1): page count is -1 and next is allowed while pages are full', () => {
    const table = createTable({
      data: numbered(10),
      columns: personColumns,
      dataMode: 'server',
      rowCount: -1,
    });
    expect(table.getPageCount()).toBe(-1);
    expect(table.getCanNextPage()).toBe(true);
    expect(table.getPageItems()).toEqual([]);
  });

  it('pageCount can be given instead of rowCount', () => {
    const table = createTable({
      data: numbered(10),
      columns: personColumns,
      dataMode: 'server',
      pageCount: 7,
    });
    expect(table.getPageCount()).toBe(7);
  });

  it('changing the page size resets to page 0 in server mode', () => {
    const table = createTable({
      data: numbered(10),
      columns: personColumns,
      dataMode: 'server',
      rowCount: 100,
    });
    table.setPageIndex(3);
    table.setPageSize(25);
    expect(table.getState().pagination).toEqual({ pageIndex: 0, pageSize: 25 });
  });
});
