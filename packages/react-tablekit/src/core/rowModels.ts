import { createRow, type RowInternals } from './rows';
import type {
  Column,
  ColumnFilter,
  FilterFn,
  Row,
  RowModel,
  SortingState,
  TableInstance,
  TableQuery,
} from './types';
import { fold } from './utils';

/** Collects flatRows / rowsById for a tree of rows. */
export function toRowModel<TData>(rows: Row<TData>[]): RowModel<TData> {
  const flatRows: Row<TData>[] = [];
  const rowsById: Record<string, Row<TData>> = {};
  const walk = (list: Row<TData>[]) => {
    for (const row of list) {
      flatRows.push(row);
      rowsById[row.id] = row;
      if (row.subRows.length) walk(row.subRows);
    }
  };
  walk(rows);
  return { rows, flatRows, rowsById };
}

/* ── core ─────────────────────────────────────────────────────────────── */

/**
 * data → rows (accessors, sub-rows via getSubRows, ids via getRowId). `getLazyChildren`
 * supplies children loaded on demand (data source `fetchChildren`).
 */
export function buildCoreRowModel<TData>(
  table: TableInstance<TData>,
  proto: object,
  data: TData[],
  getLazyChildren?: (row: Row<TData>) => TData[] | undefined,
): RowModel<TData> {
  const { getRowId, getSubRows } = table.options;
  const flatRows: Row<TData>[] = [];
  const rowsById: Record<string, Row<TData>> = {};
  const build = (items: TData[], depth: number, parent?: Row<TData>): Row<TData>[] =>
    items.map((original, index) => {
      const id = getRowId
        ? getRowId(original, index, parent)
        : parent
          ? `${parent.id}.${index}`
          : String(index);
      const row = createRow(proto, table, id, original, index, depth, [], parent?.id);
      flatRows.push(row);
      rowsById[id] = row;
      const children = getSubRows?.(original, index) ?? getLazyChildren?.(row);
      if (children?.length) row.subRows = build(children, depth + 1, row);
      return row;
    });
  const rows = build(data, 0);
  return { rows, flatRows, rowsById };
}

/* ── filtering ────────────────────────────────────────────────────────── */

interface ResolvedFilter<TData> {
  id: string;
  fn: FilterFn<TData>;
  value: unknown;
  operator: ColumnFilter['operator'];
}

/**
 * Filters a row model with the query's column filters and global filter. `excludeColumnId`
 * skips that column's own filter (used by faceting: facets respect the *other* filters).
 */
export function filterRowModel<TData>(
  table: TableInstance<TData>,
  model: RowModel<TData>,
  query: Pick<TableQuery, 'columnFilters' | 'globalFilter'>,
  excludeColumnId?: string,
): RowModel<TData> {
  const opts = table.options;
  const locale = opts.locale;
  const filters: ResolvedFilter<TData>[] = [];
  if (!opts.manualFiltering) {
    for (const f of query.columnFilters) {
      if (f.id === excludeColumnId) continue;
      const column = table.getColumn(f.id);
      if (!column?.getCanFilter()) continue;
      const fn = column.getFilterFn();
      if (!fn) continue;
      const value = fn.resolveFilterValue ? fn.resolveFilterValue(f.value) : f.value;
      filters.push({ id: f.id, fn, value, operator: f.operator });
    }
  }

  let globalTest: ((row: Row<TData>) => boolean) | undefined;
  const search = query.globalFilter.trim();
  if (search && !opts.manualGlobalFiltering) {
    const columns = table.getAllLeafColumns().filter((c) => c.getCanGlobalFilter());
    globalTest = createGlobalTest(table, columns, search);
  }

  if (!filters.length && !globalTest) return model;

  const passes = (row: Row<TData>): boolean => {
    if (row.getIsGrouped()) return true;
    for (const f of filters) {
      if (!f.fn(row, f.id, f.value, { operator: f.operator, locale })) return false;
    }
    return globalTest ? globalTest(row) : true;
  };

  const maxDepth = opts.maxLeafRowFilterDepth ?? Number.POSITIVE_INFINITY;
  const fromLeaves = opts.filterFromLeafRows ?? false;

  const filterFromRoot = (rows: Row<TData>[], depth: number): Row<TData>[] => {
    const result: Row<TData>[] = [];
    for (const row of rows) {
      if (!passes(row)) continue;
      const next = cloneWithSubRows(
        row,
        row.subRows.length && depth < maxDepth
          ? filterFromRoot(row.subRows, depth + 1)
          : row.subRows,
      );
      result.push(next);
    }
    return result;
  };

  const filterFromLeaf = (rows: Row<TData>[], depth: number): Row<TData>[] => {
    const result: Row<TData>[] = [];
    for (const row of rows) {
      const children =
        row.subRows.length && depth < maxDepth ? filterFromLeaf(row.subRows, depth + 1) : [];
      const self = passes(row);
      if (self || children.length) {
        result.push(cloneWithSubRows(row, children.length ? children : self ? row.subRows : []));
      }
    }
    return result;
  };

  const rows = fromLeaves ? filterFromLeaf(model.rows, 0) : filterFromRoot(model.rows, 0);
  return toRowModel(rows);
}

