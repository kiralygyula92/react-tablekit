import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { renderTable, type Person } from './helpers';

/** The viewport breakpoint comes from `window.innerWidth`. */
function setWidth(width: number) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

afterEach(() => {
  setWidth(1024);
});

/** Renders at a mobile width; `afterEach` restores it (resetting it here would switch back). */
const cardsTable = (props = {}) => {
  setWidth(500);
  return renderTable({
    toolbar: false,
    responsive: { mobileLayout: 'cards', mobileBreakpoint: 'md' },
    ...props,
  });
};

describe('cards layout', () => {
  it('renders a list of articles instead of a table below the breakpoint', () => {
    const { container } = cardsTable();
    expect(container.querySelector('table')).toBeNull();

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(6);
    // Label/value pairs from the visible columns.
    const first = cards[0]!;
    expect(within(first).getByText('Age')).toBeInTheDocument();
    expect(within(first).getByText('31')).toBeInTheDocument();
    // The first column titles the card.
    expect(first).toHaveAccessibleName('Zoë Adams');
  });

  it('stays a table above the breakpoint', () => {
    const { container } = renderTable({
      toolbar: false,
      responsive: { mobileLayout: 'cards', mobileBreakpoint: 'md' },
    });
    expect(container.querySelector('table')).not.toBeNull();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('shows only `cardColumns`, with selection in the header and actions in the footer', async () => {
    const user = userEvent.setup();
    const { container } = cardsTable({
      responsive: { mobileLayout: 'cards', mobileBreakpoint: 'md', cardColumns: ['name', 'city'] },
      enableRowSelection: true,
      renderRowActions: () => (
        <button type="button" onClick={() => undefined}>
          Act
        </button>
      ),
    });

    const first = screen.getAllByRole('article')[0]!;
    expect(within(first).getByText('City')).toBeInTheDocument();
    expect(within(first).queryByText('Age')).toBeNull();
    expect(within(first).getByRole('button', { name: 'Act' })).toBeInTheDocument();

    await user.click(within(first).getByRole('checkbox', { name: 'Select row' }));
    expect(container.querySelector('.tk-card[data-selected]')).not.toBeNull();
  });

  it('renderCard replaces the whole card', () => {
    cardsTable({
      responsive: {
        mobileLayout: 'cards',
        mobileBreakpoint: 'md',
        renderCard: ({ row }: { row: { original: Person } }) => <p>custom {row.original.name}</p>,
      },
    });
    expect(screen.getByText('custom Zoë Adams')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
});
