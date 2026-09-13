import type { Column, ExportCsvOptions, Row } from './types';

/** RFC 4180 field quoting. */
export function csvEscape(value: string, delimiter = ','): string {
  return /["\r\n]/.test(value) || value.includes(delimiter)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
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
 * Builds CSV text from rows and columns (05 §20): RFC 4180 quoting, optional UTF-8 BOM,
 * headers from `meta.exportHeader ?? string header ?? id`, values from `exportValue ?? format`.
 */
export function rowsToCsv<TData>(
  rows: Row<TData>[],
  columns: Column<TData>[],
  opts: Pick<ExportCsvOptions, 'delimiter' | 'bom'> = {},
): string {
  const delimiter = opts.delimiter ?? ',';
  const cols = exportableColumns(columns);
  const lines = [cols.map((c) => csvEscape(headerText(c), delimiter)).join(delimiter)];
  for (const row of rows) {
    if (row.getIsGrouped()) continue;
    lines.push(cols.map((c) => csvEscape(cellText(c, row), delimiter)).join(delimiter));
  }
  const text = lines.join('\r\n');
  return (opts.bom ?? true) ? `﻿${text}` : text;
}
