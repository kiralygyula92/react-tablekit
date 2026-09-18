import { useEffect, useRef } from 'react';
import type { ColumnFiltersState, SortingState, TableInstance, TableState } from '../core/types';
import type { SyncStateOptions } from './types';

/* ────────────────────────────────────────────────────────────────────────────
 * URL format: ?tk.page=2&tk.size=25&tk.sort=name.asc&tk.q=smith&tk.f.status=active,pending
 * ──────────────────────────────────────────────────────────────────────────── */

/** State slices that get a compact, stable URL spelling; anything else falls back to JSON. */
const SHORT_KEYS: Partial<Record<keyof TableState, string>> = {
  pagination: 'page',
  sorting: 'sort',
  globalFilter: 'q',
  columnFilters: 'f',
  grouping: 'group',
  density: 'density',
  columnVisibility: 'hidden',
  columnOrder: 'order',
  columnPinning: 'pin',
};

const encodeSorting = (sorting: SortingState) =>
  sorting.map((s) => `${s.id}.${s.desc ? 'desc' : 'asc'}`).join(',');

const decodeSorting = (value: string): SortingState =>
  value
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const index = part.lastIndexOf('.');
      const id = index === -1 ? part : part.slice(0, index);
      return { id, desc: part.slice(index + 1) === 'desc' };
    });

const encodeFilterValue = (value: unknown): string =>
  Array.isArray(value)
    ? value.map((v) => String(v ?? '')).join(',')
    : typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : String(value);

function decodeFilterValue(raw: string): unknown {
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  if (raw === 'true' || raw === 'false') return raw === 'true';
  if (raw.includes(','))
    return raw.split(',').map((v) => (Number.isNaN(Number(v)) ? v : Number(v)));
  return Number.isNaN(Number(raw)) || raw.trim() === '' ? raw : Number(raw);
}

/** Writes the selected state slices into search params. */
export function encodeState(
  state: Partial<TableState>,
  keys: (keyof TableState)[],
  prefix = 'tk',
): URLSearchParams {
  const params = new URLSearchParams();
  const put = (name: string, value: string) => {
    if (value !== '') params.set(`${prefix}.${name}`, value);
  };
  for (const key of keys) {
    const value = state[key];
    if (value === undefined) continue;
    switch (key) {
      case 'pagination': {
        const pagination = value as TableState['pagination'];
        if (pagination.pageIndex > 0) put('page', String(pagination.pageIndex + 1));
        put('size', String(pagination.pageSize));
        break;
      }
      case 'sorting':
        put('sort', encodeSorting(value as SortingState));
        break;
      case 'globalFilter':
        put('q', typeof value === 'string' ? value : '');
        break;
      case 'columnFilters':
        for (const filter of value as ColumnFiltersState) {
          put(`f.${filter.id}`, encodeFilterValue(filter.value));
        }
        break;
      case 'grouping':
        put('group', (value as string[]).join(','));
        break;
      case 'density':
        put('density', typeof value === 'string' ? value : '');
        break;
      case 'columnVisibility':
        put(
          'hidden',
          Object.entries(value as Record<string, boolean>)
            .filter(([, visible]) => !visible)
            .map(([id]) => id)
            .join(','),
        );
        break;
      case 'columnOrder':
        put('order', (value as string[]).join(','));
        break;
      case 'columnPinning': {
        const pinning = value as TableState['columnPinning'];
        put('pinL', pinning.left.join(','));
        put('pinR', pinning.right.join(','));
        break;
      }
      default:
        put(SHORT_KEYS[key] ?? key, JSON.stringify(value));
    }
  }
  return params;
}

/** Reads the state slices back out of search params. */
export function decodeState(search: string, prefix = 'tk'): Partial<TableState> {
  const params = new URLSearchParams(search);
  const get = (name: string) => params.get(`${prefix}.${name}`);
  const state: Partial<TableState> = {};

  const page = get('page');
  const size = get('size');
  if (page !== null || size !== null) {
    state.pagination = {
      pageIndex: page === null ? 0 : Math.max(0, Number(page) - 1),
      pageSize: size === null ? 10 : Number(size),
    };
  }
  const sort = get('sort');
  if (sort !== null) state.sorting = decodeSorting(sort);
  const q = get('q');
  if (q !== null) state.globalFilter = q;

  const filters: ColumnFiltersState = [];
  for (const [name, raw] of params) {
    if (!name.startsWith(`${prefix}.f.`)) continue;
    filters.push({ id: name.slice(`${prefix}.f.`.length), value: decodeFilterValue(raw) });
  }
  if (filters.length > 0) state.columnFilters = filters;

  const group = get('group');
  if (group !== null) state.grouping = group.split(',').filter(Boolean);
  const density = get('density');
  if (density !== null) state.density = density as TableState['density'];
  const hidden = get('hidden');
  if (hidden !== null) {
    state.columnVisibility = Object.fromEntries(
      hidden
        .split(',')
        .filter(Boolean)
        .map((id) => [id, false]),
    );
  }
  const order = get('order');
  if (order !== null) state.columnOrder = order.split(',').filter(Boolean);
  const pinLeft = get('pinL');
  const pinRight = get('pinR');
  if (pinLeft !== null || pinRight !== null) {
    state.columnPinning = {
      left: pinLeft?.split(',').filter(Boolean) ?? [],
      right: pinRight?.split(',').filter(Boolean) ?? [],
    };
  }
  return state;
}

