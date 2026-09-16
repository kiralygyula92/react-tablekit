import { lazy, Suspense, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useHotkey } from '../search/useHotkey';
import { pluginConfig } from '../nav/nav';
import { ThemeToggle } from './ThemeToggle';

// The palette carries the whole search index, including the generated API reference, so it is
// not part of the app shell: it arrives when a reader first reaches for it. Hovering the trigger
// starts the download, which usually hides the wait entirely.
const load = () => import('../search/CommandPalette');
const CommandPalette = lazy(() => load().then((m) => ({ default: m.CommandPalette })));

/**
 * One header, two surfaces (PPDS §2.1 / §2.2). The docs header carries the version selector and
 * never the marketing menus; both link home through the logo.
 */
export function SiteHeader({ surface }: { surface: 'marketing' | 'docs' }) {
  const [searchOpen, setSearchOpen] = useState(false);
  // Once requested, the palette stays mounted so re-opening is instant.
  const [paletteRequested, setPaletteRequested] = useState(false);
  const openSearch = () => {
    setPaletteRequested(true);
    setSearchOpen(true);
  };
  useHotkey(openSearch);

  return (
    <header className="site-topbar">
      <Link to="/" className="site-logo" aria-label={`${pluginConfig.name} home`}>
        <span className="site-logo__mark" aria-hidden="true" />
        {pluginConfig.name}
      </Link>

      {surface === 'marketing' ? (
        <nav aria-label="Primary" className="site-nav">
          <NavLink to="/react-tablekit/" className="site-nav__link">
            Docs
          </NavLink>
          <NavLink to="/react-tablekit/all-features/" className="site-nav__link">
            Features
          </NavLink>
          <NavLink to="/react-tablekit/demos/" className="site-nav__link">
            Demos
          </NavLink>
        </nav>
      ) : (
        <nav aria-label="Documentation sections" className="site-nav">
          <span className="site-plugin-name">{pluginConfig.name}</span>
          <label className="site-version-select">
            <span className="site-visually-hidden">Version</span>
            <select
              value={pluginConfig.versions?.[0]?.href ?? '/react-tablekit/'}
              onChange={(e) => {
                window.location.href = e.target.value;
              }}
            >
              {(pluginConfig.versions ?? []).map((v) => (
                <option key={v.label} value={v.href}>
                  {v.label}
                  {v.supported === false ? ' (unsupported)' : ''}
                </option>
              ))}
            </select>
          </label>
        </nav>
      )}

      <div className="site-topbar__end">
        <button
          type="button"
          className="palette-trigger"
          onClick={openSearch}
          onPointerEnter={() => void load()}
          onFocus={() => void load()}
          aria-haspopup="dialog"
        >
          <span aria-hidden="true">⌕</span>
          Search
          <kbd className="palette__kbd">Ctrl K</kbd>
        </button>
        <a className="site-nav__link" href={pluginConfig.repo} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <ThemeToggle />
      </div>
      {paletteRequested && (
        <Suspense fallback={null}>
          <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </header>
  );
}
