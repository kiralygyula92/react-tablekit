import { BrowserRouter } from 'react-router';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { SiteRoutes } from './routes';
import { DemoThemeProvider } from './theme/DemoTheme';
import { SiteThemeProvider } from './theme/SiteTheme';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export function App() {
  return (
    <SiteThemeProvider>
      <DemoThemeProvider>
        <BrowserRouter basename={basename}>
          <SiteRoutes />
        </BrowserRouter>
      </DemoThemeProvider>
      {/* Speed Insights component for tracking Core Web Vitals */}
      {import.meta.env.VITE_VERCEL_INSIGHTS && <SpeedInsights />}
    </SiteThemeProvider>
  );
}
