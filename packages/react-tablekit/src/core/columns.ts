import { aggregationFns, type BuiltInAggregationFnType } from './fns/aggregationFns';
import { filterFns, type BuiltInFilterFnType } from './fns/filterFns';
import { sortingFns, type BuiltInSortingFnType } from './fns/sortingFns';
import type {
  AnyColumnDef,
  Column,
  ColumnDef,
  ColumnDefBase,
  ColumnType,
  FacetResult,
  FilterOperator,
  FilterVariant,
  ResponsiveValue,
  Row,
  RowModel,
  TableInstance,
  Updater,
} from './types';
import { resolveResponsive } from './responsive';
import { toText } from './text';
import { functionalUpdate, getDeepValue, isDateLike, memo, toTime, warnOnce } from './utils';

/** Internal column extras. */
export interface ColumnInternals<TData> extends Column<TData> {
  _facetedRowModel?: () => RowModel<TData>;
  _facetedUniqueValues?: () => Map<unknown, number>;
  _facetedMinMax?: () => [number, number] | undefined;
}

const DEFAULT_SIZE = 150;
const DEFAULT_MIN_SIZE = 40;

/** Parses `'120px'` / `120` into px; `%` and other units yield `undefined`. */
export function parsePx(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+(\.\d+)?(px)?$/.test(value.trim()))
    return Number.parseFloat(value);
  return undefined;
}

/** Applies the `static` shortcut and merges table-level `columnDefaults`. */
function normalizeDef<TData>(
  def: AnyColumnDef<TData>,
  defaults: Partial<ColumnDefBase<TData>> | undefined,
): AnyColumnDef<TData> {
  const merged = { ...defaults, ...def } as AnyColumnDef<TData>;
  if (merged.static) {
    return {
      ...merged,
      lockPin: merged.lockPin ?? true,
      enableHiding: merged.enableHiding ?? false,
      enableOrdering: merged.enableOrdering ?? false,
      enableResizing: merged.enableResizing ?? false,
      enableColumnActions: merged.enableColumnActions ?? false,
    } as AnyColumnDef<TData>;
  }
  return merged;
}

/** Resolves the column id from `id` / `accessorKey` (dots become part of the id). */
function resolveId<TData>(def: AnyColumnDef<TData>, index: number, parentId?: string): string {
  if (def.id) return def.id;
  if (def.accessorKey) return String(def.accessorKey);
  if (typeof def.header === 'string') return def.header;
  return parentId ? `${parentId}_${index}` : `column_${index}`;
}

function isResponsiveObject<T>(value: ResponsiveValue<T> | undefined): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Builds the column tree from definitions. */
export function buildColumns<TData>(
  table: TableInstance<TData>,
  defs: AnyColumnDef<TData>[],
): Column<TData>[] {
  const defaults = { ...table.options.defaultColumn, ...table.options.columnDefaults };
  const seen = new Set<string>();
  const build = (
    list: AnyColumnDef<TData>[],
    depth: number,
    parent?: Column<TData>,
  ): Column<TData>[] =>
    list.map((raw, index) => {
      const def = normalizeDef(raw, defaults);
      const id = resolveId(def, index, parent?.id);
      if (seen.has(id)) warnOnce(`Duplicate column id "${id}". Column ids must be unique.`);
      seen.add(id);
      const column = createColumn(table, def, id, depth, parent);
      if (def.columns) column.columns = build(def.columns, depth + 1, column);
      return column;
    });
  return build(defs, 0);
}

function detectType<TData>(table: TableInstance<TData>, column: Column<TData>): ColumnType {
  const explicit = column.columnDef.type;
  if (explicit) return explicit;
  if (!column.accessorFn) return 'custom';
  for (const row of table.getCoreRowModel().flatRows.slice(0, 20)) {
    const value = row.getValue(column.id);
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string') return isDateLike(value) ? 'date' : 'text';
    return 'custom';
  }
  return 'text';
}

