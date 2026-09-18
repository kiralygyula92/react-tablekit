import { expect, test } from './fixtures';
import { demoUrl } from './demos';

/**
 * Visual baselines for the showcase pages at 1440 and 390. Font rendering differs per
 * OS, so baselines are stored per platform and the suite runs as its own Playwright project:
 * `pnpm e2e:visual` (add `--update-snapshots` after an intended change).
 */

const PAGES = [
  { id: 'demos/account-list/demo-basics', name: 'account-list', table: 'account list table' },
  { id: 'demos/asset-list/demo-basics', name: 'asset-list', table: 'asset list table' },
  {
    id: 'demos/reading-history/demo-basics',
    name: 'reading-history',
    table: 'reading history table',
  },
  { id: 'demos/asset-picker/demo-basics', name: 'asset-picker', table: 'asset selection table' },
] as const;
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
] as const;

for (const { id, name, table } of PAGES) {
  for (const viewport of WIDTHS) {
    test(`${name} at ${viewport.width}px`, { tag: '@visual' }, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(demoUrl(id));
      // A selectable table is a grid and a tree a treegrid.
      const target = page
        .getByRole('table', { name: table })
        .or(page.getByRole('grid', { name: table }))
        .or(page.getByRole('treegrid', { name: table }));
      await expect(target.locator('tbody tr[data-row-id]').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.tk-root')).toHaveScreenshot(`${name}-${viewport.width}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.002,
      });
    });
  }
}
