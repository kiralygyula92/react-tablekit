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
import { describe, expect, it, vi } from 'vitest';
import {
  ActionButton,
  Checkbox,
  Chip,
  ChipList,
  createLocalDataSource,
  DataTable,
  MultiLineList,
  RowActionsMenu,
  TableLocaleProvider,
  TableThemeProvider,
  Tooltip,
  TruncatedText,
  TwoLineText,
  useBreakpoint,
  useDataSource,
  useDataTable,
  useDetailPanelData,
  useTableState,
  type AnyColumnDef,
} from '../../src';
import {
  bodyRows,
  numbered,
  people,
  personColumns,
  renderTable,
  rowIds,
  type Person,
} from './helpers';

const tree: Person[] = [
  {
    id: 'a',
    name: 'Parent A',
    age: 50,
    joined: '2020-01-01',
    active: true,
    children: [
      { id: 'a1', name: 'Child A1', age: 30, joined: '2020-01-01', active: true },
      { id: 'a2', name: 'Child A2', age: 20, joined: '2020-01-01', active: false },
    ],
  },
  { id: 'b', name: 'Leaf B', age: 40, joined: '2020-01-01', active: true },
];

describe('cell building blocks (04 §9)', () => {
  it('ActionButton: accessible name, tooltip on hover, stops propagation, disabled wrapper', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const parent = vi.fn();
    render(
      <div onClick={parent}>
        <ActionButton icon={<span>✎</span>} label="Edit" onClick={onClick} />
        <ActionButton icon={<span>✉</span>} label="Resend" disabled />
      </div>,
    );
    const edit = screen.getByRole('button', { name: 'Edit' });
    await user.hover(edit);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Edit');
    await user.click(edit);
    expect(onClick).toHaveBeenCalled();
    expect(parent).not.toHaveBeenCalled();
    await user.unhover(edit);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    expect(screen.getByRole('button', { name: 'Resend' })).toBeDisabled();
  });

  it('Tooltip hides with Escape and describes its trigger', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Full text">
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    await user.tab();
    const tip = await screen.findByRole('tooltip');
    expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', tip.id);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('RowActionsMenu: inline actions plus a keyboard-navigable overflow menu', async () => {
    const user = userEvent.setup();
    const del = vi.fn();
    render(
      <RowActionsMenu
        inlineCount={1}
        actions={[
          { label: 'Edit', onClick: vi.fn() },
          { label: 'Duplicate', onClick: vi.fn() },
          { label: 'Delete', onClick: del, danger: true },
          { label: 'Hidden', onClick: vi.fn(), hidden: true },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    const menu = screen.getByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((m) => m.textContent),
    ).toEqual(['Duplicate', 'Delete']);
    expect(within(menu).getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(del).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Checkbox reflects checked / indeterminate and reports changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <Checkbox checked={false} indeterminate onChange={onChange} aria-label="All" />,
    );
    const box = screen.getByRole('checkbox', { name: 'All' });
    expect((box as HTMLInputElement).indeterminate).toBe(true);
    await user.click(box);
    expect(onChange).toHaveBeenCalledWith(true, expect.anything());
    rerender(<Checkbox checked onChange={onChange} aria-label="All" />);
    expect(box).toBeChecked();
  });

  it('Chip / ChipList with +N overflow, clickable and deletable chips', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onDelete = vi.fn();
    render(
      <>
        <ChipList items={['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']} />
        <Chip label="Click" onClick={onClick} color="#123456" textColor="#fff" />
        <Chip label="Delete me" onDelete={onDelete} deleteLabel="Remove chip" />
      </>,
    );
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('Epsilon')).toBeNull();
    const click = screen.getByRole('button', { name: 'Click' });
    click.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remove chip' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('TruncatedText, MultiLineList, TwoLineText render their cell layouts', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TruncatedText
          text="Gate code 4471. Dog in the back yard, please close the gate."
          maxChars={30}
        />
        <MultiLineList items={['a@example.com', 'b@example.com']} />
        <MultiLineList items={[]} empty="none" />
        <TwoLineText primary="123 Main St" secondary="Austin, TX 78701" />
        <TwoLineText primary="" />
      </>,
    );
    const truncated = screen.getByText('Gate code 4471. Dog in the bac…');
    await user.hover(truncated);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('please close the gate');
    expect(screen.getAllByText('-')).toHaveLength(1);
    expect(screen.getByText('b@example.com')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
    expect(screen.getByText('Austin, TX 78701')).toHaveClass('tk-two-line__secondary');
  });
});

