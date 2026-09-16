import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { preloadPage } from './content/pages';
import { SiteRoutes } from './routes';
import { DemoThemeProvider } from './theme/DemoTheme';
import { SiteThemeProvider } from './theme/SiteTheme';

/**
 * Renders one route to HTML at build time (`scripts/prerender.mjs`), so every URL is a real
 * document rather than an empty shell that fills in after JavaScript runs.
 *
 * The page body is fetched first so it renders as prose rather than as a loading state. Demos
 * and the other interactive surfaces stay client-only by design — they are behind `ClientOnly`,
 * so nothing here suspends.
 */
export async function render(pathname: string): Promise<string> {
  await preloadPage(pathname);
  return renderToString(
    <SiteThemeProvider>
      <DemoThemeProvider>
        <StaticRouter location={pathname}>
          <SiteRoutes />
        </StaticRouter>
      </DemoThemeProvider>
    </SiteThemeProvider>,
  );
}
