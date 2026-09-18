import { useContext, useEffect, useState } from 'react';
import type { DataSource, DataStatus, Row, TableInstance } from '../../core/types';
import { warnOnce } from '../../core/utils';
import { lightTheme } from '../../themes';
import type { Breakpoint } from '../../themes/types';
import { DefaultsContext, ViewContext } from '../context';
import { useTableState } from './useTableState';
import { useViewportBreakpoint } from './useBreakpoint';

export { useDataTable } from './useDataTable';
export { useTableState } from './useTableState';
export {
  useVirtualRows,
  type UseVirtualRowsOptions,
  type VirtualRow,
  type VirtualRowsResult,
} from './useVirtualRows';
export {
  useRouterSync,
  useSyncState,
  encodeState,
  decodeState,
  type RouterSyncAdapter,
} from '../syncState';

/** Live server-mode status returned by {@link useDataSource}. */
export interface DataSourceState<TData> extends DataStatus {
  /** The rows currently loaded from the server. */
  rows: TData[];
  /** Total matching rows reported by the server (`-1` = unknown). */
  rowCount: number;
  /** Refetches the current query. */
  refresh: () => Promise<void>;
}

/**
 * Headless access to server mode: the rows, counts and loading flags of a table driven
 * by `dataSource`. Create the table with the same `dataSource` (`useDataTable({ dataSource })`).
 */
export function useDataSource<TData>(
  dataSource: DataSource<TData>,
  opts: { table: TableInstance<TData> },
): DataSourceState<TData> {
  const { table } = opts;
  if (table.options.dataSource !== dataSource) {
    warnOnce('useDataSource: pass the same `dataSource` to useDataTable; the table owns fetching.');
  }
  const status = useTableState(
    table,
    (_s, t) => t.getDataStatus(),
    (a, b) =>
      a.loading === b.loading &&
      a.fetching === b.fetching &&
      a.error === b.error &&
      a.lastUpdated === b.lastUpdated,
  );
  const rows = useTableState(table, (_s, t) => t.getCoreRowModel());
  return {
    ...status,
    rows: rows.rows.map((r) => r.original),
    rowCount: table.getRowCount(),
    refresh: () => table.refresh(),
  };
}

interface PanelEntry {
  data?: unknown;
  error?: unknown;
  promise?: Promise<void>;
}
const panelCaches = new WeakMap<object, Map<string, PanelEntry>>();

/**
 * Loads data for a detail panel, cached per row id and loader.
 *
 * @example
 * ```tsx
 * const { data, loading } = useDetailPanelData(row, (r) => fetchOrders(r.original.id));
 * ```
 */
export function useDetailPanelData<TData, TResult>(
  row: Row<TData>,
  loader: (row: Row<TData>) => Promise<TResult>,
): { data: TResult | undefined; loading: boolean; error: unknown } {
  let cache = panelCaches.get(loader);
  if (!cache) {
    cache = new Map();
    panelCaches.set(loader, cache);
  }
  const entry = cache.get(row.id);
  const [, force] = useState(0);
  useEffect(() => {
    const c = panelCaches.get(loader);
    if (!c) return;
    let e = c.get(row.id);
    if (!e) {
      e = {};
      c.set(row.id, e);
    }
    if (e.data === undefined && e.error === undefined && !e.promise) {
      const current = e;
      current.promise = loader(row).then(
        (data) => {
          current.data = data;
        },
        (error: unknown) => {
          current.error = error;
        },
      );
    }
    let alive = true;
    void e.promise?.then(() => alive && force((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [loader, row]);
  return {
    data: entry?.data as TResult | undefined,
    loading: !entry || (entry.data === undefined && entry.error === undefined),
    error: entry?.error,
  };
}

/** The current breakpoint, using the theme's breakpoints. */
export function useBreakpoint(): Breakpoint {
  const view = useContext(ViewContext);
  const defaults = useContext(DefaultsContext);
  const fromTable = useViewportBreakpoint(
    view?.theme.breakpoints ?? lightTheme.breakpoints,
    defaults.responsive?.ssrBreakpoint ?? 'lg',
  );
  return view?.breakpoint ?? fromTable;
}
