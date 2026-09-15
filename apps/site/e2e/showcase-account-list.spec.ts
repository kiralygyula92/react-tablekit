import type { Page, Request } from '@playwright/test';
import { expect, test } from './fixtures';

interface SearchBody {
  queryCriteria?: string;
  listingCriteria?: { pageNumber: number; pageSize: number };
}

/** Records every account-search request body the table sends. */
function recordSearches(page: Page): SearchBody[] {
  const bodies: SearchBody[] = [];
  page.on('request', (req: Request) => {
    if (req.method() === 'POST' && req.url().endsWith('/api/accounts/search')) {
      bodies.push(JSON.parse(req.postData() ?? '{}') as SearchBody);
    }
  });
  return bodies;
}

const table = (page: Page) => page.getByRole('table', { name: 'account list table' });
const dataRows = (page: Page) => table(page).locator('tbody tr[data-row-id]');
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search' });

async function open(page: Page, latency = 0) {
  const bodies = recordSearches(page);
  await page.goto(`/examples/showcase-account-list?mockLatency=${latency}`);
  await expect(dataRows(page)).toHaveCount(10);
  return bodies;
}

test('initial load shows the "Loading..." row, then 10 accounts from page 0', async ({ page }) => {
  const bodies = recordSearches(page);
  await page.goto('/examples/showcase-account-list?mockLatency=1000');
  await expect(table(page).getByRole('cell', { name: 'Loading...' })).toBeVisible();
  await expect(dataRows(page)).toHaveCount(10);
  expect(bodies).toEqual([{ queryCriteria: '', listingCriteria: { pageNumber: 0, pageSize: 10 } }]);
});

test('search is debounced (300ms) and ignores terms shorter than 3 characters', async ({
  page,
}) => {
  const bodies = await open(page);
  const before = bodies.length;
  await search(page).pressSequentially('Mi', { delay: 40 });
  await page.waitForTimeout(600);
  expect(bodies.length, 'no request below min length').toBe(before);

  await search(page).pressSequentially('chael', { delay: 40 });
  await expect.poll(() => bodies.length).toBe(before + 1);
  await page.waitForTimeout(500);
  expect(bodies.slice(before)).toEqual([
    { queryCriteria: 'Michael', listingCriteria: { pageNumber: 0, pageSize: 10 } },
  ]);
  await expect(dataRows(page).first()).toContainText('Michael');
});

test('searching resets to the first page', async ({ page }) => {
  const bodies = await open(page);
  await page.getByRole('button', { name: 'Page 3', exact: true }).click();
  await expect.poll(() => bodies.at(-1)?.listingCriteria?.pageNumber).toBe(2);
  await expect(page.getByRole('button', { name: 'Page 3', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // Matches every account with an email, so the result still has several pages.
  await search(page).fill('example');
  await expect
    .poll(() => bodies.at(-1))
    .toEqual({ queryCriteria: 'example', listingCriteria: { pageNumber: 0, pageSize: 10 } });
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('Ctrl/Cmd+K focuses and selects the search', async ({ page }) => {
  await open(page);
  await search(page).fill('ab');
  await table(page).locator('tbody tr[data-row-id]').first().click();
  await expect(search(page)).not.toBeFocused();
  await page.keyboard.press('ControlOrMeta+k');
  await expect(search(page)).toBeFocused();
  expect(
    await search(page).evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!),
  ).toBe(2);
});

test('refetching shows a blocking overlay below the header and keeps the rows', async ({
  page,
}) => {
  await open(page, 800);
  await page.getByRole('button', { name: 'Next' }).click();
  const overlay = page.locator('.tk-container .tk-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute('data-blocking', 'true');
  await expect(dataRows(page)).toHaveCount(10);
  // The overlay starts at the bottom of the header row, never covering it.
  const [overlayBox, headBox] = await Promise.all([
    overlay.boundingBox(),
    table(page).locator('thead').boundingBox(),
  ]);
  expect(Math.round(overlayBox!.y)).toBeGreaterThanOrEqual(
    Math.floor(headBox!.y + headBox!.height) - 1,
  );
  await expect(overlay).toBeHidden();
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('no matches shows "No accounts found"', async ({ page }) => {
  await open(page);
  await search(page).fill('zzzz-nobody');
  await expect(table(page).getByText('No accounts found')).toBeVisible();
  await expect(dataRows(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
});

test('the pinned edit action opens the edit dialog', async ({ page }) => {
  await open(page);
  // The first data cell is the row header (`<th scope="row">`).
  const firstName = await dataRows(page).first().getByRole('rowheader').innerText();
  await dataRows(page).first().getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('dialog', { name: `Edit ${firstName}` })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('mobile (<960px) uses compact pagination on one line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const pagination = page.locator('.tk-pagination');
  await expect(pagination).toHaveAttribute('data-variant', 'compact');
  const pages = pagination.locator('.tk-pagination__pages');
  const box = await pages.boundingBox();
  const item = await pages.locator('.tk-page-button').first().boundingBox();
  expect(box!.height).toBeLessThan(item!.height * 1.5);
});
