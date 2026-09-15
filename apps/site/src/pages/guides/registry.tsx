import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** One guide page (08 §1). The body is plain JSX so it can embed live examples. */
export interface Guide {
  slug: string;
  title: string;
  lead: string;
  body: ReactNode;
}

const Code = ({ children }: { children: string }) => (
  // A scrollable region must be keyboard-focusable (axe `scrollable-region-focusable`).
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
  <pre className="site-code" tabIndex={0}>
    <code>{children}</code>
  </pre>
);

/** Links to a live example page. */
const Example = ({ slug, children }: { slug: string; children: ReactNode }) => (
  <Link to={`/examples/${slug}`}>{children}</Link>
);

export const GUIDES: Guide[] = [
  {
    slug: 'client-vs-server',
    title: 'Client vs. server',
    lead: 'The same component computes everything in the browser, or hands it all to your API — and anything in between.',
    body: (
      <>
        <p>
          In <strong>client mode</strong> you pass <code>data</code> and the engine does the work:
          searching, filtering, sorting, grouping, pagination and faceting. In{' '}
          <strong>server mode</strong> you pass a <code>dataSource</code>; the table sends a
          normalized query and renders the page it gets back.
        </p>
        <Code>{`// Client: everything in the browser
<DataTable data={rows} columns={columns} getRowId={(r) => r.id} />

// Server: the table emits a query, your API answers
<DataTable dataSource={source} columns={columns} getRowId={(r) => r.id} />`}</Code>
        <h2>Hybrid</h2>
        <p>
          Each feature can be overridden on its own with <code>paginationMode</code>,{' '}
          <code>sortingMode</code>, <code>filterMode</code>, <code>searchMode</code>,{' '}
          <code>groupingMode</code> and <code>facetingMode</code>. A common combination is server
          pagination with client sorting of the page you already have — the table never asks the
          server to re-sort, and it does not jump back to page 1.
        </p>
        <Code>{`<DataTable
  dataSource={source}      // implies dataMode="server"
  sortingMode="client"     // sort just the fetched page
  acknowledgePageLocalSorting
/>`}</Code>
        <p>
          The acknowledgement flag exists because page-local sorting surprises people: it orders the
          rows you can see, not the whole dataset. Without it the engine warns in development.
        </p>
        <p>
          See <Example slug="client-vs-server">client vs. server</Example> and{' '}
          <Example slug="hybrid-mode">hybrid mode</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'server-data',
    title: 'Server data',
    lead: 'A data source is one async function; the table handles debouncing, aborting, races, retries and out-of-range pages.',
    body: (
      <>
        <p>
          A <code>DataSource</code> receives the normalized query and returns rows plus a count.
          Everything else — the debounce, the minimum search length, aborting superseded requests,
          ignoring out-of-order responses, adopting the server&apos;s echo of the query, and
          correcting a page that no longer exists — is handled for you.
        </p>
        <Code>{`const source = createRestDataSource({
  url: '/api/accounts/search',
  method: 'POST',
  mapQuery: (q) => ({
    queryCriteria: q.globalFilter,
    listingCriteria: { pageNumber: q.pagination.pageIndex, pageSize: q.pagination.pageSize },
  }),
  mapResult: (json) => ({ rows: json.items, rowCount: json.totalItemCount }),
});`}</Code>
        <h2>Writing one by hand</h2>
        <Code>{`const source = {
  async fetch(query, { signal }) {
    const res = await fetch('/api/rows?' + new URLSearchParams({
      page: String(query.pagination.pageIndex),
      size: String(query.pagination.pageSize),
      q: query.globalFilter,
    }), { signal });
    const json = await res.json();
    return { rows: json.items, rowCount: json.total };
  },
};`}</Code>
        <p>
          Honour the <code>signal</code>: it is how the table cancels a request you no longer need.
        </p>
        <h2>React Query and friends</h2>
        <p>
          The data source is just a promise, so any client works. Call your query client inside{' '}
          <code>fetch</code> and let it own the cache, or keep the table&apos;s own fetching and use{' '}
          <code>onQueryChange</code> to mirror the query elsewhere.
        </p>
        <p>
          See <Example slug="filters-server">server filtering</Example> and{' '}
          <Example slug="cursor-pagination">cursor pagination</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'columns',
    title: 'Columns',
    lead: 'Accessors, types, formatting and fallbacks — with the column helper inferring the value type for you.',
    body: (
      <>
        <p>
          Use <code>createColumnHelper</code> so each column knows its own value type: the key form
          infers from the path, the function form from the return type.
        </p>
        <Code>{`const col = createColumnHelper<Person>();

const columns = [
  col.accessor('email', { header: 'Email' }),
  col.accessor((p) => \`\${p.firstName} \${p.lastName}\`, { id: 'name', header: 'Name' }),
  col.accessor('salary', {
    header: 'Salary',
    type: 'number',                       // right-aligned, numeric sort
    format: (v) => money.format(v),       // display, search and export
  }),
  col.display({ id: 'actions', header: 'Actions', cell: ({ row }) => <RowMenu row={row} /> }),
];`}</Code>
        <h2>Types</h2>
        <p>
          <code>type</code> picks sensible defaults: alignment, the comparator, the filter control
          and the formatter. It is inferred from the first non-null value when you leave it out —
          set it explicitly for sparse data.
        </p>
        <h2>Display vs. value</h2>
        <p>
          <code>format</code> controls what the user sees, what the search matches and what CSV
          receives. Override any of those separately with <code>cell</code>,{' '}
          <code>getSearchValue</code> and <code>exportValue</code>.
        </p>
        <p>
          See <Example slug="column-types">column types</Example> and{' '}
          <Example slug="cell-building-blocks">cell building blocks</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'theming',
    title: 'Theming',
    lead: 'Every visual value is a CSS variable; presets, dark mode, your design system, or no styles at all.',
    body: (
      <>
        <p>
          Import the stylesheet once, then pick a preset. The tokens live in a CSS layer, so your
          own rules always win without <code>!important</code>.
        </p>
        <Code>{`import 'react-tablekit/styles.css';
import 'react-tablekit/presets/classic.css';  // optional`}</Code>
        <h2>Overriding tokens</h2>
        <Code>{`/* CSS: the whole app, or one table */
.my-table { --tk-color-accent: #7c3aed; --tk-radius: 12px; }`}</Code>
        <Code>{`// Or as an object
const brand = createTheme(lightTheme, { color: { accent: '#7C3AED' } });
<DataTable theme={brand} … />`}</Code>
        <h2>Dark mode</h2>
        <p>
          <code>colorScheme="auto"</code> follows the operating system; <code>'dark'</code> and{' '}
          <code>'light'</code> pin it. Pass <code>darkTheme</code> to customize the dark palette.
        </p>
        <h2>Unstyled</h2>
        <p>
          <code>unstyled</code> drops the visual classes and keeps the structure and behaviour, for
          Tailwind or a design system of your own. The <Link to="/theme-editor">theme editor</Link>{' '}
          exports a ready-made <code>createTheme()</code> call, a CSS block or JSON.
        </p>
        <h3>Tailwind recipe</h3>
        <p>
          <code>classNames</code> takes one class per part, keyed by the camelCase slot name, and
          any of them may be a function of the row. With <code>unstyled</code> there is no visual
          layer to override, so the utilities land on a clean slate.
        </p>
        <Code>{`<DataTable
  unstyled
  data={rows}
  columns={columns}
  getRowId={(r) => r.id}
  classNames={{
    root: 'text-sm text-slate-900 dark:text-slate-100',
    toolbar: 'flex flex-wrap items-center gap-2 pb-3',
    searchInput: 'rounded-md border border-slate-300 px-2 py-1',
    table: 'w-full border-collapse',
    headerCell:
      'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ' +
      'text-slate-500 border-b-2 border-slate-200',
    cell: 'px-3 py-2 border-b border-slate-100',
    row: ({ row }) =>
      row.getIsSelected() ? 'bg-indigo-50' : 'odd:bg-slate-50 hover:bg-slate-100',
    pagination: 'flex items-center gap-2 pt-3',
  }}
/>`}</Code>
        <p>
          Keep importing <code>react-tablekit/styles.css</code> even when unstyled: what{' '}
          <code>unstyled</code> drops is the <em>visual</em> theme, not the structural rules that
          make pinning, sticky headers and virtualization position correctly.
        </p>
        <p>
          See <Example slug="slots-design-system">the design-system example</Example>, which does
          exactly this with plain CSS classes instead of utilities.
        </p>
      </>
    ),
  },
  {
    slug: 'accessibility',
    title: 'Accessibility',
    lead: 'Semantic tables, correct ARIA for the state you enable, keyboard support and live announcements.',
    body: (
      <>
        <p>
          The table renders real table markup: <code>&lt;th scope&gt;</code>, an accessible name,{' '}
          <code>aria-sort</code>, and the true totals in <code>aria-rowcount</code> even when
          paginated or virtualized.
        </p>
        <h2>Roles follow the features</h2>
        <p>
          Row state is only valid in the right container, so the role adapts: a selectable table
          becomes a <code>grid</code> (which <code>aria-selected</code> requires), and tree or
          grouped data a <code>treegrid</code> (which <code>aria-level</code> requires). A plain
          table keeps the implicit table role.
        </p>
        <h2>Keyboard</h2>
        <p>
          Everything is reachable with Tab. Turn on <code>enableKeyboardNavigation</code> for the
          full data-grid pattern: one tab stop, arrows between cells, Enter to sort or step into a
          cell, Space to select. See{' '}
          <Example slug="keyboard-navigation">keyboard navigation</Example>.
        </p>
        <h2>Announcements</h2>
        <p>
          Sorting, paging, result counts, selection and column moves are announced politely through
          a live region, debounced so a fast typist is not flooded.
        </p>
        <p>
          Every string comes from <code>localization</code>, so screen-reader output is translated
          along with the UI.
        </p>
      </>
    ),
  },
  {
    slug: 'sorting',
    title: 'Sorting',
    lead: 'Click to sort, Shift-click to add a column, and comparators that understand text, dates and your own domain order.',
    body: (
      <>
        <p>
          Sorting is on by default. A click cycles through ascending, descending and unsorted;
          holding Shift adds a column instead of replacing the current one, and each header shows
          its priority in the chain.
        </p>
        <Code>{`<DataTable data={rows} columns={columns} enableSorting enableMultiSort />`}</Code>
        <h2>Choosing a comparator</h2>
        <p>
          The column <code>type</code> already picks a sensible one, so most tables need nothing
          here. Override it with <code>sortingFn</code> when the default ordering is wrong:
        </p>
        <Code>{`col.accessor('name', { sortingFn: 'alphanumeric' })   // "Room 2" before "Room 10"
col.accessor('city', { sortingFn: 'text' })           // locale-aware: "Ávila" next to "Avila"
col.accessor('status', { sortingFn: (a, b) => RANK[a.original.status] - RANK[b.original.status] })`}</Code>
        <p>
          The built-ins are <code>alphanumeric</code>, <code>alphanumericCaseSensitive</code>,{' '}
          <code>text</code>, <code>textCaseSensitive</code>, <code>datetime</code>,{' '}
          <code>basic</code> and <code>boolean</code>.
        </p>
        <h2>Missing values and direction</h2>
        <p>
          <code>sortUndefined</code> decides where empty cells go — <code>'last'</code> keeps them
          out of the way in both directions, which is usually what people expect.{' '}
          <code>sortDescFirst</code> makes the first click descending, which suits money and dates,
          and <code>invertSorting</code> suits ranks where lower is better. When the sort value
          differs from the displayed one, give the column a <code>sortValue</code>.
        </p>
        <h2>On the server</h2>
        <p>
          In server mode the sort list is sent rather than applied. Map column ids to your
          API&apos;s field names with <code>sortServerKey</code>, and nothing else changes.
        </p>
        <p>
          See <Example slug="client-sorting">client sorting</Example> and{' '}
          <Example slug="server-sorting">server sorting</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'filtering',
    title: 'Filtering',
    lead: 'One control per column, chosen by the data type, in a panel, a row or a popover — with facet counts.',
    body: (
      <>
        <p>
          Turn on <code>enableColumnFilters</code> and each column gets a control matched to its
          type: text gets a box with operators, numbers and dates get ranges, and low-cardinality
          values get a select. Override the choice with <code>filterVariant</code>.
        </p>
        <Code>{`col.accessor('department', { filterVariant: 'select' })
col.accessor('status', { filterVariant: 'multiSelect' })
col.accessor('salary', { filterVariant: 'range' })`}</Code>
        <h2>Where the controls live</h2>
        <p>
          <code>filterDisplayMode</code> decides the layout: <code>'panel'</code> collapses them
          behind a Filters button, <code>'row'</code> puts one under each header, and{' '}
          <code>'popover'</code> attaches each to its own column menu. The active filters show as
          chips with <code>showActiveFilterChips</code>, so a filtered table never looks empty for
          no visible reason.
        </p>
        <h2>Facet counts</h2>
        <p>
          Select controls can show how many rows each option would match. In client mode the counts
          are computed; in server mode they come from <code>fetchFacets</code>, loaded lazily when
          the control opens.
        </p>
        <h2>Custom logic</h2>
        <p>
          <code>filterFn</code> takes a built-in name or your own predicate. Give it an{' '}
          <code>autoRemove</code> so an empty value clears the filter instead of matching nothing.
        </p>
        <p>
          See <Example slug="filters-panel">panel</Example>,{' '}
          <Example slug="filters-row">row</Example>,{' '}
          <Example slug="filters-popover-and-column-menu">popover</Example> and{' '}
          <Example slug="filters-server">server filtering</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'search',
    title: 'Global search',
    lead: 'One box across every searchable column, debounced, diacritic-insensitive, with the matches highlighted.',
    body: (
      <>
        <p>
          Global search matches the <em>displayed</em> text by default, so a formatted date or a
          currency string is searchable exactly as it appears. Point it somewhere else per column
          with <code>getSearchValue</code>, or exclude a column with{' '}
          <code>enableGlobalFilter: false</code>.
        </p>
        <Code>{`<DataTable
  enableGlobalFilter
  highlightSearchMatches
  searchDebounceMs={300}
  searchMinLength={3}
/>`}</Code>
        <h2>Debounce and minimum length</h2>
        <p>
          Both exist to protect the server: with a 300ms debounce and a three-character minimum, a
          fast typist produces one request rather than a dozen. They apply in client mode too, so
          the behaviour you test locally is the behaviour you ship.
        </p>
        <h2>Matching</h2>
        <p>
          Matching ignores case and diacritics — searching <code>zoe</code> finds <code>Zoë</code> —
          and <code>highlightSearchMatches</code> marks the matched runs in the cells. For ranked
          matching, set the search to the <code>fuzzy</code> filter function.
        </p>
        <p>
          The hotkey is scoped to one table, so two tables on a page never fight over it. See{' '}
          <Example slug="global-search">global search</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'pagination',
    title: 'Pagination',
    lead: 'Four variants, cursor support, and page maths that does not jump around while you use it.',
    body: (
      <>
        <p>
          Pagination is on by default. Pick the presentation with the <code>pagination</code> prop:
        </p>
        <Code>{`<DataTable pagination={{ variant: 'numbered', showRowRange: true, pageSizes: [10, 25, 50] }} />`}</Code>
        <p>
          <code>numbered</code> shows page buttons with ellipses, <code>compact</code> just the
          current page and arrows, <code>simple</code> only the arrows, and <code>loadMore</code> a
          button that appends the next page instead of replacing it. <code>infinite</code> does the
          same on scroll.
        </p>
        <h2>Stable page items</h2>
        <p>
          The <code>stable</code> algorithm keeps the number of page buttons constant as you move
          through the pages, so the control does not resize and the button under the cursor does not
          shift. <code>classic</code> reproduces the older, narrower behaviour.
        </p>
        <h2>Unknown totals</h2>
        <p>
          Cursor APIs often cannot say how many rows exist. Return <code>rowCount: -1</code> and the
          table switches to previous/next automatically — the numbered variant is unavailable
          because there is nothing to number.
        </p>
        <h2>Page resets</h2>
        <p>
          Searching, filtering or changing the page size returns you to page one, because staying on
          page nine of a result set that now has two pages is never what you meant. Sorting does
          not, since the rows are the same. A page that no longer exists is corrected rather than
          rendered empty.
        </p>
        <p>
          See <Example slug="pagination-variants">pagination variants</Example>,{' '}
          <Example slug="cursor-pagination">cursor pagination</Example> and{' '}
          <Example slug="infinite-scroll">infinite scroll</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'selection',
    title: 'Selection',
    lead: 'Checkboxes or radios, range selection, bulk actions, and "select all matching" that works across pages.',
    body: (
      <>
        <p>
          <code>enableRowSelection</code> adds the selection column;{' '}
          <code>enableMultiRowSelection={'{false}'}</code> makes it single-select, in which case the
          controls render as radios rather than checkboxes — a detail that matters to anyone using a
          screen reader.
        </p>
        <Code>{`<DataTable
  enableRowSelection
  enableRowSelectionOnClick
  enableRowSelection={(row) => row.original.status !== 'archived'}
  renderBulkActions={({ table }) => <DeleteButton table={table} />}
/>`}</Code>
        <p>
          Passing a function instead of <code>true</code> decides per row, so rows that cannot be
          acted on are never selectable. Shift-click selects a range.
        </p>
        <h2>Selecting more than one page</h2>
        <p>
          The header checkbox selects the current page. When the data comes from a server, the
          selection bar also offers <em>select all matching</em>, which cannot enumerate ids it has
          never fetched — so the selection is stored as a filter plus a set of exclusions. Read it
          with <code>getSelectionPayload()</code> and send that to your API rather than a list of
          ids.
        </p>
        <h2>Accessibility</h2>
        <p>
          A selectable table is a <code>grid</code>, because <code>aria-selected</code> is only
          valid there. That happens automatically.
        </p>
        <p>
          See <Example slug="row-selection">row selection</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'expansion',
    title: 'Expansion and detail panels',
    lead: 'Nested rows through getSubRows, or a rich panel under a row — including children fetched on demand.',
    body: (
      <>
        <p>
          There are two different things here. <strong>Sub-rows</strong> are more rows of the same
          shape, indented under their parent. A <strong>detail panel</strong> is arbitrary content
          revealed under one row.
        </p>
        <Code>{`// Sub-rows: a tree
<DataTable data={orgChart} getSubRows={(node) => node.children} enableExpanding />

// Detail panel: anything you like
<DataTable data={orders} renderDetailPanel={({ row }) => <OrderLines id={row.original.id} />} />`}</Code>
        <h2>Filtering a tree</h2>
        <p>
          By default a parent is kept when any descendant matches, so matches are never orphaned.{' '}
          <code>filterFromLeafRows</code> switches to matching leaves only.
        </p>
        <h2>Loading children on demand</h2>
        <p>
          Large trees should not be sent whole. Provide <code>fetchChildren</code> on the data
          source and only the roots load up front; expanding a row fetches that node&apos;s children
          with a spinner in the row, and a failure offers a retry rather than collapsing silently.
        </p>
        <h2>Accessibility</h2>
        <p>
          Hierarchical data makes the table a <code>treegrid</code>, which is what{' '}
          <code>aria-level</code> and <code>aria-expanded</code> require. The panel itself stays put
          while a wide table scrolls sideways.
        </p>
        <p>
          See <Example slug="tree-data">tree data</Example>,{' '}
          <Example slug="tree-lazy-server">lazy children</Example> and{' '}
          <Example slug="detail-panels">detail panels</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'grouping',
    title: 'Grouping and aggregation',
    lead: 'Collapse rows under the values they share, with counts and aggregates on the group row and in the footer.',
    body: (
      <>
        <p>
          Group by one column or several — nesting follows the order you add them. Each group row
          shows its value, how many rows it holds, and whatever you aggregate.
        </p>
        <Code>{`<DataTable
  enableGrouping
  initialState={{ grouping: ['department', 'city'] }}
  columns={[
    col.accessor('salary', { aggregationFn: 'mean', footer: ({ table }) => total(table) }),
  ]}
/>`}</Code>
        <p>
          The built-in aggregations are <code>sum</code>, <code>min</code>, <code>max</code>,{' '}
          <code>extent</code>, <code>mean</code>, <code>median</code>, <code>unique</code>,{' '}
          <code>uniqueCount</code> and <code>count</code>; <code>aggregationFn</code> also takes
          your own function. Use <code>aggregatedCell</code> to render the aggregate differently
          from a normal cell, and <code>getGroupingValue</code> when rows should group by something
          other than the displayed value — a month rather than a date, say.
        </p>
        <h2>Footers</h2>
        <p>
          A column <code>footer</code> aggregates the whole filtered set, not just the page, so the
          total reflects the question the user asked.
        </p>
        <p>
          See <Example slug="grouping-aggregation">grouping and aggregation</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'pinning',
    title: 'Column pinning',
    lead: 'Keep identity and actions in view while the middle of a wide table scrolls.',
    body: (
      <>
        <p>
          Pin declaratively on the column, or let people pin from the column menu. The classic
          arrangement is the identifying column on the left and the row actions on the right.
        </p>
        <Code>{`col.accessor('name', { pin: 'left', lockPin: true })
col.display({ id: 'actions', pin: 'right' })

// Or as initial state
initialState={{ columnPinning: { left: ['name'], right: ['actions'] } }}`}</Code>
        <h2>Responsive pins</h2>
        <p>
          A pinned column on a phone can eat most of the screen, so a pin may be responsive:{' '}
          <code>{`pin: { base: false, md: 'left' }`}</code> pins it only from the <code>md</code>{' '}
          breakpoint up.
        </p>
        <h2>Details that matter</h2>
        <p>
          Scroll shadows appear on whichever side still has hidden content, so it is obvious there
          is more. Pinning follows the writing direction, so in RTL the &ldquo;left&rdquo; side is
          rendered on the right. <code>lockPin</code> stops the user unpinning a column that your
          layout depends on.
        </p>
        <p>
          See <Example slug="column-pinning">column pinning</Example> and{' '}
          <Example slug="sticky-header-footer">sticky header and footer</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'sizing',
    title: 'Column sizing',
    lead: 'Percentages, pixels, drag-to-resize and autosize — and the keyboard path that people forget.',
    body: (
      <>
        <p>
          <code>width</code> is CSS, so <code>'30%'</code> stays proportional as the table grows.{' '}
          <code>size</code> is a pixel number and is what dragging changes, bounded by{' '}
          <code>minSize</code> and <code>maxSize</code>.
        </p>
        <Code>{`col.accessor('name', { width: '30%', minSize: 120 })
col.accessor('email', { size: 260, minSize: 140, maxSize: 420 })
col.accessor('age', { size: 80, enableResizing: false })`}</Code>
        <h2>Resize modes</h2>
        <p>
          <code>columnResizeMode</code> is <code>'onChange'</code> by default, which follows the
          pointer. Switch to <code>'onEnd'</code> for very wide tables, where laying out every frame
          is wasted work.
        </p>
        <h2>Without a mouse</h2>
        <p>
          A resize handle is focusable: ←/→ resize it, Shift jumps 50px, and Enter or a double-click
          autosizes the column to its content. Autosize is also in the column menu.
        </p>
        <p>
          See <Example slug="column-sizing">column sizing</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'ordering-and-visibility',
    title: 'Ordering and visibility',
    lead: 'Let people arrange the table around their work — and keep the arrangement.',
    body: (
      <>
        <p>
          <code>enableColumnOrdering</code> lets a header be dragged to a new position;{' '}
          <code>enableHiding</code> adds the Columns menu. Both are per-column overridable, which
          matters for the column that identifies the row.
        </p>
        <Code>{`col.accessor('name', {
  lockPosition: 'first',    // stays at the start
  enableHiding: false,      // never offered in the columns menu
  enableOrdering: false,    // and cannot be dragged
})

// Everything locked at once
col.display({ id: 'actions', static: true })`}</Code>
        <h2>Persisting the layout</h2>
        <p>
          Column order, visibility, sizes and density are personal preferences rather than something
          you would put in a shared link, so they belong in <code>localStorage</code>:
        </p>
        <Code>{`<DataTable syncState={{ storage: { key: 'customers-table', version: 1 } }} />`}</Code>
        <p>
          The <code>version</code> is not decoration: bump it when the columns change and stored
          layouts that no longer make sense are discarded instead of resurrecting a column that no
          longer exists.
        </p>
        <p>
          See <Example slug="column-ordering-visibility">column ordering and visibility</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'virtualization',
    title: 'Virtualization',
    lead: 'Render only the rows on screen, so a hundred thousand of them cost about as much as twenty.',
    body: (
      <>
        <p>
          Virtualization needs one thing from you: a bounded height. Without somewhere to scroll
          there is no window to virtualize, so <code>maxHeight</code> is required.
        </p>
        <Code>{`<DataTable
  data={rows}
  maxHeight={600}
  enableRowVirtualization
  enableStickyHeader
/>`}</Code>
        <p>
          Leaving <code>enableRowVirtualization</code> unset turns it on automatically once the
          rendered row count passes <code>virtualizationThreshold</code> (200 by default), so small
          tables keep plain markup and stay easy to debug.
        </p>
        <h2>What still works</h2>
        <p>
          Sorting, searching, filtering and selection operate on the whole dataset, not the visible
          window — the window is only what gets painted. <code>aria-rowcount</code> reports the true
          total, so assistive technology is told &ldquo;row 4 of 100,000&rdquo; rather than
          &ldquo;row 4 of 20&rdquo;.
        </p>
        <h2>Rows of different heights</h2>
        <p>
          Rows are measured as they render, so variable heights need no configuration. Give{' '}
          <code>estimateRowHeight</code> a realistic value anyway: it decides how accurate the
          scrollbar is before anything has been measured.
        </p>
        <p>
          Pair it with infinite pagination to keep both the DOM and the network small. See{' '}
          <Example slug="virtualization-100k">100k rows</Example> and{' '}
          <Example slug="infinite-scroll">infinite scroll</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'keyboard',
    title: 'Keyboard navigation',
    lead: 'Tab reaches everything by default; the full data-grid pattern is one prop away.',
    body: (
      <>
        <p>
          Out of the box every control is reachable with Tab, which is right for a table people
          mostly read. For a table people <em>work</em> in, dozens of tab stops per row is not
          navigation — it is an obstacle course.
        </p>
        <Code>{`<DataTable enableKeyboardNavigation />`}</Code>
        <p>
          That switches to the WAI-ARIA data-grid pattern: the table becomes a single tab stop, and
          the arrow keys move a roving focus between cells.
        </p>
        <h2>The keys</h2>
        <ul>
          <li>
            <strong>← ↑ → ↓</strong> move one cell; <strong>Home</strong> / <strong>End</strong> go
            to the row&apos;s first and last cell.
          </li>
          <li>
            <strong>Ctrl+Home</strong> / <strong>Ctrl+End</strong> jump to the first and last cell
            of the table; <strong>Page Up</strong> / <strong>Page Down</strong> move a screen.
          </li>
          <li>
            <strong>Enter</strong> sorts a header, or steps into a cell that has its own controls —{' '}
            <strong>Escape</strong> steps back out.
          </li>
          <li>
            <strong>Space</strong> toggles selection; <strong>Shift+Space</strong> extends it.
          </li>
        </ul>
        <p>
          Focus survives sorting, paging and refetching: it stays on the same row where the row
          still exists, rather than snapping back to the top.
        </p>
        <p>
          See <Example slug="keyboard-navigation">keyboard navigation</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'export',
    title: 'Export',
    lead: 'CSV and clipboard for the page, every matching row, or just the selection — including datasets too big to hold.',
    body: (
      <>
        <p>
          <code>enableExport</code> adds the toolbar button; the scope is the user&apos;s choice.
          Exports use the same formatting the table shows, so the file matches the screen.
        </p>
        <Code>{`<DataTable enableExport export={{ fileName: 'customers.csv', scopes: ['page', 'all', 'selected'] }} />`}</Code>
        <p>
          Override what a column contributes with <code>exportValue</code>, or leave it out of the
          file entirely — an actions column has nothing to export.
        </p>
        <h2>Large server exports</h2>
        <p>
          &ldquo;All matching rows&rdquo; may be far more than is loaded. Give the data source an{' '}
          <code>exportChunk</code> and the table pages through the results, reporting progress and
          letting the user cancel, instead of holding everything in memory at once.
        </p>
        <h2>Doing it yourself</h2>
        <p>
          <code>exportToCsv</code> is exported on its own, so a button of yours can produce exactly
          the same file.
        </p>
        <p>
          See <Example slug="export">export</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'persistence',
    title: 'Persistence',
    lead: 'Put the shareable state in the URL and the personal state in storage — they are not the same thing.',
    body: (
      <>
        <p>
          A link should reproduce what someone is looking at: the page, the sort, the search, the
          filters. How wide their columns are is nobody else&apos;s business. Split them
          accordingly:
        </p>
        <Code>{`<DataTable
  syncState={{
    url: { keys: ['pagination', 'sorting', 'globalFilter', 'columnFilters'] },
    storage: { key: 'customers-table', version: 1 },
  }}
/>`}</Code>
        <p>
          The URL format is compact and stable — <code>?tk.page=2&amp;tk.sort=name.asc</code> —
          rather than a base64 blob, so it survives being edited by hand and read in a bug report.
        </p>
        <h2>With a router</h2>
        <p>
          By default the table writes with <code>history.replaceState</code>. Under a router, hand
          it the router&apos;s search params instead so both agree on who owns the URL:
        </p>
        <Code>{`const sync = useRouterSync({ searchParams, setSearchParams });
<DataTable syncState={{ url: { keys: [...], adapter: sync } }} />`}</Code>
        <h2>Versioning</h2>
        <p>
          Bump <code>version</code> whenever the columns change. Stored layouts that no longer match
          are discarded rather than restoring a column that no longer exists.
        </p>
        <p>
          See <Example slug="url-sync">URL and storage sync</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'responsive',
    title: 'Responsive',
    lead: 'A table on a phone is either a horizontal scroll or a list of cards. Choose deliberately.',
    body: (
      <>
        <p>
          Below the mobile breakpoint <code>mobileLayout</code> decides what happens.{' '}
          <code>'scroll'</code> keeps the table and scrolls it sideways — right when the columns
          matter and comparison across rows is the point. <code>'cards'</code> renders each row as
          label/value pairs, which reads far better for a list you scan one entry at a time.
        </p>
        <Code>{`<DataTable
  responsive={{ mobileLayout: 'cards', cardColumns: ['name', 'status', 'salary'] }}
  renderCard={({ row }) => <PersonCard person={row.original} />}
/>`}</Code>
        <p>
          <code>cardColumns</code> keeps a card to the fields worth showing; <code>renderCard</code>{' '}
          replaces the card outright. In cards mode the rows become a list of articles rather than a
          table, because that is what they now are.
        </p>
        <h2>Responsive column options</h2>
        <p>
          Pinning and visibility take responsive values, so a column can be pinned on a desktop and
          released on a phone: <code>{`pin: { base: false, md: 'left' }`}</code>.
        </p>
        <p>
          The breakpoints come from the theme and can be overridden per table with{' '}
          <code>responsive.breakpoints</code>.
        </p>
        <p>
          See <Example slug="responsive-cards">responsive cards</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'customization',
    title: 'Customization',
    lead: 'Nine levels, from a class name to replacing the renderer entirely — each one reaching for the next only when you need it.',
    body: (
      <>
        <p>
          Customization is a ladder, not a switch. Most tables stop at the second rung; the higher
          ones exist so that needing something unusual never means abandoning the library.
        </p>
        <h2>0 — Props</h2>
        <p>
          The feature flags and the <code>pagination</code>, <code>responsive</code> and{' '}
          <code>export</code> option objects.
        </p>
        <h2>1 — Tokens and classes</h2>
        <p>
          <code>theme</code>, CSS variables, or <code>classNames</code> for a class on any part —
          including functions of the row, for striping or muting.
        </p>
        <h2>2 — Cells</h2>
        <p>
          A column&apos;s <code>cell</code>, <code>header</code> and <code>footer</code> render
          anything, with the shipped primitives (<Link to="/docs/guides/columns">columns</Link>)
          covering the recurring shapes.
        </p>
        <h2>3 — Rows</h2>
        <p>
          <code>getRowProps</code> and <code>getRowClassName</code> decorate a row;{' '}
          <code>renderRow</code> replaces it and is given <code>defaultRender</code>, so you can
          wrap the default rather than reimplement it — that is how an alert row or a section header
          gets inserted mid-table.
        </p>
        <h2>4 — Slots</h2>
        <p>
          Every part is a replaceable component receiving the state it needs as props. Replace the
          pagination bar, the empty state, the search box, a header cell — the rest keeps working.
        </p>
        <Code>{`<DataTable slots={{ Pagination: MyPager, EmptyState: MyEmpty }} />`}</Code>
        <h2>5 — Handlers</h2>
        <p>
          Every interaction runs through overridable middleware. Observe it, change the intent, or
          cancel it by not calling <code>next</code>:
        </p>
        <Code>{`handlers={{
  onSortChange: (ctx, next) => { analytics.track('sort', ctx); next(ctx); },
  onPageChange: (ctx, next) => { if (!dirty || confirm('Discard?')) next(ctx); },
}}`}</Code>
        <h2>6 — Composition</h2>
        <p>
          <code>DataTable.Root</code> and the parts let you place the toolbar, the table and the
          pagination wherever your layout needs them.
        </p>
        <h2>7 — Headless</h2>
        <p>
          <code>useDataTable</code> is the whole engine and renders nothing, so the rows can be
          cards, a list, or anything else.
        </p>
        <h2>8 — Core</h2>
        <p>
          <code>createTable</code> works without React at all.
        </p>
        <p>
          See <Example slug="slots-custom-components">custom slots</Example>,{' '}
          <Example slug="handlers-middleware">handler middleware</Example>,{' '}
          <Example slug="composable-layout">composable layout</Example> and{' '}
          <Example slug="headless">headless</Example>.
        </p>
      </>
    ),
  },
  {
    slug: 'localization',
    title: 'Localization',
    lead: 'Every visible string comes from one object, and the numbers, dates and counts follow the locale too.',
    body: (
      <>
        <p>
          There are no hard-coded strings. Pass a locale pack, or override individual keys on top of
          one:
        </p>
        <Code>{`import hu from 'react-tablekit/locales/hu';

<DataTable localization={hu} />
<DataTable localization={{ ...hu, search: 'Keresés a névjegyzékben' }} />`}</Code>
        <p>
          Packs ship for English, Hungarian, German and Spanish, each a separate entry point so the
          ones you do not import are never bundled.
        </p>
        <h2>Strings with values</h2>
        <p>
          Keys that take values are functions, not templates with placeholders, so the word order is
          the translator&apos;s decision rather than English&apos;s:
        </p>
        <Code>{`rowRange: ({ from, to, total }) => \`\${from}–\${to} / \${total}\``}</Code>
        <h2>With an i18n library</h2>
        <p>
          The pack is a plain object, so it can be built from your own catalogue — map the keys to{' '}
          <code>t()</code> calls and the table speaks whatever your app already speaks.
        </p>
        <h2>Formatting</h2>
        <p>
          <code>locale</code> drives <code>Intl</code> for numbers, currencies and dates, so
          formatting matches the language rather than only the labels. Screen-reader announcements
          are translated too, since they come from the same keys.
        </p>
        <p>
          See <Example slug="localization">localization</Example>.
        </p>
      </>
    ),
  },
];

export const findGuide = (slug: string | undefined) => GUIDES.find((g) => g.slug === slug);
