import { delay, http, HttpResponse } from 'msw';
import { getMockConfig, resolveLatency } from './config';
import { generateCustomers } from './data/customers';
import { searchCustomers } from './server/customers';
import { getWaterTestHistory } from './server/waterTests';
import type { ListingCriteria, SearchCustomerRequest } from './types';

let customers: ReturnType<typeof generateCustomers> | undefined;
export const getCustomerDb = () => (customers ??= generateCustomers());

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
  // Skimmer customer search contract (01 §3, 08 §7).
  http.post('*/api/customers/search', async ({ request }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;
    const body = ((await request.json().catch(() => ({}))) ?? {}) as SearchCustomerRequest;
    return HttpResponse.json(searchCustomers(getCustomerDb(), body));
  }),

  // Water-test history for one body of water.
  http.get('*/api/pools/:bodyOfWaterId/history', async ({ request, params }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;
    const url = new URL(request.url);
    return HttpResponse.json(
      getWaterTestHistory(String(params.bodyOfWaterId), listingFromSearchParams(url.searchParams)),
    );
  }),
];
