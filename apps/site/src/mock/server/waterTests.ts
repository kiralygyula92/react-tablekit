import { generateWaterTests } from '../data/waterTests';
import type { ListingCriteria, PagedResponse, WaterTestHistoryItem } from '../types';
import { normalizeListingCriteria } from './customers';

const cache = new Map<string, WaterTestHistoryItem[]>();

/** `GET /api/pools/:bodyOfWaterId/history?pageNumber&pageSize&sortColumn&ascending`. Newest first by default. */
export function getWaterTestHistory(
  bodyOfWaterId: string,
  listing: Partial<ListingCriteria>,
): PagedResponse<WaterTestHistoryItem> {
  let tests = cache.get(bodyOfWaterId);
  if (!tests) {
    tests = generateWaterTests(bodyOfWaterId);
    cache.set(bodyOfWaterId, tests);
  }
  const criteria = normalizeListingCriteria(listing);
  let rows = tests;
  const key = criteria.sortColumn as keyof WaterTestHistoryItem | undefined;
  if (key && key !== 'date') {
    const dir = criteria.ascending === false ? -1 : 1;
    rows = [...tests].sort((a, b) => {
      const va = a[key] ?? '';
      const vb = b[key] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  } else if (key === 'date' && criteria.ascending) {
    rows = [...tests].reverse();
  }
  const start = criteria.pageNumber * criteria.pageSize;
  return {
    items: rows.slice(start, start + criteria.pageSize),
    totalItemCount: rows.length,
    requestCriteria: criteria,
  };
}
