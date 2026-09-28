import { BrowserRouter } from 'react-router';
import { ErrorBoundary, FailureNotice } from './components/ErrorBoundary';
import { SiteRoutes } from './routes';
import { DemoThemeProvider } from './theme/DemoTheme';
import { SiteThemeProvider } from './theme/SiteTheme';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export function App() {
  return (
    <SiteThemeProvider>
      <DemoThemeProvider>
        {/* The last resort: if the shell itself fails, the reader still gets a message. */}
        <ErrorBoundary
          fallback={(error, retry) => (
            <main className="site-fatal">
              <FailureNotice title="This page could not be shown." error={error} retry={retry} />
            </main>
          )}
        >
          <BrowserRouter basename={basename}>
            <SiteRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </DemoThemeProvider>
    </SiteThemeProvider>
  );
}
