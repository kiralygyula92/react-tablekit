import { BrowserRouter } from 'react-router';
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
    </SiteThemeProvider>
  );
}
