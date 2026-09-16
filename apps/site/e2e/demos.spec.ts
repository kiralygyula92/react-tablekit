import type { Page } from '@playwright/test';
import {
  CLASSIC_HEADER_CONTRAST_EXCEPTION,
  expect,
  expectNoA11yViolations,
  test,
} from './fixtures';
import { allDemoIds, CLASSIC_DEMOS, demoUrl } from './demos';

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

// The list comes from the filesystem, so a new demo is covered the moment it is added and a
// deleted one cannot leave a stale test behind.
const DEMO_IDS = allDemoIds().map((id) => id.replace(/^react-tablekit\//, ''));

test('there are demos to test', () => {
  expect(DEMO_IDS.length).toBeGreaterThan(0);
});

for (const id of DEMO_IDS) {
  test.describe(`demo ${id}`, () => {
    test('renders, has no console errors and passes axe', async ({ page }) => {
      await page.goto(demoUrl(id));
      await expect(demoContent(page).first()).toBeVisible();
      await expectNoA11yViolations(
        page,
        CLASSIC_DEMOS.has(id) ? { contrastExceptions: [CLASSIC_HEADER_CONTRAST_EXCEPTION] } : {},
      );
    });

    test('fits 375px without page-level horizontal overflow', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(demoUrl(id));
      await expect(demoContent(page).first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test('a demo on a page offers its own source', async ({ page }) => {
  await page.goto('/react-tablekit/sorting/?mockLatency=0');
  // Exact: the page also carries a "Server sorting" demo, whose name contains this one.
  const demo = page.getByRole('region', { name: 'Sorting', exact: true });
  await expect(demo.locator('.tk-root tbody tr[data-row-id]').first()).toBeVisible();
  const showSource = demo.getByRole('button', { name: 'Show source' });
  await expect(showSource).toBeEnabled();
  await showSource.click();
  await expect(demo.locator('.demo__source')).toContainText('export default function');
});
