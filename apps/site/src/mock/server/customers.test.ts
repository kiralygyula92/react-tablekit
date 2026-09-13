import { describe, expect, it } from 'vitest';
import { generateCustomers } from '../data/customers';
import type { Customer } from '../types';
import { fold, normalizeListingCriteria, searchCustomers } from './customers';

const db = generateCustomers();

describe('normalizeListingCriteria', () => {
  it('defaults to page 0 / size 10', () => {
    expect(normalizeListingCriteria(undefined)).toEqual({ pageNumber: 0, pageSize: 10 });
  });

  it('clamps invalid values', () => {
    expect(normalizeListingCriteria({ pageNumber: -3, pageSize: 5000 })).toEqual({
      pageNumber: 0,
      pageSize: 100,
    });
    expect(normalizeListingCriteria({ pageNumber: Number.NaN, pageSize: 0 })).toEqual({
      pageNumber: 0,
      pageSize: 10,
    });
  });

  it('keeps sort criteria and defaults ascending to true', () => {
    expect(normalizeListingCriteria({ sortColumn: 'companyName' })).toMatchObject({
      sortColumn: 'companyName',
      ascending: true,
    });
  });
});

describe('searchCustomers (Skimmer contract)', () => {
  it('returns a page, the total and the echoed criteria', () => {
    const res = searchCustomers(db, { listingCriteria: { pageNumber: 2, pageSize: 10 } });
    expect(res.items).toHaveLength(10);
    expect(res.totalItemCount).toBe(235);
    expect(res.requestCriteria).toEqual({ pageNumber: 2, pageSize: 10 });
    expect(res.items[0]?.identifiers.id).toBe('c_0021');
  });

  it('returns the 5-row remainder on the last page and nothing beyond it', () => {
    expect(searchCustomers(db, { listingCriteria: { pageNumber: 23 } }).items).toHaveLength(5);
    const beyond = searchCustomers(db, { listingCriteria: { pageNumber: 30 } });
    expect(beyond.items).toHaveLength(0);
    expect(beyond.totalItemCount).toBe(235);
  });

  it('matches case- and diacritic-insensitively, AND across words', () => {
    const target = db.find((c) => /[À-ž]/.test(c.displayName.lastName))!;
    expect(target).toBeDefined();
    const query = fold(target.displayName.lastName).toUpperCase();
    const res = searchCustomers(db, { queryCriteria: query, listingCriteria: { pageSize: 100 } });
    expect(res.items.map((c) => c.identifiers.id)).toContain(target.identifiers.id);

    const both = searchCustomers(db, {
      queryCriteria: `${target.displayName.firstName} ${fold(target.displayName.lastName)}`,
      listingCriteria: { pageSize: 100 },
    });
    expect(both.totalItemCount).toBeGreaterThan(0);
    expect(both.totalItemCount).toBeLessThanOrEqual(res.totalItemCount);
  });

  it('returns no rows for a query that matches nothing', () => {
    const res = searchCustomers(db, { queryCriteria: 'zzzz-no-such-customer' });
    expect(res).toMatchObject({ items: [], totalItemCount: 0 });
  });

  it('sorts stably by the requested column in both directions', () => {
    const asc = searchCustomers(db, {
      listingCriteria: { sortColumn: 'bodiesOfWater', ascending: true, pageSize: 100 },
    }).items;
    const desc = searchCustomers(db, {
      listingCriteria: { sortColumn: 'bodiesOfWater', ascending: false, pageSize: 100 },
    }).items;
    const count = (c: Customer) =>
      (c.serviceLocations ?? []).reduce((n, s) => n + s.bodiesOfWater.length, 0);
    const ascCounts = asc.map(count);
    expect([...ascCounts].sort((a, b) => a - b)).toEqual(ascCounts);
    expect(count(desc[0]!)).toBeGreaterThanOrEqual(count(desc[desc.length - 1]!));
  });

  it('does not mutate the database order', () => {
    searchCustomers(db, { listingCriteria: { sortColumn: 'customerName' } });
    expect(db[0]?.identifiers.id).toBe('c_0001');
  });
});
