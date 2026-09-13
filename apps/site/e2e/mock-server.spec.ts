import { expect, test } from './fixtures';

interface PagedResponse {
  items: { identifiers: { id: string } }[];
  totalItemCount: number;
  requestCriteria: { pageNumber: number; pageSize: number };
}

test.describe('MSW mock server', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mockLatency=0');
    // Set by mock/ready.ts once the service worker is active.
    await expect(page.locator('html')).toHaveAttribute('data-mock-ready', 'true');
  });

  test('serves the Skimmer customer search contract', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/customers/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          queryCriteria: '',
          listingCriteria: { pageNumber: 1, pageSize: 10 },
        }),
      });
      return (await r.json()) as PagedResponse;
    });
    expect(res.totalItemCount).toBe(235);
    expect(res.items).toHaveLength(10);
    expect(res.items[0]?.identifiers.id).toBe('c_0011');
    expect(res.requestCriteria).toEqual({ pageNumber: 1, pageSize: 10 });
  });

  test('filters by queryCriteria', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/customers/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queryCriteria: 'zzzz-nobody' }),
      });
      return (await r.json()) as PagedResponse;
    });
    expect(res.totalItemCount).toBe(0);
  });

  test('serves water-test history pages', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/pools/bow_0001/history?pageNumber=5&pageSize=10');
      return (await r.json()) as PagedResponse;
    });
    expect(res.totalItemCount).toBe(57);
    expect(res.items).toHaveLength(7);
  });
});
