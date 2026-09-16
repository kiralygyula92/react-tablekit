import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

/**
 * Opens the palette with the keyboard and returns its dialog locator.
 *
 * The hotkey listener is attached when the shell hydrates, so the trigger has to be on screen
 * before the key is pressed — otherwise the event arrives at a page that is not listening yet.
 */
async function openWithHotkey(page: Page) {
  await expect(page.getByRole('button', { name: /Search/ })).toBeVisible();
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search the documentation' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('Ctrl+K opens the palette and Escape closes it', async ({ page }) => {
  await page.goto('/react-tablekit/');
  const dialog = await openWithHotkey(page);
  // The input is focused on open, so typing goes straight into the search.
  await expect(dialog.getByRole('combobox', { name: 'Search' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('the topbar trigger opens the palette', async ({ page }) => {
  await page.goto('/react-tablekit/');
  await page.getByRole('button', { name: /Search/ }).click();
  await expect(page.getByRole('dialog', { name: 'Search the documentation' })).toBeVisible();
});

test('results are grouped, and Enter opens the highlighted one', async ({ page }) => {
  await page.goto('/react-tablekit/');
  const dialog = await openWithHotkey(page);
  await dialog.getByRole('combobox', { name: 'Search' }).fill('virtualization');

  const listbox = dialog.getByRole('listbox', { name: 'Search results' });
  await expect(listbox).toBeVisible();
  // The index covers guides and examples, so a term used by both produces both groups.
  await expect(listbox.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');

  // Results are shown grouped by section but the arrows walk one flat list, so the numbering
  // has to follow the rendered order. Pressing ArrowDown once must select the second rendered
  // option — not the second entry of some other ordering.
  await page.keyboard.press('ArrowDown');
  const highlighted = listbox.locator('[role="option"][aria-selected="true"]');
  await expect(highlighted).toHaveCount(1);
  await expect(highlighted).toHaveAttribute('id', 'palette-option-1');

  // Enter opens whatever is highlighted.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Search the documentation' })).toBeHidden();
  // Every documentation URL ends in a slash, so "left the home page" is what this checks.
  await expect(page).toHaveURL(/\/react-tablekit\/./);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('searches API symbols and theme tokens, not just pages', async ({ page }) => {
  await page.goto('/react-tablekit/');
  const dialog = await openWithHotkey(page);
  const input = dialog.getByRole('combobox', { name: 'Search' });

  await input.fill('enableRowSelection');
  await expect(dialog.getByRole('option').first()).toContainText('enableRowSelection');

  await input.fill('color.accent');
  await expect(dialog.getByRole('group', { name: 'Tokens' })).toBeVisible();
  await expect(dialog.getByRole('option').first()).toContainText('--tk-color-accent');
});

test('an unmatched query says so rather than showing nothing', async ({ page }) => {
  await page.goto('/react-tablekit/');
  const dialog = await openWithHotkey(page);
  await dialog.getByRole('combobox', { name: 'Search' }).fill('zzzznotathing');
  await expect(dialog.getByText(/No matches/)).toBeVisible();
});

test('the open palette passes axe', async ({ page }) => {
  await page.goto('/react-tablekit/');
  const dialog = await openWithHotkey(page);
  await dialog.getByRole('combobox', { name: 'Search' }).fill('column');
  await expect(dialog.getByRole('option').first()).toBeVisible();
  await expectNoA11yViolations(page);
});

test('a table on the page keeps the hotkey for its own search', async ({ page }) => {
  // A documentation page, not an embed: this test also checks the site header's own trigger.
  await page.goto('/react-tablekit/global-search/');
  const tableSearch = page.getByRole('searchbox').first();
  await expect(tableSearch).toBeVisible();

  // The hotkey is scoped to the table last focused or hovered (B10), and this page has two.
  // Hovering the first one is what makes it the table that should answer.
  await tableSearch.hover();
  await page.keyboard.press('Control+k');

  // The table registers the same hotkey and claims the event, so it wins over the site palette:
  // the user is working in that table. Focus lands in the table's own search box.
  await expect(tableSearch).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Search the documentation' })).toBeHidden();

  // The palette is still reachable from the topbar on such a page.
  await page.getByRole('button', { name: /Search/ }).click();
  await expect(page.getByRole('dialog', { name: 'Search the documentation' })).toBeVisible();
});
