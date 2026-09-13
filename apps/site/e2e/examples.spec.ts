import type { Page } from '@playwright/test';
import {
  CLASSIC_HEADER_CONTRAST_EXCEPTION,
  expect,
  expectNoA11yViolations,
  test,
} from './fixtures';

/**
 * A demo has rendered when the table shows data rows, cards (the mobile layout), or a deliberate
 * state such as the skeleton, empty or error row.
 *
 * The headless example renders none of those by design: it drives the engine with `useDataTable`
 * and draws its own cards, so there is no `.tk-root` at all. Its cards count as content.
 */
const demoContent = (page: Page) =>
  page.locator(
    // `article` is matched by tag: a native <article> has an implicit role, not a role attribute.
    '.tk-root tbody tr[data-row-id], .tk-root article, .tk-root .tk-skeleton, .tk-root .tk-state, .headless-card',
  );

/** Mirrors src/examples/registry.ts (the registry uses import.meta.glob, so it can't load here). */
const EXAMPLES = [
  { slug: 'parity-customer-list', title: 'Parity: Customer List', parity: true },
  { slug: 'parity-pool-list', title: 'Parity: Pool List', parity: true },
  { slug: 'parity-water-test-history', title: 'Parity: Water-test history', parity: true },
  {
    slug: 'parity-body-of-water-selection',
    title: 'Parity: Body-of-water selection',
    parity: true,
  },
  { slug: 'grouping-aggregation', title: 'Grouping and aggregation', parity: false },
  { slug: 'export', title: 'Export', parity: false },
  { slug: 'url-sync', title: 'URL and storage sync', parity: false },
  { slug: 'keyboard-navigation', title: 'Keyboard navigation', parity: false },
  { slug: 'responsive-cards', title: 'Responsive cards', parity: false },
  { slug: 'states', title: 'Loading, empty and error states', parity: false },
  { slug: 'column-features', title: 'Column features', parity: false },
  { slug: 'sticky-header-footer', title: 'Sticky header and footer', parity: false },
  { slug: 'virtualization-100k', title: 'Virtualization: 100k rows', parity: false },
  { slug: 'infinite-scroll', title: 'Infinite scroll', parity: false },
  { slug: 'cursor-pagination', title: 'Cursor pagination', parity: false },
  { slug: 'row-selection', title: 'Row selection', parity: false },
  { slug: 'detail-panels', title: 'Detail panels', parity: false },
  { slug: 'tree-data', title: 'Tree data', parity: false },
  { slug: 'tree-lazy-server', title: 'Tree: lazy server children', parity: false },
  { slug: 'row-overrides', title: 'Row overrides', parity: false },
  { slug: 'handlers-middleware', title: 'Handler middleware', parity: false },
  { slug: 'basic', title: 'Basic', parity: false },
  { slug: 'global-search', title: 'Global search', parity: false },
  { slug: 'filters-panel', title: 'Filters: panel', parity: false },
  { slug: 'filters-row', title: 'Filters: row', parity: false },
  {
    slug: 'filters-popover-and-column-menu',
    title: 'Filters: popover and column menu',
    parity: false,
  },
  { slug: 'filters-server', title: 'Filters: server', parity: false },
  { slug: 'server-sorting', title: 'Server sorting', parity: false },
  { slug: 'hybrid-mode', title: 'Hybrid mode', parity: false },
  { slug: 'localization', title: 'Localization', parity: false },
  { slug: 'pagination-variants', title: 'Pagination variants', parity: false },
  { slug: 'client-vs-server', title: 'Client vs. server', parity: false },
  { slug: 'column-types', title: 'Column types', parity: false },
  { slug: 'client-sorting', title: 'Client sorting', parity: false },
  { slug: 'column-pinning', title: 'Column pinning', parity: false },
  { slug: 'column-sizing', title: 'Column sizing', parity: false },
  {
    slug: 'column-ordering-visibility',
    title: 'Column ordering and visibility',
    parity: false,
  },
  { slug: 'cell-building-blocks', title: 'Cell building blocks', parity: false },
  { slug: 'slots-custom-components', title: 'Slots: custom components', parity: false },
  { slug: 'slots-design-system', title: 'Slots: design system', parity: false },
  { slug: 'theming-presets', title: 'Theming: presets', parity: false },
  { slug: 'theming-custom', title: 'Theming: custom', parity: false },
  { slug: 'density', title: 'Density', parity: false },
  { slug: 'composable-layout', title: 'Composable layout', parity: false },
  { slug: 'headless', title: 'Headless', parity: false },
  { slug: 'react-query-recipe', title: 'React Query recipe', parity: false },
] as const;

test('the gallery lists every example and filters by tag', async ({ page }) => {
  await page.goto('/examples');
  const cards = page.locator('.site-card');
  await expect(cards).toHaveCount(EXAMPLES.length);
  for (const { title } of EXAMPLES)
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  await page.getByLabel('Filter by tag').selectOption('parity');
  await expect(cards).toHaveCount(EXAMPLES.filter((e) => e.parity).length);
  await page.getByRole('link', { name: 'Parity: Customer List' }).click();
  await expect(page).toHaveURL(/\/examples\/parity-customer-list$/);
});

for (const { slug, title, parity } of EXAMPLES) {
  test.describe(`example ${slug}`, () => {
    test('renders its demo, has no console errors and passes axe', async ({ page }) => {
      await page.goto(`/examples/${slug}?mockLatency=0`);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      // Every example renders at least one table with data rows.
      await expect(demoContent(page).first()).toBeVisible();
      await expectNoA11yViolations(
        page,
        parity ? { contrastExceptions: [CLASSIC_HEADER_CONTRAST_EXCEPTION] } : {},
      );
    });

    test('shows its source in the Code tab', async ({ page }) => {
      await page.goto(`/examples/${slug}?mockLatency=0`);
      await page.getByRole('tab', { name: 'Code' }).click();
      await expect(page.getByRole('tabpanel')).toContainText('export default function');
    });

    test('embeds at 375px without page-level horizontal overflow', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(`/embed/${slug}?mockLatency=0`);
      await expect(demoContent(page).first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test('the width presets render the demo in an iframe', async ({ page }) => {
  await page.goto('/examples/basic?mockLatency=0');
  await page.getByRole('radio', { name: '375' }).check();
  const frame = page.frameLocator('iframe[title="Basic at 375px"]');
  await expect(frame.locator('.tk-root table tbody tr[data-row-id]').first()).toBeVisible();
});
