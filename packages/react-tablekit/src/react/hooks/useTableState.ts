import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { TableInstance, TableState } from '../../core/types';

/**
 * Subscribes to a slice of table state; the component re-renders only when the selected value
 * changes (fine-grained subscriptions).
 *
 * @example
 * ```ts
 * const pagination = useTableState(table, (s) => s.pagination);
 * ```
 */
export function useTableState<TData, T>(
  table: TableInstance<TData>,
  selector: (state: TableState, table: TableInstance<TData>) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const last = useRef<{
    table: TableInstance<TData>;
    options: TableInstance<TData>['options'];
    version: number;
    selector: typeof selector;
    value: T;
  } | null>(null);
  const getSnapshot = useCallback(() => {
    const version = table._getVersion();
    const previous = last.current;
    // React reads a snapshot repeatedly between notifications. Selectors may allocate an
    // object, so reuse their result until an input changes instead of triggering a render loop.
    if (
      previous?.table === table &&
      previous.options === table.options &&
      previous.version === version &&
      previous.selector === selector
    ) {
      return previous.value;
    }
    const next = selector(table.getState(), table);
    const value = previous && isEqual(previous.value, next) ? previous.value : next;
    last.current = { table, options: table.options, version, selector, value };
    return value;
  }, [table, selector, isEqual]);
  return useSyncExternalStore(table.subscribe, getSnapshot, getSnapshot);
}
