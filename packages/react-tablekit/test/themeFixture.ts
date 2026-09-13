import type { ResolvedTableTheme } from '../src/themes/types';

/** Minimal theme object for core tests that need a render context. */
export const lightThemeForTests = {
  name: 'test',
  colorScheme: 'light',
  breakpoints: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1440 },
} as unknown as ResolvedTableTheme;
