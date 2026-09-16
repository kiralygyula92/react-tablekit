import { BrowserRouter } from 'react-router';
import { SiteRoutes } from './routes';
import { SiteThemeProvider } from './theme/SiteTheme';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export function App() {
  return (
    <SiteThemeProvider>
      <BrowserRouter basename={basename}>
        <SiteRoutes />
      </BrowserRouter>
    </SiteThemeProvider>
  );
}
