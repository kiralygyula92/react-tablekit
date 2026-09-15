import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared test: an automatic fixture fails every test on any console error or uncaught page error
 * (docs/08 §8: "it renders, has no console errors, and passes axe").
 */
export const test = base.extend<{ failOnConsoleErrors: undefined }>({
  failOnConsoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));
      await use(undefined);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Documented exception: the classic preset's header text `#717680` on `#FAFAFA` is 4.37:1, just
 * under WCAG AA. Its token values are frozen by design; every other preset passes.
 */
export const CLASSIC_HEADER_CONTRAST_EXCEPTION = '[data-theme="classic"] .tk-header-cell';

interface A11yOptions {
  /** Selectors excluded from the `color-contrast` rule only (every other rule still runs). */
  contrastExceptions?: readonly string[];
}

/** Zero serious/critical axe violations (docs/09 §1). */
export async function expectNoA11yViolations(page: Page, options: A11yOptions = {}): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const exceptions = options.contrastExceptions ?? [];
  if (exceptions.length > 0) {
    // Re-run color-contrast with the exceptions excluded and replace its result.
    const contrast = await exceptions
      .reduce(
        (builder, selector) => builder.exclude(selector),
        new AxeBuilder({ page }).withRules(['color-contrast']),
      )
      .analyze();
    results.violations = [
      ...results.violations.filter((v) => v.id !== 'color-contrast'),
      ...contrast.violations,
    ];
  }
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    blocking.map(
      (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
    ),
  ).toEqual([]);
}
