import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  createLocalDataSource,
  DataTable,
  TableDefaultsProvider,
  TableThemeProvider,
  useDataTable,
  useTableContext,
  darkTheme,
  type DataTableHandle,
} from '../../src';
import { toText } from '../../src/core/text';
import { hotkeyLabel, matchesHotkey, parseHotkey, registerHotkey } from '../../src/react/hotkeys';
import { mergeTableProps, runHandler } from '../../src/react/options';
import { cx, isInteractiveTarget, mergeProps, toCssSize } from '../../src/react/utils';
import {
  bodyRows,
  numbered,
  people,
  personColumns,
  renderTable,
  rowIds,
  type Person,
} from './helpers';

describe('toText', () => {
  it('stringifies every value kind without [object Object]', () => {
    expect(toText(null)).toBe('');
    expect(toText('a')).toBe('a');
    expect(toText(1)).toBe('1');
    expect(toText(true)).toBe('true');
    expect(toText(10n)).toBe('10');
    expect(toText(new Date(0))).toBe('1970-01-01T00:00:00.000Z');
    expect(toText(new Date('x'))).toBe('');
    expect(toText([1, 'b'])).toBe('1, b');
    expect(toText(Symbol('s'))).toBe('s');
    expect(toText(() => 1)).toBe('');
    expect(toText({ a: 1 })).toBe('{"a":1}');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(toText(cyclic)).toBe('');
  });
});

describe('overlay positioning', () => {
  it('publishes the header height on the container on mount', () => {
    // The container is an ancestor, so its ref is not attached yet when the table's layout effect runs.
    const { container } = renderTable();
    const el = container.querySelector<HTMLElement>('.tk-container')!;
    expect(el.style.getPropertyValue('--tk-head-height')).toMatch(/^\d+px$/);
  });
});

describe('hotkeys', () => {
  it('parses, matches and labels hotkeys per platform', () => {
    const hk = parseHotkey('mod+shift+k');
    expect(hk).toMatchObject({ key: 'k', mod: true, shift: true });
    const ev = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);
    expect(matchesHotkey(ev({ key: 'k', ctrlKey: true, shiftKey: true }), hk, false)).toBe(true);
    expect(matchesHotkey(ev({ key: 'k', metaKey: true, shiftKey: true }), hk, true)).toBe(true);
    expect(matchesHotkey(ev({ key: 'k', ctrlKey: true }), hk, false)).toBe(false);
    expect(matchesHotkey(ev({ key: 'j', ctrlKey: true, shiftKey: true }), hk, false)).toBe(false);
    expect(hotkeyLabel('mod+k', false)).toBe('Ctrl+K');
    expect(hotkeyLabel('mod+k', true)).toBe('⌘K');
    expect(hotkeyLabel('ctrl+alt+shift+escape', true)).toBe('⌃⌥⇧Escape');
    expect(hotkeyLabel('meta+alt+f', false)).toBe('Win+Alt+F');
  });

  it('plain-key hotkeys never steal typing from another text field', () => {
    const trigger = vi.fn();
    const reg = registerHotkey('/', document, trigger);
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    expect(trigger).not.toHaveBeenCalled();
    other.blur();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    expect(trigger).toHaveBeenCalledTimes(1);
    reg.dispose();
    other.remove();
  });
});

describe('option layering and prop merging', () => {
  it('merges nested display objects, localization, classNames, styles and slotProps', () => {
    const a = {
      pagination: { showRowRange: true },
      localization: { noRows: 'A', operators: { contains: 'has' } },
      classNames: { row: 'a', cell: () => 'c1' },
      styles: { row: { color: 'red' } },
      slotProps: { row: { onClick: vi.fn(), title: 'a' } },
      icons: { next: 'n' },
    };
    const b = {
      pagination: { pageSizeOptions: [5] },
      localization: { loading: 'B' },
      classNames: { row: () => 'b', cell: undefined, body: 'x' },
      styles: { row: () => ({ background: 'blue' }) },
      slotProps: { row: () => ({ title: 'b' }) },
      icons: { prev: 'p' },
    };
    const merged = mergeTableProps(a as never, b as never) as Record<
      string,
      Record<string, unknown>
    >;
    expect(merged.pagination).toEqual({ showRowRange: true, pageSizeOptions: [5] });
    expect(merged.localization).toMatchObject({ noRows: 'A', loading: 'B' });
    expect((merged.localization as { operators: Record<string, string> }).operators.contains).toBe(
      'has',
    );
    expect((merged.classNames!.row as (c: unknown) => string)({})).toBe('a b');
    expect(merged.classNames!.cell).toBeTypeOf('function');
    expect((merged.styles!.row as (c: unknown) => object)({})).toEqual({
      color: 'red',
      background: 'blue',
    });
    expect((merged.slotProps!.row as (c: unknown) => { title: string }).call(null, {}).title).toBe(
      'b',
    );
    expect(merged.icons).toEqual({ next: 'n', prev: 'p' });
  });

  it('runHandler without a handler calls the default', () => {
    const impl = vi.fn();
    void runHandler(undefined, { a: 1 }, impl);
    expect(impl).toHaveBeenCalledWith({ a: 1 });
  });

  it('cx / mergeProps / toCssSize / isInteractiveTarget', () => {
    expect(cx('a', false, undefined, 'b')).toBe('a b');
    expect(cx()).toBeUndefined();
    const internal = vi.fn();
    const user = vi.fn();
    const merged = mergeProps(
      { onClick: internal, className: 'x', style: { color: 'red' } },
      { onClick: user, className: 'y', style: { top: 0 }, id: 'z', skip: undefined },
    );
    (merged.onClick as (e: object) => void)({});
    expect(user).toHaveBeenCalled();
    expect(internal).toHaveBeenCalled();
    expect(merged).toMatchObject({ className: 'x y', style: { color: 'red', top: 0 }, id: 'z' });
    expect(toCssSize(10)).toBe('10px');
    expect(toCssSize('1em')).toBe('1em');
    const row = document.createElement('tr');
    row.innerHTML = '<td><span data-tk-stop><b>x</b></span></td><td><i>y</i></td>';
    expect(isInteractiveTarget(row.querySelector('b'), row)).toBe(true);
    expect(isInteractiveTarget(row.querySelector('i'), row)).toBe(false);
  });
});

