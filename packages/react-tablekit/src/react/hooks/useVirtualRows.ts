import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '../utils';

/** One rendered row of a virtualized list. */
export interface VirtualRow {
  index: number;
  /** Offset from the top of the scroll content, in px. */
  start: number;
  /** Measured (or estimated) height, in px. */
  size: number;
  /** Stable key for React. */
  key: string | number;
}

/** Options of {@link useVirtualRows}. */
export interface UseVirtualRowsOptions {
  /** Total number of rows. */
  count: number;
  /** The scroll container (must have a bounded height). */
  getScrollElement: () => HTMLElement | null;
  /** Row height estimate; a function receives the row index. @default 40 */
  estimateSize?: number | ((index: number) => number);
  /** Rows rendered above and below the viewport. @default 8 */
  overscan?: number;
  /** Stable key per row. @default the index */
  getItemKey?: (index: number) => string | number;
  /** Measure rendered rows with a ResizeObserver instead of trusting the estimate. */
  dynamic?: boolean;
}

/** What {@link useVirtualRows} returns. */
export interface VirtualRowsResult {
  virtualRows: VirtualRow[];
  /** Height of the whole scroll content, in px. */
  totalSize: number;
  /** Empty space before the first and after the last rendered row (spacer rows). */
  before: number;
  after: number;
  /** Ref callback that measures a rendered row (`dynamic` mode). */
  measureElement: (element: HTMLElement | null) => void;
  /** Scrolls a row index into view. */
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
}

const DEFAULT_ESTIMATE = 40;

/**
 * Headless row virtualization: renders only the rows near the viewport of a bounded
 * scroll container, with optional dynamic measurement.
 *
 * @example
 * ```tsx
 * const { virtualRows, before, after } = useVirtualRows({
 *   count: rows.length,
 *   getScrollElement: () => containerRef.current,
 *   estimateSize: 44,
 * });
 * ```
 */
export function useVirtualRows(options: UseVirtualRowsOptions): VirtualRowsResult {
  const { count, getScrollElement, overscan = 8, dynamic = false, getItemKey } = options;
  const estimate = useCallback(
    (index: number) => {
      const value = options.estimateSize ?? DEFAULT_ESTIMATE;
      return typeof value === 'function' ? value(index) : value;
    },
    [options.estimateSize],
  );

  const [scroll, setScroll] = useState({ top: 0, height: 0 });
  const [measured, setMeasured] = useState<Record<number, number>>({});
  const pendingRef = useRef<Record<number, number>>({});
  const frameRef = useRef<number | null>(null);

  // Offsets are recomputed whenever a measurement or the count changes.
  const { offsets, totalSize } = useMemo(() => {
    const result = new Float64Array(count + 1);
    for (let i = 0; i < count; i++) {
      result[i + 1] = (result[i] ?? 0) + (measured[i] ?? estimate(i));
    }
    return { offsets: result, totalSize: result[count] ?? 0 };
  }, [count, measured, estimate]);

  const detachRef = useRef<(() => void) | null>(null);

  /** Starts following the scroll element; a no-op while it is missing or already followed. */
  const attach = useCallback(() => {
    if (detachRef.current) return;
    const element = getScrollElement();
    if (!element) return;
    const update = () => {
      setScroll((prev) =>
        prev.top === element.scrollTop && prev.height === element.clientHeight
          ? prev
          : { top: element.scrollTop, height: element.clientHeight },
      );
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => update());
    observer?.observe(element);
    detachRef.current = () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
      detachRef.current = null;
    };
  }, [getScrollElement]);

  const detach = useCallback(() => {
    detachRef.current?.();
  }, []);

  useIsomorphicLayoutEffect(() => {
    attach();
    return detach;
  }, [attach, detach]);

  // React attaches refs child-first. When this hook runs inside a descendant of the scroll
  // container — as the table body does — the container's ref is still null during the layout
  // effect above, so nothing would ever follow the scroll and the window would stay on the first
  // rows. Every ref is attached by the time passive effects run, so try again then.
  useEffect(() => {
    attach();
  });

  /** Index of the last offset that is still at or before `position`. */
  const findIndex = useCallback(
    (position: number) => {
      let low = 0;
      let high = count;
      while (low < high) {
        const mid = (low + high) >> 1;
        if ((offsets[mid + 1] ?? 0) <= position) low = mid + 1;
        else high = mid;
      }
      return Math.min(low, Math.max(0, count - 1));
    },
    [count, offsets],
  );

  const start = Math.max(0, findIndex(scroll.top) - overscan);
  const end = Math.min(count - 1, findIndex(scroll.top + (scroll.height || 0)) + overscan);

  const virtualRows = useMemo(() => {
    const rows: VirtualRow[] = [];
    for (let index = start; index <= end && index < count; index++) {
      rows.push({
        index,
        start: offsets[index] ?? 0,
        size: measured[index] ?? estimate(index),
        key: getItemKey ? getItemKey(index) : index,
      });
    }
    return rows;
  }, [start, end, count, offsets, measured, estimate, getItemKey]);

  // Measurements are batched into one state update per frame, so a scroll never thrashes React.
  const flush = useCallback(() => {
    frameRef.current = null;
    const pending = pendingRef.current;
    pendingRef.current = {};
    setMeasured((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [key, size] of Object.entries(pending)) {
        const index = Number(key);
        if (Math.abs((prev[index] ?? -1) - size) > 0.5) {
          next[index] = size;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const measureElement = useCallback(
    (element: HTMLElement | null) => {
      if (!dynamic || !element) return;
      const index = Number(element.dataset.index);
      if (Number.isNaN(index)) return;
      pendingRef.current[index] = element.getBoundingClientRect().height;
      frameRef.current ??=
        typeof requestAnimationFrame === 'undefined'
          ? (setTimeout(flush, 0) as unknown as number)
          : requestAnimationFrame(flush);
    },
    [dynamic, flush],
  );

  useEffect(
    () => () => {
      if (frameRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  const scrollToIndex = useCallback(
    (index: number, opts?: { align?: 'start' | 'center' | 'end' }) => {
      const element = getScrollElement();
      if (!element) return;
      const clamped = Math.max(0, Math.min(index, count - 1));
      const top = offsets[clamped] ?? 0;
      const size = measured[clamped] ?? estimate(clamped);
      const align = opts?.align ?? 'start';
      element.scrollTop =
        align === 'center'
          ? top - element.clientHeight / 2 + size / 2
          : align === 'end'
            ? top - element.clientHeight + size
            : top;
    },
    [getScrollElement, count, offsets, measured, estimate],
  );

  const first = virtualRows[0];
  const last = virtualRows[virtualRows.length - 1];
  return {
    virtualRows,
    totalSize,
    before: first ? first.start : 0,
    after: last ? Math.max(0, totalSize - (last.start + last.size)) : 0,
    measureElement,
    scrollToIndex,
  };
}
