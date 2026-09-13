import { describe, expect, it } from 'vitest';
import { aggregationFns, createTable, filterFns, sortingFns } from '../../src/core';

interface Item {
  id: string;
  text: string | null;
  num: number | null;
  date: string | null;
  arr: string[] | null;
  flag: boolean;
}

const items: Item[] = [
  { id: '1', text: 'Hello World', num: 10, date: '2024-05-10', arr: ['x', 'y'], flag: true },
  { id: '2', text: 'hello', num: 5, date: '2024-05-12T10:00:00Z', arr: ['y'], flag: false },
  { id: '3', text: null, num: null, date: null, arr: null, flag: false },
];

const table = createTable<Item>({
  data: items,
  columns: [
    { accessorKey: 'text' },
    { accessorKey: 'num', type: 'number' },
    { accessorKey: 'date', type: 'date' },
    { accessorKey: 'arr' },
    { accessorKey: 'flag' },
  ],
  getRowId: (r) => r.id,
});
const row = (id: string) => table.getRow(id)!;
const ctx = { locale: 'en' };
const test = (
  fn: keyof typeof filterFns,
  id: string,
  col: string,
  value: unknown,
  operator?: never,
) => filterFns[fn](row(id), col, value, { ...ctx, operator });

describe('filterFns', () => {
  it('string functions', () => {
    expect(test('includesString', '1', 'text', 'WORLD')).toBe(true);
    expect(test('includesStringSensitive', '1', 'text', 'WORLD')).toBe(false);
    expect(test('includesStringSensitive', '1', 'text', 'World')).toBe(true);
    expect(test('equalsString', '2', 'text', 'HELLO')).toBe(true);
    expect(test('equalsString', '1', 'text', 'hello')).toBe(false);
    expect(test('startsWith', '1', 'text', 'hel')).toBe(true);
    expect(test('endsWith', '1', 'text', 'rld')).toBe(true);
    expect(test('includesString', '3', 'text', 'x')).toBe(false);
  });

  it('equality and array functions', () => {
    expect(test('equals', '1', 'num', 10)).toBe(true);
    expect(test('equals', '1', 'num', '10')).toBe(false);
    expect(test('weakEquals', '1', 'num', '10')).toBe(true);
    expect(test('arrIncludes', '1', 'arr', 'x')).toBe(true);
    expect(test('arrIncludes', '3', 'arr', 'x')).toBe(false);
    expect(test('arrIncludesAll', '1', 'arr', ['x', 'y'])).toBe(true);
    expect(test('arrIncludesAll', '2', 'arr', ['x', 'y'])).toBe(false);
    expect(test('arrIncludesSome', '2', 'arr', ['x', 'y'])).toBe(true);
    expect(test('arrIncludesSome', '2', 'text', ['hello'])).toBe(true);
  });

  it('range and date functions', () => {
    expect(test('inNumberRange', '1', 'num', [5, 10])).toBe(true);
    expect(test('inNumberRange', '1', 'num', [11, null])).toBe(false);
    expect(test('inNumberRange', '3', 'num', [0, 100])).toBe(false);
    expect(test('inDateRange', '2', 'date', ['2024-05-11', null])).toBe(true);
    expect(test('inDateRange', '3', 'date', ['2024-05-11', null])).toBe(false);
    expect(test('dateEquals', '1', 'date', '2024-05-10')).toBe(true);
    expect(test('before', '1', 'date', '2024-05-11')).toBe(true);
    expect(test('after', '1', 'date', '2024-05-11')).toBe(false);
    expect(test('date', '3', 'date', '2024-05-11')).toBe(false);
    expect(test('date', '1', 'date', 'not-a-date')).toBe(true);
    expect(test('date', '1', 'date', '2024-05-09', 'after' as never)).toBe(true);
  });

  it('empty / notEmpty / fuzzy / boolean', () => {
    expect(test('empty', '3', 'text', undefined)).toBe(true);
    expect(test('notEmpty', '1', 'text', undefined)).toBe(true);
    expect(test('fuzzy', '1', 'text', 'hwd')).toBe(true);
    expect(test('fuzzy', '1', 'text', 'zzz')).toBe(false);
    expect(test('boolean', '1', 'flag', true)).toBe(true);
    expect(test('boolean', '2', 'flag', true)).toBe(false);
  });

  it('number operators', () => {
    const op = (operator: string, value: unknown) =>
      test('number', '1', 'num', value, operator as never);
    expect(op('equals', 10)).toBe(true);
    expect(op('gte', 10)).toBe(true);
    expect(op('lt', 10)).toBe(false);
    expect(op('lte', 10)).toBe(true);
    expect(op('neq', 10)).toBe(false);
    expect(op('gt', '')).toBe(true);
    expect(test('number', '3', 'num', 1)).toBe(false);
  });

  it('autoRemove rules', () => {
    expect(filterFns.includesString.autoRemove?.('  ')).toBe(true);
    expect(filterFns.equals.autoRemove?.(0)).toBe(false);
    expect(filterFns.arrIncludesSome.autoRemove?.([])).toBe(true);
    expect(filterFns.inNumberRange.autoRemove?.(['', null])).toBe(true);
    expect(filterFns.inDateRange.autoRemove?.([null, '2020-01-01'])).toBe(false);
    expect(filterFns.boolean.autoRemove?.(null)).toBe(true);
    expect(filterFns.number.autoRemove?.('abc')).toBe(true);
  });
});

