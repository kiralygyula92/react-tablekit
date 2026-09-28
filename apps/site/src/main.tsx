import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource-variable/open-sans';
import 'react-tablekit/styles.css';
import { App } from './App';
import { reloadOnceForNewBuild } from './components/ErrorBoundary';
import { preloadPage } from './content/pages';
import './styles/site.css';
import './styles/layout.css';

// Vite reports a code chunk that failed to load. After a deploy that means this tab predates the
// new build, and reloading is the fix; the error boundaries show a message if it was something else.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewBuild()) event.preventDefault();
});

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// `scripts/prerender.mjs` writes real HTML for every route and stamps the route it rendered.
// Hydrate only when that is this route: in `vite dev` the shell is empty, and a host that falls
// back to `index.html` for an unknown URL serves the home page's markup, which is not ours.
const prerenderedRoute = container.dataset.route;
if (prerenderedRoute && prerenderedRoute === window.location.pathname) {
  // The page body is code-split, so its chunk has to be in memory before hydration starts.
  void preloadPage(prerenderedRoute).then(() => hydrateRoot(container, app));
} else {
  container.replaceChildren();
  createRoot(container).render(app);
}

// Traffic and field Core Web Vitals, on the deployments that serve them (see `insights.ts`). The
// flag is a build-time literal, so anywhere else this whole branch — and both packages with it —
// is gone from the bundle rather than merely unused.
if (import.meta.env.VITE_VERCEL_INSIGHTS as boolean) {
  void import('./insights').then(({ startInsights }) => {
    startInsights();
  });
}
