import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  classicTheme,
  createLocalDataSource,
  DataTable,
  TableDefaultsProvider,
  type DataTableHandle,
  type TableSlots,
} from '../../src';
import { en } from '../../src/locales/en';
import { useTableSlots } from '../../src/react/context';
import {
  bodyRows,
  numbered,
  people,
  personColumns,
  renderTable,
  rowIds,
  tick,
  type Person,
} from './helpers';

describe('<DataTable> rendering', () => {
  it('renders semantic table markup with colgroup, headers and row headers', () => {
    const { container } = renderTable({ toolbar: false });
    const table = screen.getByRole('table', { name: 'People' });
    expect(table).toHaveClass('tk-table');
    expect(container.querySelectorAll('colgroup col')).toHaveLength(5);
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Name', 'Age', 'City', 'Joined', 'Active']);
    // first data cell is a row header
    expect(within(table).getAllByRole('rowheader')[0]).toHaveTextContent('Zoë Adams');
    expect(bodyRows(container)).toHaveLength(6);
  });

  it('rows have no checkbox role and no aria-selected without selection', () => {
    const { container } = renderTable({ toolbar: false });
    const row = bodyRows(container)[0]!;
    expect(row).not.toHaveAttribute('role');
    expect(row).not.toHaveAttribute('aria-checked');
    expect(row).not.toHaveAttribute('aria-selected');
  });

  it('renders fallback values for empty cells', () => {
    const { container } = renderTable({ toolbar: false, renderFallbackValue: '-' });
    const p3 = container.querySelector('tr[data-row-id="p3"]')!;
    expect(p3.querySelector('[data-column-id="age"]')).toHaveTextContent('-');
  });

  it('widths go on <col>, min/max widths on header and body cells alike', () => {
    const { container } = renderTable({
      toolbar: false,
      columns: [{ accessorKey: 'name', width: '15%', minWidth: '160px', maxWidth: 300 }],
    });
    expect(container.querySelector('col')).toHaveStyle({ width: '15%' });
    const th = container.querySelector<HTMLElement>('th[data-column-id="name"]')!;
    const td = container.querySelector<HTMLElement>('tbody [data-column-id="name"]')!;
    for (const cell of [th, td]) {
      expect(cell.style.minWidth).toBe('160px');
      expect(cell.style.maxWidth).toBe('300px');
    }
  });

  it('warns in dev when the table has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<DataTable data={people} columns={personColumns} toolbar={false} />);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('accessible name'))).toBe(true);
    warn.mockRestore();
  });
});

describe('sorting UI', () => {
  it('clicking a header cycles asc → desc → none and sets aria-sort', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ toolbar: false });
    const button = screen.getByRole('button', { name: /City/ });
    const th = button.closest('th')!;
    await user.click(button);
    expect(th).toHaveAttribute('aria-sort', 'ascending');
    expect(th).toHaveAttribute('data-sorted', 'asc');
    expect(rowIds(container)[0]).toBe('p2');
    await user.click(button);
    expect(th).toHaveAttribute('aria-sort', 'descending');
    await user.click(button);
    expect(th).not.toHaveAttribute('aria-sort');
  });

  it('Shift+click multi-sorts; only the primary column gets aria-sort, others aria-description', async () => {
    const user = userEvent.setup();
    renderTable({ toolbar: false });
    await user.click(screen.getByRole('button', { name: /City/ }));
    await user.keyboard('{Shift>}');
    await user.click(screen.getByRole('button', { name: /Age/ }));
    await user.keyboard('{/Shift}');
    const age = screen.getByRole('button', { name: /Age/ }).closest('th')!;
    expect(age).not.toHaveAttribute('aria-sort');
    expect(age).toHaveAttribute('aria-description', 'sorted ascending, priority 2');
    expect(age.querySelector('.tk-sort-badge')).toHaveTextContent('2');
  });

  it('keyboard activation (Enter / Space on the sort button)', async () => {
    const user = userEvent.setup();
    renderTable({ toolbar: false });
    const button = screen.getByRole('button', { name: /Name/ });
    button.focus();
    await user.keyboard('{Enter}');
    expect(button.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    await user.keyboard(' ');
    expect(button.closest('th')).toHaveAttribute('aria-sort', 'descending');
  });

  it('non-sortable columns render a plain label', () => {
    renderTable({ toolbar: false, enableSorting: false });
    expect(screen.queryByRole('button', { name: /City/ })).toBeNull();
  });
});

