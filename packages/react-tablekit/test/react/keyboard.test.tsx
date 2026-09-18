import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { bodyRows, numbered, renderTable, type Person } from './helpers';

/** The focused cell, as "rowId:columnId" (or "header:columnId"). */
function focused(): string {
  const cell = document.activeElement as HTMLElement | null;
  const columnId = cell?.dataset.columnId ?? '?';
  const row = cell?.closest('tr');
  return `${row?.dataset.rowId ?? (row?.closest('thead') ? 'header' : '?')}:${columnId}`;
}

const setup = (props = {}) =>
  renderTable({ toolbar: false, enableKeyboardNavigation: true, ...props });

describe('keyboard grid navigation', () => {
  it('enters with Tab, moves with the arrows and leaves again (roving tabindex)', async () => {
    const user = userEvent.setup();
    const { container } = setup();

    // Exactly one cell is tabbable, so the grid is a single tab stop.
    const tabbable = () =>
      [...container.querySelectorAll<HTMLElement>('[data-column-id]')].filter(
        (c) => c.tabIndex === 0,
      );
    expect(tabbable()).toHaveLength(1);

    await user.tab();
    expect(focused()).toBe('header:name');

    await user.keyboard('{ArrowRight}');
    expect(focused()).toBe('header:age');
    await user.keyboard('{ArrowDown}');
    expect(focused()).toBe('p1:age');
    await user.keyboard('{ArrowLeft}');
    expect(focused()).toBe('p1:name');
    await user.keyboard('{ArrowUp}');
    expect(focused()).toBe('header:name');

    // Still one tab stop after moving around.
    expect(tabbable()).toHaveLength(1);
  });

  it('Home/End and Ctrl+Home/End jump within the row and the grid', async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.keyboard('{ArrowDown}{End}');
    expect(focused()).toBe('p1:active');
    await user.keyboard('{Home}');
    expect(focused()).toBe('p1:name');
    await user.keyboard('{Control>}{End}{/Control}');
    expect(focused()).toBe('p6:active');
    await user.keyboard('{Control>}{Home}{/Control}');
    expect(focused()).toBe('header:name');
  });

  it('PageDown and PageUp move by a page of rows', async () => {
    const user = userEvent.setup();
    setup({ data: numbered(40), initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
    await user.tab();
    await user.keyboard('{PageDown}');
    // Header + 10 rows, clamped to the last rendered row.
    expect(focused()).toBe('r9:name');
    await user.keyboard('{PageUp}');
    expect(focused()).toBe('header:name');
  });

  it('Enter sorts from a header cell and moves into interactive cell content', async () => {
    const user = userEvent.setup();
    const { container } = setup({
      renderRowActions: () => (
        <button type="button" onClick={() => undefined}>
          Act
        </button>
      ),
    });
    await user.tab();
    await user.keyboard('{Enter}');
    expect(container.querySelector('th[data-column-id="name"]')).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    // Enter on a body cell with a button moves focus inside it; Escape comes back to the cell.
    // (The sort above reordered the rows, so only the column is asserted.)
    await user.keyboard('{Control>}{End}{/Control}');
    expect(focused()).toMatch(/:tk-actions$/);
    await user.keyboard('{Enter}');
    expect(document.activeElement?.textContent).toBe('Act');
    await user.keyboard('{Escape}');
    expect(focused()).toMatch(/:tk-actions$/);
  });

  it('Space selects the focused row and Ctrl+A selects the page', async () => {
    const user = userEvent.setup();
    const { container } = setup({ enableRowSelection: true });
    await user.tab();
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    expect(bodyRows(container)[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Control>}a{/Control}');
    expect(container.querySelectorAll('tr[aria-selected="true"]')).toHaveLength(
      bodyRows(container).length,
    );
  });

  it('ArrowLeft collapses an expanded row before moving', async () => {
    const user = userEvent.setup();
    const tree: Person[] = [
      { ...numbered(1)[0]!, id: 'a', name: 'A', children: [{ ...numbered(1)[0]!, id: 'a1' }] },
    ];
    const { container } = setup({ data: tree, getSubRows: (p: Person) => p.children });
    await user.click(screen.getByRole('button', { name: 'Expand row' }));
    expect(bodyRows(container)).toHaveLength(2);

    // Enter the grid through its roving tab stop (focus is on the expand button after the click).
    container.querySelector<HTMLElement>('[data-column-id][tabindex="0"]')!.focus();
    await user.keyboard('{ArrowDown}');
    // Tree rows start with the expand column, so that is the first cell of the row.
    expect(focused()).toBe('a:tk-expand');
    await user.keyboard('{ArrowLeft}');
    expect(bodyRows(container)).toHaveLength(1);
  });

  it('does nothing when keyboard navigation is off', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ toolbar: false });
    expect(
      [...container.querySelectorAll<HTMLElement>('[data-column-id]')].filter(
        (c) => c.tabIndex === 0,
      ),
    ).toHaveLength(0);
    await user.tab();
    expect((document.activeElement as HTMLElement).dataset.columnId).toBeUndefined();
  });

  it('routes selection through the handler middleware', async () => {
    const user = userEvent.setup();
    const onRowSelect = vi.fn((ctx: { value: boolean }, next: (c: unknown) => void) => {
      next(ctx);
    });
    const { container } = setup({ enableRowSelection: true, handlers: { onRowSelect } });
    await user.tab();
    await user.keyboard('{ArrowDown} ');
    expect(onRowSelect).toHaveBeenCalled();
    expect(bodyRows(container)[0]).toHaveAttribute('aria-selected', 'true');
  });
});
