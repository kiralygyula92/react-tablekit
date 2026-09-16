import { useMemo, type ReactNode } from 'react';
import { darkTheme, lightTheme, TableThemeProvider } from 'react-tablekit';
import { useSiteTheme } from './SiteTheme';

/**
 * Every table on the site follows the site's own appearance.
 *
 * A demo that rendered the light preset on a dark page would not be showing the library — it
 * would be showing a bug. The site theme picks the preset here, once, so no demo has to know
 * about it; a demo that deliberately sets its own `theme` still wins, because a prop beats the
 * provider. That is how the theming demos and the showcase pages keep comparing presets.
 */
export function DemoThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useSiteTheme();
  const preset = useMemo(() => (theme === 'dark' ? darkTheme : lightTheme), [theme]);

  return (
    <TableThemeProvider theme={preset} colorScheme={theme}>
      {children}
    </TableThemeProvider>
  );
}
