import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { DataTable, type DataTableProps } from '../../src';
import { people, personColumns, type Person } from '../fixtures';

/**
 * Unit-level a11y checks (09 §1): every feature configuration renders without axe violations.
 * The demo site runs the same rule set over whole pages in Playwright.
 */
async function expectNoViolations(container: HTMLElement) {
  const results = await axe(container, {
    // jsdom has no layout, so contrast cannot be computed here; the e2e suite covers it.
    rules: { 'color-contrast': { enabled: false } },
  });
  const violations = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    violations.map(
      (v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.failureSummary ?? n.html).join(' | ')}`,
    ),
  ).toEqual([]);
}

const base = {
  'aria-label': 'People',
  data: people,
  columns: personColumns,
  getRowId: (r: Person) => r.id,
  searchDebounceMs: 0,
  filterDebounceMs: 0,
} as const;

describe('accessibility', () => {
  it('the default table has no violations', async () => {
    const { container } = render(<DataTable<Person> {...base} />);
    await expectNoViolations(container);
  });

  const CONFIGS: [name: string, options: Partial<DataTableProps<Person>>][] = [
    ['selection + expansion', { enableRowSelection: true, getSubRows: (p) => p.children }],
    [
      'sorting + pinning',
      { enableSorting: true, initialState: { columnPinning: { left: ['name'] } } },
    ],
    ['pagination + density + export', { enableDensityToggle: true, enableExport: true }],
    ['filter row mode', { filterDisplayMode: 'row' }],
    ['sticky header + grouping', { enableStickyHeader: true, enableGrouping: true }],
  ];

  it.each(CONFIGS)('%s has no violations', async (_name, options) => {
    const { container } = render(<DataTable<Person> {...base} {...options} />);
    await expectNoViolations(container);
  });

  it('uses grid semantics only when rows carry grid-only ARIA state', () => {
    const plain = render(<DataTable<Person> {...base} />).container.querySelector('table')!;
    expect(plain).not.toHaveAttribute('role');

    const selectable = render(
      <DataTable<Person> {...base} aria-label="Selectable" enableRowSelection />,
    ).container.querySelector('table')!;
    expect(selectable).toHaveAttribute('role', 'grid');

    const tree = render(
      <DataTable<Person> {...base} aria-label="Tree" getSubRows={(p) => p.children} />,
    ).container.querySelector('table')!;
    expect(tree).toHaveAttribute('role', 'treegrid');
  });

  it('the open filter panel and columns menu have no violations', async () => {
    const user = userEvent.setup();
    const { container } = render(<DataTable<Person> {...base} enableHiding />);
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    await expectNoViolations(container);
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    await expectNoViolations(container);
  });

  it('the empty, loading and error states have no violations', async () => {
    const { container, rerender } = render(<DataTable<Person> {...base} data={[]} />);
    await expectNoViolations(container);
    rerender(<DataTable<Person> {...base} data={[]} loading />);
    await expectNoViolations(container);
    rerender(<DataTable<Person> {...base} data={[]} error={new Error('nope')} />);
    await expectNoViolations(container);
  });
});