describe('sortingFns', () => {
  const cmp = (fn: keyof typeof sortingFns, a: string, b: string, col: string) =>
    sortingFns[fn](row(a), row(b), col);

  it('text (case-insensitive) vs textCaseSensitive', () => {
    expect(cmp('text', '1', '2', 'text')).toBeGreaterThan(0);
    expect(cmp('textCaseSensitive', '2', '1', 'text')).toBeLessThan(0);
    expect(cmp('alphanumericCaseSensitive', '1', '2', 'text')).toBeLessThan(0);
  });

  it('datetime puts invalid dates first; basic handles numbers', () => {
    expect(cmp('datetime', '3', '1', 'date')).toBeLessThan(0);
    expect(cmp('datetime', '2', '1', 'date')).toBeGreaterThan(0);
    expect(cmp('basic', '2', '1', 'num')).toBeLessThan(0);
    expect(cmp('basic', '1', '1', 'num')).toBe(0);
    expect(cmp('boolean', '1', '2', 'flag')).toBeGreaterThan(0);
  });

  it('alphanumeric handles mixed digit/letter chunks', () => {
    const t = createTable<{ v: string }>({
      data: [{ v: 'a10b' }, { v: 'a2b' }, { v: '10' }, { v: 'x' }],
      columns: [{ accessorKey: 'v' }],
    });
    const r = t.getCoreRowModel().rows;
    expect(sortingFns.alphanumeric(r[0]!, r[1]!, 'v')).toBeGreaterThan(0);
    expect(sortingFns.alphanumeric(r[2]!, r[3]!, 'v')).toBeLessThan(0);
    expect(sortingFns.alphanumeric(r[3]!, r[2]!, 'v')).toBeGreaterThan(0);
  });
});

describe('aggregationFns', () => {
  const rows = table.getCoreRowModel().rows;
  it('ignore non-numbers and handle empty input', () => {
    expect(aggregationFns.sum('num', rows, rows)).toBe(15);
    expect(aggregationFns.min('num', [], [])).toBeUndefined();
    expect(aggregationFns.max('num', [], [])).toBeUndefined();
    expect(aggregationFns.mean('num', [], [])).toBeUndefined();
    expect(aggregationFns.median('num', [], [])).toBeUndefined();
    expect(aggregationFns.extent('num', [], [])).toBeUndefined();
    expect(aggregationFns.median('num', rows.slice(0, 2), [])).toBe(7.5);
    expect(aggregationFns.count('num', rows, rows)).toBe(3);
  });
});