/** Returns the same row when sub-rows are unchanged, otherwise a shallow copy on the same prototype. */
function cloneWithSubRows<TData>(row: Row<TData>, subRows: Row<TData>[]): Row<TData> {
  if (
    subRows === row.subRows ||
    (subRows.length === row.subRows.length && subRows.every((r, i) => r === row.subRows[i]))
  ) {
    return row;
  }
  const copy = Object.create(Object.getPrototypeOf(row) as object) as RowInternals<TData>;
  Object.assign(copy, row);
  copy.subRows = subRows;
  copy._leafRows = undefined;
  return copy;
}

/**
 * Global search: case/diacritic-insensitive over each searchable column's display string.
 * `all-words` (default): every word must match some column. `any-word`: one word is enough.
 * `phrase`: the whole query must match within one column.
 */
function createGlobalTest<TData>(
  table: TableInstance<TData>,
  columns: Column<TData>[],
  search: string,
): (row: Row<TData>) => boolean {
  const { globalFilterFn } = table.options;
  const custom =
    typeof globalFilterFn === 'function'
      ? globalFilterFn
      : globalFilterFn && globalFilterFn !== 'includesString'
        ? table._getFilterFn(globalFilterFn)
        : undefined;
  if (custom) {
    const locale = table.options.locale;
    return (row) => columns.some((c) => custom(row, c.id, search, { locale }));
  }
  const mode = table.options.globalFilterMatch ?? 'all-words';
  const folded = fold(search);
  const words = mode === 'phrase' ? [folded] : folded.split(/\s+/).filter(Boolean);
  return (row) => {
    const r = row as RowInternals<TData>;
    const texts = columns.map((c) => r._getFoldedSearchValue(c.id));
    const matches = (w: string) => texts.some((t) => t.includes(w));
    return mode === 'any-word' ? words.some(matches) : words.every(matches);
  };
}

/* ── grouping ─────────────────────────────────────────────────────────── */

/** Groups rows by the grouping columns (multi-level) and computes aggregates. */
export function groupRowModel<TData>(
  table: TableInstance<TData>,
  proto: object,
  model: RowModel<TData>,
  grouping: string[],
): RowModel<TData> {
  const columns = grouping.map((id) => table.getColumn(id)).filter((c): c is Column<TData> => !!c);
  if (!columns.length) return model;

  const groupValue = (row: Row<TData>, column: Column<TData>) =>
    column.columnDef.getGroupingValue
      ? column.columnDef.getGroupingValue(row.original)
      : row.getValue(column.id);

  const group = (rows: Row<TData>[], depth: number, parentId?: string): Row<TData>[] => {
    const column = columns[depth];
    if (!column) {
      // Leaf level: re-parent leaves under the group row for correct depth/indentation.
      return rows;
    }
    const buckets = new Map<unknown, Row<TData>[]>();
    for (const row of rows) {
      const key = groupValue(row, column);
      const list = buckets.get(key);
      if (list) list.push(row);
      else buckets.set(key, [row]);
    }
    let index = 0;
    const result: Row<TData>[] = [];
    for (const [value, leaves] of buckets) {
      const id = `${parentId ? `${parentId}>` : ''}group:${column.id}:${String(value)}`;
      const subRows = group(leaves, depth + 1, id);
      const first = leaves[0]!;
      const groupRow = createRow(
        proto,
        table,
        id,
        first.original,
        index++,
        depth,
        subRows,
        parentId,
      ) as RowInternals<TData>;
      groupRow.groupingColumnId = column.id;
      groupRow.groupingValue = value;
      const leafRows = collectLeaves(leaves);
      groupRow._leafRows = leafRows;
      groupRow.getValue = function getGroupValue(
        this: RowInternals<TData>,
        columnId: string,
      ): unknown {
        if (columnId in this._valuesCache) return this._valuesCache[columnId];
        let v: unknown;
        if (grouping.includes(columnId)) {
          // The value of an outer or this grouping column is shared by every leaf.
          v = columnId === column.id ? value : first.getValue(columnId);
        } else {
          const agg = table.getColumn(columnId)?.getAggregationFn();
          v = agg ? agg(columnId, leafRows, subRows) : undefined;
        }
        this._valuesCache[columnId] = v;
        this._groupingValuesCache[columnId] = v;
        return v;
      } as Row<TData>['getValue'];
      result.push(groupRow);
    }
    return result;
  };

  return toRowModel(group(model.rows, 0));
}

