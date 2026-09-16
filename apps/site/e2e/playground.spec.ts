import { readFileSync } from 'node:fs';
import { expect, expectNoA11yViolations, test } from './fixtures';

// Read rather than imported: Node's ESM loader, which Playwright uses, needs an import
// attribute for JSON modules.
const schema = JSON.parse(
  readFileSync(new URL('../src/generated/api/playground.json', import.meta.url), 'utf8'),
) as { controls: unknown[] };

test('every controllable prop has a control', async ({ page }) => {
  await page.goto('/react-tablekit/demos/playground/');
  const panel = page.getByRole('complementary', { name: 'Options' });
  await expect(panel.locator('.prop-control')).toHaveCount(schema.controls.length);
  // The generated count is the real contract; guard against it collapsing.
  expect(schema.controls.length).toBeGreaterThanOrEqual(100);
});

test('the rows-per-page dropdown can be switched off, and the link keeps it off', async ({
  page,
}) => {
  await page.goto('/react-tablekit/demos/playground/');
  await expect(page.getByLabel('Rows per page:')).toBeVisible();

  const panel = page.getByRole('complementary', { name: 'Options' });
  await panel.getByPlaceholder(/Filter props/).fill('pageSizeOptions');
  await panel.getByRole('checkbox', { name: 'false for pagination.pageSizeOptions' }).check();

  await expect(page.getByLabel('Rows per page:')).toHaveCount(0);
  await expect(page.getByTestId('playground-code')).toContainText(
    'pagination={{ pageSizeOptions: false }}',
  );
  await expect(page).toHaveURL(/p\.pagination\.pageSizeOptions=false/);

  // The configuration lives in the URL, so a reload (or a shared link) restores it.
  await page.reload();
  await expect(page.getByRole('table', { name: 'Playground' })).toBeVisible();
  await expect(page.getByLabel('Rows per page:')).toHaveCount(0);

  // Custom options instead of "off".
  await panel.getByPlaceholder(/Filter props/).fill('pageSizeOptions');
  await panel.getByRole('checkbox', { name: 'false for pagination.pageSizeOptions' }).uncheck();
  await panel.getByLabel('pagination.pageSizeOptions', { exact: true }).fill('5, 15');
  const select = page.getByLabel('Rows per page:');
  await expect(select).toBeVisible();
  await expect(select.locator('option')).toHaveText(['5', '15']);
});

test('resetting a prop removes it from the code', async ({ page }) => {
  await page.goto('/react-tablekit/demos/playground/');
  const panel = page.getByRole('complementary', { name: 'Options' });
  await panel.getByPlaceholder(/Filter props/).fill('enableRowSelection');
  await panel.getByLabel('enableRowSelection', { exact: true }).selectOption('true');
  await expect(page.getByTestId('playground-code')).toContainText('enableRowSelection');
  await expect(page.getByRole('grid', { name: 'Playground' })).toBeVisible();

  await panel.getByRole('button', { name: 'Reset enableRowSelection' }).click();
  await expect(page.getByTestId('playground-code')).not.toContainText('enableRowSelection');
});

test('the playground with every group open passes axe', async ({ page }) => {
  await page.goto('/react-tablekit/demos/playground/');
  await page.getByPlaceholder(/Filter props/).fill('pagination');
  await expectNoA11yViolations(page);
});
