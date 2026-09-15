import { expect, expectNoA11yViolations, test } from './fixtures';

const ROUTES = [
  { path: '/', heading: 'react-tablekit' },
  { path: '/docs/getting-started', heading: 'Getting started' },
  { path: '/docs/guides/client-vs-server', heading: 'Client vs. server' },
  { path: '/docs/guides/server-data', heading: 'Server data' },
  { path: '/docs/guides/columns', heading: 'Columns' },
  { path: '/docs/guides/theming', heading: 'Theming' },
  { path: '/docs/guides/accessibility', heading: 'Accessibility' },
  { path: '/docs/guides/sorting', heading: 'Sorting' },
  { path: '/docs/guides/filtering', heading: 'Filtering' },
  { path: '/docs/guides/search', heading: 'Global search' },
  { path: '/docs/guides/pagination', heading: 'Pagination' },
  { path: '/docs/guides/selection', heading: 'Selection' },
  { path: '/docs/guides/expansion', heading: 'Expansion and detail panels' },
  { path: '/docs/guides/grouping', heading: 'Grouping and aggregation' },
  { path: '/docs/guides/pinning', heading: 'Column pinning' },
  { path: '/docs/guides/sizing', heading: 'Column sizing' },
  { path: '/docs/guides/ordering-and-visibility', heading: 'Ordering and visibility' },
  { path: '/docs/guides/virtualization', heading: 'Virtualization' },
  { path: '/docs/guides/keyboard', heading: 'Keyboard navigation' },
  { path: '/docs/guides/export', heading: 'Export' },
  { path: '/docs/guides/persistence', heading: 'Persistence' },
  { path: '/docs/guides/responsive', heading: 'Responsive' },
  { path: '/docs/guides/customization', heading: 'Customization' },
  { path: '/docs/guides/localization', heading: 'Localization' },
  { path: '/docs/versioning', heading: 'Versioning policy' },
  { path: '/changelog', heading: 'Changelog' },
  { path: '/examples', heading: 'Examples' },
  { path: '/playground', heading: 'Playground' },
  { path: '/theme-editor', heading: 'Theme editor' },
  { path: '/api', heading: 'API reference' },
  { path: '/api/data-table', heading: '<DataTable> props' },
  { path: '/api/column-def', heading: 'ColumnDef' },
  { path: '/api/instance', heading: 'TableInstance' },
  { path: '/api/state', heading: 'State and query' },
  { path: '/api/hooks', heading: 'Hooks' },
  { path: '/api/utilities', heading: 'Utilities' },
  { path: '/api/slots', heading: 'Slots' },
  { path: '/api/handlers', heading: 'Handlers' },
  { path: '/api/theme-tokens', heading: 'Theme tokens' },
  { path: '/api/localization', heading: 'Localization' },
  { path: '/api/icons', heading: 'Icons' },
  { path: '/does-not-exist', heading: 'Page not found' },
] as const;

for (const { path, heading } of ROUTES) {
  test(`${path} renders without console errors and passes axe`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expectNoA11yViolations(page);
  });
}

/**
 * The generated API pages once rendered a heading and nothing else, because the symbols
 * resolved to empty re-export stubs. Asserting the heading alone did not catch it, so each
 * page has to show real documented members.
 */
const API_PAGES = [
  { path: '/api/data-table', symbol: 'DataTableProps', member: 'enableRowSelection' },
  { path: '/api/column-def', symbol: 'ColumnDefBase', member: 'cell' },
  { path: '/api/instance', symbol: 'TableInstance', member: 'getRowModel' },
  { path: '/api/state', symbol: 'TableState', member: 'pagination' },
] as const;

for (const { path, symbol, member } of API_PAGES) {
  test(`${path} documents its members`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('table').first()).toBeVisible();

    // A long member table virtualizes — `DataTableProps` alone documents 217 entries — so only
    // the visible window is in the DOM. Filter the row into view instead of assuming it is
    // rendered, which also keeps this test honest if another symbol grows past the threshold.
    await page.getByPlaceholder(`Filter ${symbol}`).fill(member);

    // Each member name carries an anchor id, which is what `/api/instance#getRowModel` links to.
    // The cell's accessible name would also include the " required" marker, and the same name can
    // appear under two symbols on one page (`TableState.pagination`, `TableQuery.pagination`).
    await expect(page.locator(`#${member}`).first()).toBeVisible();
  });
}

test('a long virtualized member table scrolls all the way to its last row', async ({ page }) => {
  // Regression: the table body virtualizes inside its scroll container, but React attaches the
  // container's ref only after the body's layout effect has run. The virtualizer gave up on that
  // first attempt and never followed the scroll, so this 217-row table showed its first 9 rows
  // (ending at `autoResetPageIndex`) however far it was scrolled. It is a browser-only ordering
  // effect, which is why this lives in e2e rather than jsdom.
  await page.goto('/api/data-table');
  const table = page
    .getByRole('grid', { name: 'DataTableProps members' })
    .or(page.getByRole('table', { name: 'DataTableProps members' }));
  await expect(table.locator('tbody tr.tk-row').first()).toBeVisible();
  const scroller = table.locator('xpath=ancestor::div[contains(@class,"tk-container")][1]');
  const renderedIds = () =>
    table
      .locator('tbody tr.tk-row')
      .evaluateAll((rows) => rows.map((r) => r.querySelector('[id]')?.id ?? ''));
  const firstWindow = await renderedIds();

  await expect(async () => {
    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const atBottom = await scroller.evaluate(
      (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
    );
    expect(atBottom).toBe(true);
    const ids = await renderedIds();
    expect(ids).not.toContain(firstWindow[0]);
    // At the bottom the last row is rendered: nothing stands in for further rows after it.
    // (Not `toBeInViewport`: the table sits below the fold, so that checks the page instead.)
    await expect(table.locator('tbody tr').last()).toHaveClass(/\btk-row\b/);
  }).toPass({ timeout: 10_000 });
});

test('primary navigation routes between sections', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await nav.getByRole('link', { name: 'Examples' }).click();
  await expect(page).toHaveURL(/\/examples$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Examples' })).toBeVisible();
  await expect(page.locator('.site-card').first()).toBeVisible();
  await nav.getByRole('link', { name: 'API' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'API reference' })).toBeVisible();
});

test('theme toggle switches light / dark / classic and persists', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await page.getByRole('radio', { name: 'Dark' }).check({ force: true });
  await expect(html).toHaveAttribute('data-site-theme', 'dark');
  await expectNoA11yViolations(page);
  await page.getByRole('radio', { name: 'Classic' }).check({ force: true });
  await expect(html).toHaveAttribute('data-site-theme', 'classic');
  await page.reload();
  await expect(html).toHaveAttribute('data-site-theme', 'classic');
  await expect(page.getByRole('radio', { name: 'Classic' })).toBeChecked();
});

test('is usable at 375px width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/docs/getting-started');
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