function collectLeaves<TData>(rows: Row<TData>[]): Row<TData>[] {
  const out: Row<TData>[] = [];
  const walk = (list: Row<TData>[]) => {
    for (const r of list) {
      if (r.getIsGrouped()) walk(r.subRows);
      else out.push(r);
    }
  };
  walk(rows);
  return out;
}

/* ── sorting ──────────────────────────────────────────────────────────── */

/** Stable multi-column sort; sub-rows are sorted inside their parents. */
export function sortRowModel<TData>(
  table: TableInstance<TData>,
  model: RowModel<TData>,
  sorting: SortingState,
): RowModel<TData> {
  const sorts = sorting
    .map((s) => {
      const column = table.getColumn(s.id);
      if (!column?.getCanSort()) return undefined;
      return {
        id: s.id,
        desc: s.desc,
        fn: column.getSortingFn(),
        sortUndefined: column.columnDef.sortUndefined ?? 'last',
        invert: column.columnDef.invertSorting ?? false,
      };
    })
    .filter((s): s is NonNullable<typeof s> => !!s);
  if (!sorts.length) return model;

  const compare = (a: Row<TData>, b: Row<TData>): number => {
    for (const s of sorts) {
      if (s.sortUndefined !== false) {
        const av = (a as RowInternals<TData>)._getSortValue(s.id);
        const bv = (b as RowInternals<TData>)._getSortValue(s.id);
        const aU = av === undefined || av === null;
        const bU = bv === undefined || bv === null;
        if (aU || bU) {
          if (aU && bU) continue;
          if (s.sortUndefined === 'first') return aU ? -1 : 1;
          if (s.sortUndefined === 'last') return aU ? 1 : -1;
          // numeric: 1 = last when ascending, -1 = first when ascending; flips with direction
          const r = aU ? s.sortUndefined : -s.sortUndefined;
          return s.desc ? -r : r;
        }
      }
      let r = s.fn(a, b, s.id);
      if (r !== 0) {
        if (s.desc) r = -r;
        if (s.invert) r = -r;
        return r;
      }
    }
    return a.index - b.index;
  };

  const sortLevel = (rows: Row<TData>[]): Row<TData>[] => {
    const sorted = rows.map((r, i) => ({ r, i }));
    sorted.sort((x, y) => compare(x.r, y.r) || x.i - y.i);
    return sorted.map(({ r }) =>
      r.subRows.length ? cloneWithSubRows(r, sortLevel(r.subRows)) : r,
    );
  };

  return toRowModel(sortLevel(model.rows));
}

/* ── expansion ────────────────────────────────────────────────────────── */

/** Flattens expanded sub-rows / group rows into the visible list. Detail panels are not rows. */
export function expandRowModel<TData>(model: RowModel<TData>): RowModel<TData> {
  const hasExpandable = model.rows.some((r) => r.subRows.length);
  if (!hasExpandable) return model;
  const rows: Row<TData>[] = [];
  const walk = (list: Row<TData>[]) => {
    for (const row of list) {
      rows.push(row);
      if (row.subRows.length && row.getIsExpanded()) walk(row.subRows);
    }
  };
  walk(model.rows);
  return { rows, flatRows: model.flatRows, rowsById: model.rowsById };
}

/* ── pagination ───────────────────────────────────────────────────────── */

/** Slices the current page. */
export function paginateRowModel<TData>(
  model: RowModel<TData>,
  pageIndex: number,
  pageSize: number,
  expandAfter: boolean,
): RowModel<TData> {
  const start = pageIndex * pageSize;
  const page = model.rows.slice(start, start + pageSize);
  const rows = expandAfter
    ? expandRowModel({ rows: page, flatRows: page, rowsById: {} }).rows
    : page;
  // Only rendered rows are indexed: `getRow(id)` without `searchAll` finds rows on this page.
  const rowsById: Record<string, Row<TData>> = {};
  for (const row of rows) rowsById[row.id] = row;
  return { rows, flatRows: rows, rowsById };
}
