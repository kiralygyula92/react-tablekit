import { describe, expect, it } from 'vitest';
import { generateAccounts } from '../data/accounts';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizeListingCriteria,
  searchAccounts,
} from './accounts';

const accounts = generateAccounts();

describe('normalizeListingCriteria', () => {
  it('falls back to the defaults for missing input', () => {
    expect(normalizeListingCriteria(undefined)).toEqual({
      pageNumber: 0,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('clamps the page size and rejects negative pages', () => {
    expect(normalizeListingCriteria({ pageSize: 5000, pageNumber: -3 })).toEqual({
      pageNumber: 0,
      pageSize: MAX_PAGE_SIZE,
    });
  });

  it('survives non-finite values from untrusted JSON', () => {
    expect(normalizeListingCriteria({ pageSize: Number.NaN, pageNumber: Number.NaN })).toEqual({
      pageNumber: 0,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('only echoes a sort direction when a sort column was asked for', () => {
    expect(normalizeListingCriteria({ pageNumber: 0, pageSize: 10 }).ascending).toBeUndefined();
    expect(
      normalizeListingCriteria({ pageNumber: 0, pageSize: 10, sortColumn: 'accountName' }),
    ).toEqual({ pageNumber: 0, pageSize: 10, sortColumn: 'accountName', ascending: true });
  });
});

describe('searchAccounts', () => {
  it('pages through the whole dataset and echoes the request', () => {
    const page = searchAccounts(accounts, { listingCriteria: { pageNumber: 1, pageSize: 10 } });
    expect(page.totalItemCount).toBe(accounts.length);
    expect(page.items).toHaveLength(10);
    expect(page.items[0]?.identifiers.id).toBe('a_0011');
    expect(page.requestCriteria).toEqual({ pageNumber: 1, pageSize: 10 });
  });

  it('returns an empty page past the end rather than failing', () => {
    const page = searchAccounts(accounts, { listingCriteria: { pageNumber: 999, pageSize: 10 } });
    expect(page.items).toEqual([]);
    expect(page.totalItemCount).toBe(accounts.length);
  });

  it('matches case- and diacritic-insensitively', () => {
    const plain = searchAccounts(accounts, { queryCriteria: 'zoe' }).totalItemCount;
    const accented = searchAccounts(accounts, { queryCriteria: 'Zoë' }).totalItemCount;
    expect(plain).toBeGreaterThan(0);
    expect(accented).toBe(plain);
  });

  it('requires every word of a multi-word query to match', () => {
    const first = searchAccounts(accounts, { queryCriteria: 'james' });
    expect(first.totalItemCount).toBeGreaterThan(0);
    const impossible = searchAccounts(accounts, { queryCriteria: 'james zzzz-nobody' });
    expect(impossible.totalItemCount).toBe(0);
  });

  it('searches the addresses and contact details, not just the name', () => {
    expect(
      searchAccounts(accounts, { queryCriteria: 'example.com' }).totalItemCount,
    ).toBeGreaterThan(0);
  });

  it('sorts by a known column in both directions, leaving the count unchanged', () => {
    const asc = searchAccounts(accounts, {
      listingCriteria: { pageNumber: 0, pageSize: 10, sortColumn: 'accountName', ascending: true },
    });
    const desc = searchAccounts(accounts, {
      listingCriteria: { pageNumber: 0, pageSize: 10, sortColumn: 'accountName', ascending: false },
    });
    expect(asc.totalItemCount).toBe(desc.totalItemCount);
    expect(asc.items[0]?.identifiers.id).not.toBe(desc.items[0]?.identifiers.id);
  });

  it('ignores an unknown sort column instead of throwing', () => {
    const page = searchAccounts(accounts, {
      listingCriteria: { pageNumber: 0, pageSize: 10, sortColumn: 'nope' },
    });
    expect(page.items).toHaveLength(10);
  });
});
