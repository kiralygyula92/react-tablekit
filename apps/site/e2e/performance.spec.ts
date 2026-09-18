import { expect, test } from './fixtures';
import { demoUrl } from './demos';

/**
 * The browser-side performance budget: scrolling 100 000 virtualized rows for ~2s must
 * not produce a long task over 50ms. Long tasks are collected with PerformanceObserver, which is
 * what the budget is really about (a frozen main thread), rather than a trace file.
 */
test('scrolling 100k virtualized rows has no long tasks over 50ms', async ({ page }) => {
  await page.goto(demoUrl('features/virtualization/demo-basics'));
  const container = page.locator('.tk-container');
  await expect(container.locator('tbody tr[data-row-id]').first()).toBeVisible();

  // Only a window of the 100k rows is in the DOM.
  const rendered = await container.locator('tbody tr[data-row-id]').count();
  expect(rendered).toBeGreaterThan(0);
  expect(rendered).toBeLessThan(200);

  await page.evaluate(() => {
    const w = window as unknown as { __longTasks: number[] };
    w.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__longTasks.push(entry.duration);
    }).observe({ entryTypes: ['longtask'] });
  });

  // ~2 seconds of continuous scrolling.
  const start = Date.now();
  let offset = 0;
  while (Date.now() - start < 2000) {
    offset += 800;
    await container.evaluate((el, top) => {
      el.scrollTop = top;
    }, offset);
    await page.waitForTimeout(50);
  }

  const longTasks = await page.evaluate(
    () => (window as unknown as { __longTasks: number[] }).__longTasks,
  );
  const worst = longTasks.length > 0 ? Math.max(...longTasks) : 0;
  expect(worst, `longest task ${worst.toFixed(0)}ms of ${String(longTasks.length)}`).toBeLessThan(
    50,
  );

  // Still virtualized after scrolling, and the rows changed.
  expect(await container.locator('tbody tr[data-row-id]').count()).toBeLessThan(200);
  expect(await container.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});
