import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Starts the MSW service worker. Unhandled requests (assets, fonts) pass through silently. */
export async function startMockServer(): Promise<void> {
  const worker = setupWorker(...handlers);
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}
