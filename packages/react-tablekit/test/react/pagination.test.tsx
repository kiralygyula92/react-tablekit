import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { bodyRows, numbered, renderTable } from './helpers';

const current = () => screen.getByRole('button', { current: 'page' }).textContent;

describe('pagination controls (05 §4)', () => {
  it('first / last / next / previous move through the pages', async () => {
    const user = userEvent.setup();
    renderTable({
      toolbar: false,
      data: numbered(45),
      pagination: { showFirstLast: true, variant: 'numbered' },
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    });
    expect(current()).toBe('1');

    await user.click(screen.getByRole('button', { name: 'Last page' }));
    expect(current()).toBe('5');
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(current()).toBe('4');
    await user.click(screen.getByRole('button', { name: 'First page' }));
    expect(current()).toBe('1');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(current()).toBe('2');
  });

  it('the page-size selector changes the page size and keeps the row range honest', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      toolbar: false,
      data: numbered(45),
      pagination: { pageSizeOptions: [10, 25], showRowRange: true },
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    });
    expect(bodyRows(container)).toHaveLength(10);
    expect(screen.getByText('1–10 of 45')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Rows per page:'), '25');
    expect(bodyRows(container)).toHaveLength(25);
    expect(screen.getByText('1–25 of 45')).toBeInTheDocument();
  });

  it('announces the page change to the live region', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      toolbar: false,
      data: numbered(45),
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    // Announcements are debounced by 150ms (05 §16).
    await expect
      .poll(() => container.querySelector('.tk-sr-live')?.textContent)
      .toBe('Page 2 of 5');
  });
});
