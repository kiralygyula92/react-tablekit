import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataTable } from '../../src';
import { bodyRows, numbered, people, personColumns, renderTable, type Person } from './helpers';

const headerIds = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('thead th[data-leaf]')].map(
    (th) => th.dataset.columnId,
  );

describe('column resizing (05 §9)', () => {
  it('exposes a keyboard-operable separator that resizes and resets the column', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ toolbar: false, enableColumnResizing: true });
    const handle = screen.getAllByRole('separator', { name: 'Resize column' })[0]!;
    const before = Number(handle.getAttribute('aria-valuenow'));

    handle.focus();
    await user.keyboard('{ArrowRight}');
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before + 10);
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before + 60);
    await user.keyboard('{ArrowLeft}');
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before + 50);

    // Enter resets to the column's own size.
    await user.keyboard('{Enter}');
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before);
    // Resizing switches the table to fixed layout with px widths (05 §9).
    expect(container.querySelector('table')).toHaveStyle({ tableLayout: 'fixed' });
  });

  it('drag resizes live in onChange mode', () => {
    renderTable({ toolbar: false, enableColumnResizing: true });
    const handle = screen.getAllByRole('separator', { name: 'Resize column' })[0]!;
    const before = Number(handle.getAttribute('aria-valuenow'));
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before + 60);
    fireEvent.pointerUp(handle, { clientX: 160, pointerId: 1 });
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before + 60);
  });
});

describe('column actions menu (05 §11)', () => {
  const open = async (user: ReturnType<typeof userEvent.setup>, columnId: string) => {
    await user.click(screen.getByRole('button', { name: `Column actions: ${columnId}` }));
    return screen.getByRole('menu', { name: 'Column actions' });
  };

  it('sorts, pins and hides the column from the menu', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ toolbar: false, enableColumnActions: true });

    let menu = await open(user, 'city');
    await user.click(within(menu).getByRole('menuitem', { name: 'Sort descending' }));
    expect(container.querySelector('th[data-column-id="city"]')).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    menu = await open(user, 'city');
    await user.click(within(menu).getByRole('menuitem', { name: 'Pin left' }));
    expect(container.querySelector('th[data-column-id="city"]')).toHaveAttribute(
      'data-pinned',
      'left',
    );

    menu = await open(user, 'city');
    await user.click(within(menu).getByRole('menuitem', { name: 'Hide column' }));
    expect(headerIds(container)).not.toContain('city');
  });

  it('opens a single column filter from the menu', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ toolbar: false, enableColumnActions: true });
    const menu = await open(user, 'city');
    await user.click(within(menu).getByRole('menuitem', { name: 'Filter…' }));
    const input = screen.getByLabelText('City');
    await user.type(input, 'Austin');
    expect(bodyRows(container).length).toBeLessThan(people.length);
  });

  it('autosizes and resets the width from the menu', async () => {
    const user = userEvent.setup();
    renderTable({ toolbar: false, enableColumnActions: true, enableColumnResizing: true });
    const handle = screen.getAllByRole('separator', { name: 'Resize column' })[0]!;
    const initial = Number(handle.getAttribute('aria-valuenow'));

    handle.focus();
    await user.keyboard('{ArrowRight}');
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(initial + 10);

    let menu = await open(user, 'name');
    await user.click(within(menu).getByRole('menuitem', { name: 'Reset size' }));
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(initial);

    // Autosize measures the rendered content (0 in jsdom), so it only has to stay consistent.
    menu = await open(user, 'name');
    await user.click(within(menu).getByRole('menuitem', { name: 'Autosize' }));
    expect(handle.getAttribute('aria-valuenow')).not.toBeNull();
  });

  it('renderColumnActionsMenuItems can replace the items', async () => {
    const user = userEvent.setup();
    render(
      <DataTable<Person>
        aria-label="People"
        data={people}
        columns={personColumns}
        getRowId={(p) => p.id}
        toolbar={false}
        enableColumnActions
        renderColumnActionsMenuItems={({ column }) => (
          <button type="button">Only {column.id}</button>
        )}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Column actions: city' }));
    expect(screen.getByRole('button', { name: 'Only city' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Hide column' })).toBeNull();
  });
});

describe('column ordering (05 §10)', () => {
  it('moves a column by drag and drop and announces it', async () => {
    const { container } = renderTable({ toolbar: false, enableColumnOrdering: true });
    const before = headerIds(container);
    const name = container.querySelector<HTMLElement>('th[data-column-id="name"]')!;
    const city = container.querySelector<HTMLElement>('th[data-column-id="city"]')!;

    const dataTransfer = { effectAllowed: '', setData: () => undefined, getData: () => 'name' };
    fireEvent.dragStart(name, { dataTransfer });
    fireEvent.dragOver(city, { dataTransfer });
    fireEvent.drop(city, { dataTransfer });

    const after = headerIds(container);
    expect(after).not.toEqual(before);
    expect(after.indexOf('name')).toBe(before.indexOf('city'));
    // Live-region announcements are debounced by 150ms (05 §16).
    await waitFor(() =>
      expect(container.querySelector('.tk-sr-live')?.textContent).toMatch(/Moved Name to position/),
    );
  });
});

describe('row virtualization (05 §14)', () => {
  it('renders a window of rows with spacers and grid semantics', () => {
    const { container } = renderTable({
      toolbar: false,
      data: numbered(1000),
      enablePagination: false,
      enableRowVirtualization: true,
      maxHeight: 400,
      estimateRowHeight: 40,
    });
    const rendered = bodyRows(container);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(100);
    // The un-rendered rows are represented by spacer rows, so the scrollbar is honest.
    const spacers = container.querySelectorAll('tr.tk-virtual-spacer');
    expect(spacers.length).toBeGreaterThan(0);
    expect(container.querySelector('table')).toHaveAttribute('role', 'grid');
  });

  it('counts rendered rows, not the server total, and needs a bounded height', () => {
    // Regression: a server page of 10 rows out of 235 must not turn on virtualization, and an
    // unbounded table must render normally rather than collapsing to an empty window.
    const { container } = renderTable({
      toolbar: false,
      data: numbered(10),
      rowCount: 235,
      manualPagination: true,
    });
    expect(bodyRows(container)).toHaveLength(10);
    expect(container.querySelector('table')).not.toHaveAttribute('role', 'grid');

    const unbounded = renderTable({
      toolbar: false,
      data: numbered(500),
      enablePagination: false,
      enableRowVirtualization: true,
    });
    expect(bodyRows(unbounded.container)).toHaveLength(500);
  });

  it('stays off below the threshold and can be forced off', () => {
    const { container } = renderTable({ toolbar: false, data: numbered(30) });
    expect(container.querySelectorAll('tr.tk-virtual-spacer')).toHaveLength(0);

    const forced = renderTable({
      toolbar: false,
      data: numbered(1000),
      enablePagination: false,
      enableRowVirtualization: false,
    });
    expect(bodyRows(forced.container)).toHaveLength(1000);
  });
});
