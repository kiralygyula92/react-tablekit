import { createTable } from '../core/createTable';
import { toText } from '../core/text';
import type {
  AnyColumnDef,
  DataSource,
  DataSourceResult,
  FacetResult,
  Row,
  TableOptions,
  TableQuery,
} from '../core/types';

/** The request handed to a custom `fetcher` by {@link createRestDataSource}. */
export interface RestRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  /** The mapped query (JSON body for POST/PUT/PATCH, search params for GET). */
  body: unknown;
  headers: Record<string, string>;
  signal: AbortSignal;
}

/** Options for {@link createRestDataSource}. */
export interface RestDataSourceOptions<TData, TResponse> {
  url: string;
  /** @default 'GET' */
  method?: RestRequest['method'];
  headers?: Record<string, string>;
  /** Maps the table query to the request body (or search params for GET). */
  mapQuery: (query: TableQuery) => unknown;
  /** Maps the JSON response to rows/counts. */
  mapResult: (response: TResponse, query: TableQuery) => DataSourceResult<TData>;
  /** Inject your own HTTP client (ky, axios, an API client with auth headers…). */
  fetcher?: (request: RestRequest) => Promise<TResponse>;
}

function toSearchParams(value: unknown): string {
  const params = new URLSearchParams();
  const add = (key: string, v: unknown) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'object') params.append(key, JSON.stringify(v));
    else params.append(key, toText(v));
  };
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) add(k, v);
  }
  return params.toString();
}

/**
 * A data source for REST endpoints with page/size/sort/search params (03 §5.3).
 *
 * @example
 * ```ts
 * const customers = createRestDataSource<Customer, SearchResponse>({
 *   url: '/api/customers/search',
 *   method: 'POST',
 *   mapQuery: (q) => ({ queryCriteria: q.globalFilter, listingCriteria: { pageNumber: q.pagination.pageIndex, pageSize: q.pagination.pageSize } }),
 *   mapResult: (json) => ({ rows: json.items, rowCount: json.totalItemCount }),
 * });
 * ```
 */
export function createRestDataSource<TData, TResponse = unknown>(
  options: RestDataSourceOptions<TData, TResponse>,
): DataSource<TData> {
  const method = options.method ?? 'GET';
  const defaultFetcher = async (req: RestRequest): Promise<TResponse> => {
    const isGet = req.method === 'GET';
    const qs = isGet ? toSearchParams(req.body) : '';
    const url = qs ? `${req.url}${req.url.includes('?') ? '&' : '?'}${qs}` : req.url;
    const init: RequestInit = {
      method: req.method,
      headers: isGet ? req.headers : { 'content-type': 'application/json', ...req.headers },
      signal: req.signal,
    };
    if (!isGet) init.body = JSON.stringify(req.body);
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    return (await res.json()) as TResponse;
  };
  const fetcher = options.fetcher ?? defaultFetcher;
  return {
    async fetch(query, { signal }) {
      const response = await fetcher({
        url: options.url,
        method,
        body: options.mapQuery(query),
        headers: options.headers ?? {},
        signal,
      });
      return options.mapResult(response, query);
    },
  };
}

