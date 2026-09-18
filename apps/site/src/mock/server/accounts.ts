import { formatAccountName, getAccountAssets } from '../data/accounts';
import type { Account, ListingCriteria, PagedResponse, SearchAccountRequest } from '../types';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/**
 * Normalizes the listing criteria so the server can echo them back.
 * Inputs come from untrusted JSON, so non-finite values fall back to the defaults.
 */
export function normalizeListingCriteria(
  input: Partial<ListingCriteria> | undefined,
): ListingCriteria {
  const requestedPageSize = input?.pageSize ?? DEFAULT_PAGE_SIZE;
  const requestedPageNumber = input?.pageNumber ?? 0;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.isFinite(requestedPageSize)
        ? Math.trunc(requestedPageSize) || DEFAULT_PAGE_SIZE
        : DEFAULT_PAGE_SIZE,
    ),
  );
  const pageNumber = Number.isFinite(requestedPageNumber)
    ? Math.max(0, Math.trunc(requestedPageNumber))
    : 0;
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

function accountSearchText(a: Account): string {
  const parts: string[] = [formatAccountName(a), a.displayName.companyName ?? ''];
  const addr = a.billingAddress;
  if (addr) parts.push(addr.address1, addr.city, addr.region, addr.postalCode);
  for (const e of a.contactInformation?.emailAddresses ?? []) parts.push(e.email);
  for (const p of a.contactInformation?.phoneNumbers ?? []) parts.push(p.number);
  for (const s of a.sites ?? []) parts.push(s.address.address1, s.address.city);
  return fold(parts.join(' '));
}

const sortAccessors: Record<string, (a: Account) => string | number> = {
  id: (a) => a.identifiers.id,
  accountName: (a) => fold(`${a.displayName.lastName} ${a.displayName.firstName}`),
  companyName: (a) => fold(a.displayName.companyName ?? ''),
  assets: (a) => getAccountAssets(a).length,
};

/**
 * `POST /api/accounts/search`:
 * `{ queryCriteria, listingCriteria }` → `{ items, totalItemCount, requestCriteria }`.
 * Multi-word queries match when every word matches (AND).
 */
export function searchAccounts(
  accounts: readonly Account[],
  request: SearchAccountRequest,
): PagedResponse<Account> {
  const criteria = normalizeListingCriteria(request.listingCriteria);
  const words = fold(request.queryCriteria?.trim() ?? '')
    .split(/\s+/)
    .filter(Boolean);

  let matches =
    words.length === 0
      ? [...accounts]
      : accounts.filter((a) => {
          const text = accountSearchText(a);
          return words.every((w) => text.includes(w));
        });

  const accessor =
    criteria.sortColumn && Object.hasOwn(sortAccessors, criteria.sortColumn)
      ? sortAccessors[criteria.sortColumn]
      : undefined;
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