describe('toolbar, filters and chips (05 §3, §18)', () => {
  const filterColumns: AnyColumnDef<Person>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'age', header: 'Age', type: 'number' },
    { accessorKey: 'city', header: 'City', filterVariant: 'select' },
    { accessorKey: 'active', header: 'Active', type: 'boolean' },
    { accessorKey: 'joined', header: 'Joined', type: 'date' },
    {
      accessorKey: 'tags',
      header: 'Tags',
      filterVariant: 'multiSelect',
      filterOptions: [
        { value: 'a', label: 'Alpha', color: '#003', textColor: '#fff' },
        { value: 'b', label: 'Beta' },
      ],
    },
  ];

  it('the Filters button toggles the panel; controls filter rows; chips remove filters', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ columns: filterColumns });
    const toggle = screen.getByRole('button', { name: /Filters/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    const panel = container.querySelector<HTMLElement>('.tk-filter-panel')!;
    expect(panel).toBeInTheDocument();

    await user.selectOptions(
      within(panel).getByLabelText('City'),
      within(panel).getByRole('option', { name: 'Austin (2)' }),
    );
    expect(rowIds(container)).toEqual(['p2', 'p3']);
    expect(screen.getByRole('button', { name: /Filters/ })).toHaveTextContent('1');

    await user.selectOptions(within(panel).getByLabelText('Active'), 'false');
    expect(rowIds(container)).toEqual(['p2']);

    const chips = container.querySelector<HTMLElement>('.tk-filter-chips')!;
    expect(within(chips).getByText('City: Austin')).toBeInTheDocument();
    await user.click(within(chips).getByRole('button', { name: /City: Austin/ }));
    expect(rowIds(container)).toEqual(['p2', 'p5']);
    await user.click(within(chips).getByRole('button', { name: 'Clear all' }));
    expect(bodyRows(container)).toHaveLength(6);
  });

  it('range, text-with-operator, date range and multi-select list controls', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      columns: [
        ...filterColumns.slice(0, 2),
        {
          accessorKey: 'city',
          header: 'City',
          filterOperators: ['contains', 'startsWith', 'empty'],
        },
        ...filterColumns.slice(4),
      ],
    });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    const panel = container.querySelector<HTMLElement>('.tk-filter-panel')!;
    await user.type(within(panel).getByLabelText('Age Min'), '40');
    expect(rowIds(container)).toEqual(['p4', 'p6']);
    await user.clear(within(panel).getByLabelText('Age Min'));
    await user.selectOptions(within(panel).getByLabelText('Operator'), 'empty');
    expect(rowIds(container)).toEqual(['p5']);
    await user.selectOptions(within(panel).getByLabelText('Operator'), 'startsWith');
    await user.type(within(panel).getByLabelText('City'), 'bud');
    expect(rowIds(container)).toEqual(['p1', 'p6']);
    await user.clear(within(panel).getByLabelText('City'));
    fireEvent.change(within(panel).getByLabelText('Joined From'), {
      target: { value: '2021-01-01' },
    });
    expect(rowIds(container)).toEqual(['p1', 'p3', 'p5']);
    fireEvent.change(within(panel).getByLabelText('Joined From'), { target: { value: '' } });
    await user.click(within(panel).getByRole('checkbox', { name: /Alpha/ }));
    expect(rowIds(container)).toEqual(['p1', 'p3']);
    const chip = within(container.querySelector<HTMLElement>('.tk-filter-chips')!).getByText(
      'Tags: Alpha',
    );
    expect(chip.closest('.tk-chip')).toHaveStyle({ '--tk-chip-bg': '#003' });
  });

  it('date range presets fill both inputs', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      columns: [{ accessorKey: 'joined', header: 'Joined', type: 'date' }],
    });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    const panel = container.querySelector<HTMLElement>('.tk-filter-panel')!;
    await user.selectOptions(within(panel).getByLabelText('Joined: Preset'), 'thisYear');
    expect(within(panel).getByLabelText<HTMLInputElement>('Joined From').value).toMatch(
      /^\d{4}-01-01$/,
    );
  });

  it('manual apply mode only filters on Apply', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({ columns: filterColumns, filterApplyMode: 'manual' });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    const panel = container.querySelector<HTMLElement>('.tk-filter-panel')!;
    await user.selectOptions(
      within(panel).getByLabelText('City'),
      within(panel).getByRole('option', { name: 'Miami (1)' }),
    );
    expect(bodyRows(container)).toHaveLength(6);
    await user.click(within(panel).getByRole('button', { name: 'Apply' }));
    expect(rowIds(container)).toEqual(['p4']);
    await user.click(within(panel).getByRole('button', { name: 'Clear all' }));
    expect(bodyRows(container)).toHaveLength(6);
  });

  it("popover mode opens the filters in a dialog; 'row' mode renders a filter row", async () => {
    const user = userEvent.setup();
    renderTable({ columns: filterColumns, filterDisplayMode: 'popover' });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(within(dialog).getByLabelText('City')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    const row = renderTable({ columns: filterColumns, filterDisplayMode: 'row' });
    const filterRow = row.container.querySelector<HTMLElement>('thead .tk-filter-row')!;
    await user.type(within(filterRow).getByLabelText('Name'), 'bob');
    expect(rowIds(row.container)).toEqual(['p2']);
  });

  it('autocomplete multi-select (an ARIA combobox)', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      multiSelectDisplay: 'autocomplete',
      columns: [{ accessorKey: 'city', header: 'City', filterVariant: 'multiSelect' }],
    });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    const combo = screen.getByRole('combobox', { name: 'City' });
    await user.type(combo, 'mia');
    expect(screen.getByRole('listbox')).toHaveTextContent('Miami (1)');
    await user.keyboard('{Enter}');
    expect(rowIds(container)).toEqual(['p4']);
    await user.keyboard('{Backspace}');
    expect(bodyRows(container)).toHaveLength(6);
  });

  it('async filterOptions show a loading state, then options', async () => {
    const user = userEvent.setup();
    renderTable({
      columns: [
        {
          accessorKey: 'city',
          header: 'City',
          filterVariant: 'select',
          filterOptions: () => Promise.resolve([{ value: 'Miami', label: 'Miami!' }]),
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    expect(await screen.findByRole('option', { name: 'Miami!' })).toBeInTheDocument();
  });

  it('Columns menu toggles visibility; density and export buttons work', async () => {
    const user = userEvent.setup();
    const onExportFile = vi.fn();
    const { container } = renderTable({
      enableDensityToggle: true,
      enableExport: true,
      onExportFile,
      enableColumnOrdering: true,
    });
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    const dialog = screen.getByRole('dialog', { name: 'Columns' });
    await user.click(within(dialog).getByRole('checkbox', { name: 'City' }));
    expect(container.querySelector('th[data-column-id="city"]')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Move right: Name' }));
    expect(container.querySelector('thead th')).toHaveAttribute('data-column-id', 'age');
    await user.click(within(dialog).getByRole('button', { name: 'Reset' }));
    expect(container.querySelector('th[data-column-id="city"]')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Hide all' }));
    await user.click(within(dialog).getByRole('button', { name: 'Show all' }));
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Density: Standard' }));
    expect(container.querySelector('.tk-root')).toHaveAttribute('data-density', 'comfortable');

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(screen.getByRole('menuitem', { name: 'Export CSV (current page)' }));
    await waitFor(() => expect(onExportFile).toHaveBeenCalled());
    const [blob, name] = onExportFile.mock.calls[0] as [Blob, string];
    expect(name).toBe('export.csv');
    expect(await blob.text()).toContain('Name,Age,City');
  });

  it('toolbarActions / renderToolbarStart / renderToolbarEnd', () => {
    renderTable({ toolbarActions: <button type="button">Add</button> });
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    renderTable({
      renderToolbarStart: () => <span>start</span>,
      renderToolbarEnd: () => <span>end</span>,
    });
    expect(screen.getByText('start')).toBeInTheDocument();
    expect(screen.getByText('end')).toBeInTheDocument();
  });
});

describe('selection, expansion, grouping rendering (05 §5–7)', () => {
  it('row checkboxes, header tri-state, selection bar with bulk actions and Shift range', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      data: numbered(25),
      enableRowSelection: true,
      renderBulkActions: ({ selectedRows }) => (
        <button type="button">Delete {selectedRows.length}</button>
      ),
    });
    const rowBoxes = () => screen.getAllByRole('checkbox', { name: 'Select row' });
    await user.click(rowBoxes()[0]!);
    expect(bodyRows(container)[0]).toHaveAttribute('aria-selected', 'true');
    const header = screen.getByRole('checkbox', { name: 'Select all rows on this page' });
    expect((header as HTMLInputElement).indeterminate).toBe(true);
    await user.keyboard('{Shift>}');
    await user.click(rowBoxes()[3]!);
    await user.keyboard('{/Shift}');
    expect(container.querySelectorAll('tr[aria-selected="true"]')).toHaveLength(4);
    const bar = screen.getByRole('region', { name: '4 selected' });
    expect(within(bar).getByRole('button', { name: 'Delete 4' })).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: 'Select all 25 matching' }));
    expect(within(screen.getByRole('region')).getByText('25 selected')).toBeInTheDocument();
    await user.click(within(screen.getByRole('region')).getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region')).toBeNull();
    await user.click(header);
    expect(container.querySelectorAll('tr[aria-selected="true"]')).toHaveLength(10);
  });

  it('single selection by row click; interactive descendants do not toggle', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      toolbar: false,
      enableRowSelection: true,
      enableMultiRowSelection: false,
      selectOnRowClick: true,
      renderRowActions: () => <button type="button">Act</button>,
    });
    expect(screen.queryByRole('checkbox', { name: 'Select all rows on this page' })).toBeNull();
    // Single selection has radio semantics (05 §5), not checkboxes.
    expect(screen.getAllByRole('radio', { name: 'Select row' })).toHaveLength(
      bodyRows(container).length,
    );
    expect(screen.queryAllByRole('checkbox', { name: 'Select row' })).toHaveLength(0);
    await user.click(bodyRows(container)[1]!.querySelector<HTMLElement>('td')!);
    await user.click(bodyRows(container)[2]!.querySelector<HTMLElement>('td')!);
    expect(container.querySelectorAll('tr[aria-selected="true"]')).toHaveLength(1);
    await user.click(within(bodyRows(container)[4]!).getByRole('button', { name: 'Act' }));
    expect(bodyRows(container)[4]).toHaveAttribute('aria-selected', 'false');
    // actions column is pinned right and its header is localized
    expect(container.querySelector('th[data-column-id="tk-actions"]')).toHaveAttribute(
      'data-pinned',
      'right',
    );
  });

  it('tree data with the expand column, expand all and indentation', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      data: tree,
      getSubRows: (p) => p.children,
      toolbar: false,
    });
    await user.click(screen.getByRole('button', { name: 'Expand row' }));
    expect(rowIds(container)).toEqual(['a', 'a1', 'a2', 'b']);
    const child = container.querySelector<HTMLElement>('tr[data-row-id="a1"] [data-tree]')!;
    expect(child.style.getPropertyValue('--tk-depth')).toBe('1');
    await user.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(rowIds(container)).toEqual(['a', 'b']);
    await user.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(rowIds(container)).toHaveLength(4);
  });

  it('detail panels: lazy, aria-controls, keepMounted, expandOnRowClick', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      toolbar: false,
      expandOnRowClick: true,
      detailPanelProps: { animate: false },
      renderDetailPanel: ({ row }) => <p>Details for {row.original.name}</p>,
    });
    expect(container.querySelector('.tk-detail-row')).toBeNull();
    const button = within(bodyRows(container)[0]!).getByRole('button', { name: 'Expand row' });
    await user.click(button);
    const panel = await screen.findByText('Details for Zoë Adams');
    const detailRow = panel.closest('tr')!;
    expect(button).toHaveAttribute('aria-controls', detailRow.id);
    await user.click(bodyRows(container)[1]!.querySelector<HTMLElement>('td')!);
    expect(await screen.findByText('Details for bob brown')).toBeInTheDocument();
  });

  it('grouping renders group rows with counts, aggregates and a footer', async () => {
    const user = userEvent.setup();
    const { container } = renderTable({
      toolbar: false,
      enableGrouping: true,
      initialState: { grouping: ['city'] },
      columns: [
        { accessorKey: 'city', header: 'City' },
        { accessorKey: 'age', header: 'Age', aggregationFn: 'sum' },
        { accessorKey: 'name', header: 'Name', footer: () => 'Total' },
      ],
    });
    const toggle = screen.getByRole('button', { name: 'Expand row: Budapest' });
    expect(toggle).toHaveTextContent('Budapest(2)');
    expect(container.querySelector('tr[data-grouped] [data-column-id="age"]')).toHaveTextContent(
      '88',
    );
    await user.click(toggle);
    expect(rowIds(container).slice(0, 3)).toEqual(['group:city:Budapest', 'p1', 'p6']);
    expect(container.querySelector('tfoot [data-column-id="age"]')).toHaveTextContent('180');
    expect(container.querySelector('tfoot [data-column-id="name"]')).toHaveTextContent('Total');
  });

  it('renderRow can wrap the default row and insert rows', () => {
    const { container } = renderTable({
      toolbar: false,
      renderRow: ({ row, defaultRender, table }) => (
        <>
          {defaultRender({ rowProps: { 'data-extra': 'yes' } })}
          {row.id === 'p1' && (
            <tr className="tk-row--alert">
              <td colSpan={table.getVisibleLeafColumns().length}>Alert</td>
            </tr>
          )}
        </>
      ),
    });
    expect(container.querySelector('tr[data-row-id="p1"]')).toHaveAttribute('data-extra', 'yes');
    expect(container.querySelector('.tk-row--alert')).toHaveTextContent('Alert');
  });

  it('row numbers, disabled rows, striped and row event props', async () => {
    const user = userEvent.setup();
    const onRowDoubleClick = vi.fn();
    const onCellClick = vi.fn();
    const { container } = renderTable({
      toolbar: false,
      enableRowNumbers: true,
      enableStriped: true,
      isRowDisabled: (r) => r.id === 'p2',
      onRowDoubleClick,
      onCellClick,
      getRowClassName: (r) => (r.id === 'p3' ? 'three' : undefined),
    });
    expect(
      container.querySelector('tr[data-row-id="p4"] [data-column-id="tk-row-number"]'),
    ).toHaveTextContent('4');
    expect(container.querySelector('tr[data-row-id="p2"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(container.querySelector('tr[data-row-id="p3"]')).toHaveClass('three');
    await user.dblClick(bodyRows(container)[0]!.querySelector<HTMLElement>('td')!);
    expect(onRowDoubleClick).toHaveBeenCalled();
    expect(onCellClick).toHaveBeenCalled();
  });

  it('row pinning keeps pinned rows on top across pages', () => {
    const { container } = renderTable({
      toolbar: false,
      data: numbered(30),
      enableRowPinning: true,
      initialState: {
        rowPinning: { top: ['r25'], bottom: [] },
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });
    expect(rowIds(container)[0]).toBe('r25');
    expect(container.querySelector('tr[data-row-id="r25"]')).toHaveAttribute('data-pinned', 'top');
  });

  it('sticky header, headerTooltip, headerShort and truncate', async () => {
    const user = userEvent.setup();
    window.innerWidth = 500;
    const { container } = renderTable({
      toolbar: false,
      enableStickyHeader: true,
      columns: [
        { accessorKey: 'name', header: 'Name', headerTooltip: 'Full legal name', truncate: true },
        {
          accessorKey: 'city',
          header: 'Location',
          headerShort: { base: 'Loc', sm: undefined },
        },
      ],
    });
    window.innerWidth = 1024;
    expect(container.querySelector('thead')).toHaveAttribute('data-sticky');
    expect(screen.getByText('Loc')).toBeInTheDocument();
    await user.hover(container.querySelector<HTMLElement>('.tk-header-tooltip')!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Full legal name');
    expect(container.querySelector('.tk-truncate')).toBeInTheDocument();
  });

  it('B14 regression: the header sticks inside a max-height scroll container (a picker dialog)', () => {
    const { container } = renderTable({
      toolbar: false,
      enableStickyHeader: true,
      maxHeight: 400,
    });
    const scroller = container.querySelector<HTMLElement>('.tk-container')!;
    // The container is the scroll parent the sticky header sticks to.
    expect(scroller).toHaveAttribute('data-scrollable');
    expect(scroller.style.maxHeight).toBe('400px');
    expect(container.querySelector('thead')).toHaveAttribute('data-sticky');
  });
});

describe('providers and hooks (04 §6–7)', () => {
  it('TableThemeProvider applies theme variables and data-theme; TableLocaleProvider strings', () => {
    const { container } = render(
      <TableThemeProvider theme={{ name: 'brand', color: { accent: '#7C3AED' } }}>
        <TableLocaleProvider localization={{ noRows: 'Nothing here' }}>
          <DataTable aria-label="T" data={[]} columns={personColumns} toolbar={false} />
        </TableLocaleProvider>
      </TableThemeProvider>,
    );
    const root = container.querySelector<HTMLElement>('.tk-root')!;
    expect(root).toHaveAttribute('data-theme', 'brand');
    expect(root.style.getPropertyValue('--tk-color-accent')).toBe('#7C3AED');
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it("colorScheme 'dark' switches to the dark preset", () => {
    const { container } = render(
      <DataTable
        aria-label="T"
        data={people}
        columns={personColumns}
        colorScheme="dark"
        toolbar={false}
      />,
    );
    expect(container.querySelector('.tk-root')).toHaveAttribute('data-color-scheme', 'dark');
  });

  it('useTableState re-renders on the selected slice only', () => {
    const renders = vi.fn();
    const { result } = renderHook(() => {
      const table = useDataTable<Person>({ data: people, columns: personColumns });
      const density = useTableState(table, (s) => s.density);
      renders(density);
      return table;
    });
    act(() => result.current.setDensity('compact'));
    expect(renders).toHaveBeenLastCalledWith('compact');
  });

  it('useDataSource exposes rows and status', async () => {
    const ds = createLocalDataSource(numbered(12), {
      columns: personColumns,
      getRowId: (r) => r.id,
    });
    const { result } = renderHook(() => {
      const table = useDataTable<Person>({
        dataSource: ds,
        columns: personColumns,
        getRowId: (r) => r.id,
      });
      return useDataSource(ds, { table });
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(10));
    expect(result.current.rowCount).toBe(12);
    expect(result.current.loading).toBe(false);
  });

  it('useDetailPanelData loads once per row and caches', async () => {
    const table = renderHook(() =>
      useDataTable<Person>({ data: people, columns: personColumns, getRowId: (r) => r.id }),
    ).result.current;
    const loader = vi.fn((row: { id: string }) => Promise.resolve(`orders of ${row.id}`));
    const row = table.getRow('p1')!;
    const first = renderHook(() => useDetailPanelData(row, loader));
    expect(first.result.current.loading).toBe(true);
    await waitFor(() => expect(first.result.current.data).toBe('orders of p1'));
    const second = renderHook(() => useDetailPanelData(row, loader));
    expect(second.result.current.data).toBe('orders of p1');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('useBreakpoint follows the viewport', () => {
    window.innerWidth = 700;
    expect(renderHook(() => useBreakpoint()).result.current).toBe('sm');
    window.innerWidth = 1024;
  });
});
