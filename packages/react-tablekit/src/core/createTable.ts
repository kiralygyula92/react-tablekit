import { buildColumns, builtInFns, parsePx, resolveColumnPin } from './columns';
import { exportableColumns, rowsToCsv } from './csv';
import { createDataSourceController, type DataSourceController } from './dataSource';
import { buildHeaderGroups } from './headers';
import { getPageItems } from './pageItems';
import { BREAKPOINT_ORDER, isAtLeast, isResponsive } from './responsive';
import {
  buildCoreRowModel,
  expandRowModel,
  filterRowModel,
  groupRowModel,
  paginateRowModel,
  sortRowModel,
} from './rowModels';
import { createRowPrototype } from './rows';
import type {
  Column,
  ColumnFiltersState,
  ColumnPinningState,
  DataStatus,
  Density,
  ExpandedState,
  HeaderGroup,
  OnChangeFn,
  PaginationState,
  QueryChangeReason,
  ResetPageReason,
  ResolvedTableOptions,
  Row,
  RowSelectionState,
  TableInstance,
  TableOptions,
  TableQuery,
  TableState,
  Updater,
} from './types';
import { deepEqual, functionalUpdate, getDefaultLocale, memo, warnOnce } from './utils';

/** Library defaults for every state slice. */
export function getDefaultTableState(): TableState {
  return {
    columnVisibility: {},
    columnOrder: [],
    columnPinning: { left: [], right: [] },
    columnSizing: {},
    columnSizingInfo: {
      isResizingColumn: false,
      startOffset: null,
      startSize: null,
      deltaOffset: null,
    },
    globalFilter: '',
    columnFilters: [],
    sorting: [],
    grouping: [],
    expanded: {},
    rowPinning: { top: [], bottom: [] },
    rowSelection: {},
    pagination: { pageIndex: 0, pageSize: 10 },
    density: 'standard',
  };
}

const CHANGE_KEYS: { [K in keyof TableState]: keyof TableOptions<unknown> } = {
  columnVisibility: 'onColumnVisibilityChange',
  columnOrder: 'onColumnOrderChange',
  columnPinning: 'onColumnPinningChange',
  columnSizing: 'onColumnSizingChange',
  columnSizingInfo: 'onColumnSizingInfoChange',
  globalFilter: 'onGlobalFilterChange',
  columnFilters: 'onColumnFiltersChange',
  sorting: 'onSortingChange',
  grouping: 'onGroupingChange',
  expanded: 'onExpandedChange',
  rowPinning: 'onRowPinningChange',
  rowSelection: 'onRowSelectionChange',
  pagination: 'onPaginationChange',
  density: 'onDensityChange',
};

const ALL_RESET_REASONS: ResetPageReason[] = [
  'globalFilter',
  'columnFilters',
  'sorting',
  'grouping',
  'pageSize',
];
/** Display columns that follow the left pins. */
const LEADING_DISPLAY_COLUMNS = ['tk-select', 'tk-expand', 'tk-row-number'];
const ACTIONS_COLUMNS = ['tk-actions', 'actions'];

/** Resolves `dataMode` / `xMode` aliases into `manualX` flags. */
export function resolveOptions<TData>(options: TableOptions<TData>): ResolvedTableOptions<TData> {
  const base = options.dataMode ?? (options.dataSource ? 'server' : 'client');
  const isServer = (mode: TableOptions<TData>['paginationMode']) => (mode ?? base) === 'server';
  const manualFiltering = options.manualFiltering ?? isServer(options.filterMode);
  return {
    ...options,
    data: options.data ?? [],
    manualPagination: options.manualPagination ?? isServer(options.paginationMode),
    manualSorting: options.manualSorting ?? isServer(options.sortingMode),
    manualFiltering,
    manualGlobalFiltering: options.searchMode ? options.searchMode === 'server' : manualFiltering,
    manualGrouping: options.manualGrouping ?? isServer(options.groupingMode),
    manualFaceting: options.manualFaceting ?? isServer(options.facetingMode),
    locale: options.locale ?? getDefaultLocale(),
  };
}

/** Dev warnings for questionable hybrid combinations. */
function validateModes<TData>(o: ResolvedTableOptions<TData>): void {
  if (process.env.NODE_ENV === 'production') return;
  if (o.manualGrouping && !o.manualPagination && (o.enableGrouping ?? false)) {
    throw new Error('[react-tablekit] Server grouping with client pagination is not supported.');
  }
  if (
    o.manualPagination &&
    !o.manualSorting &&
    (o.enableSorting ?? true) &&
    !o.acknowledgePageLocalSorting
  ) {
    warnOnce(
      'Server pagination with client sorting sorts only the current page. Set `acknowledgePageLocalSorting: true` if that is intended.',
    );
  }
  if (
    o.manualPagination &&
    (!o.manualFiltering || !o.manualGlobalFiltering) &&
    (o.enableFilters ?? true) &&
    !o.acknowledgePageLocalFiltering
  ) {
    warnOnce(
      'Server pagination with client filtering filters only the current page. Set `acknowledgePageLocalFiltering: true` if that is intended.',
    );
  }
}

type InternalTable<TData> = TableInstance<TData> & {
  _dataSource: DataSourceController<TData>;
};

/**
 * Creates a headless table instance. Framework-agnostic: React binds to it through
 * `subscribe` + `getState`.
 *
 * @example
 * ```ts
 * const table = createTable({ data, columns, getRowId: (r) => r.id });
 * table.setSorting([{ id: 'name', desc: false }]);
 * table.getRowModel().rows.map((row) => row.getValue('name'));
 * ```
 */
