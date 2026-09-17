import { BrowserRouter } from 'react-router';
import { Analytics, SpeedInsights } from './insights';
import { SiteRoutes } from './routes';
import { DemoThemeProvider } from './theme/DemoTheme';
import { SiteThemeProvider } from './theme/SiteTheme';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

// Vercel Insights components are conditionally rendered only on Vercel deployments.
// The flag is a build-time literal, so anywhere else this whole branch — and both packages
// with it — is gone from the bundle rather than merely unused.
const showInsights = import.meta.env.VITE_VERCEL_INSIGHTS as boolean;

export function App() {
  return (
    <SiteThemeProvider>
      <DemoThemeProvider>
        <BrowserRouter basename={basename}>
          <SiteRoutes />
        </BrowserRouter>
      </DemoThemeProvider>
      {showInsights && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </SiteThemeProvider>
  );
}
