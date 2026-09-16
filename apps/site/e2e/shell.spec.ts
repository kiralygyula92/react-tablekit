import {
  CLASSIC_HEADER_CONTRAST_EXCEPTION,
  expect,
  expectNoA11yViolations,
  test,
} from './fixtures';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The generated content index, read from disk so this file needs no JSON import attribute. */
interface IndexedPage {
  pathname: string;
  frontmatter: { title: string };
}
const indexPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'generated',
  'content',
  'index.json',
);
const pages = JSON.parse(readFileSync(indexPath, 'utf8')) as IndexedPage[];

/**
 * Every page the content tree defines renders, logs nothing to the console and passes axe. The
 * list is generated, so a page added without a route — or a route left behind without a page —
 * cannot slip past this suite.
 */
for (const page_ of pages) {
  test(`${page_.pathname} renders without console errors and passes axe`, async ({ page }) => {
    await page.goto(page_.pathname);
    // A documentation page's heading is its title, written in one place (PPDS P10). The marketing
    // surface writes its own headline, so there only the presence of an h1 is asserted.
    await expect(
      page_.pathname.startsWith('/react-tablekit/')
        ? page.getByRole('heading', { level: 1, name: page_.frontmatter.title })
        : page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
    // The showcase pages default to the `classic` preset, whose header contrast is a documented
    // exception (see CLASSIC_HEADER_CONTRAST_EXCEPTION). Every other rule still runs.
    await expectNoA11yViolations(page, {
      contrastExceptions: page_.pathname.startsWith('/react-tablekit/demos/')
        ? [CLASSIC_HEADER_CONTRAST_EXCEPTION]
        : [],
    });
  });
}

test('an unknown URL renders the not-found page', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
});

/**
 * The generated API pages once rendered a heading and nothing else, because the symbols resolved
 * to empty re-export stubs. Asserting the heading alone did not catch it, so each page has to
 * show real documented members.
 */
const API_PAGES = [
  {
    path: '/react-tablekit/api/data-table-props/',
    symbol: 'DataTableProps',
    member: 'enableRowSelection',
  },
  { path: '/react-tablekit/api/column-def/', symbol: 'ColumnDefBase', member: 'cell' },
  { path: '/react-tablekit/api/table-instance/', symbol: 'TableInstance', member: 'getRowModel' },
  { path: '/react-tablekit/api/table-state/', symbol: 'TableState', member: 'pagination' },
] as const;

for (const { path, symbol, member } of API_PAGES) {
  test(`${path} documents its members`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('table').first()).toBeVisible();

    // A long member table virtualizes — `DataTableProps` alone documents 217 entries — so only
    // the visible window is in the DOM. Filter the row into view instead of assuming it is
    // rendered, which also keeps this test honest if another symbol grows past the threshold.
    await page.getByPlaceholder(`Filter ${symbol}`).fill(member);

    // Each member name carries an anchor id, which is what `…/table-instance/#getRowModel` links
    // to. The cell's accessible name would also include the " required" marker, and the same name
    // can appear under two symbols on one page (`TableState.pagination`, `TableQuery.pagination`).
    await expect(page.locator(`#${member}`).first()).toBeVisible();
  });
}

test('a long virtualized member table scrolls all the way to its last row', async ({ page }) => {
  // Regression: the table body virtualizes inside its scroll container, but React attaches the
  // container's ref only after the body's layout effect has run. The virtualizer gave up on that
  // first attempt and never followed the scroll, so this 217-row table showed its first 9 rows
  // (ending at `autoResetPageIndex`) however far it was scrolled. It is a browser-only ordering
  // effect, which is why this lives in e2e rather than jsdom.
  await page.goto('/react-tablekit/api/data-table-props/');
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

test('the marketing header routes into the documentation', async ({ page }) => {
  await page.goto('/');
  // Crossing into the documentation swaps the header for the docs surface (PPDS P1), so the
  // marketing nav is gone on the other side — each link is followed from the home page.
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await nav.getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL(/\/react-tablekit\/all-features\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'All features' })).toBeVisible();
  await expect(nav).toHaveCount(0);

  await page.goto('/');
  await nav.getByRole('link', { name: 'Docs' }).click();
  await expect(page).toHaveURL(/\/react-tablekit\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
});

test('the documentation sidebar links to every page in the navigation', async ({ page }) => {
  await page.goto('/react-tablekit/');
  const sidebar = page.getByRole('navigation', { name: 'Documentation' });
  await sidebar.getByRole('link', { name: 'Sorting', exact: true }).click();
  await expect(page).toHaveURL(/\/react-tablekit\/sorting\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sorting' })).toBeVisible();
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
  await page.goto('/react-tablekit/getting-started/quickstart/');
  await expect(page.getByRole('heading', { level: 1, name: 'Quickstart' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
