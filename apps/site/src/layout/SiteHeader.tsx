import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import { useHotkey } from '../search/useHotkey';
import { pluginConfig } from '../nav/nav';
import { ThemeToggle } from './ThemeToggle';

// The palette carries the whole search index, including the generated API reference, so it is
// not part of the app shell: it arrives when a reader first reaches for it. Hovering the trigger
// starts the download, which usually hides the wait entirely.
const load = () => import('../search/CommandPalette');
const CommandPalette = lazy(() => load().then((m) => ({ default: m.CommandPalette })));

/**
 * The site header: the product, the version it documents, and the three tools — search, source,
 * appearance. There are no section links here because the sidebar already lists every section;
 * a second copy in the header would be one more thing to keep in step with the nav data.
 */
export function SiteHeader() {
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
      <Link to="/react-tablekit/" className="site-logo">
        {pluginConfig.name}
      </Link>

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
