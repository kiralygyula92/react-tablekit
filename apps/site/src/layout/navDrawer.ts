import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

/**
 * Where the sidebar stops being a rail and becomes a drawer behind the header's menu button.
 * Must match the `max-width: 860px` breakpoint in `layout.css` and `site.css`.
 */
export const NARROW_SCREEN = '(max-width: 860px)';

/** The sidebar as a drawer, shared by the button that opens it and the sidebar it opens. */
export interface NavDrawer {
  /** Only ever true on a narrow screen: a wide one has the sidebar as a rail and no drawer. */
  open: boolean;
  toggle: () => void;
  close: () => void;
}

export const NavDrawerContext = createContext<NavDrawer | null>(null);

/** The drawer, or `null` outside the documentation layout, where there is no sidebar to open. */
export function useNavDrawer(): NavDrawer | null {
  return useContext(NavDrawerContext);
}

/**
 * Whether a media query matches, kept current as the window changes. The server has no viewport,
 * so it renders the wide layout, and the first client render agrees with it before updating.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => {
        list.removeEventListener('change', notify);
      };
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
