import { createTable } from '../core/createTable';
import { rowsToCsv } from '../core/csv';
import type { AnyColumnDef, ExportCsvOptions } from '../core/types';

/**
 * Standalone CSV export: RFC 4180 quoting, optional UTF-8 BOM, headers from
 * `meta.exportHeader ?? string header ?? id`, values from `exportValue ?? format`.
 *
 * @example
 * ```ts
 * const csv = exportToCsv(customers, customerColumns, { bom: false });
 * ```
 */
export function exportToCsv<TData>(
  rows: TData[],
  columns: AnyColumnDef<TData>[],
  opts: Pick<ExportCsvOptions, 'delimiter' | 'bom' | 'columns'> = {},
): string {
  const table = createTable<TData>({ data: rows, columns, enablePagination: false });
  const cols = opts.columns
    ? opts.columns.map((id) => table.getColumn(id)).filter((c) => c !== undefined)
    : table.getAllLeafColumns();
  return rowsToCsv(table.getCoreRowModel().rows, cols, opts);
}
