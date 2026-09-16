import { expect, test } from './fixtures';
import { demoUrl } from './demos';

interface PagedResponse {
  items: { identifiers: { id: string } }[];
  totalItemCount: number;
  requestCriteria: { pageNumber: number; pageSize: number };
}

test.describe('MSW mock server', () => {
  test.beforeEach(async ({ page }) => {
    // The worker starts on the first `mockFetch`, so this opens a demo that makes one rather
    // than a page that might not.
    await page.goto(demoUrl('demos/account-list/demo-basics'));
    // Set by mock/ready.ts once the service worker is active.
    await expect(page.locator('html')).toHaveAttribute('data-mock-ready', 'true');
  });

  test('serves the account search contract', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/accounts/search', {
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
    expect(res.items[0]?.identifiers.id).toBe('a_0011');
    expect(res.requestCriteria).toEqual({ pageNumber: 1, pageSize: 10 });
  });

  test('filters by queryCriteria', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/accounts/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queryCriteria: 'zzzz-nobody' }),
      });
      return (await r.json()) as PagedResponse;
    });
    expect(res.totalItemCount).toBe(0);
  });

  test('serves reading history pages', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/assets/as_0001/readings?pageNumber=5&pageSize=10');
      return (await r.json()) as PagedResponse;
    });
    expect(res.totalItemCount).toBe(57);
    expect(res.items).toHaveLength(7);
  });
});