/* ── storage ──────────────────────────────────────────────────────────── */

interface StoredPayload {
  version: number;
  state: Partial<TableState>;
}

function readStorage(options: NonNullable<SyncStateOptions['storage']>): Partial<TableState> {
  const store = options.storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  if (!store) return {};
  try {
    const raw = store.getItem(options.key);
    if (raw === null) return {};
    const payload = JSON.parse(raw) as StoredPayload;
    const version = options.version ?? 0;
    if (payload.version !== version) {
      // Older payload: migrate it, or drop it when there is no migration.
      return options.migrate ? options.migrate(payload.state, payload.version) : {};
    }
    return payload.state;
  } catch {
    return {};
  }
}

function writeStorage(
  options: NonNullable<SyncStateOptions['storage']>,
  state: Partial<TableState>,
): void {
  const store = options.storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  if (!store) return;
  try {
    const payload: StoredPayload = { version: options.version ?? 0, state };
    store.setItem(options.key, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable (private mode, quota); persistence is best-effort.
  }
}

const pick = (state: TableState, keys: (keyof TableState)[]): Partial<TableState> =>
  Object.fromEntries(keys.map((key) => [key, state[key]]));

const DEFAULT_URL_KEYS: (keyof TableState)[] = [
  'pagination',
  'sorting',
  'globalFilter',
  'columnFilters',
  'grouping',
];
const DEFAULT_STORAGE_KEYS: (keyof TableState)[] = [
  'columnVisibility',
  'columnOrder',
  'columnSizing',
  'columnPinning',
  'density',
];

/** A router adapter for `useRouterSync`. */
export interface RouterSyncAdapter {
  /** Returns the router's current search string (with or without the leading `?`). */
  getSearch: () => string;
  /** Writes the search string back through the router. */
  setSearch: (search: string, mode: 'push' | 'replace') => void;
}

/**
 * Persists table state to the URL and/or storage. On mount the URL wins over storage,
 * which wins over `initialState`.
 *
 * `DataTable` calls this for you when `syncState` is set; call it directly only for a table you
 * built with `createTable`.
 */
export function useSyncState<TData>(
  table: TableInstance<TData>,
  options: SyncStateOptions | undefined,
  router?: RouterSyncAdapter,
): void {
  const applied = useRef(false);
  const optionsRef = useRef(options);
  const routerRef = useRef(router);
  // Kept fresh in an effect (never during render) and declared first, so the effects below see
  // the latest values.
  useEffect(() => {
    optionsRef.current = options;
    routerRef.current = router;
  });

  // Restore once, before the first paint, so the table never renders the wrong page first.
  useEffect(() => {
    if (applied.current || !optionsRef.current) return;
    applied.current = true;
    const { url, storage } = optionsRef.current;
    const fromStorage = storage ? readStorage(storage) : {};
    const search = routerRef.current
      ? routerRef.current.getSearch()
      : typeof window === 'undefined'
        ? ''
        : window.location.search;
    const fromUrl = url ? decodeState(search, url.prefix) : {};
    const restored = { ...fromStorage, ...fromUrl };
    if (Object.keys(restored).length > 0) {
      table.setState((prev) => ({ ...prev, ...restored }));
    }
  }, [table]);

  // Persist on every change.
  useEffect(() => {
    if (!options) return;
    const write = () => {
      const state = table.getState();
      const { url, storage } = optionsRef.current ?? {};
      if (storage) writeStorage(storage, pick(state, storage.keys ?? DEFAULT_STORAGE_KEYS));
      if (url) {
        const params = encodeState(state, url.keys ?? DEFAULT_URL_KEYS, url.prefix);
        const search = params.toString();
        const currentRouter = routerRef.current;
        if (currentRouter) {
          if (currentRouter.getSearch().replace(/^\?/, '') !== search) {
            currentRouter.setSearch(search ? `?${search}` : '', url.mode ?? 'replace');
          }
        } else if (typeof window !== 'undefined') {
          const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
          if (
            next !== `${window.location.pathname}${window.location.search}${window.location.hash}`
          ) {
            if ((url.mode ?? 'replace') === 'push') window.history.pushState(null, '', next);
            else window.history.replaceState(null, '', next);
          }
        }
      }
    };
    write();
    return table.subscribe(write);
  }, [table, options]);
}

/**
 * Plugs `syncState.url` into a router instead of the History API, for React Router,
 * Next.js and friends.
 *
 * @example
 * ```tsx
 * const [params, setParams] = useSearchParams();
 * useRouterSync(table, {
 *   getSearch: () => params.toString(),
 *   setSearch: (search, mode) => setParams(search, { replace: mode === 'replace' }),
 * });
 * ```
 */
export function useRouterSync<TData>(
  table: TableInstance<TData>,
  adapter: RouterSyncAdapter,
  options?: SyncStateOptions,
): void {
  useSyncState(table, options ?? { url: {} }, adapter);
}
