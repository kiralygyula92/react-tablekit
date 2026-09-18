import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import type { TableInstance } from '../../core/types';

/** Layout facts shared between the parts of one table (container ref, footer presence). */
export interface LayoutRegistry {
  containerRef: RefObject<HTMLDivElement | null>;
  tableRef: RefObject<HTMLTableElement | null>;
  /** Number of visible bottom pagination bars; the container drops its bottom border when > 0. */
  footerCount: number;
  registerFooter: () => () => void;
  /** Open state of the filter section, shared by `FiltersButton` and `FilterPanel`. */
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean | ((open: boolean) => boolean)) => void;
}

export const LayoutContext = createContext<LayoutRegistry | null>(null);

export function useLayoutRegistry(): LayoutRegistry {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [footerCount, setFooterCount] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const registerFooter = useCallback(() => {
    setFooterCount((n) => n + 1);
    return () => setFooterCount((n) => n - 1);
  }, []);
  return useMemo(
    () => ({ containerRef, tableRef, footerCount, registerFooter, filtersOpen, setFiltersOpen }),
    [footerCount, registerFooter, filtersOpen],
  );
}

export function useLayout(): LayoutRegistry {
  const layout = useContext(LayoutContext);
  if (!layout)
    throw new Error('[react-tablekit] Layout context missing: render inside <DataTable.Root>.');
  return layout;
}

/**
 * Subscribes a part to every table change. Parts are usually passed as `children`, so they must
 * subscribe themselves instead of relying on a parent re-render.
 */
export function useTableVersion(table: TableInstance<unknown>): number {
  return useSyncExternalStore(table.subscribe, table._getVersion, table._getVersion);
}

/** Polite, debounced live-region announcer. */
export function useAnnouncer() {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  const announce = useCallback((next: string) => {
    clearTimeout(timer.current);
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    timer.current = setTimeout(() => {
      // Clear first so repeating the same message is announced again.
      setMessage('');
      frame.current = requestAnimationFrame(() => setMessage(next));
    }, 150);
  }, []);
  // A table can unmount inside the debounce window: a filter that closes the drawer it lives in,
  // a route change on the keystroke after the last one. Both handles have to go with it, or the
  // callback wakes up against a component that is no longer there.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return { message, announce };
}
