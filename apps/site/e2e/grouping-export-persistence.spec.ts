import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const anyTable = (page: Page, name: string) =>
  page
    .getByRole('table', { name })
    .or(page.getByRole('grid', { name }))
    .or(page.getByRole('treegrid', { name }));

test.describe('grouping and aggregation', () => {
  test('group rows carry a count and expand to their members', async ({ page }) => {
    await page.goto('/examples/grouping-aggregation');
    const table = anyTable(page, 'People');
    const groupRows = table.locator('tbody tr[data-grouped]');
    await expect(groupRows.first()).toBeVisible();

    // The group row shows the value and how many rows it holds.
    await expect(groupRows.first()).toContainText(/\(\d+\)/);

    const before = await table.locator('tbody tr[data-row-id]').count();
    await groupRows.first().getByRole('button').first().click();
    await expect.poll(() => table.locator('tbody tr[data-row-id]').count()).not.toBe(before);

    // The footer aggregates the whole filtered set.
    await expect(page.locator('tfoot')).toBeVisible();
  });
});

test.describe('export', () => {
  test('offers the four scopes and downloads a CSV of the page', async ({ page }) => {
    await page.goto('/examples/export');
    await page.getByRole('button', { name: 'Export' }).first().click();
    const menu = page.getByRole('menu').first();
    for (const label of [
      'Export CSV (current page)',
      'Export CSV (all matching)',
      'Export selected rows',
      'Copy to clipboard',
    ]) {
      await expect(menu.getByRole('menuitem', { name: label })).toBeVisible();
    }

    const download = page.waitForEvent('download');
    await menu.getByRole('menuitem', { name: 'Export CSV (current page)' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe('URL and storage sync', () => {
  test('writes the page to the URL and restores it on reload', async ({ page }) => {
    await page.goto('/examples/url-sync');
    const table = anyTable(page, 'People');
    await expect(table.locator('tbody tr[data-row-id]').first()).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect.poll(() => new URL(page.url()).search).toContain('tk.page=2');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('a shared URL reproduces the view', async ({ page }) => {
    await page.goto('/examples/url-sync?tk.q=ava&tk.sort=age.desc');
    const table = anyTable(page, 'People');
    await expect(table.locator('tbody tr[data-row-id]').first()).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('ava');
    await expect(page.locator('th[data-column-id="age"]')).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });
});

test('keyboard navigation moves between cells and selects a row', async ({ page }) => {
  await page.goto('/examples/keyboard-navigation');
  const table = anyTable(page, 'People');
  await expect(table.locator('tbody tr[data-row-id]').first()).toBeVisible();

  // Enter the grid at its single tab stop.
  await page.locator('[data-column-id][tabindex="0"]').first().focus();
  const focusedColumn = () =>
    page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.columnId);
  const firstColumn = await focusedColumn();

  await page.keyboard.press('ArrowRight');
  await expect.poll(focusedColumn).not.toBe(firstColumn);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await expect(page.locator('tr[aria-selected="true"]')).toHaveCount(1);
});

test('the cards layout replaces the table on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/responsive-cards');
  await expect(page.getByRole('article').first()).toBeVisible();
  await expect(page.locator('.tk-root table')).toHaveCount(0);

  // Back to a table on a wide viewport.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.tk-root table')).toHaveCount(1);
});

test.describe('states', () => {
  test('shows each loading, empty and error state', async ({ page }) => {
    await page.goto('/examples/states');
    const select = page.getByLabel('State');

    await expect(page.locator('.tk-skeleton').first()).toBeVisible();

    await select.selectOption('loading');
    // The English locale spells it "Loading...".
    await expect(page.getByRole('cell', { name: /^Loading/ })).toBeVisible();

    // Scoped to the table: the select options mention the same words.
    await select.selectOption('empty');
    await expect(page.getByRole('cell', { name: 'No rows' })).toBeVisible();

    await select.selectOption('noResults');
    await expect(page.getByRole('cell', { name: /No results match your filters/ })).toBeVisible();

    await select.selectOption('error');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});
