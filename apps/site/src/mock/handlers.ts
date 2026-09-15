import { delay, http, HttpResponse } from 'msw';
import { getMockConfig, resolveLatency } from './config';
import { generateAccounts } from './data/accounts';
import { searchAccounts } from './server/accounts';
import { getReadingHistory } from './server/readings';
import type { ListingCriteria, SearchAccountRequest } from './types';

let accounts: ReturnType<typeof generateAccounts> | undefined;
export const getAccountDb = () => (accounts ??= generateAccounts());

/** Applies the configured latency and returns an error response when failure is injected. */
async function simulateNetwork(): Promise<Response | undefined> {
  const config = getMockConfig();
  const ms = resolveLatency(config);
  if (ms > 0) await delay(ms);
  if (config.errorRate > 0 && Math.random() < config.errorRate) {
    return HttpResponse.json({ message: 'Injected mock server error' }, { status: 500 });
  }
  return undefined;
}

function listingFromSearchParams(params: URLSearchParams): Partial<ListingCriteria> {
  const listing: Partial<ListingCriteria> = {};
  const pageNumber = params.get('pageNumber');
  const pageSize = params.get('pageSize');
  const sortColumn = params.get('sortColumn');
  const ascending = params.get('ascending');
  if (pageNumber !== null) listing.pageNumber = Number(pageNumber);
  if (pageSize !== null) listing.pageSize = Number(pageSize);
  if (sortColumn) listing.sortColumn = sortColumn;
  if (ascending !== null) listing.ascending = ascending === 'true';
  return listing;
}

export const handlers = [
  // Account search: a POST body carrying the query and the listing criteria.
  http.post('*/api/accounts/search', async ({ request }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;
    const body = ((await request.json().catch(() => ({}))) ?? {}) as SearchAccountRequest;
    return HttpResponse.json(searchAccounts(getAccountDb(), body));
  }),

  // Reading history for one asset, with the listing criteria as search parameters.
  http.get('*/api/assets/:assetId/readings', async ({ request, params }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;
    const url = new URL(request.url);
    return HttpResponse.json(
      getReadingHistory(String(params.assetId), listingFromSearchParams(url.searchParams)),
    );
  }),
];
