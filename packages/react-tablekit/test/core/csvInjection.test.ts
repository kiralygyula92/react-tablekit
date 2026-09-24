import { describe, expect, it } from 'vitest';
import { createTable, type AnyColumnDef } from '../../src/core';
import { exportToCsv } from '../../src/utils';

interface Entry {
  id: string;
  note: string;
  amount: number;
}

const columns: AnyColumnDef<Entry>[] = [
  { accessorKey: 'note', header: 'Note' },
  { accessorKey: 'amount', header: 'Amount' },
];

const one = (note: string, amount = 0): Entry[] => [{ id: '1', note, amount }];

/** The single data field of a one-row, one-column export. */
const field = (note: string, opts: { escapeFormulas?: boolean } = {}) =>
  exportToCsv(one(note), [columns[0]!], { bom: false, ...opts }).split('\r\n')[1];

describe('CSV export: formula injection', () => {
  it.each([
    [
      '=HYPERLINK("http://evil.example","Click")',
      `"'=HYPERLINK(""http://evil.example"",""Click"")"`,
    ],
    ["=cmd|' /C calc'!A0", `'=cmd|' /C calc'!A0`],
    ['+SUM(A1:A9)', `'+SUM(A1:A9)`],
    ['-2+3+cmd', `'-2+3+cmd`],
    ['@SUM(A1)', `'@SUM(A1)`],
    ['\t=1+1', `'\t=1+1`],
  ])('neutralizes %j so a spreadsheet shows it as text', (value, expected) => {
    expect(field(value)).toBe(expected);
  });

  it.each(['-12', '+3.5', '-1,234.50', '-1 234,50', '-15%'])(
    'leaves the plain number %j alone, so numeric columns stay numeric',
    (value) => {
      expect(field(value)).toBe(value.includes(',') ? `"${value}"` : value);
    },
  );

  it('leaves ordinary text alone', () => {
    expect(field('Zoë Adams')).toBe('Zoë Adams');
    expect(field('a = b')).toBe('a = b');
  });

  it('applies to headers, which can be named from data too', () => {
    const csv = exportToCsv(one('x'), [{ accessorKey: 'note', header: '=1+1' }], { bom: false });
    expect(csv.split('\r\n')[0]).toBe(`'=1+1`);
  });

  it('applies to values from exportValue', () => {
    const csv = exportToCsv(
      one('ignored'),
      [{ accessorKey: 'note', header: 'Note', exportValue: () => '=1+1' }],
      { bom: false },
    );
    expect(csv.split('\r\n')[1]).toBe(`'=1+1`);
  });

  it('can be turned off for data the caller trusts', () => {
    expect(field('=1+1', { escapeFormulas: false })).toBe('=1+1');
  });

  it('covers the table export and the clipboard copy, which share the path', async () => {
    const table = createTable<Entry>({
      data: one('=1+1', -5),
      columns,
      getRowId: (r) => r.id,
    });
    const csv = await table.exportCsv({ bom: false });
    expect(csv.split('\r\n')[1]).toBe(`'=1+1,-5`);

    let copied = '';
    const clipboard = { writeText: (text: string) => ((copied = text), Promise.resolve()) };
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { clipboard }, configurable: true });
    try {
      await table.copyToClipboard();
    } finally {
      if (original) Object.defineProperty(globalThis, 'navigator', original);
      else Reflect.deleteProperty(globalThis, 'navigator');
    }
    expect(copied.split('\r\n')[1]).toBe(`'=1+1\t-5`);
  });
});
