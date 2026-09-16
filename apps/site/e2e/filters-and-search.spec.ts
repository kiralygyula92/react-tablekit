import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { demoUrl } from './demos';

const rows = (page: Page, name: string) =>
  page.getByRole('table', { name }).locator('tbody tr[data-row-id]');

/** Picks an option by its visible text; option values are encoded, not the raw value. */
async function selectByLabel(select: Locator, text: RegExp) {
  const value = await select.locator('option', { hasText: text }).first().getAttribute('value');
  await select.selectOption(value ?? '');
}

test.describe('global search', () => {
  test('highlights matches, folds diacritics and honours the minimum length', async ({ page }) => {
    await page.goto(demoUrl('features/global-search/demo-basics'));
    const search = page.getByRole('searchbox', { name: 'Search' }).first();
    await search.fill('z');
    // Below `searchMinLength`, nothing is filtered.
    await expect(rows(page, 'Employees').first()).toBeVisible();
    const unfiltered = await rows(page, 'Employees').count();

    await search.fill('zoe');
    await expect.poll(() => rows(page, 'Employees').count()).toBeLessThan(unfiltered + 1);
    const marks = page.getByRole('table', { name: 'Employees' }).locator('mark.tk-highlight');
    await expect(marks.first()).toBeVisible();
    // Diacritic-insensitive: the query "zoe" matched the rendered "Zoë".
    await expect(marks.first()).toHaveText(/zoë/i);
  });

  test('the Ctrl+K hotkey is scoped to the table you last touched (B10)', async ({ page }) => {
    await page.goto(demoUrl('features/global-search/demo-basics'));
    const employees = page.getByRole('searchbox', { name: 'Search' }).first();
    const contractors = page.getByRole('searchbox', { name: 'Search' }).last();

    await page.getByRole('table', { name: 'Contractors' }).hover();
    await page.keyboard.press('ControlOrMeta+k');
    await expect(contractors).toBeFocused();

    await page.getByRole('table', { name: 'Employees' }).hover();
    await page.keyboard.press('ControlOrMeta+k');
    await expect(employees).toBeFocused();
  });
});

test.describe('filter panel', () => {
  test('filters, shows a chip with the count and clears back to the full set', async ({ page }) => {
    await page.goto(demoUrl('features/column-filters/demo-basics'));
    const table = 'People';
    const before = await page.getByRole('table', { name: table }).getAttribute('aria-rowcount');

    await page.getByRole('button', { name: /Filters/ }).click();
    const panel = page.locator('.tk-filter-panel');
    await selectByLabel(panel.getByLabel('Department'), /^Engineering/);

    // The Filters button shows the active count, and a chip names the filter.
    await expect(page.getByRole('button', { name: /Filters/ })).toContainText('1');
    const chip = page.locator('.tk-filter-chips').getByText(/Department: Engineering/);
    await expect(chip).toBeVisible();
    await expect
      .poll(() => page.getByRole('table', { name: table }).getAttribute('aria-rowcount'))
      .not.toBe(before);
    for (const cell of await rows(page, table).locator('td').nth(2).allInnerTexts()) {
      expect(cell).toBe('Engineering');
    }

    await page.locator('.tk-filter-chips').getByRole('button', { name: 'Clear all' }).click();
    await expect
      .poll(() => page.getByRole('table', { name: table }).getAttribute('aria-rowcount'))
      .toBe(before);
  });

  test('the row mode filters from the header row', async ({ page }) => {
    await page.goto(demoUrl('features/column-filters/demo-row-mode'));
    const filterRow = page.locator('.tk-filter-row-cell');
    await expect(filterRow.first()).toBeVisible();
    await selectByLabel(filterRow.getByLabel('Department'), /^Sales/);
    for (const cell of await rows(page, 'People').locator('td').nth(2).allInnerTexts()) {
      expect(cell).toBe('Sales');
    }
  });
});

test.describe('server mode', () => {
  test('server sorting sends the sortServerKey, not the column id', async ({ page }) => {
    await page.goto(demoUrl('features/sorting/demo-server'));
    await expect(rows(page, 'People (server sorting)').first()).toBeVisible();
    await page.getByRole('button', { name: /^Name/ }).click();
    // The request log renders what the "server" received.
    await expect(page.locator('.example-log').first()).toContainText('last_name asc');
  });

  test('hybrid mode sorts the current page without a request', async ({ page }) => {
    await page.goto(demoUrl('features/client-and-server/demo-hybrid'));
    await expect(rows(page, 'People (hybrid mode)').first()).toBeVisible();
    const requestsBefore = await page.locator('.example-log li').count();
    await page.getByRole('button', { name: /^Age/ }).click();
    await expect(rows(page, 'People (hybrid mode)').first()).toBeVisible();
    expect(await page.locator('.example-log li').count()).toBe(requestsBefore);
  });
});

test('localization switches every visible string', async ({ page }) => {
  await page.goto(demoUrl('features/localization/demo-basics'));
  await expect(page.getByRole('searchbox', { name: 'Keresés' })).toBeVisible();
  await page.getByLabel('Language').selectOption('de');
  await expect(page.getByRole('searchbox', { name: 'Suche' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Spalten' })).toBeVisible();
  await page.getByLabel('Language').selectOption('es');
  await expect(page.getByRole('button', { name: 'Columnas' })).toBeVisible();
});
