import { expect, test } from './fixtures';

/**
 * Visual baselines for the showcase pages at 1440 and 390 (docs/09 §4). Font rendering differs per
 * OS, so baselines are stored per platform and the suite runs as its own Playwright project:
 * `pnpm e2e:visual` (add `--update-snapshots` after an intended change).
 */

const PAGES = [
  { slug: 'showcase-account-list', table: 'account list table' },
  { slug: 'showcase-asset-list', table: 'asset list table' },
  { slug: 'showcase-readings', table: 'reading history table' },
  { slug: 'showcase-asset-picker', table: 'asset selection table' },
] as const;
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
] as const;

for (const { slug, table } of PAGES) {
  for (const viewport of WIDTHS) {
    test(`${slug} at ${viewport.width}px`, { tag: '@visual' }, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/embed/${slug}?mockLatency=0`);
      // A selectable table is a grid and a tree a treegrid (ADR-004 D8).
      const target = page
        .getByRole('table', { name: table })
        .or(page.getByRole('grid', { name: table }))
        .or(page.getByRole('treegrid', { name: table }));
      await expect(target.locator('tbody tr[data-row-id]').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.tk-root')).toHaveScreenshot(`${slug}-${viewport.width}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.002,
      });
    });
  }
}
