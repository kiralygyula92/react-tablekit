import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import { useHotkey } from '../search/useHotkey';
import { pluginConfig } from '../nav/nav';
import { ThemeToggle } from './ThemeToggle';

// The palette carries the whole search index, including the generated API reference, so it is
// not part of the app shell: it arrives when a reader first reaches for it. Hovering the trigger
// starts the download, which usually hides the wait entirely.
function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
        {/* A native select cannot hold an element, so the chevron sits over it. */}
        <span className="site-version-select__chevron" aria-hidden="true">
          <ChevronDownIcon />
        </span>
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
        <a
          className="icon-link"
          href={pluginConfig.repo}
          target="_blank"
          rel="noreferrer"
          aria-label="Source on GitHub"
          title="Source on GitHub"
        >
          <GitHubIcon />
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