describe('pagination UI', () => {
  const data = numbered(95);

  it('renders numbered pagination with aria-current and navigates', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ data, toolbar: false });
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(nav).getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(within(nav).getByRole('button', { name: 'Page 3' }));
    expect(rowIds(container)[0]).toBe('r20');
    await user.click(within(nav).getByRole('button', { name: 'Next' }));
    expect(rowIds(container)[0]).toBe('r30');
    await user.click(within(nav).getByRole('button', { name: 'Page 10' }));
    expect(within(nav).getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('the UI never shows an ellipsis between adjacent pages (n=10, c=2)', async () => {
    const user = userEvent.setup();
    renderTable({ data, toolbar: false });
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    await user.click(within(nav).getByRole('button', { name: 'Page 3' }));
    const items = [...nav.querySelectorAll('.tk-page-button, .tk-ellipsis')].map(
      (el) => el.textContent,
    );
    expect(items).toEqual(['1', '2', '3', '4', '…', '9', '10']);
  });

  it('hides on a single page and the container keeps its bottom border', async () => {
    const { container } = renderTable({ toolbar: false });
    await tick();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    expect(container.querySelector('.tk-container')).not.toHaveAttribute('data-has-footer');
  });

  it('with pagination attached the container drops its bottom border', async () => {
    const { container } = renderTable({ data, toolbar: false });
    await waitFor(() =>
      expect(container.querySelector('.tk-container')).toHaveAttribute('data-has-footer'),
    );
  });

  it('the page count follows the page size; the size selector keeps position', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      data,
      toolbar: false,
      pagination: { pageSizeOptions: [10, 25], showRowRange: true },
    });
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(nav).getByText('1–10 of 95')).toBeInTheDocument();
    await user.selectOptions(within(nav).getByLabelText('Rows per page:'), '25');
    expect(bodyRows(container)).toHaveLength(25);
    expect(within(nav).getByRole('button', { name: 'Page 4' })).toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: 'Page 5' })).toBeNull();
  });

  it('compact variant: icon-only nav with first/last buttons', () => {
    renderTable({ data, toolbar: false, pagination: { variant: 'compact', showFirstLast: true } });
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toHaveAttribute('data-variant', 'compact');
    expect(within(nav).getByRole('button', { name: 'First page' })).toBeDisabled();
    expect(within(nav).getByRole('button', { name: 'Last page' })).toBeEnabled();
    expect(within(nav).getByRole('button', { name: 'Previous' }).textContent).toBe('');
  });

  it('simple variant shows the row range', () => {
    renderTable({ data, toolbar: false, pagination: { variant: 'simple' } });
    expect(screen.getByText('1–10 of 95')).toBeInTheDocument();
  });

  it('classic responsive default: compact below md, numbered from md', () => {
    const view = (bp: number) => {
      window.innerWidth = bp;
      const r = renderTable({ data, toolbar: false, theme: classicTheme });
      const variant = screen
        .getByRole('navigation', { name: 'Pagination' })
        .getAttribute('data-variant');
      r.unmount();
      return variant;
    };
    expect(view(959)).toBe('compact');
    expect(view(960)).toBe('numbered');
    window.innerWidth = 1024;
  });
});

