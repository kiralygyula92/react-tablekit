import { Link, useLocation } from 'react-router';
import { ClientOnly } from '../components/ClientOnly';
import { PageMeta } from '../head/PageMeta';
import { useNavDrawer } from '../layout/navDrawer';
import { Sidebar } from '../layout/Sidebar';
import { SearchIcon } from '../search/SearchIcon';
import { requestSearch, useSearchShortcut } from '../search/shortcut';

const NEXT = [
  {
    to: '/react-tablekit/',
    label: 'Overview',
    note: 'what the library is and how it is organised',
  },
  {
    to: '/react-tablekit/getting-started/installation/',
    label: 'Installation',
    note: 'the package, its peers and the stylesheet',
  },
  { to: '/react-tablekit/all-features/', label: 'All features', note: 'every capability, grouped' },
  { to: '/react-tablekit/api/', label: 'API reference', note: 'every prop, option and type' },
];

/**
 * The page for an address that matches nothing. It sits inside the site, with the sidebar, so a
 * reader who followed a stale link can carry on from here instead of starting over.
 */
export function NotFoundPage() {
  const { pathname } = useLocation();
  const drawer = useNavDrawer();
  const shortcut = useSearchShortcut();

  return (
    <>
      <PageMeta
        title="Page not found"
        description="There is nothing at this address. The page may have moved, or the link may have a typo."
        pathname="/404/"
        noindex
      />
      <div className="docs-body docs-body--wide">
        <Sidebar pathname={pathname} />
        <main id="main" className="docs-main" tabIndex={-1} inert={drawer?.open}>
          <article className="site-prose not-found">
            <header className="page-header">
              <p className="not-found__code">404</p>
              <h1>Page not found</h1>
              <p className="site-lead">
                There is nothing at this address. The page may have moved, or the link may have a
                typo.
              </p>
              {/* The address is only known in the browser: this page is prerendered once for all. */}
              <ClientOnly>
                <p className="not-found__path">
                  <code>{pathname}</code>
                </p>
              </ClientOnly>
            </header>
            <h2>Where to go from here</h2>
            <ul className="not-found__links">
              {NEXT.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                  <span>{item.note}</span>
                </li>
              ))}
            </ul>
            <p className="not-found__search">
              <button
                type="button"
                className="palette-trigger"
                onClick={requestSearch}
                aria-haspopup="dialog"
              >
                <SearchIcon />
                <span>Search the documentation</span>
                <kbd className="palette__kbd">{shortcut}</kbd>
              </button>
            </p>
          </article>
        </main>
      </div>
    </>
  );
}
