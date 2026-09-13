import type {
  DataSourceResult,
  DataStatus,
  FacetResult,
  QueryChangeReason,
  Row,
  TableInstance,
  TableQuery,
  Updater,
} from './types';
import { deepEqual, functionalUpdate } from './utils';

/** What the controller needs from the table. */
export interface DataSourceHost<TData> {
  table: TableInstance<TData>;
  /** The public (server-key mapped) query. */
  getQuery(): TableQuery;
  notify(): void;
  /** Adopts a server-echoed query into state without triggering a refetch. */
  adoptQuery(partial: Partial<TableQuery>): void;
}

interface ChildrenEntry<TData> {
  status: 'loading' | 'loaded' | 'error';
  rows: TData[];
  error: unknown;
  queryKey: string;
}

const isAbortError = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError';

/** Serializes the parts of a query that change the result set (not pagination). */
export function queryKey(query: TableQuery): string {
  return JSON.stringify([query.sorting, query.globalFilter, query.columnFilters, query.grouping]);
}

/**
 * Owns fetching for `dataSource` (03 §5.1): initial load vs refetch, abort of stale requests,
 * race guard, in-flight dedupe, server echo, out-of-range correction, polling, errors and
 * optimistic local mutations.
 */
export function createDataSourceController<TData>(host: DataSourceHost<TData>) {
  const { table } = host;
  let rows: TData[] = [];
  let rowCount: number | undefined;
  let pageCount: number | undefined;
  let nextCursor: string | null | undefined;
  let prevCursor: string | null | undefined;
  const facets = new Map<string, FacetResult>();
  const facetRequests = new Map<string, Promise<void>>();
  let status: DataStatus = {
    loading: false,
    fetching: false,
    error: undefined,
    lastQuery: null,
    lastUpdated: null,
  };
  let seq = 0;
  let controller: AbortController | undefined;
  let inflight: { query: TableQuery; promise: Promise<void> } | undefined;
  let lastCompleted: { query: TableQuery; at: number } | undefined;
  let mounted = false;
  let correctingRange = false;
  let pendingReason: QueryChangeReason | undefined;
  const children = new Map<string, ChildrenEntry<TData>>();
  const childControllers = new Map<string, AbortController>();

  const opts = () => table.options;

  function setStatus(patch: Partial<DataStatus>) {
    const next = { ...status, ...patch };
    if (deepEqual(next, status)) return;
    status = next;
    opts().onStatusChange?.(status);
  }

  function run(query: TableQuery, reason: QueryChangeReason, force = false): Promise<void> {
    const ds = opts().dataSource;
    if (!ds) return Promise.resolve();
    if (!mounted) {
      pendingReason = reason;
      return Promise.resolve();
    }
    if (!force && inflight && deepEqual(inflight.query, query)) return inflight.promise;
    const dedupeMs = opts().dedupeMs ?? 0;
    if (
      !force &&
      dedupeMs > 0 &&
      lastCompleted &&
      deepEqual(lastCompleted.query, query) &&
      Date.now() - lastCompleted.at < dedupeMs
    ) {
      return Promise.resolve();
    }

    controller?.abort();
    const ac = new AbortController();
    controller = ac;
    const id = ++seq;
    const keep = opts().keepPreviousData ?? true;
    const hasData = status.lastUpdated !== null;
    if (!keep) rows = [];
    setStatus({ loading: !hasData || !keep, fetching: hasData && keep });
    host.notify();

    const promise = (async () => {
      try {
        const result: DataSourceResult<TData> = await ds.fetch(query, {
          signal: ac.signal,
          reason,
        });
        if (id !== seq || ac.signal.aborted) return;
        apply(result, query);
      } catch (error) {
        if (id !== seq || ac.signal.aborted || isAbortError(error)) return;
        setStatus({ loading: false, fetching: false, error });
        opts().onError?.(error, query);
        host.notify();
      } finally {
        if (id === seq) inflight = undefined;
      }
    })();
    inflight = { query, promise };
    return promise;
  }

  /**
   * Whether pages accumulate: `appendPages`, or a `loadMore` / `infinite` pagination variant
   * (including inside a responsive value).
   */
  function appendsPages(): boolean {
    const o = opts() as {
      appendPages?: boolean;
      pagination?: { variant?: unknown };
    };
    if (o.appendPages !== undefined) return o.appendPages;
    const variant = o.pagination?.variant;
    const values =
      typeof variant === 'string'
        ? [variant]
        : variant && typeof variant === 'object'
          ? Object.values(variant)
          : [];
    return values.some((v) => v === 'loadMore' || v === 'infinite');
  }

  /** True when two queries differ only by page (queryKey already ignores pagination). */
  const sameExceptPage = (a: TableQuery, b: TableQuery) => queryKey(a) === queryKey(b);

  function apply(result: DataSourceResult<TData>, query: TableQuery) {
    // `loadMore` / `infinite` accumulate pages instead of replacing them (03 §6, 05 §4.1).
    const previous = lastCompleted?.query;
    const appending =
      appendsPages() &&
      previous !== undefined &&
      query.pagination.pageIndex > previous.pagination.pageIndex &&
      sameExceptPage(previous, query);
    if (appending) {
      const seen = new Set(rows.map((r, i) => opts().getRowId?.(r, i) ?? String(i)));
      const added = result.rows.filter((r, i) => !seen.has(opts().getRowId?.(r, i) ?? String(i)));
      rows = [...rows, ...added];
    } else {
      rows = result.rows;
    }
    rowCount = result.rowCount ?? (result.pageCount === undefined ? -1 : undefined);
    pageCount = result.pageCount;
    nextCursor = result.nextCursor;
    prevCursor = result.prevCursor;
    if (result.facets) for (const [k, v] of Object.entries(result.facets)) facets.set(k, v);
    lastCompleted = { query, at: Date.now() };
    setStatus({
      loading: false,
      fetching: false,
      error: undefined,
      lastQuery: query,
      lastUpdated: Date.now(),
    });
    if (result.query) host.adoptQuery(result.query);

    // Page out of range (e.g. rows were deleted): move to the last page and refetch once.
    const pc = table.getPageCount();
    const pageIndex = table.getState().pagination.pageIndex;
    if (pc > 0 && pageIndex >= pc && !correctingRange) {
      correctingRange = true;
      table.setPageIndex(pc - 1);
    } else {
      correctingRange = false;
    }
    host.notify();
  }

  let interval: ReturnType<typeof setInterval> | undefined;
  let removeFocus: (() => void) | undefined;

  return {
    getRows: () => rows,
    getRowCount: () => rowCount,
    getPageCount: () => pageCount,
    getCursors: () => ({ next: nextCursor, prev: prevCursor }),
    getStatus: () => status,
    getFacets: (columnId: string) => facets.get(columnId),

    mount(): () => void {
      mounted = true;
      if (opts().fetchOnMount ?? true) {
        void run(host.getQuery(), pendingReason ?? 'refresh', true);
      } else if (pendingReason) {
        void run(host.getQuery(), pendingReason, true);
      }
      pendingReason = undefined;
      const ms = opts().refetchInterval;
      if (ms && ms > 0)
        interval = setInterval(() => void run(host.getQuery(), 'refresh', true), ms);
      if (opts().refetchOnWindowFocus && typeof window !== 'undefined') {
        const onFocus = () => {
          if (document.visibilityState !== 'hidden') void run(host.getQuery(), 'refresh', true);
        };
        window.addEventListener('focus', onFocus);
        removeFocus = () => window.removeEventListener('focus', onFocus);
      }
      return () => {
        mounted = false;
        controller?.abort();
        inflight = undefined;
        for (const c of childControllers.values()) c.abort();
        if (interval) clearInterval(interval);
        removeFocus?.();
        // A remount (StrictMode) must refetch: forget that a request was made.
        if (status.fetching || status.loading)
          setStatus({ fetching: false, loading: status.lastUpdated === null });
      };
    },

    onQueryChange(query: TableQuery, reason: QueryChangeReason) {
      // Lazy children are cached per query: drop them when the result set changes.
      if (reason !== 'pagination') {
        for (const [id, entry] of children)
          if (entry.queryKey !== queryKey(query)) children.delete(id);
      }
      void run(query, reason);
    },

    refresh: () => run(host.getQuery(), 'refresh', true),

    updateRow(id: string, updater: Updater<TData>) {
      const index = rows.findIndex((r, i) => (opts().getRowId?.(r, i) ?? String(i)) === id);
      if (index === -1) return;
      rows = rows.slice();
      rows[index] = functionalUpdate(updater, rows[index] as TData);
      host.notify();
    },
    removeRow(id: string) {
      const next = rows.filter((r, i) => (opts().getRowId?.(r, i) ?? String(i)) !== id);
      if (next.length === rows.length) return;
      rows = next;
      if (rowCount !== undefined && rowCount > 0) rowCount -= 1;
      host.notify();
    },
    insertRow(row: TData, index = 0) {
      rows = [...rows.slice(0, index), row, ...rows.slice(index)];
      if (rowCount !== undefined && rowCount >= 0) rowCount += 1;
      host.notify();
    },

    /* ── lazy children ─────────────────────────────────────────────── */
    getChildren(rowId: string): TData[] | undefined {
      const entry = children.get(rowId);
      return entry?.status === 'loaded' ? entry.rows : undefined;
    },
    getChildrenStatus(rowId: string) {
      const entry = children.get(rowId);
      return {
        loading: entry?.status === 'loading',
        error: entry?.status === 'error' ? entry.error : undefined,
      };
    },
    async loadChildren(row: Row<TData>, force = false) {
      const ds = opts().dataSource;
      if (!ds?.fetchChildren) return;
      const query = host.getQuery();
      const key = queryKey(query);
      const existing = children.get(row.id);
      if (!force && existing?.queryKey === key && existing.status !== 'error') return;
      childControllers.get(row.id)?.abort();
      const ac = new AbortController();
      childControllers.set(row.id, ac);
      children.set(row.id, { status: 'loading', rows: [], error: undefined, queryKey: key });
      host.notify();
      try {
        const result = await ds.fetchChildren(row, query, { signal: ac.signal });
        if (ac.signal.aborted) return;
        children.set(row.id, { status: 'loaded', rows: result, error: undefined, queryKey: key });
      } catch (error) {
        if (ac.signal.aborted || isAbortError(error)) return;
        children.set(row.id, { status: 'error', rows: [], error, queryKey: key });
      }
      host.notify();
    },
    getChildrenVersion: () => children,

    /* ── facets ────────────────────────────────────────────────────── */
    loadFacets(columnId: string): Promise<void> {
      const ds = opts().dataSource;
      if (!ds?.fetchFacets) return Promise.resolve();
      const query = host.getQuery();
      const key = `${columnId}|${queryKey(query)}`;
      const pending = facetRequests.get(key);
      if (pending) return pending;
      const ac = new AbortController();
      const promise = ds
        .fetchFacets(columnId, query, { signal: ac.signal })
        .then((result) => {
          facets.set(columnId, result);
          host.notify();
        })
        .catch((error: unknown) => {
          facetRequests.delete(key);
          if (!isAbortError(error)) opts().onError?.(error, query);
        });
      facetRequests.set(key, promise);
      return promise;
    },

    /** Fetches every matching row in chunks (server "export all"). */
    async fetchAll(
      chunkSize: number,
      maxRows: number,
      onProgress?: (p: number) => void,
      signal?: AbortSignal,
    ): Promise<TData[]> {
      const ds = opts().dataSource;
      if (!ds) return rows;
      const base = host.getQuery();
      const all: TData[] = [];
      let pageIndex = 0;
      let cursor: string | null | undefined = null;
      for (;;) {
        if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
        const ac = new AbortController();
        signal?.addEventListener('abort', () => ac.abort(), { once: true });
        const result: DataSourceResult<TData> = await ds.fetch(
          {
            ...base,
            pagination: { pageIndex, pageSize: chunkSize, ...(cursor !== null ? { cursor } : {}) },
          },
          { signal: ac.signal, reason: 'refresh' },
        );
        all.push(...result.rows);
        const total =
          result.rowCount !== undefined && result.rowCount >= 0
            ? Math.min(result.rowCount, maxRows)
            : maxRows;
        onProgress?.(Math.min(1, all.length / Math.max(1, total)));
        const more =
          result.nextCursor !== undefined
            ? result.nextCursor !== null
            : result.rows.length === chunkSize &&
              (result.rowCount === undefined ||
                result.rowCount < 0 ||
                all.length < result.rowCount);
        if (!more || all.length >= maxRows) break;
        cursor = result.nextCursor ?? null;
        pageIndex += 1;
      }
      return all.slice(0, maxRows);
    },
  };
}

export type DataSourceController<TData> = ReturnType<typeof createDataSourceController<TData>>;
