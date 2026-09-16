/**
 * Readiness of the MSW mock server.
 *
 * The worker and its data generators are a few hundred kilobytes, so they are not part of the
 * app: the first demo that calls `mockFetch` starts them, and a reader who never opens a
 * server-mode demo never downloads them at all. Everything that talks to `/api/*` must go
 * through `mockFetch` for that reason.
 */
let started: Promise<void> | undefined;

export function whenMockReady(): Promise<void> {
  started ??= import('./browser')
    .then(({ startMockServer }) => startMockServer())
    .catch((error: unknown) => {
      console.warn('[site] mock server failed to start; server-mode demos will not work.', error);
    })
    .finally(() => {
      // The end-to-end tests wait on this flag rather than on a timeout.
      document.documentElement.dataset.mockReady = 'true';
    });
  return started;
}

/** `fetch` that starts the mock server if it is not running yet, then waits for it. */
export async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  await whenMockReady();
  return fetch(input, init);
}