describe('DataTable variants', () => {
  it('throws without columns or table; renders an external table instance', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<DataTable aria-label="x" data={people} />)).toThrow(/columns/);
    err.mockRestore();
    function External() {
      const table = useDataTable<Person>({
        data: people,
        columns: personColumns,
        getRowId: (r) => r.id,
      });
      return <DataTable table={table} aria-label="External" toolbar={false} />;
    }
    const { container } = render(<External />);
    expect(screen.getByRole('table', { name: 'External' })).toBeInTheDocument();
    expect(bodyRows(container)).toHaveLength(6);
  });

  it('ref handle: focus, scrollToRow and the headless focusCell / scrollToRow', () => {
    const ref = createRef<DataTableHandle<Person>>();
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(
      <DataTable
        ref={ref}
        aria-label="R"
        data={people}
        columns={personColumns}
        getRowId={(r) => r.id}
        toolbar={false}
      />,
    );
    act(() => ref.current!.focus());
    expect(document.activeElement?.tagName).toBe('BUTTON');
    ref.current!.scrollToRow('p2', { align: 'center' });
    expect(scroll).toHaveBeenCalledWith({ block: 'center' });
    ref.current!.table.scrollToRow('p3', { align: 'end' });
    expect(scroll).toHaveBeenLastCalledWith({ block: 'end' });
    act(() => ref.current!.table.focusCell('p2', 'city'));
    expect(document.activeElement).toHaveAttribute('data-column-id', 'city');
  });

  it('useTableContext outside a table throws a helpful error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useTableContext())).toThrow(/inside <DataTable>/);
    err.mockRestore();
  });

  it('toolbar bottom / both, pagination top and both, caption', () => {
    const { container } = renderTable({
      data: numbered(30),
      toolbar: 'both',
      pagination: { position: 'both' },
      caption: 'People list',
      showCaption: true,
    });
    expect(container.querySelectorAll('.tk-toolbar')).toHaveLength(2);
    expect(screen.getAllByRole('navigation', { name: 'Pagination' })).toHaveLength(2);
    expect(container.querySelector('caption.tk-caption')).toHaveTextContent('People list');
  });

  it('unstyled and data-theme passthrough; provider theme + dark scheme', () => {
    const { container } = render(
      <TableThemeProvider colorScheme="dark" darkTheme={darkTheme}>
        <DataTable aria-label="U" data={people} columns={personColumns} unstyled toolbar={false} />
      </TableThemeProvider>,
    );
    const root = container.querySelector<HTMLElement>('.tk-root')!;
    expect(root).toHaveAttribute('data-unstyled');
    expect(root).toHaveAttribute('data-color-scheme', 'dark');
    const css = render(
      <DataTable.Root
        table={
          renderHook(() => useDataTable<Person>({ data: people, columns: personColumns })).result
            .current
        }
        data-theme="classic"
      >
        <span />
      </DataTable.Root>,
    );
    expect(css.container.querySelector('.tk-root')).toHaveAttribute('data-theme', 'classic');
  });
});

