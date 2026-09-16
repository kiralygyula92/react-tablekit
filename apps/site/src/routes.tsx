import { Navigate, Route, Routes } from 'react-router';
import { pages } from './content/pages';
import { DocsLayout, DocsPage } from './layout/DocsLayout';
import { EmbedPage } from './pages/EmbedPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * The route table, generated from the content tree: a page cannot exist without a route and a
 * route cannot exist without a page (PPDS P2 — navigation is data).
 *
 * Declared as elements rather than as a data router so the same tree renders under
 * `BrowserRouter` in the browser and `StaticRouter` during prerendering.
 */
export function SiteRoutes() {
  return (
    <Routes>
      {/* There is one surface. The root is the documentation's front door, and the host 301s to
          it; this covers the dev server and any client-side arrival at `/`. */}
      <Route path="/" element={<Navigate to="/react-tablekit/" replace />} />

      {/* A chrome-less single demo, used by the width-preset iframes and by the test suite. */}
      <Route path="/embed/*" element={<EmbedPage />} />

      <Route element={<DocsLayout />}>
        {pages.map((page) => (
          <Route
            key={page.pathname}
            path={page.pathname}
            element={<DocsPage pathname={page.pathname} />}
          />
        ))}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
