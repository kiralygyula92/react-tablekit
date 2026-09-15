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
  { slug: 'showcase-account-list', title: 'Showcase: account list', classic: true },
  { slug: 'showcase-asset-list', title: 'Showcase: asset list', classic: true },
  { slug: 'showcase-readings', title: 'Showcase: reading history', classic: true },
  { slug: 'showcase-asset-picker', title: 'Showcase: asset picker', classic: true },
  { slug: 'grouping-aggregation', title: 'Grouping and aggregation', classic: false },
  { slug: 'export', title: 'Export', classic: false },
  { slug: 'url-sync', title: 'URL and storage sync', classic: false },
  { slug: 'keyboard-navigation', title: 'Keyboard navigation', classic: false },
  { slug: 'responsive-cards', title: 'Responsive cards', classic: false },
  { slug: 'states', title: 'Loading, empty and error states', classic: false },
  { slug: 'column-features', title: 'Column features', classic: false },
  { slug: 'sticky-header-footer', title: 'Sticky header and footer', classic: false },
  { slug: 'virtualization-100k', title: 'Virtualization: 100k rows', classic: false },
  { slug: 'infinite-scroll', title: 'Infinite scroll', classic: false },
  { slug: 'cursor-pagination', title: 'Cursor pagination', classic: false },
  { slug: 'row-selection', title: 'Row selection', classic: false },
  { slug: 'detail-panels', title: 'Detail panels', classic: false },
  { slug: 'tree-data', title: 'Tree data', classic: false },
  { slug: 'tree-lazy-server', title: 'Tree: lazy server children', classic: false },
  { slug: 'row-overrides', title: 'Row overrides', classic: false },
  { slug: 'handlers-middleware', title: 'Handler middleware', classic: false },
  { slug: 'basic', title: 'Basic', classic: false },
  { slug: 'global-search', title: 'Global search', classic: false },
  { slug: 'filters-panel', title: 'Filters: panel', classic: false },
  { slug: 'filters-row', title: 'Filters: row', classic: false },
  {
    slug: 'filters-popover-and-column-menu',
    title: 'Filters: popover and column menu',
    classic: false,
  },
  { slug: 'filters-server', title: 'Filters: server', classic: false },
  { slug: 'server-sorting', title: 'Server sorting', classic: false },
  { slug: 'hybrid-mode', title: 'Hybrid mode', classic: false },
  { slug: 'localization', title: 'Localization', classic: false },
  { slug: 'pagination-variants', title: 'Pagination variants', classic: false },
  { slug: 'client-vs-server', title: 'Client vs. server', classic: false },
  { slug: 'column-types', title: 'Column types', classic: false },
  { slug: 'client-sorting', title: 'Client sorting', classic: false },
  { slug: 'column-pinning', title: 'Column pinning', classic: false },
  { slug: 'column-sizing', title: 'Column sizing', classic: false },
  {
    slug: 'column-ordering-visibility',
    title: 'Column ordering and visibility',
    classic: false,
  },
  { slug: 'cell-building-blocks', title: 'Cell building blocks', classic: false },
  { slug: 'slots-custom-components', title: 'Slots: custom components', classic: false },
  { slug: 'slots-design-system', title: 'Slots: design system', classic: false },
  { slug: 'theming-presets', title: 'Theming: presets', classic: false },
  { slug: 'theming-custom', title: 'Theming: custom', classic: false },
  { slug: 'density', title: 'Density', classic: false },
  { slug: 'composable-layout', title: 'Composable layout', classic: false },
  { slug: 'headless', title: 'Headless', classic: false },
  { slug: 'react-query-recipe', title: 'React Query recipe', classic: false },
] as const;

test('the gallery lists every example and filters by tag', async ({ page }) => {
  await page.goto('/examples');
  const cards = page.locator('.site-card');
  await expect(cards).toHaveCount(EXAMPLES.length);
  for (const { title } of EXAMPLES)
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  await page.getByLabel('Filter by tag').selectOption('showcase');
  await expect(cards).toHaveCount(EXAMPLES.filter((e) => e.classic).length);
  await page.getByRole('link', { name: 'Showcase: account list' }).click();
  await expect(page).toHaveURL(/\/examples\/showcase-account-list$/);
});

for (const { slug, title, classic } of EXAMPLES) {
  test.describe(`example ${slug}`, () => {
    test('renders its demo, has no console errors and passes axe', async ({ page }) => {
      await page.goto(`/examples/${slug}?mockLatency=0`);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      // Every example renders at least one table with data rows.
      await expect(demoContent(page).first()).toBeVisible();
      await expectNoA11yViolations(
        page,
        classic ? { contrastExceptions: [CLASSIC_HEADER_CONTRAST_EXCEPTION] } : {},
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