describe('pagination variants', () => {
  it('loadMore accumulates by paging; hidden when exhausted', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      data: numbered(15),
      toolbar: false,
      pagination: { variant: 'loadMore' },
    });
    const button = screen.getByRole('button', { name: /Load more \(5 remaining\)/ });
    await user.click(button);
    expect(rowIds(container)[0]).toBe('r10');
    expect(screen.queryByRole('button', { name: /Load more/ })).toBeNull();
  });

  it('cursor pagination falls back to the simple variant and pages via cursors', async () => {
    const user = userEvent.setup();
    const ds = createLocalDataSource(numbered(25), {
      columns: personColumns,
      getRowId: (r) => r.id,
    });
    const { container } = render(
      <DataTable
        aria-label="C"
        dataSource={ds}
        paginationType="cursor"
        columns={personColumns}
        getRowId={(r) => r.id}
        toolbar={false}
      />,
    );
    await waitFor(() => expect(bodyRows(container)).toHaveLength(10));
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toHaveAttribute('data-variant', 'simple');
    await user.click(within(nav).getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(rowIds(container)[0]).toBe('r10'));
    await user.click(within(nav).getByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(rowIds(container)[0]).toBe('r0'));
  });

  it('keyboard page change focuses the new active page and scrolls the container to the top', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ data: numbered(50), toolbar: false, maxHeight: 200 });
    const scroller = container.querySelector<HTMLElement>('.tk-container')!;
    scroller.scrollTop = 120;
    const page2 = screen.getByRole('button', { name: 'Page 2' });
    page2.focus();
    await user.keyboard('{Enter}');
    expect(scroller.scrollTop).toBe(0);
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveFocus();
  });

  it("variant 'none' and hideOnSinglePage:false", () => {
    renderTable({ data: numbered(30), toolbar: false, pagination: { variant: 'none' } });
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    renderTable({ toolbar: false, pagination: { hideOnSinglePage: false } });
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('pagination is disabled while fetching and the page-size change handler runs', () => {
    const onPageSizeChange = vi.fn((_ctx: unknown, next: () => void) => next());
    renderTable({
      data: numbered(30),
      toolbar: false,
      fetching: true,
      pagination: { pageSizeOptions: [10, 20] },
      handlers: { onPageSizeChange },
    });
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(nav).getByRole('button', { name: 'Page 2' })).toBeDisabled();
    expect(within(nav).getByLabelText('Rows per page:')).toBeDisabled();
  });
});

describe('provider defaults', () => {
  it('provider slotProps/classNames apply under props; handlers compose', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const { container } = render(
      <TableDefaultsProvider
        value={{
          classNames: { root: 'from-provider' },
          handlers: { onPageChange: (_c, next) => (calls.push('provider'), next()) },
        }}
      >
        <TableDefaultsProvider value={{ classNames: { root: 'nested' } }}>
          <DataTable
            aria-label="P"
            data={numbered(30)}
            columns={personColumns}
            toolbar={false}
            classNames={{ root: 'from-props' }}
          />
        </TableDefaultsProvider>
      </TableDefaultsProvider>,
    );
    expect(container.querySelector('.tk-root')).toHaveClass(
      'from-provider',
      'nested',
      'from-props',
    );
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(calls).toEqual(['provider']);
  });

  it('search hint can be hidden; Search part accepts an explicit table and placeholder', () => {
    function Page() {
      const table = useDataTable<Person>({ data: people, columns: personColumns });
      return (
        <DataTable.Root
          table={table}
          aria-label="S"
          searchHotkey="mod+k"
          showSearchHotkeyHint={false}
        >
          <DataTable.Search table={table} placeholder="Find people" />
        </DataTable.Root>
      );
    }
    render(<Page />);
    expect(screen.getByPlaceholderText('Find people')).toBeInTheDocument();
    expect(screen.queryByText('Ctrl+K')).toBeNull();
  });

  it('clear button in the search input', async () => {
    const user = userEvent.setup();
    const { container } = renderTable();
    await user.type(screen.getByRole('searchbox'), 'bob');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(bodyRows(container)).toHaveLength(6);
  });

  it('renderEmptyState and renderErrorState overrides', () => {
    renderTable({
      data: [],
      toolbar: false,
      renderEmptyState: ({ reason }) => <span>custom {reason}</span>,
    });
    expect(screen.getByText('custom noRows')).toBeInTheDocument();
    renderTable({
      data: [],
      toolbar: false,
      error: new Error('x'),
      renderErrorState: ({ retry }) => (
        <button type="button" onClick={retry}>
          again
        </button>
      ),
    });
    expect(screen.getByRole('button', { name: 'again' })).toBeInTheDocument();
    renderTable({
      data: [],
      loading: true,
      toolbar: false,
      renderEmptyState: ({ reason }) => <span>custom {reason}</span>,
    });
    expect(screen.getByText('custom loading')).toBeInTheDocument();
    renderTable({ data: [], loading: true, loadingDisplay: 'spinner', toolbar: false });
    expect(document.querySelector('.tk-state .tk-spinner')).toBeInTheDocument();
  });

  it('scroll shadows flag the container when content is scrolled underneath', () => {
    const { container } = renderTable({
      toolbar: false,
      columns: [{ accessorKey: 'name', pin: 'left' }, { accessorKey: 'city' }],
    });
    const el = container.querySelector<HTMLElement>('.tk-container')!;
    Object.defineProperty(el, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true });
    el.scrollLeft = 50;
    fireEvent.scroll(el);
    expect(el).toHaveAttribute('data-scrolled-left');
    expect(el).toHaveAttribute('data-scrolled-right');
    expect(container.querySelector('th[data-column-id="name"]')).toHaveAttribute(
      'data-pinned-edge',
    );
  });
});
