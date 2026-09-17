import { inject } from '@vercel/analytics';

/**
 * Starts Vercel Web Analytics (traffic).
 *
 * The script is served from `/_vercel` by the platform itself, so it exists on a Vercel
 * deployment and nowhere else. `main.tsx` calls this only when the build came from Vercel:
 * against `vite preview` or a dev server the request is a guaranteed 404, and a script that
 * fails to load is a console error, which the e2e suite fails every page on.
 *
 * Every URL this site serves is one of a fixed set — 84 pages, plus one frame per demo — so
 * path-based tracking already reports the route, and the call doesn't have to be told which
 * page it is on. It patches the history API itself, so client-side navigations are counted too.
 *
 * Speed Insights is now integrated via the <SpeedInsights /> React component in App.tsx,
 * following the latest Vercel documentation for React applications.
 */
export function startInsights(): void {
  inject({ framework: 'react' });
}
