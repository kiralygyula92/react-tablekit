import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Site-wide appearance. `classic` also switches demo tables to the classic preset. */
export type SiteTheme = 'light' | 'dark' | 'classic';

export const SITE_THEMES: readonly SiteTheme[] = ['light', 'dark', 'classic'];

const STORAGE_KEY = 'tk-site:theme';

interface SiteThemeValue {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
}

const SiteThemeContext = createContext<SiteThemeValue | null>(null);

function readStored(): SiteTheme {
  const fromDom = document.documentElement.dataset.siteTheme;
  return SITE_THEMES.includes(fromDom as SiteTheme) ? (fromDom as SiteTheme) : 'light';
}

export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(readStored);

  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
    document.documentElement.dataset.siteTheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}

export function useSiteTheme(): SiteThemeValue {
  const value = useContext(SiteThemeContext);
  if (!value) throw new Error('useSiteTheme must be used inside <SiteThemeProvider>');
  return value;
}
