import type { Column, ExportCsvOptions, Row } from './types';

/** RFC 4180 field quoting. */
export function csvEscape(value: string, delimiter = ','): string {
  return /["\r\n]/.test(value) || value.includes(delimiter)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

/**
 * How a spreadsheet recognises a formula: a field starting with `=`, `+`, `-` or `@`, or with a
 * tab or carriage return that some importers strip first.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
/** A plain number, signed or grouped or a percentage: the one thing a `+` or `-` may begin. */
const PLAIN_NUMBER = /^[+-]?[\d\s.,  ]*\d[\d\s.,  ]*%?$/;

/**
 * Makes a field safe to open in a spreadsheet (OWASP "CSV injection"): one that would run as a
 * formula gets a leading `'`, so Excel, Sheets and LibreOffice show it as text. Plain numbers such
 * as `-12` or `-1,234.50` are left alone, so numeric columns stay numeric.
 */
export function neutralizeFormula(value: string): string {
  return FORMULA_START.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
}

function headerText<TData>(column: Column<TData>): string {
  const meta = column.columnDef.meta as { exportHeader?: string } | undefined;
  if (meta?.exportHeader) return meta.exportHeader;
  const header = column.columnDef.header;
  return typeof header === 'string' ? header : column.id;
}

function cellText<TData>(column: Column<TData>, row: Row<TData>): string {
  const def = column.columnDef;
  if (def.exportValue) return String(def.exportValue(row.original));
  const value = row.getValue(column.id);
  return column.formatValue(value, row.original);
}

/** Columns eligible for export: accessor (or exportValue) columns not opted out. */
export function exportableColumns<TData>(columns: Column<TData>[]): Column<TData>[] {
  return columns.filter(
    (c) =>
      c.columnDef.enableExport !== false &&
      (!!c.accessorFn || !!c.columnDef.exportValue) &&
      !c.id.startsWith('tk-'),
  );
}

/**
 * Builds CSV text from rows and columns: RFC 4180 quoting, formula-like fields neutralized,
 * optional UTF-8 BOM, headers from `meta.exportHeader ?? string header ?? id`, values from
 * `exportValue ?? format`.
 */
export function rowsToCsv<TData>(
  rows: Row<TData>[],
  columns: Column<TData>[],
  opts: Pick<ExportCsvOptions, 'delimiter' | 'bom' | 'escapeFormulas'> = {},
): string {
  const delimiter = opts.delimiter ?? ',';
  // Headers too: a column can be named from data as easily as a cell is filled from it.
  const safe = (opts.escapeFormulas ?? true) ? neutralizeFormula : (text: string) => text;
  const field = (text: string) => csvEscape(safe(text), delimiter);
  const cols = exportableColumns(columns);
  const lines = [cols.map((c) => field(headerText(c))).join(delimiter)];
  for (const row of rows) {
    if (row.getIsGrouped()) continue;
    lines.push(cols.map((c) => field(cellText(c, row))).join(delimiter));
  }
  const text = lines.join('\r\n');
  return (opts.bom ?? true) ? `﻿${text}` : text;
}