/** Creates one column with every feature API. */
export function createColumn<TData>(
  table: TableInstance<TData>,
  def: AnyColumnDef<TData>,
  id: string,
  depth: number,
  parent?: Column<TData>,
): Column<TData> {
  const accessorKey = def.accessorKey as string | undefined;
  const accessorFn: ((row: TData, index: number) => unknown) | undefined = def.accessorFn
    ? (def.accessorFn as (row: TData, index: number) => unknown)
    : accessorKey !== undefined
      ? (row: TData) => getDeepValue(row, accessorKey)
      : undefined;

  const state = () => table.getState();
  const opts = () => table.options;

  const column = {
    id,
    depth,
    columnDef: def as ColumnDef<TData>,
    columns: [] as Column<TData>[],
    parent,
    accessorFn,
  } as ColumnInternals<TData>;

  const getFlatColumns = memo(
    () => [column.columns],
    (children) => [column, ...children.flatMap((c) => c.getFlatColumns())],
  );
  const getLeafColumns = memo(
    () => [column.columns, table.getAllLeafColumns()],
    (children, orderedLeaves) => {
      if (!children.length) return [column];
      const leaves = new Set(children.flatMap((c) => c.getLeafColumns()));
      return orderedLeaves.filter((c) => leaves.has(c));
    },
  );
  const getType = memo(
    () => [def.type, table.getCoreRowModel()],
    () => detectType(table, column),
  );

  Object.assign(column, {
    getFlatColumns,
    getLeafColumns,
    getType,
    getAlign: () => def.align ?? (column.getType() === 'number' ? 'right' : 'left'),
    formatValue: (value: unknown, row: TData) => {
      if (def.format) return def.format(value, row);
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toLocaleDateString(opts().locale);
      if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join(', ');
      if (typeof value === 'object') return '';
      return toText(value);
    },

    /* ── visibility ─────────────────────────────────────────────────── */
    getIsVisible: () => {
      if (column.columns.length) return column.columns.some((c) => c.getIsVisible());
      return state().columnVisibility[id] !== false;
    },
    getCanHide: () => (opts().enableHiding ?? true) && def.enableHiding !== false && !def.static,
    toggleVisibility: (value?: boolean) => {
      if (!column.getCanHide() && value === false) return;
      table.setColumnVisibility((old) => ({ ...old, [id]: value ?? !column.getIsVisible() }));
    },

    /* ── pinning ────────────────────────────────────────────────────── */
    getIsPinned: () => {
      const leafIds = column.getLeafColumns().map((c) => c.id);
      const pinning = table.getEffectiveColumnPinning();
      if (leafIds.every((l) => pinning.left.includes(l))) return 'left';
      if (leafIds.every((l) => pinning.right.includes(l))) return 'right';
      return false;
    },
    getCanPin: () =>
      (opts().enableColumnPinning ?? true) &&
      !def.lockPin &&
      !def.static &&
      !isResponsiveObject(def.pin),
    pin: (position: 'left' | 'right' | false) => {
      const ids = column.getLeafColumns().map((c) => c.id);
      table.setColumnPinning((old) => {
        const left = old.left.filter((c) => !ids.includes(c));
        const right = old.right.filter((c) => !ids.includes(c));
        if (position === 'left') left.push(...ids);
        if (position === 'right') right.unshift(...ids);
        return { left, right };
      });
    },
    getPinnedIndex: () => {
      const pos = column.getIsPinned();
      if (!pos) return 0;
      const list =
        pos === 'left' ? table.getLeftVisibleLeafColumns() : table.getRightVisibleLeafColumns();
      return list.findIndex((c) => c.id === id);
    },
    getStart: (position?: 'left' | 'right') => {
      const cols =
        position === 'left'
          ? table.getLeftVisibleLeafColumns()
          : position === 'right'
            ? table.getRightVisibleLeafColumns()
            : table.getVisibleLeafColumns();
      let sum = 0;
      for (const c of cols) {
        if (c.id === id) return sum;
        sum += c.getSize();
      }
      return 0;
    },
    getAfter: (position?: 'left' | 'right') => {
      const cols =
        position === 'left'
          ? table.getLeftVisibleLeafColumns()
          : position === 'right'
            ? table.getRightVisibleLeafColumns()
            : table.getVisibleLeafColumns();
      let sum = 0;
      for (let i = cols.length - 1; i >= 0; i--) {
        const c = cols[i]!;
        if (c.id === id) return sum;
        sum += c.getSize();
      }
      return 0;
    },

    /* ── sizing ─────────────────────────────────────────────────────── */
    getSize: () => {
      if (column.columns.length) {
        return column.getLeafColumns().reduce((sum, c) => sum + c.getSize(), 0);
      }
      const size = state().columnSizing[id] ?? def.size ?? parsePx(def.width) ?? DEFAULT_SIZE;
      const min = def.minSize ?? parsePx(def.minWidth) ?? DEFAULT_MIN_SIZE;
      const max = def.maxSize ?? parsePx(def.maxWidth) ?? Number.POSITIVE_INFINITY;
      return Math.min(Math.max(size, min), max);
    },
    resetSize: () => {
      table.setColumnSizing((old) => {
        const { [id]: _removed, ...rest } = old;
        return rest;
      });
    },
    getCanResize: () =>
      (opts().enableColumnResizing ?? false) && def.enableResizing !== false && !def.static,
    getIsResizing: () => state().columnSizingInfo.isResizingColumn === id,

    /* ── ordering ───────────────────────────────────────────────────── */
    getIndex: () => table.getVisibleLeafColumns().findIndex((c) => c.id === id),
    getCanOrder: () =>
      (opts().enableColumnOrdering ?? false) &&
      def.enableOrdering !== false &&
      !def.static &&
      !def.lockPosition,

    /* ── sorting ────────────────────────────────────────────────────── */
    getCanSort: () =>
      (!!accessorFn || !!def.sortValue) && (def.enableSorting ?? opts().enableSorting ?? true),
    getIsSorted: () => {
      const s = state().sorting.find((x) => x.id === id);
      return s ? (s.desc ? 'desc' : 'asc') : false;
    },
    getSortIndex: () => state().sorting.findIndex((x) => x.id === id),
    getFirstSortDir: () => {
      const pref = def.sortDescFirst ?? opts().sortDescFirst ?? false;
      if (pref === 'auto') {
        const type = column.getType();
        return type === 'number' || type === 'date' || type === 'datetime' ? 'desc' : 'asc';
      }
      return pref ? 'desc' : 'asc';
    },
    getNextSortingOrder: () => {
      const current = column.getIsSorted();
      const first = column.getFirstSortDir();
      if (!current) return first;
      if (current === first) return first === 'asc' ? 'desc' : 'asc';
      return (opts().enableSortingRemoval ?? true) ? false : first;
    },
    getAutoSortingFn: () => {
      const type = column.getType();
      if (type === 'number') return sortingFns.basic;
      if (type === 'date' || type === 'datetime') return sortingFns.datetime;
      if (type === 'boolean') return sortingFns.boolean;
      if (type === 'text') return sortingFns.text;
      // custom / unknown: inspect the first non-null sort value
      for (const row of table.getCoreRowModel().flatRows.slice(0, 20)) {
        const v = (row as Row<TData> & { _getSortValue(id: string): unknown })._getSortValue(id);
        if (v === null || v === undefined || v === '') continue;
        if (typeof v === 'number') return sortingFns.basic;
        if (typeof v === 'boolean') return sortingFns.boolean;
        if (v instanceof Date || isDateLike(v)) return sortingFns.datetime;
        return sortingFns.text;
      }
      return sortingFns.text;
    },
    getSortingFn: () => {
      const fn = def.sortingFn;
      if (typeof fn === 'function') return fn;
      if (typeof fn === 'string') {
        const resolved = table._getSortingFn(fn);
        if (resolved) return resolved;
        warnOnce(`Unknown sortingFn "${fn}" on column "${id}"; falling back to auto.`);
      }
      return column.getAutoSortingFn();
    },
    toggleSorting: (desc?: boolean, multi?: boolean) => {
      const nextOrder = column.getNextSortingOrder();
      const hasDesc = desc !== undefined;
      table.setSorting((old) => {
        const existing = old.find((s) => s.id === id);
        const isMulti = !!multi && (opts().enableMultiSort ?? true);
        if (isMulti) {
          if (existing) {
            if (!hasDesc && nextOrder === false) return old.filter((s) => s.id !== id);
            return old.map((s) =>
              s.id === id ? { id, desc: hasDesc ? desc : nextOrder === 'desc' } : s,
            );
          }
          const next = [...old, { id, desc: hasDesc ? desc : nextOrder === 'desc' }];
          const max = opts().maxMultiSortColCount ?? 3;
          return next.length > max ? next.slice(next.length - max) : next;
        }
        if (!hasDesc && nextOrder === false) return [];
        return [{ id, desc: hasDesc ? desc : nextOrder === 'desc' }];
      });
    },
    clearSorting: () => table.setSorting((old) => old.filter((s) => s.id !== id)),

    /* ── filtering ──────────────────────────────────────────────────── */
    getCanFilter: () =>
      !!accessorFn &&
      (opts().enableFilters ?? true) &&
      (opts().enableColumnFilters ?? true) &&
      def.enableColumnFilter !== false,
    getCanGlobalFilter: () =>
      (!!accessorFn || !!def.getSearchValue) &&
      (opts().enableFilters ?? true) &&
      (opts().enableGlobalFilter ?? true) &&
      def.enableGlobalFilter !== false &&
      (opts().getColumnCanGlobalFilter?.(column) ?? true),
    getFilterVariant: (): FilterVariant => {
      if (def.filterVariant) return def.filterVariant;
      const type = column.getType();
      if (type === 'number') return 'range';
      if (type === 'date' || type === 'datetime') return 'dateRange';
      if (type === 'boolean') return 'boolean';
      return 'text';
    },
    getFilterFn: () => {
      const fn = def.filterFn;
      if (typeof fn === 'function') return fn;
      if (typeof fn === 'string') {
        const resolved = table._getFilterFn(fn);
        if (resolved) return resolved;
        warnOnce(`Unknown filterFn "${fn}" on column "${id}".`);
      }
      const byVariant: Record<FilterVariant, keyof typeof filterFns | undefined> = {
        text: 'text',
        select: 'equals',
        multiSelect: 'multiSelect',
        number: 'number',
        range: 'inNumberRange',
        rangeSlider: 'inNumberRange',
        date: 'date',
        dateRange: 'inDateRange',
        boolean: 'boolean',
        custom: undefined,
      };
      const name = byVariant[column.getFilterVariant()];
      return name ? filterFns[name] : undefined;
    },
    getFilterValue: () => state().columnFilters.find((f) => f.id === id)?.value,
    getFilterOperator: () => state().columnFilters.find((f) => f.id === id)?.operator,
    setFilterValue: (updater: Updater<unknown>, operator?: FilterOperator) => {
      table.setColumnFilters((old) => {
        const existing = old.find((f) => f.id === id);
        const value = functionalUpdate(updater, existing?.value);
        const op = operator ?? existing?.operator;
        const valueless = op === 'empty' || op === 'notEmpty';
        const fn = column.getFilterFn();
        const remove = !valueless && (value === undefined || (fn?.autoRemove?.(value) ?? false));
        if (remove) return old.filter((f) => f.id !== id);
        const next = { id, value, ...(op ? { operator: op } : {}) };
        return existing ? old.map((f) => (f.id === id ? next : f)) : [...old, next];
      });
    },
    getIsFiltered: () => column.getFilterIndex() > -1,
    getFilterIndex: () => state().columnFilters.findIndex((f) => f.id === id),

    /* ── faceting ───────────────────────────────────────────────────── */
    getFacetedRowModel: () => {
      column._facetedRowModel ??= memo(
        () => [
          table.getCoreRowModel(),
          table._getInternalQuery().columnFilters,
          table._getInternalQuery().globalFilter,
        ],
        () => table._filterRows(table.getCoreRowModel(), id),
      );
      return column._facetedRowModel();
    },
    getFacetedUniqueValues: () => {
      column._facetedUniqueValues ??= memo(
        () => [column.getFacetedRowModel()],
        (model) => {
          const counts = new Map<unknown, number>();
          for (const row of model.flatRows) {
            if (row.getIsGrouped()) continue;
            for (const v of row.getUniqueValues(id)) counts.set(v, (counts.get(v) ?? 0) + 1);
          }
          return counts;
        },
      );
      return column._facetedUniqueValues();
    },
    getFacetedMinMaxValues: () => {
      column._facetedMinMax ??= memo(
        () => [column.getFacetedRowModel()],
        (model) => {
          let min = Number.POSITIVE_INFINITY;
          let max = Number.NEGATIVE_INFINITY;
          for (const row of model.flatRows) {
            const raw = row.getValue(id);
            const v = typeof raw === 'number' ? raw : isDateLike(raw) ? toTime(raw) : Number.NaN;
            if (Number.isNaN(v)) continue;
            if (v < min) min = v;
            if (v > max) max = v;
          }
          return min <= max ? ([min, max] as [number, number]) : undefined;
        },
      );
      return column._facetedMinMax();
    },
    getServerFacets: (): FacetResult | undefined => table._getServerFacets(id),
    loadFacets: () => table._loadFacets(id),

    /* ── grouping ───────────────────────────────────────────────────── */
    getCanGroup: () => !!accessorFn && (def.enableGrouping ?? opts().enableGrouping ?? false),
    getIsGrouped: () => state().grouping.includes(id),
    getGroupedIndex: () => state().grouping.indexOf(id),
    toggleGrouping: () =>
      table.setGrouping((old) => (old.includes(id) ? old.filter((g) => g !== id) : [...old, id])),
    getAggregationFn: () => {
      const fn = def.aggregationFn;
      if (typeof fn === 'function') return fn;
      if (typeof fn === 'string') {
        const resolved = table._getAggregationFn(fn);
        if (!resolved) warnOnce(`Unknown aggregationFn "${fn}" on column "${id}".`);
        return resolved;
      }
      return undefined;
    },
  });

  for (const feature of table._features) feature.createColumn?.(column, table);
  return column;
}

/** Resolves a column's `pin` for the current breakpoint. */
export function resolveColumnPin<TData>(
  column: Column<TData>,
  table: TableInstance<TData>,
): 'left' | 'right' | false {
  const pin = column.columnDef.pin;
  if (pin === undefined) return false;
  return (
    resolveResponsive(
      pin,
      table.getBreakpoint(),
      table.options._renderContext?.theme.breakpoints,
    ) ?? false
  );
}

export { isResponsiveObject };

/** Built-in registries (generic functions, usable with any row type). */
export const builtInFns: {
  sortingFns: Record<string, BuiltInSortingFnType | undefined>;
  filterFns: Record<string, BuiltInFilterFnType | undefined>;
  aggregationFns: Record<string, BuiltInAggregationFnType | undefined>;
} = { sortingFns, filterFns, aggregationFns };