/** Options for {@link createLocalDataSource}. */
export interface LocalDataSourceOptions<TData> {
  /** Columns defining filter/sort semantics (use the same columns as the table). */
  columns: AnyColumnDef<TData>[];
  /** Row identity, so selection and expansion survive refetches. */
  getRowId?: TableOptions<TData>['getRowId'];
  /** Tree data: the children of a row. */
  getSubRows?: TableOptions<TData>['getSubRows'];
  /** Simulated latency: fixed ms or a `[min, max]` range. @default 0 */
  latencyMs?: number | [number, number];
  /** Probability (0–1) that a request fails. @default 0 */
  failRate?: number;
  /** Extra engine options (e.g. `globalFilterMatch`, custom `filterFns`). */
  engineOptions?: Partial<TableOptions<TData>>;
  /** Random source (for deterministic tests). @default Math.random */
  random?: () => number;
  /** Serve lazy children through `fetchChildren` instead of nested `getSubRows` rows. */
  lazyChildren?: boolean;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return signal.aborted
      ? Promise.reject(new DOMException('Aborted', 'AbortError'))
      : Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * An in-memory array that *behaves like a server* (latency, failures, abort). It reuses the
 * engine's own filter/sort functions, so client mode and simulated server mode return identical
 * rows for the same query (03 §5.3).
 */
export function createLocalDataSource<TData>(
  rows: TData[] | (() => TData[]),
  options: LocalDataSourceOptions<TData>,
): DataSource<TData> {
  const random = options.random ?? Math.random;
  const getRows = typeof rows === 'function' ? rows : () => rows;
  const engine = createTable<TData>({
    data: getRows(),
    columns: options.columns,
    ...(options.getRowId ? { getRowId: options.getRowId } : {}),
    ...(options.getSubRows && !options.lazyChildren ? { getSubRows: options.getSubRows } : {}),
    searchDebounceMs: 0,
    filterDebounceMs: 0,
    autoResetPageIndex: false,
    enablePagination: false,
    enableGrouping: true,
    ...options.engineOptions,
  });
  const serverToColumnId = () => {
    const sort = new Map<string, string>();
    const filter = new Map<string, string>();
    for (const c of engine.getAllFlatColumns()) {
      sort.set(c.columnDef.sortServerKey ?? c.id, c.id);
      filter.set(c.columnDef.filterServerKey ?? c.id, c.id);
    }
    return { sort, filter };
  };

  const latency = () => {
    const l = options.latencyMs ?? 0;
    return typeof l === 'number' ? l : Math.round(l[0] + random() * (l[1] - l[0]));
  };

  /** Applies the query (minus pagination) to the engine and returns the matching top-level rows. */
  const run = (query: TableQuery): Row<TData>[] => {
    const data = getRows();
    if (engine.options.data !== data) engine.setOptions((o) => ({ ...o, data }));
    const keys = serverToColumnId();
    engine.setState((s) => ({
      ...s,
      sorting: query.sorting.map((x) => ({ ...x, id: keys.sort.get(x.id) ?? x.id })),
      columnFilters: query.columnFilters.map((f) => ({ ...f, id: keys.filter.get(f.id) ?? f.id })),
      globalFilter: query.globalFilter,
      grouping: query.grouping,
    }));
    engine.flushQuery();
    return engine.getSortedRowModel().rows;
  };

  const simulate = async (signal: AbortSignal) => {
    await wait(latency(), signal);
    if ((options.failRate ?? 0) > 0 && random() < (options.failRate ?? 0)) {
      throw new Error('Simulated server error');
    }
  };

  return {
    async fetch(query, { signal }) {
      await simulate(signal);
      const matching = run(query);
      const { pageIndex, pageSize, cursor } = query.pagination;
      const start = cursor ? Number(cursor) : pageIndex * pageSize;
      const page = matching.slice(start, start + pageSize);
      const end = start + page.length;
      return {
        rows: page.map((r) => r.original),
        rowCount: matching.length,
        nextCursor: end < matching.length ? String(end) : null,
        prevCursor: start > 0 ? String(Math.max(0, start - pageSize)) : null,
      };
    },
    async fetchFacets(columnId, query, { signal }): Promise<FacetResult> {
      await simulate(signal);
      run({ ...query, columnFilters: query.columnFilters.filter((f) => f.id !== columnId) });
      const id = serverToColumnId().filter.get(columnId) ?? columnId;
      const column = engine.getColumn(id);
      if (!column) return { type: 'values', values: [] };
      const variant = column.getFilterVariant();
      if (variant === 'range' || variant === 'rangeSlider' || variant === 'number') {
        const mm = column.getFacetedMinMaxValues();
        return { type: 'range', min: mm?.[0] ?? 0, max: mm?.[1] ?? 0 };
      }
      const values = [...column.getFacetedUniqueValues()]
        .filter(([v]) => v !== undefined && v !== null && v !== '')
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => String(a.value).localeCompare(String(b.value)));
      return { type: 'values', values };
    },
    async fetchAllIds(query, { signal }) {
      await simulate(signal);
      return run(query).map((r) => r.id);
    },
    ...(options.getSubRows && options.lazyChildren
      ? {
          async fetchChildren(
            row: Row<TData>,
            _query: TableQuery,
            { signal }: { signal: AbortSignal },
          ) {
            await simulate(signal);
            return options.getSubRows?.(row.original, row.index) ?? [];
          },
        }
      : {}),
  };
}
