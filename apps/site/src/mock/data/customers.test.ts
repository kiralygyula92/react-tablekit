import { describe, expect, it } from 'vitest';
import { CUSTOMER_COUNT, generateCustomers, getCustomerBodiesOfWater } from './customers';
import { generateWaterTests, WATER_TESTS_PER_POOL } from './waterTests';

describe('customer generator', () => {
  const customers = generateCustomers();

  it('produces 235 customers (24 pages at size 10)', () => {
    expect(customers).toHaveLength(CUSTOMER_COUNT);
    expect(Math.ceil(customers.length / 10)).toBe(24);
  });

  it('is deterministic for the same seed', () => {
    expect(generateCustomers()).toEqual(customers);
  });

  it('produces unique customer and body-of-water ids', () => {
    const ids = customers.map((c) => c.identifiers.id);
    expect(new Set(ids).size).toBe(ids.length);
    const bowIds = customers.flatMap((c) => getCustomerBodiesOfWater(c).map((b) => b.id));
    expect(new Set(bowIds).size).toBe(bowIds.length);
    expect(bowIds.length).toBeGreaterThan(100);
  });

  it('leaves some optional fields missing to exercise "-" fallbacks', () => {
    expect(customers.some((c) => c.displayName.companyName === undefined)).toBe(true);
    expect(customers.some((c) => c.billingAddress === undefined)).toBe(true);
    expect(customers.some((c) => c.serviceLocations === undefined)).toBe(true);
    expect(customers.some((c) => (c.contactInformation?.emailAddresses.length ?? 0) === 0)).toBe(
      true,
    );
  });

  it('includes customers with more than three bodies of water (PoolTags "+N")', () => {
    expect(customers.some((c) => getCustomerBodiesOfWater(c).length > 3)).toBe(true);
  });
});

describe('water-test generator', () => {
  it('produces 57 deterministic tests per pool, newest first', () => {
    const a = generateWaterTests('bow_0001');
    expect(a).toHaveLength(WATER_TESTS_PER_POOL);
    expect(generateWaterTests('bow_0001')).toEqual(a);
    const dates = a.map((t) => Date.parse(t.date));
    expect([...dates].sort((x, y) => y - x)).toEqual(dates);
  });

  it('has tests without a pdfUrl (disabled "View report" action)', () => {
    const tests = generateWaterTests('bow_0002');
    expect(tests.some((t) => t.pdfUrl === undefined)).toBe(true);
    expect(tests.some((t) => t.pdfUrl !== undefined)).toBe(true);
  });
});
