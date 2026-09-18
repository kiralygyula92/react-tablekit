import { expect, test } from './fixtures';

test('theme changes propagate to another open tab', async ({ page, context }) => {
  await page.goto('/react-tablekit/');
  const other = await context.newPage();
  await other.goto('/react-tablekit/');
  await expect(other.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(other.locator('html')).toHaveAttribute('data-site-theme', 'dark');
  await expect(other.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();

  await other.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-site-theme', 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
});

test('denied clipboard access leaves the demo usable without an unhandled rejection', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
      configurable: true,
    });
  });
  await page.goto('/react-tablekit/sorting/?mockLatency=0');
  const demo = page.getByRole('region', { name: 'Sorting', exact: true });
  await demo.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'Copy', exact: true })).toBeEnabled();
  await demo.getByRole('button', { name: 'Show source' }).click();
  await expect(demo.locator('.demo__source')).toContainText('export default function');
});

test('copy feedback stays visible for the latest copy operation', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-write']);
  await page.clock.install();
  await page.goto('/react-tablekit/sorting/?mockLatency=0');
  const demo = page.getByRole('region', { name: 'Sorting', exact: true });
  await demo.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  await page.clock.runFor(1000);
  await demo.getByRole('button', { name: 'Copied', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(demo.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  await page.clock.runFor(500);
  await expect(demo.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
});

test('playground initial state controls update the live preview', async ({ page }) => {
  await page.goto('/react-tablekit/demos/playground/');
  const options = page.getByRole('region', { name: 'Options' });
  const preview = page.getByRole('region', { name: 'Preview' });
  await options.getByLabel('Initial page size', { exact: true }).fill('25');
  await expect(preview.locator('tbody tr[data-row-id]')).toHaveCount(25);
  await options
    .getByRole('combobox', { name: 'Initial density', exact: true })
    .selectOption('compact');
  await expect(preview.locator('.tk-root')).toHaveAttribute('data-density', 'compact');
  await options.getByRole('button', { name: 'Reset all' }).click();
  await expect(preview.locator('tbody tr[data-row-id]')).toHaveCount(10);
  await expect(preview.locator('.tk-root')).toHaveAttribute('data-density', 'standard');
});

test('playground numeric inputs respect their configured limits', async ({ page }) => {
  await page.goto('/react-tablekit/demos/playground/');
  const options = page.getByRole('region', { name: 'Options' });
  const rows = options.getByLabel('Rows', { exact: true });
  await rows.fill('10001');
  await expect(rows).toHaveValue('10000');
  const latency = options.getByLabel('API latency (ms)', { exact: true });
  await latency.fill('-5');
  await expect(latency).toHaveValue('0');
});
