import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { DocsLayout, DocsPage } from './layout/DocsLayout';
import { MarketingPage } from './layout/MarketingLayout';
import { pages } from './content/pages';
import { EmbedPage } from './pages/EmbedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SiteThemeProvider } from './theme/SiteTheme';

// Routes come from the content tree, so a page cannot exist without content and content cannot
// exist without a route (PPDS P2 — navigation is data).
const docsRoutes: RouteObject[] = pages
  .filter((page) => page.pathname.startsWith('/react-tablekit/'))
  .map((page) => ({ path: page.pathname, element: <DocsPage pathname={page.pathname} /> }));

const marketingRoutes: RouteObject[] = pages
  .filter((page) => !page.pathname.startsWith('/react-tablekit/'))
  .map((page) => ({ path: page.pathname, element: <MarketingPage pathname={page.pathname} /> }));

const router = createBrowserRouter(
  [
    ...marketingRoutes,
    { path: '/embed/*', element: <EmbedPage /> },
    { element: <DocsLayout />, children: docsRoutes.map((r) => ({ ...r })) },
    { path: '*', element: <NotFoundPage /> },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);

export function App() {
  return (
    <SiteThemeProvider>
      <RouterProvider router={router} />
    </SiteThemeProvider>
  );
}
