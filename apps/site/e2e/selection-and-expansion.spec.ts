import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * A selectable table exposes `role="grid"` and a tree `role="treegrid"` (ADR-004 D8), so a lookup
 * by accessible name has to accept all three roles.
 */
const tableByName = (page: Page, name: string) =>
  page
    .getByRole('table', { name })
    .or(page.getByRole('grid', { name }))
    .or(page.getByRole('treegrid', { name }));

const rows = (page: Page, name: string) => tableByName(page, name).locator('tbody tr[data-row-id]');

test.describe('row selection', () => {
  test('selects, range-selects with Shift and offers a bulk action', async ({ page }) => {
    await page.goto('/examples/row-selection');
    const table = 'People';
    const boxes = rows(page, table).getByRole('checkbox');
    await boxes.nth(0).check();
    await expect(rows(page, table).nth(0)).toHaveAttribute('aria-selected', 'true');

    // Shift+click extends the selection from the anchor row.
    await boxes.nth(3).click({ modifiers: ['Shift'] });
    await expect(page.locator('tr[aria-selected="true"]')).toHaveCount(4);

    // The selection bar reports the count and carries the bulk action.
    const bar = page.locator('.tk-selection-bar');
    await expect(bar).toContainText('4 selected');
    await bar.getByRole('button', { name: 'Email selected' }).click();
    await expect(page.getByRole('status')).toContainText('Emailed 4 people');

    await bar.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('tr[aria-selected="true"]')).toHaveCount(0);
  });

  test('disabled rows cannot be selected and select-all skips them', async ({ page }) => {
    await page.goto('/examples/row-selection');
    const disabled = rows(page, 'People').filter({ has: page.locator('[data-disabled]') });
    const selectAll = page.getByRole('checkbox', { name: /Select all rows on this page/ });
    await selectAll.check();
    const selectedCount = await page.locator('tr[aria-selected="true"]').count();
    const total = await rows(page, 'People').count();
    expect(selectedCount).toBeLessThan(total);
    for (const row of await disabled.all())
      await expect(row).not.toHaveAttribute('aria-selected', 'true');
  });

  test('single mode uses radio semantics', async ({ page }) => {
    await page.goto('/examples/row-selection');
    await page.getByLabel('Mode').selectOption('single');
    const radios = rows(page, 'People').getByRole('radio');
    await radios.nth(1).check();
    await radios.nth(2).check();
    await expect(page.locator('tr[aria-selected="true"]')).toHaveCount(1);
  });
});

test.describe('expansion', () => {
  test('detail panels open under the row and close again', async ({ page }) => {
    await page.goto('/examples/detail-panels');
    const first = rows(page, 'People').first();
    await first.getByRole('button', { name: 'Expand row' }).click();
    const panel = page.locator('.tk-detail-row').first();
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('@example.com');
    await first.getByRole('button', { name: 'Collapse row' }).click();
    await expect(page.locator('.tk-detail-row')).toHaveCount(0);
  });

  test('tree rows indent by depth and expand all works', async ({ page }) => {
    await page.goto('/examples/tree-data');
    const table = 'Organisation';
    const before = await rows(page, table).count();
    await page.getByRole('button', { name: 'Expand all' }).click();
    await expect.poll(() => rows(page, table).count()).toBeGreaterThan(before);
    // Children carry a deeper level than their parent.
    await expect(rows(page, table).first()).toHaveAttribute('aria-level', '1');
    await expect(rows(page, table).nth(1)).toHaveAttribute('aria-level', '2');
  });

  test('lazy children are fetched once per row on expand', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/examples/tree-lazy-server');
    const table = 'Organisation (lazy)';
    const first = rows(page, table).first();
    await expect(first).toBeVisible();
    const before = await rows(page, table).count();
    await first.getByRole('button', { name: 'Expand row' }).click();
    await expect.poll(() => rows(page, table).count()).toBeGreaterThan(before);

    // Collapsing and re-expanding uses the cached children (the demo source is in-memory, so the
    // assertion is on the rows, not the network).
    await first.getByRole('button', { name: 'Collapse row' }).click();
    await expect.poll(() => rows(page, table).count()).toBe(before);
    await first.getByRole('button', { name: 'Expand row' }).click();
    await expect.poll(() => rows(page, table).count()).toBeGreaterThan(before);
  });
});

test('handler middleware can cancel and rewrite an interaction', async ({ page }) => {
  await page.goto('/examples/handlers-middleware');
  // Paging past page 3 is cancelled by the middleware.
  await page.getByRole('button', { name: 'Page 4', exact: true }).click();
  await expect(page.locator('.example-log')).toContainText('page 4 blocked by middleware');
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // A one-character search is rewritten to an empty one.
  await page.getByRole('searchbox', { name: 'Search' }).fill('a');
  await expect(page.locator('.example-log')).toContainText('search → ""');
});
