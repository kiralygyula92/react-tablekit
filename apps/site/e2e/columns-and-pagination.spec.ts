import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { demoUrl } from './demos';

const headers = (page: Page) => page.locator('thead th[data-leaf]');
const headerIds = async (page: Page) =>
  headers(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.columnId));

test.describe('column features', () => {
  test('resizes a column with the keyboard', async ({ page }) => {
    await page.goto(demoUrl('features/column-visibility/demo-basics'));
    const handle = page.getByRole('separator', { name: 'Resize column' }).first();
    const before = Number(await handle.getAttribute('aria-valuenow'));
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', String(before + 20));

    // The rendered column really changed width.
    const width = await headers(page)
      .first()
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(width)).toBeGreaterThan(before);
  });

  test('reorders columns by dragging a header', async ({ page }) => {
    await page.goto(demoUrl('features/column-visibility/demo-basics'));
    await expect(headers(page).first()).toBeVisible();
    const before = await headerIds(page);
    const source = headers(page).first();
    const target = headers(page).nth(2);
    await source.dragTo(target);
    const after = await headerIds(page);
    expect(after).not.toEqual(before);
    expect(after).toHaveLength(before.length);
  });

  test('the column menu sorts, pins and hides', async ({ page }) => {
    await page.goto(demoUrl('features/column-visibility/demo-basics'));
    const menuButton = page.getByRole('button', { name: /^Column actions: age/ });
    const ageHeader = page.locator('thead th[data-column-id="age"]');
    await menuButton.click();
    await page.getByRole('menuitem', { name: 'Sort descending' }).click();
    await expect(ageHeader).toHaveAttribute('aria-sort', 'descending');

    await menuButton.click();
    await page.getByRole('menuitem', { name: 'Pin left' }).click();
    await expect(ageHeader).toHaveAttribute('data-pinned', 'left');

    await menuButton.click();
    await page.getByRole('menuitem', { name: 'Hide column' }).click();
    await expect(ageHeader).toHaveCount(0);
  });
});

test('sticky header and footer stay visible while the body scrolls', async ({ page }) => {
  await page.goto(demoUrl('features/sticky-header-and-footer/demo-basics'));
  const container = page.locator('.tk-container');
  // Stickiness lives on the cells (a `thead` cannot be sticky in every browser).
  const headerCell = page.locator('thead th').first();
  await expect(headerCell).toBeVisible();
  const headerTop = await headerCell.evaluate((el) => el.getBoundingClientRect().top);
  await container.evaluate((el) => {
    el.scrollTop = 600;
  });
  await expect
    .poll(() => headerCell.evaluate((el) => Math.round(el.getBoundingClientRect().top)))
    .toBe(Math.round(headerTop));

  // The footer stays pinned to the bottom of the scroll area.
  const footerCell = page.locator('tfoot td, tfoot th').first();
  const containerBottom = await container.evaluate((el) => el.getBoundingClientRect().bottom);
  const footerBottom = await footerCell.evaluate((el) => el.getBoundingClientRect().bottom);
  expect(Math.abs(containerBottom - footerBottom)).toBeLessThan(4);
});

test.describe('pagination modes', () => {
  test('infinite pagination appends the next page when scrolled to the end', async ({ page }) => {
    await page.goto(demoUrl('features/pagination/demo-infinite'));
    const container = page.locator('.tk-container');
    await expect(container.locator('tbody tr[data-row-id]').first()).toBeVisible();
    // The scroll content grows as pages are appended.
    const firstHeight = await container.evaluate((el) => el.scrollHeight);

    for (let i = 0; i < 6; i++) {
      await container.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(300);
    }
    await expect
      .poll(() => container.evaluate((el) => el.scrollHeight))
      .toBeGreaterThan(firstHeight);
  });

  test('cursor pagination moves with next and previous, without a page count', async ({ page }) => {
    await page.goto(demoUrl('features/pagination/demo-cursor'));
    const rows = page.locator('.tk-container tbody tr[data-row-id]');
    await expect(rows.first()).toBeVisible();
    const firstId = await rows.first().getAttribute('data-row-id');

    // No numbered page buttons in cursor mode.
    await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect.poll(() => rows.first().getAttribute('data-row-id')).not.toBe(firstId);
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect.poll(() => rows.first().getAttribute('data-row-id')).toBe(firstId);
  });
});
