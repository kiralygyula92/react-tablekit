import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { version } from 'react-tablekit';
import { GUIDES } from '../pages/guides/registry';
import { PKG_NAME, REPO_URL } from '../pkg';
import { CommandPalette } from '../search/CommandPalette';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/docs/getting-started', label: 'Docs' },
  { to: '/examples', label: 'Examples' },
  { to: '/api', label: 'API' },
  { to: '/playground', label: 'Playground' },
] as const;

const SIDEBAR: Record<'docs' | 'api', { to: string; label: string }[]> = {
  docs: [
    { to: '/docs/getting-started', label: 'Getting started' },
    ...GUIDES.map((guide) => ({ to: `/docs/guides/${guide.slug}`, label: guide.title })),
    { to: '/docs/versioning', label: 'Versioning policy' },
    { to: '/changelog', label: 'Changelog' },
  ],
  api: [
    { to: '/api', label: 'API index' },
    { to: '/api/data-table', label: '<DataTable> props' },
    { to: '/api/column-def', label: 'ColumnDef' },
    { to: '/api/instance', label: 'TableInstance' },
    { to: '/api/state', label: 'State and query' },
    { to: '/api/hooks', label: 'Hooks' },
    { to: '/api/utilities', label: 'Utilities' },
    { to: '/api/slots', label: 'Slots' },
    { to: '/api/handlers', label: 'Handlers' },
    { to: '/api/theme-tokens', label: 'Theme tokens' },
    { to: '/api/localization', label: 'Localization' },
    { to: '/api/icons', label: 'Icons' },
  ],
};

export function SiteLayout() {
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const section = pathname.startsWith('/docs')
    ? 'docs'
    : pathname.startsWith('/api')
      ? 'api'
      : null;

  // Ctrl+K (Cmd+K on a Mac) opens the palette from anywhere on the site. It is deliberately
  // ignored while the user is typing somewhere else, so a table's own search keeps the hotkey.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'k' || !(event.ctrlKey || event.metaKey)) return;
      // A table on the page registers the same hotkey for its own search and claims the event on
      // `document`, which bubbles before `window`. When a table has taken it, the user is working
      // in that table and it should win; the topbar button still opens the palette.
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="site">
      <a className="site-skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-topbar">
        <NavLink to="/" className="site-logo" aria-label={`${PKG_NAME} home`}>
          <span className="site-logo__mark" aria-hidden="true" />
          {PKG_NAME}
        </NavLink>
        <nav aria-label="Primary" className="site-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className="site-nav__link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="site-topbar__end">
          <button
            type="button"
            className="palette-trigger"
            onClick={() => setSearchOpen(true)}
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">⌕</span>
            Search
            <kbd className="palette__kbd">Ctrl K</kbd>
          </button>
          <span className="site-version" title="Library version">
            v{version}
          </span>
          <a className="site-nav__link" href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </header>
      <div className={section ? 'site-body site-body--with-sidebar' : 'site-body'}>
        {section && (
          <nav
            aria-label={section === 'docs' ? 'Documentation' : 'API reference'}
            className="site-sidebar"
          >
            <ul>
              {SIDEBAR[section].map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end className="site-sidebar__link">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <main id="main" className="site-main" tabIndex={-1}>
          <Suspense fallback={<p className="site-muted">Loading…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ScrollRestoration />
    </div>
  );
}