export function createTable<TData>(userOptions: TableOptions<TData>): TableInstance<TData> {
  const table = {
    _features: userOptions._features ?? [],
    _view: {},
    _selectionAnchor: undefined,
  } as unknown as InternalTable<TData>;

  let rawOptions = userOptions;
  table.options = resolveOptions(userOptions);
  for (const f of table._features) {
    const defaults = f.getDefaultOptions?.(table);
    if (defaults) table.options = resolveOptions({ ...defaults, ...rawOptions });
  }
  validateModes(table.options);

  const listeners = new Set<() => void>();
  let version = 0;
  let batchDepth = 0;
  let dirty = false;
  let disposed = false;
  const notify = () => {
    version++;
    if (batchDepth > 0) {
      dirty = true;
      return;
    }
    for (const l of [...listeners]) l();
  };
  const batch = (fn: () => void) => {
    batchDepth++;
    try {
      fn();
    } finally {
      batchDepth--;
      if (batchDepth === 0 && dirty) {
        dirty = false;
        for (const l of [...listeners]) l();
      }
    }
  };

  const proto = createRowPrototype(table);
  /** Bumped when lazily loaded children arrive, so the core row model rebuilds. */
  let childrenVersion = 0;

  /* ── columns ──────────────────────────────────────────────────────── */

  const getAllColumns = memo(
    () =>
      [table.options.columns, table.options.columnDefaults, table.options.defaultColumn] as const,
    (defs) => buildColumns(table, defs),
    { key: 'columns', debug: () => !!table.options.debugColumns },
  );
  const getAllFlatColumns = memo(
    () => [getAllColumns()],
    (cols) => cols.flatMap((c) => c.getFlatColumns()),
  );
  const getColumnMap = memo(
    () => [getAllFlatColumns()],
    (cols) => new Map(cols.map((c) => [c.id, c])),
  );

  /* ── initial state ────────────────────────────────────────────────── */

  const buildInitialState = (): TableState => {
    const defaults = getDefaultTableState();
    const leafDefs = getAllFlatColumns().filter((c) => !c.columns.length);
    const visibility: Record<string, boolean> = {};
    const left: string[] = [];
    const right: string[] = [];
    for (const c of leafDefs) {
      if (c.columnDef.defaultHidden) visibility[c.id] = false;
      const pin = c.columnDef.pin;
      // Plain, unlocked pins seed the state; locked and responsive pins are applied on top.
      if ((pin === 'left' || pin === 'right') && !c.columnDef.lockPin && !c.columnDef.static) {
        (pin === 'left' ? left : right).push(c.id);
      }
    }
    let state: TableState = {
      ...defaults,
      columnVisibility: visibility,
      columnPinning: { left, right },
    };
    for (const f of table._features) state = { ...state, ...f.getInitialState?.(state) };
    const init = rawOptions.initialState ?? {};
    return {
      ...state,
      ...init,
      // Object slices merge, so `initialState` can name just the part it cares about.
      columnVisibility: { ...state.columnVisibility, ...init.columnVisibility },
      columnPinning: { ...state.columnPinning, ...init.columnPinning },
      pagination: { ...state.pagination, ...init.pagination },
    };
  };

  table.initialState = buildInitialState();
  let internal: TableState = table.initialState;
  let merged:
    { internal: TableState; controlled: Partial<TableState>; result: TableState } | undefined;

  table.getState = () => {
    const controlled = table.options.state;
    if (!controlled) return internal;
    if (merged?.internal === internal && merged.controlled === controlled) return merged.result;
    const result = { ...internal };
    for (const key of Object.keys(controlled) as (keyof TableState)[]) {
      if (controlled[key] !== undefined) (result as Record<string, unknown>)[key] = controlled[key];
    }
    merged = { internal, controlled, result };
    return result;
  };

  const isControlled = (key: keyof TableState) => table.options.state?.[key] !== undefined;

  /** Sets one slice: calls on*Change with the updater, updates internal state unless controlled. */
  function setSlice<K extends keyof TableState>(key: K, updater: Updater<TableState[K]>): void {
    const prev = table.getState()[key];
    const next = functionalUpdate(updater, prev);
    if (deepEqual(prev, next)) return;
    const onChange = table.options[CHANGE_KEYS[key]] as OnChangeFn<TableState[K]> | undefined;
    if (!isControlled(key)) internal = { ...internal, [key]: next };
    batch(() => {
      onChange?.(updater);
      table.options.onStateChange?.((old) => ({
        ...old,
        [key]: functionalUpdate(updater, old[key]),
      }));
      afterChange(key, prev, next);
      notify();
    });
  }

  table.setState = (updater) => {
    const prev = table.getState();
    const next = functionalUpdate(updater, prev);
    batch(() => {
      for (const key of Object.keys(next) as (keyof TableState)[]) {
        if (!deepEqual(prev[key], next[key])) setSlice(key, next[key] as never);
      }
    });
  };

  table.setOptions = (updater) => {
    const prev = rawOptions;
    rawOptions = functionalUpdate(updater, prev);
    const opts = rawOptions.mergeOptions ? rawOptions.mergeOptions(prev, rawOptions) : rawOptions;
    table.options = resolveOptions(opts);
    // Side effects are deferred: setOptions runs during render in React.
    if (prev.state !== rawOptions.state) schedule(() => syncQuery());
    if (prev.data !== rawOptions.data) schedule(onDataChange);
    if (prev.dataSource !== rawOptions.dataSource && rawOptions.dataSource) {
      schedule(() => void ds.refresh());
    }
  };

  const queued: (() => void)[] = [];
  function schedule(fn: () => void) {
    if (!queued.includes(fn)) queued.push(fn);
    if (queued.length === 1) {
      queueMicrotask(() => {
        const fns = queued.splice(0);
        if (disposed) return;
        batch(() => {
          for (const f of fns) f();
        });
      });
    }
  }

  table.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  table._getVersion = () => version;

  const resetSlice = <K extends keyof TableState>(key: K, defaultState?: boolean) =>
    setSlice(key, defaultState ? getDefaultTableState()[key] : table.initialState[key]);

  table.reset = () => {
    batch(() => {
      for (const key of Object.keys(table.initialState) as (keyof TableState)[]) resetSlice(key);
    });
  };

  /* ── query tracking ───────────────────────────────────────────────── */

  const buildQuery = (s: TableState): TableQuery => ({
    pagination: s.pagination,
    sorting: s.sorting,
    globalFilter: s.globalFilter,
    columnFilters: s.columnFilters,
    grouping: s.grouping,
  });
  let query: TableQuery = buildQuery(table.getState());
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let filterTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressSync = 0;
  let pendingState: Partial<TableState> = {};

  table._getInternalQuery = () => query;

  /** Maps column ids to `sortServerKey` / `filterServerKey` (what the server sees). */
  const mapQueryValue = (q: TableQuery): TableQuery => {
    const cols = getColumnMap();
    return {
      ...q,
      sorting: q.sorting.map((s) => ({
        ...s,
        id: cols.get(s.id)?.columnDef.sortServerKey ?? s.id,
      })),
      columnFilters: q.columnFilters.map((f) => ({
        ...f,
        id: cols.get(f.id)?.columnDef.filterServerKey ?? f.id,
      })),
    };
  };
  const mapQuery = memo(
    () => [query, getColumnMap()],
    (q) => mapQueryValue(q),
  );
  table.getQuery = () => mapQuery();

  /**
   * In hybrid mode only the server-managed features reach the data source. Client-side
   * parts are blanked out, so, for example, server pagination + client sorting really does sort
   * just the page that was fetched instead of asking the server to re-sort everything.
   */
  const serverQuery = (q: TableQuery): TableQuery => {
    const o = table.options;
    return {
      ...q,
      sorting: o.manualSorting ? q.sorting : [],
      columnFilters: o.manualFiltering ? q.columnFilters : [],
      globalFilter: o.manualGlobalFiltering ? q.globalFilter : '',
      grouping: o.manualGrouping ? q.grouping : [],
      pagination: o.manualPagination
        ? q.pagination
        : {
            ...q.pagination,
            pageIndex: 0,
            ...(q.pagination.cursor !== undefined ? { cursor: null } : {}),
          },
    };
  };

  /** Whether a query change is something the server needs to hear about. */
  const isServerReason = (reason: QueryChangeReason): boolean => {
    const o = table.options;
    if (reason === 'pagination') return o.manualPagination;
    if (reason === 'sorting') return o.manualSorting;
    if (reason === 'globalFilter') return o.manualGlobalFiltering;
    if (reason === 'columnFilters') return o.manualFiltering;
    if (reason === 'grouping') return o.manualGrouping;
    return true; // refresh
  };

  const shouldResetPage = (reason: ResetPageReason) => {
    const reasons = table.options.resetPageOn ?? ALL_RESET_REASONS;
    if (!reasons.includes(reason)) return false;
    return table.options.manualPagination || (table.options.autoResetPageIndex ?? true);
  };

  const stateForQuery = (): TableState => ({ ...table.getState(), ...pendingState });

  function isGatedSearch(value: string): boolean {
    const min = table.options.searchMinLength ?? 0;
    const len = value.trim().length;
    return len > 0 && len < min;
  }

  function syncQuery() {
    if (suppressSync > 0) return;
    const s = stateForQuery();
    const next: TableQuery = { ...query };
    const reasons: QueryChangeReason[] = [];

    if (!deepEqual(s.sorting, query.sorting)) {
      next.sorting = s.sorting;
      reasons.push('sorting');
    }
    if (!deepEqual(s.grouping, query.grouping)) {
      next.grouping = s.grouping;
      reasons.push('grouping');
    }

    if (s.globalFilter !== query.globalFilter) {
      const delay = table.options.searchDebounceMs ?? 300;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = undefined;
      if (delay <= 0) {
        if (!isGatedSearch(s.globalFilter)) {
          next.globalFilter = s.globalFilter;
          reasons.push('globalFilter');
        }
      } else {
        searchTimer = setTimeout(() => {
          searchTimer = undefined;
          const value = stateForQuery().globalFilter;
          if (value === query.globalFilter || isGatedSearch(value)) return;
          batch(() => commit({ ...query, globalFilter: value }, ['globalFilter']));
        }, delay);
      }
    } else if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = undefined;
    }

    if (!deepEqual(s.columnFilters, query.columnFilters)) {
      const delay = table.options.filterDebounceMs ?? 300;
      if (filterTimer) clearTimeout(filterTimer);
      filterTimer = undefined;
      if (delay <= 0 || !isTextChange(query.columnFilters, s.columnFilters)) {
        next.columnFilters = s.columnFilters;
        reasons.push('columnFilters');
      } else {
        filterTimer = setTimeout(() => {
          filterTimer = undefined;
          const value = stateForQuery().columnFilters;
          if (deepEqual(value, query.columnFilters)) return;
          batch(() => commit({ ...query, columnFilters: value }, ['columnFilters']));
        }, delay);
      }
    } else if (filterTimer) {
      clearTimeout(filterTimer);
      filterTimer = undefined;
    }

    if (!deepEqual(s.pagination, query.pagination)) {
      next.pagination = s.pagination;
      reasons.push('pagination');
    }
    if (reasons.length) commit(next, reasons);
  }

  /**
   * Edits of typed inputs (`text` / `number` variants) are debounced; selects, ranges, dates,
   * booleans and removals apply immediately.
   */
  function isTextChange(prev: ColumnFiltersState, next: ColumnFiltersState): boolean {
    const changed = next.filter((f) => !prev.some((p) => deepEqual(p, f)));
    return (
      changed.length > 0 &&
      changed.every((f) => {
        const variant = table.getColumn(f.id)?.getFilterVariant();
        return (variant === 'text' || variant === 'number') && typeof f.value !== 'object';
      })
    );
  }

  function commit(candidate: TableQuery, reasons: QueryChangeReason[]) {
    let next = candidate;
    const primary = reasons.find((r) => r !== 'pagination') ?? reasons[0] ?? 'refresh';
    const resetFor = reasons.find(
      (r) =>
        r !== 'pagination' &&
        r !== 'refresh' &&
        shouldResetPage(r as ResetPageReason) &&
        // A client-side change under server pagination only affects the page already fetched
        //, so it must not jump back to page 1 — and must not refetch.
        (isServerReason(r) || !table.options.manualPagination),
    );
    if (resetFor && (next.pagination.pageIndex !== 0 || next.pagination.cursor)) {
      const pagination: PaginationState = {
        ...next.pagination,
        pageIndex: 0,
        ...(next.pagination.cursor !== undefined ? { cursor: null } : {}),
      };
      suppressSync++;
      try {
        setSlice('pagination', pagination);
      } finally {
        suppressSync--;
      }
      next = { ...next, pagination };
    }
    const previous = query;
    query = next;
    const isQueryFilterChange =
      primary === 'globalFilter' || primary === 'columnFilters' || primary === 'grouping';
    if (isQueryFilterChange) {
      const sel = table.getState().rowSelection;
      const clear = table.options.clearSelectionOnQueryChange ?? table.options.manualPagination;
      if (sel.__all || (clear && Object.keys(sel).length)) setSlice('rowSelection', {});
    }
    const publicQuery = table.getQuery();
    table.options.onQueryChange?.(publicQuery, {
      reason: primary,
      previous: mapQueryValue(previous),
    });
    if (table.options.dataSource && reasons.some(isServerReason)) {
      ds.onQueryChange(serverQuery(publicQuery), primary);
    } else if (!table.options.manualPagination && isQueryFilterChange) ensurePageInRange();
    notify();
  }

  table.flushQuery = () => {
    const hadTimers = !!searchTimer || !!filterTimer;
    if (searchTimer) clearTimeout(searchTimer);
    if (filterTimer) clearTimeout(filterTimer);
    searchTimer = filterTimer = undefined;
    if (!hadTimers) return;
    const s = stateForQuery();
    const reasons: QueryChangeReason[] = [];
    const next = { ...query };
    if (s.globalFilter !== query.globalFilter && !isGatedSearch(s.globalFilter)) {
      next.globalFilter = s.globalFilter;
      reasons.push('globalFilter');
    }
    if (!deepEqual(s.columnFilters, query.columnFilters)) {
      next.columnFilters = s.columnFilters;
      reasons.push('columnFilters');
    }
    if (reasons.length) batch(() => commit(next, reasons));
  };

  /** Server echo: adopt into state and query without refetching. */
  function adoptQuery(partial: Partial<TableQuery>) {
    const cols = getAllFlatColumns();
    const bySortKey = new Map(cols.map((c) => [c.columnDef.sortServerKey ?? c.id, c.id]));
    const byFilterKey = new Map(cols.map((c) => [c.columnDef.filterServerKey ?? c.id, c.id]));
    const adopted: Partial<TableQuery> = {};
    if (partial.pagination) adopted.pagination = { ...query.pagination, ...partial.pagination };
    if (partial.sorting)
      adopted.sorting = partial.sorting.map((s) => ({ ...s, id: bySortKey.get(s.id) ?? s.id }));
    if (partial.columnFilters) {
      adopted.columnFilters = partial.columnFilters.map((f) => ({
        ...f,
        id: byFilterKey.get(f.id) ?? f.id,
      }));
    }
    if (partial.globalFilter !== undefined) adopted.globalFilter = partial.globalFilter;
    if (partial.grouping) adopted.grouping = partial.grouping;
    const next = { ...query, ...adopted };
    if (deepEqual(next, query)) return;
    suppressSync++;
    try {
      batch(() => {
        for (const key of Object.keys(adopted) as (keyof TableQuery)[]) {
          if (key !== 'expanded') setSlice(key, adopted[key] as never);
        }
      });
    } finally {
      suppressSync--;
    }
    query = next;
  }

  function afterChange<K extends keyof TableState>(
    key: K,
    _prev: TableState[K],
    next: TableState[K],
  ) {
    if (
      key === 'sorting' ||
      key === 'grouping' ||
      key === 'pagination' ||
      key === 'globalFilter' ||
      key === 'columnFilters'
    ) {
      // Controlled slices: the consumer hasn't re-rendered yet, so remember the value.
      if (isControlled(key)) pendingState = { ...pendingState, [key]: next };
      syncQuery();
      schedule(() => {
        pendingState = {};
      });
    }
    if (key === 'grouping' && table.options.autoResetExpanded !== false) {
      if (!isControlled('expanded')) setSlice('expanded', {});
    }
  }

  function onDataChange() {
    if (table.options.dataSource || table.options.manualPagination) return;
    if (table.options.autoResetPageIndex === true) table.setPageIndex(0);
    else ensurePageInRange();
    if (table.options.autoResetExpanded === true) setSlice('expanded', {});
    if (table.options.autoResetSelection === true) setSlice('rowSelection', {});
  }

  function ensurePageInRange() {
    const pageCount = table.getPageCount();
    const { pageIndex } = table.getState().pagination;
    if (pageCount > 0 && pageIndex > pageCount - 1) table.setPageIndex(pageCount - 1);
  }

  /* ── data source ──────────────────────────────────────────────────── */

  const ds = createDataSourceController<TData>({
    table,
    getQuery: () => serverQuery(table.getQuery()),
    notify: () => notify(),
    adoptQuery,
  });
  table._dataSource = ds;

  const getData = (): TData[] => (table.options.dataSource ? ds.getRows() : table.options.data);

  table._mount = () => {
    disposed = false;
    const stop = table.options.dataSource ? ds.mount() : undefined;
    return () => {
      stop?.();
      if (searchTimer) clearTimeout(searchTimer);
      if (filterTimer) clearTimeout(filterTimer);
      searchTimer = filterTimer = undefined;
    };
  };

  table.refresh = async () => {
    table.options.onQueryChange?.(table.getQuery(), {
      reason: 'refresh',
      previous: table.getQuery(),
    });
    await ds.refresh();
  };
  table.invalidate = () => schedule(() => void ds.refresh());
  table.getDataStatus = (): DataStatus => {
    const o = table.options;
    const s = o.dataSource
      ? ds.getStatus()
      : { loading: false, fetching: false, error: undefined, lastQuery: null, lastUpdated: null };
    return {
      ...s,
      loading: o.loading ?? s.loading,
      fetching: o.fetching ?? s.fetching,
      error: o.error !== undefined ? o.error : s.error,
    };
  };
  const warnLocalMutation = () =>
    warnOnce(
      'updateRow/removeRow/insertRow mutate data-source pages only. Update `data` in client mode.',
    );
  table.updateRow = (id, updater) =>
    table.options.dataSource ? ds.updateRow(id, updater) : warnLocalMutation();
  table.removeRow = (id) => (table.options.dataSource ? ds.removeRow(id) : warnLocalMutation());
  table.insertRow = (row, index) =>
    table.options.dataSource ? ds.insertRow(row, index) : warnLocalMutation();
  table.getCursors = () => ds.getCursors();
  table._getServerFacets = (id) =>
    table.options.dataSource ? ds.getFacets(id) : table.options.facets?.[id];
  table._loadFacets = (id) => ds.loadFacets(id);

  /* ── function registries ──────────────────────────────────────────── */

  table._getSortingFn = (name) => table.options.sortingFns?.[name] ?? builtInFns.sortingFns[name];
  table._getFilterFn = (name) => table.options.filterFns?.[name] ?? builtInFns.filterFns[name];
  table._getAggregationFn = (name) =>
    table.options.aggregationFns?.[name] ?? builtInFns.aggregationFns[name];

  /* ── column accessors ─────────────────────────────────────────────── */

  table.getAllColumns = getAllColumns;
  table.getAllFlatColumns = getAllFlatColumns;
  table.getColumn = (id) => {
    const col = getColumnMap().get(id);
    if (!col && process.env.NODE_ENV !== 'production' && table.options.debugColumns)
      warnOnce(`Column "${id}" not found.`);
    return col;
  };

  table.getAllLeafColumns = memo(
    () => [
      getAllColumns(),
      table.getState().columnOrder,
      table.getState().grouping,
      table.options.groupedColumnMode,
    ],
    (columns, order, grouping, groupedMode) => {
      let leaves = columns.flatMap((c) => c.getFlatColumns()).filter((c) => !c.columns.length);
      if (order.length) {
        const byId = new Map(leaves.map((c) => [c.id, c]));
        const listed = order.map((id) => byId.get(id)).filter((c): c is Column<TData> => !!c);
        const listedSet = new Set(listed);
        leaves = [...listed, ...leaves.filter((c) => !listedSet.has(c))];
      }
      const first = leaves.filter((c) => c.columnDef.lockPosition === 'first');
      const last = leaves.filter((c) => c.columnDef.lockPosition === 'last');
      const middle = leaves.filter((c) => !c.columnDef.lockPosition);
      leaves = [...first, ...middle, ...last];
      if (grouping.length && (groupedMode ?? 'reorder') === 'reorder') {
        const grouped = grouping
          .map((id) => leaves.find((c) => c.id === id))
          .filter((c): c is Column<TData> => !!c);
        const leading = leaves.filter((c) => LEADING_DISPLAY_COLUMNS.includes(c.id));
        leaves = [
          ...leading,
          ...grouped,
          ...leaves.filter((c) => !grouped.includes(c) && !leading.includes(c)),
        ];
      }
      return leaves;
    },
  );

  const isResponsivelyHidden = (column: Column<TData>) => {
    const bp = table.getBreakpoint();
    const { hideBelow, hideAbove } = column.columnDef;
    if (hideBelow && !isAtLeast(bp, hideBelow)) return true;
    if (hideAbove && BREAKPOINT_ORDER.indexOf(bp) > BREAKPOINT_ORDER.indexOf(hideAbove))
      return true;
    return false;
  };

  const getVisibleLeafColumnsUnordered = memo(
    () => [
      table.getAllLeafColumns(),
      table.getState().columnVisibility,
      table.getBreakpoint(),
      table.getState().grouping,
      table.options.groupedColumnMode,
    ],
    (leaves, _vis, _bp, grouping, groupedMode) =>
      leaves.filter(
        (c) =>
          c.getIsVisible() &&
          !isResponsivelyHidden(c) &&
          !(groupedMode === 'remove' && grouping.includes(c.id)),
      ),
  );

  table.getBreakpoint = () => table.options._renderContext?.breakpoint ?? 'lg';

  table.getEffectiveColumnPinning = memo(
    () => [
      table.getState().columnPinning,
      table.getAllLeafColumns(),
      table.getBreakpoint(),
      table.options.stickyActions,
    ],
    (pinning, leaves, _bp, stickyActions): ColumnPinningState => {
      const left = new Set(pinning.left);
      const right = new Set(pinning.right);
      for (const c of leaves) {
        const pin = c.columnDef.pin;
        const locked = !!c.columnDef.lockPin || !!c.columnDef.static;
        const responsive = pin !== undefined && isResponsive(pin);
        const inState = left.has(c.id) || right.has(c.id);
        if (pin !== undefined && (locked || (responsive && !inState))) {
          left.delete(c.id);
          right.delete(c.id);
          const side = resolveColumnPin(c, table);
          if (side === 'left') left.add(c.id);
          if (side === 'right') right.add(c.id);
        }
        if (stickyActions && ACTIONS_COLUMNS.includes(c.id) && !inState && pin === undefined)
          right.add(c.id);
      }
      const pinnedDataLeft = [...left].some((id) => !LEADING_DISPLAY_COLUMNS.includes(id));
      if (pinnedDataLeft) {
        for (const c of leaves) if (LEADING_DISPLAY_COLUMNS.includes(c.id)) left.add(c.id);
      }
      const order = new Map(leaves.map((c, i) => [c.id, i]));
      const byOrder = (a: string, b: string) => (order.get(a) ?? 0) - (order.get(b) ?? 0);
      return {
        left: [...left].filter((id) => order.has(id)).sort(byOrder),
        right: [...right].filter((id) => order.has(id)).sort(byOrder),
      };
    },
  );

  const getVisibleSections = memo(
    () => [getVisibleLeafColumnsUnordered(), table.getEffectiveColumnPinning()],
    (visible, pinning) => {
      const leftSet = new Set(pinning.left);
      const rightSet = new Set(pinning.right);
      const left = visible.filter((c) => leftSet.has(c.id));
      const right = visible.filter((c) => rightSet.has(c.id));
      const center = visible.filter((c) => !leftSet.has(c.id) && !rightSet.has(c.id));
      return { left, center, right, all: [...left, ...center, ...right] };
    },
  );
  table.getVisibleLeafColumns = () => getVisibleSections().all;
  table.getLeftVisibleLeafColumns = () => getVisibleSections().left;
  table.getCenterVisibleLeafColumns = () => getVisibleSections().center;
  table.getRightVisibleLeafColumns = () => getVisibleSections().right;

  /* ── headers ──────────────────────────────────────────────────────── */

  const getHeaderSections = memo(
    () => [getVisibleSections()],
    (sections) => {
      const depthOf = (c: Column<TData>) => c.depth;
      const maxDepth = Math.max(0, ...sections.all.map(depthOf));
      return {
        left: buildHeaderGroups(table, sections.left, maxDepth, 'left'),
        center: buildHeaderGroups(table, sections.center, maxDepth, 'center'),
        right: buildHeaderGroups(table, sections.right, maxDepth, 'right'),
      };
    },
  );
  table.getLeftHeaderGroups = () => getHeaderSections().left;
  table.getCenterHeaderGroups = () => getHeaderSections().center;
  table.getRightHeaderGroups = () => getHeaderSections().right;
  table.getHeaderGroups = memo(
    () => [getHeaderSections()],
    ({ left, center, right }): HeaderGroup<TData>[] =>
      center.map((group, i) => ({
        id: `header_${i}`,
        depth: i,
        headers: [...(left[i]?.headers ?? []), ...group.headers, ...(right[i]?.headers ?? [])],
      })),
  );
  table.getFooterGroups = () => [...table.getHeaderGroups()].reverse();
  table.getLeafHeaders = () => {
    const groups = table.getHeaderGroups();
    return groups[groups.length - 1]?.headers ?? [];
  };

  /* ── row models ───────────────────────────────────────────────────── */

  const getCoreRowModel = memo(
    () => [
      getData(),
      table.options.getRowId,
      table.options.getSubRows,
      getAllColumns(),
      childrenVersion,
    ],
    (data) =>
      buildCoreRowModel(
        table,
        proto,
        data,
        // Lazy children loaded through the data source become sub-rows.
        table.options.dataSource?.fetchChildren ? (row) => ds.getChildren(row.id) : undefined,
      ),
    { key: 'coreRowModel', debug: () => !!table.options.debugRows },
  );
  table.getCoreRowModel = getCoreRowModel;

  table._filterRows = (model, excludeColumnId) =>
    filterRowModel(table, model, query, excludeColumnId);

  table.getFilteredRowModel = memo(
    () => [
      getCoreRowModel(),
      query.columnFilters,
      query.globalFilter,
      table.options.manualFiltering,
      table.options.manualGlobalFiltering,
      table.options.globalFilterMatch,
      table.options.filterFromLeafRows,
      table.getAllLeafColumns(),
    ],
    (core) => filterRowModel(table, core, query),
    { key: 'filteredRowModel', debug: () => !!table.options.debugTable },
  );
  table.getGlobalFacetedRowModel = () => table.getFilteredRowModel();

  table.getGroupedRowModel = memo(
    () => [table.getFilteredRowModel(), table.getState().grouping, table.options.manualGrouping],
    (filtered, grouping, manual) =>
      manual || !grouping.length ? filtered : groupRowModel(table, proto, filtered, grouping),
    { key: 'groupedRowModel', debug: () => !!table.options.debugTable },
  );

  table.getSortedRowModel = memo(
    () => [table.getGroupedRowModel(), table.getState().sorting, table.options.manualSorting],
    (grouped, sorting, manual) =>
      manual || !sorting.length ? grouped : sortRowModel(table, grouped, sorting),
    { key: 'sortedRowModel', debug: () => !!table.options.debugTable },
  );

  table.getExpandedRowModel = memo(
    () => [
      table.getSortedRowModel(),
      table.getState().expanded,
      table.options.paginateExpandedRows,
    ],
    (sorted, _expanded, paginateExpanded) =>
      paginateExpanded === false ? sorted : expandRowModel(sorted),
  );

  table.getPrePaginationRowModel = () => table.getExpandedRowModel();

  table.getPaginationRowModel = memo(
    () => [
      table.getExpandedRowModel(),
      table.getState().pagination,
      table.options.manualPagination,
      table.options.enablePagination,
      table.options.paginateExpandedRows,
      table.getState().expanded,
    ],
    (model, pagination, manual, enabled, paginateExpanded) => {
      if (manual || enabled === false) {
        return paginateExpanded === false ? expandRowModel(model) : model;
      }
      return paginateRowModel(
        model,
        pagination.pageIndex,
        pagination.pageSize,
        paginateExpanded === false,
      );
    },
    { key: 'paginationRowModel', debug: () => !!table.options.debugTable },
  );
  table.getRowModel = () => table.getPaginationRowModel();

  table.getRow = (id, searchAll) => {
    const row =
      table.getRowModel().rowsById[id] ??
      (searchAll
        ? (table.getPrePaginationRowModel().rowsById[id] ?? getCoreRowModel().rowsById[id])
        : undefined);
    if (!row && searchAll) return table.getGroupedRowModel().rowsById[id];
    return row;
  };

  table.getRowCount = () => {
    if (table.options.manualPagination) {
      const count = table.options.rowCount ?? ds.getRowCount();
      if (count !== undefined) return count;
      const pageCount = table.options.pageCount ?? ds.getPageCount();
      if (pageCount !== undefined) return pageCount * table.getState().pagination.pageSize;
      return table.options.dataSource ? -1 : getData().length;
    }
    return table.getPrePaginationRowModel().rows.length;
  };

  table.getPageCount = () => {
    if (table.options.enablePagination === false) return 1;
    const explicit =
      table.options.pageCount ?? (table.options.manualPagination ? ds.getPageCount() : undefined);
    if (explicit !== undefined) return explicit;
    const rowCount = table.getRowCount();
    if (rowCount < 0) return -1;
    return Math.ceil(rowCount / Math.max(1, table.getState().pagination.pageSize));
  };

  /* ── sorting ──────────────────────────────────────────────────────── */

  table.setSorting = (u) => setSlice('sorting', u);
  table.resetSorting = (d) => resetSlice('sorting', d);

  /* ── filtering ────────────────────────────────────────────────────── */

  table.setGlobalFilter = (u) => setSlice('globalFilter', u);
  table.resetGlobalFilter = (d) => resetSlice('globalFilter', d);
  table.setColumnFilters = (u) => setSlice('columnFilters', u);
  table.resetColumnFilters = (d) => resetSlice('columnFilters', d);
  table.clearAllFilters = () =>
    batch(() => {
      setSlice('columnFilters', []);
      setSlice('globalFilter', '');
      table.flushQuery();
    });
  table.getActiveFilterCount = () => {
    const s = table.getState();
    return s.columnFilters.length + (s.globalFilter.trim() ? 1 : 0);
  };

  /* ── pagination ───────────────────────────────────────────────────── */

  const isCursor = () => table.options.paginationType === 'cursor';

  table.setPagination = (u) => setSlice('pagination', u);
  table.resetPagination = (d) => resetSlice('pagination', d);
  table.setPageIndex = (u) =>
    setSlice('pagination', (old) => {
      let pageIndex = functionalUpdate(u, old.pageIndex);
      const pageCount = table.getPageCount();
      pageIndex = Math.max(0, pageCount > 0 ? Math.min(pageIndex, pageCount - 1) : pageIndex);
      return { ...old, pageIndex };
    });
  table.setPageSize = (u) =>
    setSlice('pagination', (old) => {
      const pageSize = Math.max(1, functionalUpdate(u, old.pageSize));
      if (table.options.manualPagination) {
        const reset = (table.options.resetPageOn ?? ALL_RESET_REASONS).includes('pageSize');
        return {
          ...old,
          pageSize,
          pageIndex: reset ? 0 : old.pageIndex,
          ...(old.cursor !== undefined ? { cursor: null } : {}),
        };
      }
      // Keep the first visible row on screen.
      const firstRow = old.pageIndex * old.pageSize;
      return { ...old, pageSize, pageIndex: Math.floor(firstRow / pageSize) };
    });
  table.getCanPreviousPage = () => table.getState().pagination.pageIndex > 0;
  table.getCanNextPage = () => {
    if (isCursor()) {
      const next = table.options.dataSource ? ds.getCursors().next : undefined;
      return next !== undefined
        ? next !== null
        : table.getRowModel().rows.length >= table.getState().pagination.pageSize;
    }
    const pageCount = table.getPageCount();
    const { pageIndex, pageSize } = table.getState().pagination;
    if (pageCount === -1) return getData().length >= pageSize;
    return pageIndex < pageCount - 1;
  };
  table.nextPage = () => {
    if (!table.getCanNextPage()) return;
    if (isCursor()) {
      const next = ds.getCursors().next;
      setSlice('pagination', (old) => ({
        ...old,
        pageIndex: old.pageIndex + 1,
        cursor: next ?? null,
      }));
    } else table.setPageIndex((i) => i + 1);
  };
  table.previousPage = () => {
    if (!table.getCanPreviousPage()) return;
    if (isCursor()) {
      const prev = ds.getCursors().prev;
      setSlice('pagination', (old) => ({
        ...old,
        pageIndex: Math.max(0, old.pageIndex - 1),
        cursor: old.pageIndex - 1 <= 0 ? null : (prev ?? null),
      }));
    } else table.setPageIndex((i) => i - 1);
  };
  table.firstPage = () =>
    isCursor()
      ? setSlice('pagination', (old) => ({ ...old, pageIndex: 0, cursor: null }))
      : table.setPageIndex(0);
  table.lastPage = () => table.setPageIndex(Math.max(0, table.getPageCount() - 1));
  table.getPageItems = (opts) => {
    const pageCount = table.getPageCount();
    if (pageCount < 0) return [];
    return getPageItems({ ...opts, pageIndex: table.getState().pagination.pageIndex, pageCount });
  };

  /* ── selection ────────────────────────────────────────────────────── */

  const canSelect = (row: Row<TData>) => {
    if (row.getIsDisabled()) return false;
    const enabled = table.options.enableRowSelection;
    const allowed = typeof enabled === 'function' ? enabled(row) : (enabled ?? false);
    return allowed && (table.options.getRowCanSelect?.(row) ?? true);
  };
  const resolveFlag = (
    flag: boolean | ((row: Row<TData>) => boolean) | undefined,
    row: Row<TData>,
    fallback: boolean,
  ) => (typeof flag === 'function' ? flag(row) : (flag ?? fallback));

  const isSelectedIn = (sel: RowSelectionState, row: Row<TData>) =>
    sel.__all ? sel[row.id] !== false && canSelect(row) : sel[row.id] === true;

  function mutateSelection(
    sel: RowSelectionState,
    row: Row<TData>,
    value: boolean,
    withChildren: boolean,
  ) {
    if (canSelect(row)) {
      if (sel.__all) {
        if (value) delete sel[row.id];
        else sel[row.id] = false;
      } else if (value) sel[row.id] = true;
      else delete sel[row.id];
    }
    if (
      withChildren &&
      row.subRows.length &&
      resolveFlag(table.options.enableSubRowSelection, row, true)
    ) {
      for (const child of row.subRows) mutateSelection(sel, child, value, true);
    }
  }

  const selectionProto = {
    getIsSelected(this: Row<TData>) {
      return isSelectedIn(table.getState().rowSelection, this);
    },
    getCanSelect(this: Row<TData>) {
      return canSelect(this);
    },
    getCanMultiSelect(this: Row<TData>) {
      return resolveFlag(table.options.enableMultiRowSelection, this, true);
    },
    getCanSelectSubRows(this: Row<TData>) {
      return resolveFlag(table.options.enableSubRowSelection, this, true);
    },
    getIsSomeSelected(this: Row<TData>) {
      if (!this.subRows.length) return false;
      const leaves = this.getLeafRows().filter((r) => canSelect(r));
      const selected = leaves.filter((r) => r.getIsSelected()).length;
      return selected > 0 && selected < leaves.length;
    },
    getIsAllSubRowsSelected(this: Row<TData>) {
      const leaves = this.getLeafRows().filter((r) => canSelect(r));
      return leaves.length > 0 && leaves.every((r) => r.getIsSelected());
    },
    toggleSelected(this: Row<TData>, value?: boolean, opts?: { selectChildren?: boolean }) {
      const row = this;
      const current =
        row.getIsSelected() || (row.subRows.length > 0 && row.getIsAllSubRowsSelected());
      const next = value ?? !current;
      table._selectionAnchor = row.id;
      setSlice('rowSelection', (old) => {
        const multi = resolveFlag(table.options.enableMultiRowSelection, row, true);
        const sel = Object.assign(Object.create(null) as RowSelectionState, multi ? old : {});
        mutateSelection(sel, row, next, opts?.selectChildren ?? true);
        return sel;
      });
    },
  };
  Object.assign(proto, selectionProto);

  table.setRowSelection = (u) => setSlice('rowSelection', u);
  table.resetRowSelection = (d) => resetSlice('rowSelection', d);
  const selectableFiltered = () =>
    table.getFilteredRowModel().flatRows.filter((r) => canSelect(r) && !r.getIsGrouped());
  /** Selectable rows displayed on the current page (expanded sub-rows are already flattened in). */
  const selectablePage = () =>
    table.getRowModel().rows.filter((r) => canSelect(r) && !r.getIsGrouped());
  const serverAll = () => table.options.manualPagination && table.options.selectAllMode === 'all';

  table.toggleAllRowsSelected = (value) => {
    if (serverAll()) {
      const next = value ?? !table.getIsAllRowsSelected();
      setSlice('rowSelection', next ? { __all: true } : {});
      return;
    }
    const next = value ?? !table.getIsAllRowsSelected();
    setSlice('rowSelection', (old) => {
      const sel = Object.assign(Object.create(null) as RowSelectionState, old);
      delete sel.__all;
      for (const r of selectableFiltered()) {
        if (next) sel[r.id] = true;
        else delete sel[r.id];
      }
      return sel;
    });
  };
  table.toggleAllPageRowsSelected = (value) => {
    const next = value ?? !table.getIsAllPageRowsSelected();
    setSlice('rowSelection', (old) => {
      const sel = Object.assign(Object.create(null) as RowSelectionState, old);
      for (const r of selectablePage()) mutateSelection(sel, r, next, false);
      return sel;
    });
  };
  table.getIsAllRowsSelected = () => {
    if (table.getState().rowSelection.__all)
      return Object.values(table.getState().rowSelection).every(Boolean);
    const rows = selectableFiltered();
    return rows.length > 0 && rows.every((r) => r.getIsSelected());
  };
  table.getIsSomeRowsSelected = () => {
    const count = table.getSelectedCount();
    return count > 0 && !table.getIsAllRowsSelected();
  };
  table.getIsAllPageRowsSelected = () => {
    const rows = selectablePage();
    return rows.length > 0 && rows.every((r) => r.getIsSelected());
  };
  table.getIsSomePageRowsSelected = () => {
    const rows = selectablePage();
    const n = rows.filter((r) => r.getIsSelected()).length;
    return n > 0 && n < rows.length;
  };
  table.getSelectedRowModel = memo(
    () => [table.getState().rowSelection, getCoreRowModel()],
    (sel, core) => {
      const rows = core.flatRows.filter((r) => isSelectedIn(sel, r));
      return { rows, flatRows: rows, rowsById: Object.fromEntries(rows.map((r) => [r.id, r])) };
    },
  );
  table.getSelectedRowIds = () =>
    Object.entries(table.getState().rowSelection)
      .filter(([k, v]) => k !== '__all' && v)
      .map(([k]) => k);
  table.getIsAllMatchingSelected = () =>
    !!table.getState().rowSelection.__all ||
    (!table.options.manualPagination && table.getIsAllRowsSelected());
  table.selectAllMatching = () => {
    if (table.options.manualPagination) setSlice('rowSelection', { __all: true });
    else table.toggleAllRowsSelected(true);
  };
  table.getSelectedCount = () => {
    const sel = table.getState().rowSelection;
    if (sel.__all) {
      const total = table.getRowCount();
      const except = Object.entries(sel).filter(([k, v]) => k !== '__all' && !v).length;
      return total < 0 ? -1 : Math.max(0, total - except);
    }
    return Object.entries(sel).filter(([k, v]) => k !== '__all' && v).length;
  };
  table.getSelectionQuery = () => {
    const sel = table.getState().rowSelection;
    if (sel.__all) {
      return {
        mode: 'all',
        query: table.getQuery(),
        except: Object.entries(sel)
          .filter(([k, v]) => k !== '__all' && !v)
          .map(([k]) => k),
      };
    }
    return { mode: 'ids', ids: table.getSelectedRowIds() };
  };
  table.selectRange = (fromId, toId, value = true) => {
    const rows = table.getRowModel().rows;
    const a = rows.findIndex((r) => r.id === fromId);
    const b = rows.findIndex((r) => r.id === toId);
    if (a === -1 || b === -1) return;
    const [start, end] = a < b ? [a, b] : [b, a];
    setSlice('rowSelection', (old) => {
      const sel = Object.assign(Object.create(null) as RowSelectionState, old);
      for (const r of rows.slice(start, end + 1)) mutateSelection(sel, r, value, false);
      return sel;
    });
    table._selectionAnchor = toId;
  };

  /* ── expansion ────────────────────────────────────────────────────── */

  const expansionEnabled = () =>
    table.options.enableExpanding ??
    (!!table.options.getSubRows ||
      !!table.options.getRowCanExpand ||
      !!table.options._hasDetailPanel ||
      !!table.options.dataSource?.fetchChildren ||
      table.getState().grouping.length > 0);

  const expansionProto = {
    getIsExpanded(this: Row<TData>) {
      const expanded = table.getState().expanded;
      return expanded === true || expanded[this.id] === true;
    },
    getCanExpand(this: Row<TData>) {
      if (this.getIsGrouped()) return true;
      if (table.options.getRowCanExpand) return table.options.getRowCanExpand(this);
      return expansionEnabled() && (this.subRows.length > 0 || !!table.options._hasDetailPanel);
    },
    getIsAllParentsExpanded(this: Row<TData>) {
      return this.getParentRows().every((p) => p.getIsExpanded());
    },
    toggleExpanded(this: Row<TData>, value?: boolean) {
      const row = this;
      const next = value ?? !row.getIsExpanded();
      if (
        next &&
        table.options.dataSource?.fetchChildren &&
        !row.subRows.length &&
        !row.getIsGrouped()
      ) {
        void ds.loadChildren(row).then(() => {
          childrenVersion++;
          notify();
        });
      }
      setSlice('expanded', (old): ExpandedState => {
        if (old === true) {
          if (next) return true;
          const all: Record<string, boolean> = {};
          for (const r of table.getPrePaginationRowModel().flatRows)
            if (r.getCanExpand()) all[r.id] = true;
          delete all[row.id];
          return all;
        }
        if (!next) {
          const { [row.id]: _omit, ...rest } = old;
          return rest;
        }
        if (table.options.expandMode === 'single') {
          const keep: Record<string, boolean> = {};
          for (const p of row.getParentRows()) keep[p.id] = true;
          keep[row.id] = true;
          return keep;
        }
        return { ...old, [row.id]: true };
      });
    },
  };
  Object.assign(proto, expansionProto);

  table.setExpanded = (u) => setSlice('expanded', u);
  table.resetExpanded = (d) => resetSlice('expanded', d);
  table.getIsAllRowsExpanded = () => {
    const expanded = table.getState().expanded;
    if (expanded === true) return true;
    const rows = table.getPrePaginationRowModel().flatRows.filter((r) => r.getCanExpand());
    return rows.length > 0 && rows.every((r) => expanded[r.id] === true);
  };
  table.getIsSomeRowsExpanded = () => {
    const expanded = table.getState().expanded;
    return expanded === true || Object.values(expanded).some(Boolean);
  };
  table.getCanSomeRowsExpand = () =>
    table.getPrePaginationRowModel().flatRows.some((r) => r.getCanExpand());
  table.toggleAllRowsExpanded = (value) => {
    const next = value ?? !table.getIsAllRowsExpanded();
    setSlice('expanded', next ? true : {});
  };
  table.getRowChildrenStatus = (id) => ds.getChildrenStatus(id);

  /* ── grouping ─────────────────────────────────────────────────────── */

  table.setGrouping = (u) => setSlice('grouping', u);
  table.resetGrouping = (d) => resetSlice('grouping', d);

  /* ── column visibility / order / pinning / sizing ─────────────────── */

  table.setColumnVisibility = (u) => setSlice('columnVisibility', u);
  table.resetColumnVisibility = (d) => resetSlice('columnVisibility', d);
  table.toggleAllColumnsVisible = (value) => {
    const next = value ?? !table.getIsAllColumnsVisible();
    setSlice('columnVisibility', (old) => {
      const vis = { ...old };
      for (const c of table.getAllLeafColumns()) {
        if (c.getCanHide()) vis[c.id] = next;
      }
      return vis;
    });
  };
  table.getIsAllColumnsVisible = () => table.getAllLeafColumns().every((c) => c.getIsVisible());
  table.getIsSomeColumnsVisible = () => table.getAllLeafColumns().some((c) => c.getIsVisible());

  table.setColumnOrder = (u) => setSlice('columnOrder', u);
  table.resetColumnOrder = (d) => resetSlice('columnOrder', d);
  table.moveColumn = (id, toIndex) => {
    const column = table.getColumn(id);
    if (!column?.getCanOrder()) return;
    const ids = table.getAllLeafColumns().map((c) => c.id);
    const from = ids.indexOf(id);
    if (from === -1) return;
    ids.splice(from, 1);
    const target = Math.max(0, Math.min(toIndex, ids.length));
    ids.splice(target, 0, id);
    setSlice('columnOrder', ids);
  };

  table.setColumnPinning = (u) => setSlice('columnPinning', u);
  table.resetColumnPinning = (d) => resetSlice('columnPinning', d);
  table.getIsSomeColumnsPinned = (position) => {
    const p = table.getEffectiveColumnPinning();
    return position ? p[position].length > 0 : p.left.length > 0 || p.right.length > 0;
  };

  table.setColumnSizing = (u) => setSlice('columnSizing', u);
  table.setColumnSizingInfo = (u) => setSlice('columnSizingInfo', u);
  table.resetColumnSizing = (d) => resetSlice('columnSizing', d);
  table.getTotalSize = () => table.getVisibleLeafColumns().reduce((sum, c) => sum + c.getSize(), 0);
  table.autosizeColumn = (id, measuredWidth) => {
    if (measuredWidth === undefined) {
      const col = table.getColumn(id);
      const width = parsePx(col?.columnDef.width);
      if (col && width !== undefined) setSlice('columnSizing', (old) => ({ ...old, [id]: width }));
      return;
    }
    setSlice('columnSizing', (old) => ({ ...old, [id]: Math.round(measuredWidth) }));
  };
  table.autosizeAllColumns = (measure) => {
    setSlice('columnSizing', (old) => {
      const next = { ...old };
      for (const c of table.getVisibleLeafColumns()) {
        const w = measure?.(c.id);
        if (w !== undefined && c.getCanResize()) next[c.id] = Math.round(w);
      }
      return next;
    });
  };

  /* ── row pinning ──────────────────────────────────────────────────── */

  Object.assign(proto, {
    getIsPinned(this: Row<TData>) {
      const { top, bottom } = table.getState().rowPinning;
      return top.includes(this.id) ? 'top' : bottom.includes(this.id) ? 'bottom' : false;
    },
    getCanPin(this: Row<TData>) {
      return resolveFlag(table.options.enableRowPinning, this, false);
    },
    pin(this: Row<TData>, position: 'top' | 'bottom' | false) {
      const id = this.id;
      setSlice('rowPinning', (old) => ({
        top:
          position === 'top'
            ? [...old.top.filter((r) => r !== id), id]
            : old.top.filter((r) => r !== id),
        bottom:
          position === 'bottom'
            ? [...old.bottom.filter((r) => r !== id), id]
            : old.bottom.filter((r) => r !== id),
      }));
    },
  });
  table.setRowPinning = (u) => setSlice('rowPinning', u);
  table.resetRowPinning = (d) => resetSlice('rowPinning', d);
  const pinnedRows = (ids: string[]) => {
    const keep = table.options.keepPinnedRows ?? true;
    return ids
      .map((id) => (keep ? table.getRow(id, true) : table.getRowModel().rowsById[id]))
      .filter((r): r is Row<TData> => !!r);
  };
  table.getTopRows = () => pinnedRows(table.getState().rowPinning.top);
  table.getBottomRows = () => pinnedRows(table.getState().rowPinning.bottom);
  table.getCenterRows = () => {
    const { top, bottom } = table.getState().rowPinning;
    if (!top.length && !bottom.length) return table.getRowModel().rows;
    const pinned = new Set([...top, ...bottom]);
    return table.getRowModel().rows.filter((r) => !pinned.has(r.id));
  };

  /* ── density ──────────────────────────────────────────────────────── */

  const DENSITIES: Density[] = ['compact', 'standard', 'comfortable'];
  table.setDensity = (u) => setSlice('density', u);
  table.toggleDensity = () =>
    setSlice('density', (d) => DENSITIES[(DENSITIES.indexOf(d) + 1) % DENSITIES.length]!);

  /* ── export ───────────────────────────────────────────────────────── */

  table.exportCsv = async (opts = {}) => {
    const scope = opts.scope ?? 'page';
    const columns = opts.columns
      ? opts.columns.map((id) => table.getColumn(id)).filter((c): c is Column<TData> => !!c)
      : table.getVisibleLeafColumns();
    let rows: Row<TData>[];
    if (scope === 'selected') rows = table.getSelectedRowModel().rows;
    else if (scope === 'all') {
      if (table.options.dataSource && table.options.manualPagination) {
        const all = await ds.fetchAll(
          (table.options as { exportChunkSize?: number }).exportChunkSize ?? 1000,
          (table.options as { exportMaxRows?: number }).exportMaxRows ?? 10000,
          opts.onProgress,
          opts.signal,
        );
        rows = buildCoreRowModel(table, proto, all).rows;
      } else rows = table.getPrePaginationRowModel().flatRows.filter((r) => !r.getIsGrouped());
    } else rows = table.getRowModel().rows;
    opts.onProgress?.(1);
    return rowsToCsv(rows, exportableColumns(columns), opts);
  };
  table.copyToClipboard = async (opts = {}) => {
    const text = await table.exportCsv({ ...opts, delimiter: opts.delimiter ?? '\t', bom: false });
    const clipboard = (
      globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } }
    ).navigator?.clipboard;
    if (!clipboard) throw new Error('Clipboard API is not available.');
    await clipboard.writeText(text);
  };

  /* ── view hooks ───────────────────────────────────────────────────── */

  table.focusCell = (rowId, columnId) => table._view.focusCell?.(rowId, columnId);
  table.scrollToRow = (rowId, opts) => table._view.scrollToRow?.(rowId, opts);

  for (const f of table._features) f.createTable?.(table);
  if (
    process.env.NODE_ENV !== 'production' &&
    table.options.enableRowSelection &&
    !table.options.getRowId
  ) {
    warnOnce('`getRowId` is strongly recommended with row selection (ids default to row indexes).');
  }
  return table;
}

/** `true` when the value is a pagination state with the same page, size and cursor. */
export function isSamePagination(a: PaginationState, b: PaginationState): boolean {
  return (
    a.pageIndex === b.pageIndex &&
    a.pageSize === b.pageSize &&
    (a.cursor ?? null) === (b.cursor ?? null)
  );
}
