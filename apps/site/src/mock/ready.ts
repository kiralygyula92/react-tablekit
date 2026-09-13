/**
 * Readiness of the MSW mock server. The worker (and the data generators) are loaded in a separate
 * chunk so first paint isn't blocked; anything that talks to `/api/*` awaits `whenMockReady()`.
 */
let resolveReady!: () => void;
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export function whenMockReady(): Promise<void> {
  return ready;
}

export function startMockServerInBackground(): void {
  import('./browser')
    .then(({ startMockServer }) => startMockServer())
    .catch((error: unknown) => {
      console.warn('[site] mock server failed to start; server-mode demos will not work.', error);
    })
    .finally(() => {
      document.documentElement.dataset.mockReady = 'true';
      resolveReady();
    });
}

/** `fetch` that waits for the mock server first. Use it for every demo request to `/api/*`. */
export async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  await ready;
  return fetch(input, init);
}
