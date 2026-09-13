import { useCallback, useSyncExternalStore } from 'react';
import { breakpointForWidth, DEFAULT_BREAKPOINTS } from '../../core/responsive';
import type { Breakpoint, Breakpoints } from '../../themes/types';

/**
 * The current viewport breakpoint (05 §13). SSR-safe: the server (and hydration) renders with
 * `ssrBreakpoint`, then the client updates.
 */
export function useViewportBreakpoint(
  breakpoints: Breakpoints = DEFAULT_BREAKPOINTS,
  ssrBreakpoint: Breakpoint = 'lg',
): Breakpoint {
  const key = JSON.stringify(breakpoints);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined') return () => undefined;
      if (typeof window.matchMedia !== 'function') {
        window.addEventListener('resize', onChange);
        return () => window.removeEventListener('resize', onChange);
      }
      const bps = JSON.parse(key) as Breakpoints;
      const queries = Object.values(bps).map((min) => window.matchMedia(`(min-width: ${min}px)`));
      for (const q of queries) q.addEventListener('change', onChange);
      return () => {
        for (const q of queries) q.removeEventListener('change', onChange);
      };
    },
    [key],
  );
  const getSnapshot = useCallback(
    () => breakpointForWidth(window.innerWidth, JSON.parse(key) as Breakpoints),
    [key],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => ssrBreakpoint);
}

/** `prefers-color-scheme: dark`, SSR-safe (false on the server). */
export function usePrefersDark(enabled: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => undefined;
      }
      const q = window.matchMedia('(prefers-color-scheme: dark)');
      q.addEventListener('change', onChange);
      return () => q.removeEventListener('change', onChange);
    },
    [enabled],
  );
  return useSyncExternalStore(
    subscribe,
    () =>
      enabled && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false,
    () => false,
  );
}
