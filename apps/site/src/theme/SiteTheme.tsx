import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/**
 * Site-wide appearance.
 *
 * Light and dark only. `classic` is a *table* preset, not a site appearance — it lives on the
 * theming page, in the theme editor and on the showcase demos, which is where a reader is
 * comparing presets rather than choosing how to read the documentation.
 */
export type SiteTheme = 'light' | 'dark';

export const SITE_THEMES: readonly SiteTheme[] = ['light', 'dark'];

const STORAGE_KEY = 'tk-site:theme';

/** The page background of each appearance, which the browser's own chrome is tinted to match. */
const CHROME_COLOR: Record<SiteTheme, string> = { light: '#ffffff', dark: '#0b1220' };

function applyTheme(theme: SiteTheme): void {
  document.documentElement.dataset.siteTheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME_COLOR[theme]);
}

interface SiteThemeValue {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  toggle: () => void;
}

const SiteThemeContext = createContext<SiteThemeValue | null>(null);

/*
 * The theme is not React state: it is an attribute on `<html>`, applied by the inline script in
 * `index.html` before first paint so the colours never flash. React reads it rather than owning
 * it, which is what `useSyncExternalStore` is for — and it is what lets the prerendered HTML and
 * the hydrating browser agree, because the server snapshot is the default and React knows to use
 * it while hydrating.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changing the theme is a change to the same external state.
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    const next = event.newValue;
    if (next !== null && next !== 'light' && next !== 'dark') return;
    applyTheme(next ?? 'light');
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): SiteTheme {
  const fromDom = document.documentElement.dataset.siteTheme;
  return fromDom === 'dark' ? 'dark' : 'light';
}

const getServerSnapshot = (): SiteTheme => 'light';

export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: SiteTheme) => {
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A browser with storage blocked still gets the theme for this page.
    }
    for (const listener of listeners) listener();
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
    [theme, setTheme],
  );
  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}

export function useSiteTheme(): SiteThemeValue {
  const value = useContext(SiteThemeContext);
  if (!value) throw new Error('useSiteTheme must be used inside <SiteThemeProvider>');
  return value;
}
