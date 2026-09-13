import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { TableInstance, TableState } from '../../core/types';

/**
 * Subscribes to a slice of table state; the component re-renders only when the selected value
 * changes (02 §5 fine-grained subscriptions).
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
  const last = useRef<{ value: T } | null>(null);
  const getSnapshot = useCallback(() => {
    const next = selector(table.getState(), table);
    if (last.current && isEqual(last.current.value, next)) return last.current.value;
    last.current = { value: next };
    return next;
  }, [table, selector, isEqual]);
  return useSyncExternalStore(table.subscribe, getSnapshot, getSnapshot);
}