describe('states', () => {
  it("initial load: 'text' shows one centred Loading row; 'skeleton' shows skeleton rows", () => {
    const { container, rerender } = renderTable({
      data: [],
      loading: true,
      loadingDisplay: 'text',
      toolbar: false,
    });
    const state = container.querySelector('.tk-state[data-state="loading"]')!;
    expect(state).toHaveTextContent('Loading...');
    expect(state).toHaveAttribute('colspan', '5');
    rerender(
      <DataTable aria-label="People" data={[]} columns={personColumns} loading toolbar={false} />,
    );
    expect(container.querySelectorAll('.tk-skeleton-row').length).toBeGreaterThan(0);
  });

  it('empty: noRows vs noResults with a working "Clear all"', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ localization: { noRows: 'No customers found' } });
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzzz');
    const state = container.querySelector<HTMLElement>('.tk-state')!;
    expect(state).toHaveAttribute('data-state', 'noResults');
    await user.click(within(state).getByRole('button', { name: 'Clear all' }));
    expect(bodyRows(container)).toHaveLength(6);
    const empty = renderTable({
      data: [],
      toolbar: false,
      localization: { noRows: 'No customers found' },
    });
    expect(empty.container.querySelector('.tk-state')).toHaveTextContent('No customers found');
  });

  it('emptyStateContent renders a custom precondition message', () => {
    const { container } = renderTable({
      data: [],
      toolbar: false,
      emptyStateContent: 'Please choose a site first',
    });
    expect(container.querySelector('.tk-state')).toHaveAttribute('data-state', 'custom');
    expect(container.querySelector('.tk-state')).toHaveTextContent('Please choose a site first');
  });

  it('the refetch overlay blocks interaction and the table is aria-busy', async () => {
    const onRowClick = vi.fn();
    const { container } = renderTable({
      fetching: true,
      loadingOverlayDelayMs: 0,
      onRowClick,
      toolbar: false,
    });
    await waitFor(() => expect(container.querySelector('.tk-overlay')).toBeInTheDocument());
    expect(container.querySelector('.tk-overlay')).toHaveAttribute('data-blocking');
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    const body = container.querySelector<HTMLElement>('tbody')!;
    expect(body).toHaveAttribute('data-blocked');
    expect((body as HTMLElement & { inert?: boolean }).inert).toBe(true);
  });

  it('the overlay lives inside the positioned container', async () => {
    const { container } = renderTable({ fetching: true, loadingOverlayDelayMs: 0, toolbar: false });
    await waitFor(() =>
      expect(container.querySelector('.tk-container > .tk-overlay')).toBeInTheDocument(),
    );
  });

  it('the overlay waits for loadingOverlayDelayMs', async () => {
    vi.useFakeTimers();
    const { container } = renderTable({
      fetching: true,
      loadingOverlayDelayMs: 150,
      toolbar: false,
    });
    expect(container.querySelector('.tk-overlay')).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(container.querySelector('.tk-overlay')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('error without data shows ErrorState with retry; with data a dismissible banner', async () => {
    const user = userEvent.setup();
    const { container, rerender } = renderTable({
      data: [],
      error: new Error('x'),
      toolbar: false,
    });
    expect(container.querySelector('.tk-state[data-state="error"]')).toHaveTextContent('Retry');
    rerender(
      <DataTable
        aria-label="People"
        data={people}
        columns={personColumns}
        error={new Error('x')}
        toolbar={false}
      />,
    );
    const banner = screen.getByRole('alert');
    expect(banner).toHaveClass('tk-error-banner');
    await user.click(within(banner).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('global search', () => {
  it('filters rows and Escape clears', async () => {
    const user = userEvent.setup();
    const { container } = renderTable();
    const input = screen.getByRole('searchbox', { name: 'Search' });
    await user.type(input, 'alvarez');
    expect(rowIds(container)).toEqual(['p4']);
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(rowIds(container)).toHaveLength(6);
  });

  it('the hotkey is opt-in, scoped per table and focuses its own input', async () => {
    const user = userEvent.setup();
    render(
      <>
        <DataTable
          aria-label="A"
          data={people}
          columns={personColumns}
          searchHotkey="mod+k"
          searchPlaceholder="Search A"
        />
        <DataTable
          aria-label="B"
          data={people}
          columns={personColumns}
          searchHotkey="mod+k"
          searchPlaceholder="Search B"
        />
        <DataTable
          aria-label="C"
          data={people}
          columns={personColumns}
          searchPlaceholder="Search C"
        />
      </>,
    );
    const a = screen.getByPlaceholderText('Search A');
    const b = screen.getByPlaceholderText('Search B');
    expect(screen.getAllByText('Ctrl+K')).toHaveLength(2);
    fireEvent.pointerEnter(a.closest('.tk-root')!);
    await user.keyboard('{Control>}k{/Control}');
    expect(a).toHaveFocus();
    fireEvent.pointerEnter(b.closest('.tk-root')!);
    a.blur();
    await user.keyboard('{Control>}k{/Control}');
    expect(b).toHaveFocus();
  });

  it('highlights matches when highlightSearchMatches is on (regex-safe)', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ highlightSearchMatches: true });
    await user.type(screen.getByRole('searchbox'), 'bob');
    expect(container.querySelector('mark.tk-highlight')).toHaveTextContent('bob');
  });
});

describe('server mode', () => {
  it('controlled server mode: renders the page and emits pagination changes', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
      const page = numbered(235).slice(pagination.pageIndex * 10, pagination.pageIndex * 10 + 10);
      return (
        <DataTable
          aria-label="Server"
          dataMode="server"
          data={page}
          rowCount={235}
          columns={personColumns}
          getRowId={(r) => r.id}
          state={{ pagination }}
          onPaginationChange={setPagination}
          toolbar={false}
        />
      );
    }
    const { container } = render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Page 24' }));
    expect(rowIds(container)[0]).toBe('r230');
    expect(bodyRows(container)).toHaveLength(5);
  });

  it('dataSource: initial Loading row, then rows, with the local server', async () => {
    const ds = createLocalDataSource(numbered(40), {
      columns: personColumns,
      getRowId: (r) => r.id,
      latencyMs: 20,
    });
    const { container } = render(
      <DataTable
        aria-label="DS"
        dataSource={ds}
        columns={personColumns}
        getRowId={(r) => r.id}
        loadingDisplay="text"
        toolbar={false}
      />,
    );
    expect(container.querySelector('.tk-state[data-state="loading"]')).toBeInTheDocument();
    await waitFor(() => expect(bodyRows(container)).toHaveLength(10));
    expect(screen.getByRole('button', { name: 'Page 4' })).toBeInTheDocument();
  });
});

describe('customization (06)', () => {
  it('classNames / styles / slotProps merge with the defaults and chain event handlers', async () => {
    const user = userEvent.setup();
    const internal = vi.fn();
    const userClick = vi.fn((e: React.MouseEvent<HTMLTableRowElement>) =>
      (e as unknown as { preventTablekitDefault: () => void }).preventTablekitDefault(),
    );
    const { container } = renderTable({
      toolbar: false,
      enableRowSelection: true,
      selectOnRowClick: true,
      handlers: { onRowSelect: (_ctx, next) => (internal(), next()) },
      classNames: {
        row: ({ row }) => (row.id === 'p1' ? 'first-row' : undefined),
        root: 'my-root',
      },
      styles: { headerCell: { textTransform: 'uppercase' } },
      slotProps: {
        row: ({ row }) => ({
          'data-status': row.original.city,
          onClick: row.id === 'p2' ? userClick : undefined,
        }),
      },
    });
    const p1 = container.querySelector('tr[data-row-id="p1"]')!;
    expect(p1).toHaveClass('tk-row', 'first-row');
    expect(p1).toHaveAttribute('data-status', 'Budapest');
    expect(container.querySelector('.tk-root')).toHaveClass('my-root');
    expect(container.querySelector('th[data-column-id="name"]')).toHaveStyle({
      textTransform: 'uppercase',
    });
    await user.click(p1.querySelector<HTMLElement>('td')!);
    expect(internal).toHaveBeenCalledTimes(1);
    await user.click(container.querySelector('tr[data-row-id="p2"] td')!);
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(internal).toHaveBeenCalledTimes(1); // preventTablekitDefault skipped the internal handler
  });

  it('slots: a replacement receives computed props and can wrap the default', () => {
    const HeaderCell: TableSlots<Person>['HeaderCell'] = (props) => {
      const { HeaderCell: Default } = useTableSlots<Person>().defaults;
      return (
        <Default {...props} className={`${props.className ?? ''} my-header`}>
          {props.children}
          <span data-testid="extra">{props.column.id}</span>
        </Default>
      );
    };
    const { container } = renderTable({ toolbar: false, slots: { HeaderCell } });
    const th = container.querySelector('th[data-column-id="age"]')!;
    expect(th).toHaveClass('tk-header-cell', 'my-header');
    expect(within(th as HTMLElement).getByTestId('extra')).toHaveTextContent('age');
  });

  it('handlers: next() / next(modified) / cancel / provider composition order', async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    const { container } = render(
      <TableDefaultsProvider
        value={{ handlers: { onSortToggle: (_ctx, next) => (order.push('provider'), next()) } }}
      >
        <DataTable
          aria-label="H"
          data={people}
          columns={personColumns}
          getRowId={(r) => r.id}
          toolbar={false}
          handlers={{
            onSortToggle: (ctx, next) => {
              order.push('props');
              if (ctx.column.id === 'city') return; // cancel
              return next({ desc: true }); // modified input
            },
          }}
        />
      </TableDefaultsProvider>,
    );
    await user.click(screen.getByRole('button', { name: /City/ }));
    expect(screen.getByRole('button', { name: /City/ }).closest('th')).not.toHaveAttribute(
      'aria-sort',
    );
    await user.click(screen.getByRole('button', { name: /Age/ }));
    expect(screen.getByRole('button', { name: /Age/ }).closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(order).toEqual(['props', 'props', 'provider']);
    expect(rowIds(container)[0]).toBe('p6');
  });

  it('every string comes from localization (pseudo-locale)', () => {
    const pseudo = Object.fromEntries(
      Object.entries(en).map(([key, value]) => [
        key,
        typeof value === 'object'
          ? Object.fromEntries(Object.keys(value as object).map((k) => [k, `⟦${k}⟧`]))
          : `⟦${key}⟧`,
      ]),
    ) as never;
    const { container } = renderTable({
      data: numbered(30),
      enableRowSelection: true,
      localization: pseudo,
      pagination: { showRowRange: true, pageSizeOptions: [10] },
    });
    const texts: string[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) texts.push(walker.currentNode.textContent ?? '');
    const dataCells = new Set(
      [
        ...container.querySelectorAll(
          'tbody td, tbody th, .tk-page-button, thead th .tk-header-cell__label, option',
        ),
      ].flatMap((el) =>
        [...el.childNodes]
          .filter((n) => n.nodeType === 3 || (n as Element).tagName === 'MARK')
          .map((n) => n.textContent),
      ),
    );
    const suspicious = texts.filter(
      (t) => t.trim() && !t.includes('⟦') && !dataCells.has(t) && !/^[\d\s–…,.]+$/.test(t.trim()),
    );
    expect(suspicious).toEqual([]);
    for (const el of container.querySelectorAll('[aria-label]')) {
      if (el.closest('tbody') && el.tagName === 'TABLE') continue;
      const label = el.getAttribute('aria-label') ?? '';
      if (label === 'People') continue;
      expect(label, el.outerHTML.slice(0, 80)).toMatch(/⟦/);
    }
  });

  it('ref handle exposes the table and scroll helpers', () => {
    const ref = createRef<DataTableHandle<Person>>();
    render(
      <DataTable ref={ref} aria-label="R" data={people} columns={personColumns} toolbar={false} />,
    );
    expect(ref.current?.table.getRowModel().rows).toHaveLength(6);
    expect(() => ref.current?.scrollToTop()).not.toThrow();
  });

  it('composable parts: Search in a page header, Container and Pagination', async () => {
    const user = userEvent.setup();
    const { useDataTable } = await import('../../src');
    function Composed() {
      const table = useDataTable<Person>({
        data: numbered(30),
        columns: personColumns,
        getRowId: (r) => r.id,
        searchDebounceMs: 0,
      });
      return (
        <DataTable.Root table={table} aria-label="Composed">
          <header>
            <h3>All people</h3>
            <DataTable.Search />
          </header>
          <DataTable.Container />
          <DataTable.Pagination />
        </DataTable.Root>
      );
    }
    const { container } = render(<Composed />);
    await user.type(screen.getByRole('searchbox'), 'Row 2');
    await waitFor(() => expect(rowIds(container)).toContain('r2'));
    expect(screen.getByRole('table', { name: 'Composed' })).toBeInTheDocument();
  });

  describe('surface', () => {
    const base = {
      data: numbered(5),
      columns: personColumns,
      getRowId: (r: Person) => r.id,
      'aria-label': 'People',
    };

    it('is a card by default, and a card is rounded', () => {
      const { container } = render(<DataTable<Person> {...base} />);
      const root = container.querySelector('.tk-root')!;
      expect(root).toHaveAttribute('data-surface', 'card');
      expect(root).toHaveAttribute('data-rounded', 'true');
      expect(root).not.toHaveStyle({ '--tk-radius': '0px' });
    });

    it('a plain surface is square unless asked, because nothing would show the curve', () => {
      const { container, rerender } = render(<DataTable<Person> {...base} surface="plain" />);
      const root = () => container.querySelector('.tk-root')!;
      expect(root()).toHaveAttribute('data-surface', 'plain');
      expect(root()).toHaveAttribute('data-rounded', 'false');
      // The radius is a token, so squaring the corners is one variable rather than a rule each.
      expect(root().getAttribute('style')).toContain('--tk-radius: 0px');

      rerender(<DataTable<Person> {...base} surface="plain" rounded />);
      expect(root()).toHaveAttribute('data-rounded', 'true');
      expect(root().getAttribute('style')).not.toContain('--tk-radius: 0px');
    });

    it('a card can be squared', () => {
      const { container } = render(<DataTable<Person> {...base} rounded={false} />);
      const root = container.querySelector('.tk-root')!;
      expect(root).toHaveAttribute('data-surface', 'card');
      expect(root).toHaveAttribute('data-rounded', 'false');
      expect(root.getAttribute('style')).toContain('--tk-radius: 0px');
    });
  });
});
