import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

/**
 * Starts Vercel Web Analytics (traffic) and Speed Insights (field Core Web Vitals).
 *
 * Both scripts are served from `/_vercel` by the platform itself, so they exist on a Vercel
 * deployment and nowhere else. `main.tsx` calls this only when the build came from Vercel:
 * against `vite preview` or a dev server the request is a guaranteed 404, and a script that
 * fails to load is a console error, which the e2e suite fails every page on.
 *
 * Every URL this site serves is one of a fixed set — 84 pages, plus one frame per demo — so
 * path-based tracking already reports the route, and neither call has to be told which page it
 * is on. Both patch the history API themselves, so client-side navigations are counted too.
 */
export function startInsights(): void {
  inject({ framework: 'react' });
  injectSpeedInsights({ framework: 'react' });
}
