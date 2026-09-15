import { generateReadings } from '../data/readings';
import type { ListingCriteria, PagedResponse, Reading } from '../types';
import { normalizeListingCriteria } from './accounts';

const cache = new Map<string, Reading[]>();

/** `GET /api/assets/:assetId/readings?pageNumber&pageSize&sortColumn&ascending`. Newest first. */
export function getReadingHistory(
  assetId: string,
  listing: Partial<ListingCriteria>,
): PagedResponse<Reading> {
  let readings = cache.get(assetId);
  if (!readings) {
    readings = generateReadings(assetId);
    cache.set(assetId, readings);
  }
  const criteria = normalizeListingCriteria(listing);
  let rows = readings;
  const key = criteria.sortColumn as keyof Reading | undefined;
  if (key && key !== 'date') {
    const dir = criteria.ascending === false ? -1 : 1;
    rows = [...readings].sort((a, b) => {
      const va = a[key] ?? '';
      const vb = b[key] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  } else if (key === 'date' && criteria.ascending) {
    rows = [...readings].reverse();
  }
  const start = criteria.pageNumber * criteria.pageSize;
  return {
    items: rows.slice(start, start + criteria.pageSize),
    totalItemCount: rows.length,
    requestCriteria: criteria,
  };
}
