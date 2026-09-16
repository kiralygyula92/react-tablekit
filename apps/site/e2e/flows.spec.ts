import { expect, test } from './fixtures';

/**
 * The user flows the standard requires to be completable without a dead end (PPDS §9).
 *
 * Each test walks the path by clicking, not by navigating — a flow that only works when you
 * already know the URL is not a flow. F6 (convert) has no test: there is nothing to buy, which
 * is recorded as exception E-01.
 */

test('F1 evaluate: root → overview → features index → a capability', async ({ page }) => {
  // The root is the documentation: there is no landing page in front of it (E-16).
  await page.goto('/');
  await expect(page).toHaveURL(/\/react-tablekit\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();

  const sidebar = page.getByRole('navigation', { name: 'Documentation' });
  await sidebar.getByRole('button', { name: 'Features' }).click();
  await sidebar.getByRole('link', { name: 'All features' }).click();
  await expect(page).toHaveURL(/\/react-tablekit\/all-features\/$/);

  await page.getByRole('link', { name: 'Sorting', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sorting' })).toBeVisible();
});

test('F2 adopt: overview → installation → quickstart → a capability', async ({ page }) => {
  await page.goto('/react-tablekit/');
  const sidebar = page.getByRole('navigation', { name: 'Documentation' });

  await sidebar.getByRole('link', { name: 'Installation' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Installation' })).toBeVisible();

  await sidebar.getByRole('link', { name: 'Quickstart' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Quickstart' })).toBeVisible();
  // The minimal example has to be complete, not an outline with ellipses.
  const code = page.locator('pre.site-code').first();
  await expect(code).toContainText('createColumnHelper');
  await expect(code).not.toContainText('...');

  await sidebar.getByRole('button', { name: 'Features' }).click();
  await sidebar.getByRole('link', { name: 'Columns', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Columns' })).toBeVisible();
});

test('F3 implement: search → capability → demo source → reference', async ({ page }) => {
  await page.goto('/react-tablekit/');
  await page.getByRole('button', { name: /Search/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Search the documentation' });
  await dialog.getByRole('combobox', { name: 'Search' }).fill('row selection');
  await dialog.getByRole('option').first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Row selection' })).toBeVisible();

  const demo = page.getByRole('region', { name: 'Row selection' });
  const showSource = demo.getByRole('button', { name: 'Show source' });
  await expect(showSource).toBeEnabled();
  await showSource.click();
  await expect(demo.locator('.demo__source')).toContainText('export default function');

  await page.getByRole('link', { name: 'DataTableProps' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'DataTableProps' })).toBeVisible();
  // And back: the reference names the pages that use it.
  await expect(page.locator('.api-used-by').first()).toContainText('Row selection');
});

test('F4 customise: capability → customization → theming → tokens', async ({ page }) => {
  await page.goto('/react-tablekit/sorting/');
  await page.getByRole('link', { name: 'Handler middleware' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Handler middleware' })).toBeVisible();

  const sidebar = page.getByRole('navigation', { name: 'Documentation' });
  await sidebar.getByRole('link', { name: 'Theming' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Theming' })).toBeVisible();

  await page.getByRole('link', { name: 'Design tokens' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Design tokens' })).toBeVisible();
});

test('F5 upgrade: version selector → Versions → Migration → Changelog', async ({ page }) => {
  await page.goto('/react-tablekit/sorting/');
  await expect(page.getByLabel('Version')).toBeVisible();

  const sidebar = page.getByRole('navigation', { name: 'Documentation' });
  await sidebar.getByRole('button', { name: 'Getting started' }).click();
  await sidebar.getByRole('link', { name: 'Versions' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Versions' })).toBeVisible();

  await sidebar.getByRole('button', { name: 'Migration' }).click();
  await sidebar.getByRole('link', { name: 'Migration', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Migration' })).toBeVisible();

  await sidebar.getByRole('button', { name: 'Discover more' }).click();
  await sidebar.getByRole('link', { name: 'Changelog' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Changelog' })).toBeVisible();
});

test('F7 support: any docs page → Support → a channel that resolves', async ({ page }) => {
  await page.goto('/react-tablekit/pagination/');
  const sidebar = page.getByRole('navigation', { name: 'Documentation' });
  await sidebar.getByRole('button', { name: 'Getting started' }).click();
  await sidebar.getByRole('link', { name: 'Support' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Support' })).toBeVisible();

  const issues = page.getByRole('link', { name: /issue/i }).first();
  await expect(issues).toHaveAttribute('href', /github\.com/);
});

test('F8 agent: llms.txt → a .md twin, both machine-readable', async ({ page, request }) => {
  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  const text = await llms.text();
  expect(text).toContain('# React Tablekit');

  const first = /\]\((https?:\/\/[^)]+\.md)\)/.exec(text)?.[1];
  expect(first, 'llms.txt lists at least one entry').toBeTruthy();

  const twin = await request.get(new URL(first!).pathname);
  expect(twin.status()).toBe(200);
  expect(await twin.text()).toMatch(/^# /);

  // The twin of the page a reader would be on, too.
  const page_ = await request.get('/react-tablekit/sorting/index.md');
  expect(page_.status()).toBe(200);
  expect(await page_.text()).toContain('## Limitations');
  await page.goto('/react-tablekit/sorting/');
});
