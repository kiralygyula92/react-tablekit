import { createBrowserRouter, RouterProvider } from 'react-router';
import { SiteLayout } from './layout/SiteLayout';
import { SiteThemeProvider } from './theme/SiteTheme';

// Every page is code-split per route (docs/08 §8).
const router = createBrowserRouter(
  [
    {
      path: '/embed/:slug',
      lazy: async () => ({ Component: (await import('./pages/EmbedPage')).EmbedPage }),
    },
    {
      path: '/',
      Component: SiteLayout,
      children: [
        {
          index: true,
          lazy: async () => ({ Component: (await import('./pages/HomePage')).HomePage }),
        },
        {
          path: 'docs/getting-started',
          lazy: async () => ({
            Component: (await import('./pages/GettingStartedPage')).GettingStartedPage,
          }),
        },
        {
          path: 'docs/guides/:slug',
          lazy: async () => ({ Component: (await import('./pages/GuidePage')).GuidePage }),
        },
        {
          path: 'docs/versioning',
          lazy: async () => ({
            Component: (await import('./pages/VersioningPage')).VersioningPage,
          }),
        },
        {
          path: 'changelog',
          lazy: async () => ({
            Component: (await import('./pages/ChangelogPage')).ChangelogPage,
          }),
        },
        {
          path: 'examples',
          lazy: async () => ({
            Component: (await import('./pages/ExamplesGalleryPage')).ExamplesGalleryPage,
          }),
        },
        {
          path: 'examples/:slug',
          lazy: async () => ({ Component: (await import('./pages/ExamplePage')).ExamplePage }),
        },
        {
          path: 'playground',
          lazy: async () => ({
            Component: (await import('./pages/PlaygroundPage')).PlaygroundPage,
          }),
        },
        {
          path: 'theme-editor',
          lazy: async () => ({
            Component: (await import('./pages/ThemeEditorPage')).ThemeEditorPage,
          }),
        },
        {
          path: 'api',
          lazy: async () => ({ Component: (await import('./pages/ApiIndexPage')).ApiIndexPage }),
        },
        {
          path: 'api/data-table',
          lazy: async () => ({
            Component: (await import('./pages/api/generatedPages')).ApiDataTablePage,
          }),
        },
        {
          path: 'api/column-def',
          lazy: async () => ({
            Component: (await import('./pages/api/generatedPages')).ApiColumnDefPage,
          }),
        },
        {
          path: 'api/instance',
          lazy: async () => ({
            Component: (await import('./pages/api/generatedPages')).ApiInstancePage,
          }),
        },
        {
          path: 'api/state',
          lazy: async () => ({
            Component: (await import('./pages/api/generatedPages')).ApiStatePage,
          }),
        },
        {
          path: 'api/hooks',
          lazy: async () => ({
            Component: (await import('./pages/api/generatedPages')).ApiHooksPage,
          }),
        },
        {
          path: 'api/utilities',
          lazy: async () => ({
            Component: (await import('./pages/api/generatedPages')).ApiUtilitiesPage,
          }),
        },
        {
          path: 'api/slots',
          lazy: async () => ({
            Component: (await import('./pages/api/ApiSlotsPage')).ApiSlotsPage,
          }),
        },
        {
          path: 'api/handlers',
          lazy: async () => ({
            Component: (await import('./pages/api/ApiHandlersPage')).ApiHandlersPage,
          }),
        },
        {
          path: 'api/theme-tokens',
          lazy: async () => ({
            Component: (await import('./pages/api/ApiTokensPage')).ApiTokensPage,
          }),
        },
        {
          path: 'api/localization',
          lazy: async () => ({
            Component: (await import('./pages/api/ApiLocalizationPage')).ApiLocalizationPage,
          }),
        },
        {
          path: 'api/icons',
          lazy: async () => ({
            Component: (await import('./pages/api/ApiIconsPage')).ApiIconsPage,
          }),
        },
        {
          path: '*',
          lazy: async () => ({ Component: (await import('./pages/NotFoundPage')).NotFoundPage }),
        },
      ],
    },
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
