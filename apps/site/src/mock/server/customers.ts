import { formatCustomerName, getCustomerBodiesOfWater } from '../data/customers';
import type { Customer, ListingCriteria, PagedResponse, SearchCustomerRequest } from '../types';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/**
 * Normalizes listing criteria the way the Skimmer backend does, so it can be echoed back.
 * Inputs come from untrusted JSON, so non-finite values fall back to the defaults.
 */
export function normalizeListingCriteria(
  input: Partial<ListingCriteria> | undefined,
): ListingCriteria {
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(input?.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
  );
  const pageNumber = Math.max(0, Math.trunc(input?.pageNumber ?? 0) || 0);
  const normalized: ListingCriteria = { pageNumber, pageSize };
  if (input?.sortColumn) {
    normalized.sortColumn = input.sortColumn;
    normalized.ascending = input.ascending ?? true;
  }
  return normalized;
}

/** Case- and diacritic-insensitive folding. */
export function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function customerSearchText(c: Customer): string {
  const parts: string[] = [formatCustomerName(c), c.displayName.companyName ?? ''];
  const addr = c.billingAddress;
  if (addr) parts.push(addr.address1, addr.city, addr.adminArea1, addr.postalCode);
  for (const e of c.contactInformation?.emailAddresses ?? []) parts.push(e.email);
  for (const p of c.contactInformation?.phoneNumbers ?? []) parts.push(p.number);
  for (const s of c.serviceLocations ?? []) parts.push(s.address.address1, s.address.city);
  return fold(parts.join(' '));
}

const sortAccessors: Record<string, (c: Customer) => string | number> = {
  id: (c) => c.identifiers.id,
  customerName: (c) => fold(`${c.displayName.lastName} ${c.displayName.firstName}`),
  companyName: (c) => fold(c.displayName.companyName ?? ''),
  bodiesOfWater: (c) => getCustomerBodiesOfWater(c).length,
};

/**
 * The Skimmer `POST /api/customers/search` contract:
 * `{ queryCriteria, listingCriteria }` → `{ items, totalItemCount, requestCriteria }`.
 * Multi-word queries match when every word matches (AND).
 */
export function searchCustomers(
  customers: readonly Customer[],
  request: SearchCustomerRequest,
): PagedResponse<Customer> {
  const criteria = normalizeListingCriteria(request.listingCriteria);
  const words = fold(request.queryCriteria?.trim() ?? '')
    .split(/\s+/)
    .filter(Boolean);

  let matches =
    words.length === 0
      ? [...customers]
      : customers.filter((c) => {
          const text = customerSearchText(c);
          return words.every((w) => text.includes(w));
        });

  const accessor = criteria.sortColumn ? sortAccessors[criteria.sortColumn] : undefined;
  if (accessor) {
    const dir = criteria.ascending === false ? -1 : 1;
    // Array.prototype.sort is stable, so ties keep their original order.
    matches = matches.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }

  const start = criteria.pageNumber * criteria.pageSize;
  return {
    items: matches.slice(start, start + criteria.pageSize),
    totalItemCount: matches.length,
    requestCriteria: criteria,
  };
}
