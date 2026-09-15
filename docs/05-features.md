# 05: Feature Specifications (Source of Truth for Behaviour)

Each feature lists its **behaviour**, **UI**, **client/server semantics** (details in 03), **a11y** and **acceptance tests**. Names match 04.

---

## 1. Sorting

**Behaviour**
- Clicking a sortable header cycles through `asc → desc → none`. With `sortDescFirst` it cycles `desc → asc → none`. When `enableSortingRemoval: false` there is no `none` step.
- Multi-sort: a `isMultiSortEvent` (Shift+click by default) adds the column or toggles it within the list, up to `maxMultiSortColCount`. A plain click replaces the list.
- Sort priority badges (1, 2, 3) appear next to the icons when more than one column is sorted.
- Built-in `sortingFns`: `alphanumeric` (natural "a2" < "a10"), `alphanumericCaseSensitive`, `text` (`Intl.Collator(locale, { sensitivity: 'base', numeric: true })`), `textCaseSensitive`, `datetime` (Date, ISO string or timestamp), `basic` (`<`/`>` on primitives), `boolean`.
- The auto sort function is chosen from the first non-null value: string → `text`, number → `basic`, Date or ISO date → `datetime`, boolean → `boolean`.
- `sortUndefined` controls where null and undefined values go, regardless of direction (default `'last'`).
- Sorting is stable: ties keep their original order, and sub-rows are sorted inside their parents.
- `sortValue(row)` overrides the value used for sorting (the column's `sortValue`).

**UI**
- The header label is wrapped in a `<button class="tk-sort-button">`, so the whole label area is clickable.
- The icon shows the state: unsorted icon (appears on hover/focus only in `classic`, always faint in `light`), ascending arrow, or descending arrow.
- `data-sorted="asc|desc"` and `aria-sort` go on the `<th>`. Only the primary sorted column gets `aria-sort` (per ARIA). The others get `aria-description="sorted descending, priority 2"`.
- Column menu entries: "Sort ascending", "Sort descending", "Clear sort".

**Server**: emits `sorting[]` using `column.sortServerKey ?? id`.

**Tests**: cycle order; multi-sort limit; a stable sort with ties; undefined placement in both directions; natural sort; the server key mapping; keyboard activation (Enter/Space on the sort button).

## 2. Global search

**Behaviour**
- A toolbar input (`type="search"`) plus a clear button (×). Escape clears it when focused.
- Debounced by `searchDebounceMs`. `searchMinLength` gating works as described in 03 §5.1.
- Client mode matches every column with `enableGlobalFilter !== false`, using `getSearchValue` → `format` → `String(value)`. Matching is case- and diacritic-insensitive (`normalize('NFD')` with the combining marks stripped). Multi-word queries use AND across words by default; set `globalFilterMatch: 'all-words' | 'any-word' | 'phrase'` to change this.
- Optional **match highlighting**: `highlightSearchMatches` (default `false`). The `<mark class="tk-highlight">` markup wraps matches in text cells rendered via the default cell renderer.
- `searchHotkey` (e.g. `'mod+k'`) focuses and selects this table's input. The listener is bound on the table root's `ownerDocument`. It is ignored when focus is already inside another text field (unless the hotkey includes `mod`) and when another tablekit instance with the same hotkey is more recently focused/hovered. A hint chip (`Ctrl+K` / `⌘K` by platform) is shown when `showSearchHotkeyHint`.
- Changing the search resets the page (per `resetPageOn`).

**Classic preset**: input width `500px` on desktop and `100%` below `md`, a magnifying-glass start icon, the `Ctrl+K` chip at the end, `searchMinLength: 3`, `searchDebounceMs: 300`. It can be rendered **outside** the table via `<DataTable.Search table={table} />` (composable part) so it can sit in a page header.

**Tests**: debounce timing; min length; reset to page 0; diacritic-insensitive matching; hotkey scoping with 2 tables on a page; highlight correctness with regex-special characters.

## 3. Column filters and the filter section

### 3.1 Display modes (`filterDisplayMode`)

| Mode | UI |
|---|---|
| `'panel'` (default) | A toolbar **"Filters" button** with an active-count badge toggles a collapsible **filter section** under the toolbar. It is a responsive grid of filter controls, one per filterable column, with a "Clear all" button and optional "Apply" (`filterApplyMode: 'instant' \| 'manual'`, default `'instant'`) |
| `'popover'` | The same controls in a popover anchored to the Filters button |
| `'row'` | A second header row with an inline filter input under each filterable column |
| `'none'` | No built-in UI. Use state/API or a custom `slots.FilterPanel` |

Also, `enableColumnActions` adds a "Filter…" entry in each header menu that opens that column's filter in a popover. It works in any mode.

### 3.2 Active filter chips

When `showActiveFilterChips` is on, a chip row below the toolbar (or inline in it) shows `"{Column}: {value summary}"` for each active filter, plus the global search as `"Search: smith"`. Each chip has a remove (×) button, and there's a "Clear all" link. Chips use `FilterOption.color/textColor` when the value is an option that defines colours.

### 3.3 Variants (default input per variant)

| Variant | Control | Default filterFn |
|---|---|---|
| `text` | Text input + optional operator dropdown | `includesString` |
| `select` | Single select (options from `filterOptions` or facets, with counts) | `equals` |
| `multiSelect` | Checkbox list with search inside, or an autocomplete with chips (`multiSelectDisplay: 'list' \| 'autocomplete'`) | `arrIncludesSome` |
| `number` | Number input + operator | `equals`/`gt`/... |
| `range` | Two number inputs (min/max) | `inNumberRange` |
| `rangeSlider` | A dual-thumb slider over the faceted min/max | `inNumberRange` |
| `date` | Native `<input type="date">` (no date-lib dependency) + operator | `dateEquals` / `before` / `after` |
| `dateRange` | Two date inputs + presets (Today, Last 7 days, This month, …) via `datePresets` | `inDateRange` |
| `boolean` | Tri-state select (Any / Yes / No) | `equals` |
| `custom` | `renderFilter` | the user's `filterFn` |

Built-in `filterFns`: `includesString`, `includesStringSensitive`, `equalsString`, `startsWith`, `endsWith`, `equals`, `weakEquals`, `arrIncludes`, `arrIncludesAll`, `arrIncludesSome`, `inNumberRange`, `inDateRange`, `dateEquals`, `before`, `after`, `empty`, `notEmpty`, `fuzzy` (a lightweight in-house scorer, no dependency).

Every filterFn may define `autoRemove(value)`: empty values remove the filter. It may also define `resolveFilterValue(value)`, which pre-processes the value once per filter pass (for example, parsing dates).

### 3.4 Options and facets
- `filterOptions` can be static, a function, or async (with a loading state inside the control).
- If they aren't provided, options come from `column.getFacetedUniqueValues()` in client mode or `dataSource.fetchFacets` in server mode. Facets are lazy-loaded on first open and cached per query.
- Counts are shown next to options (`showFacetCounts`, default `true`).

### 3.5 Tests
All variants in client mode; serialization to `TableQuery` in server mode; autoRemove; facet counts respecting the other filters; the manual apply mode; chips remove the right filter; `'row'` mode keyboard tab order; async options.

## 4. Pagination

### 4.1 Variants

| Variant | Rendering |
|---|---|
| `numbered` | Desktop: `[← Previous] … page buttons … [Next →]`, `space-between` |
| `compact` | Mobile: `[«] [‹] 1 2 … 9 10 [›] [»]`, centred, icon-only prev/next, first/last buttons, `siblingCount 0` |
| `simple` | `[‹] 11–20 of 235 [›]` + optional page-size select. Required for cursor pagination |
| `loadMore` | A "Load more (215 remaining)" button below the rows; rows accumulate |
| `infinite` | Loads the next page when a sentinel row enters the viewport (IntersectionObserver). Works with virtualization |
| `none` | No UI. State still applies |

Responsive: the variant accepts `ResponsiveValue`. The classic default is `{ base: 'compact', md: 'numbered' }`, where `md` = 960px.

### 4.2 Page size selector
`pageSizeOptions: [10, 25, 50, 100]`. It renders "Rows per page: [10 ▾]". Changing it keeps the first visible row on screen (`pageIndex = floor(firstRowIndex / newSize)`), or resets to 0 in server mode when `resetPageOn` includes `'pageSize'`.

### 4.3 Row range and counts
`showRowRange` prints `"11–20 of 235"` using `formatters.rowRange`. When the total is unknown (`-1`) it shows `"11–20 of many"`.

### 4.4 Page-item algorithm (fixes B1 and B17)

Pure function `getPageItems({ pageIndex: c, pageCount: n, siblingCount: s = 1, boundaryCount: b = 2, algorithm })`, 0-based.

**`'classic'` (default):**
```
if n <= 2b + 3 (= 7 by default): return all pages 0..n-1
pages = {0..b-1} ∪ {n-b..n-1}
if c <= b-1:           pages ∪= {b .. b+1}               // near start: show 2 extra (0-based 2,3)
elif c >= n-b:         pages ∪= {n-b-2 .. n-b-1}         // near end:   show 2 extra (n-4,n-3)
else:                  pages ∪= {c-s .. c+s}
sort ascending; walk pairs (prev, next):
   gap = next - prev - 1
   gap == 0 → nothing
   gap == 1 → insert the single missing page (never hide exactly one page)
   gap >= 2 → insert one ellipsis
```

Required outputs for `n = 10` (display 1-based in UI; shown 0-based here):

| c | output |
|---|---|
| 0, 1 | `0 1 2 3 … 8 9` |
| 2 | `0 1 2 3 … 8 9` |
| 3 | `0 1 2 3 4 … 8 9` |
| 4 | `0 1 2 3 4 5 … 8 9` |
| 5 | `0 1 … 4 5 6 7 8 9` |
| 6 | `0 1 … 5 6 7 8 9` |
| 7, 8, 9 | `0 1 … 6 7 8 9` |

Also `n=7` → all seven; `n=8, c=0` → `0 1 2 3 … 6 7`; `n=8, c=4` → all eight; `n=1` → `0`; `n=0` → `[]`.

**`'stable'`:** MUI-style. It always renders `2b + 2s + 3` slots when `n` is large enough, so the bar width never changes. The reference is MUI `usePagination`, re-implemented 0-based.

**Custom:** pass a function `(args) => PageItem[]`.

### 4.5 Behaviour rules
- Prev is disabled on the first page. Next is disabled on the last page, or when `!hasMore` in cursor mode.
- `hideOnSinglePage` (default `true`): when `pageCount <= 1` the pagination is not rendered **and** the container restores its bottom border and radius (fixes B5).
- While fetching, the controls are disabled (`disablePaginationWhileFetching`).
- Page buttons have `aria-current="page"` when active and `aria-label="Page 3"`. The ellipsis is `aria-hidden`. The nav has `aria-label="Pagination"`.
- A page change moves focus to the new active page button (keyboard users) and, if `scrollToTopOnPageChange` (default `true`), scrolls the container to the top.

### 4.6 Tests
The table above (unit); `stable` slot constancy for n=50 across all c; hide on single page plus border restoration (visual); page size keeps position; cursor mode; loadMore accumulation; infinite with virtualization.

## 5. Row selection

- `enableRowSelection: true | (row) => boolean`, with `enableMultiRowSelection` (single = radio semantics, as in a picker dialog).
- The auto-inserted **selection column** (`id: 'tk-select'`, pinned `left` when any left pin exists). The header has a tri-state checkbox (all/some/none) for the current page or all rows per `selectAllMode`. In single mode the header is empty (no checkbox).
- `selectOnRowClick` (typical in a picker dialog). Clicking interactive descendants (buttons, links, inputs, `[data-tk-stop]`) does not toggle.
- Shift+click selects a range between the last clicked row and this one (`enableRangeSelection`).
- Sub-row selection cascades when `enableSubRowSelection`. A parent is indeterminate when some of its children are selected.
- **Selection bar** (`showSelectionBar`, default `true` when multi): "3 selected · Select all 235 matching · Clear", plus `renderBulkActions({ table, selectedRows, selectionQuery })`.
- Disabled rows can't be selected, and select-all skips them.
- Server "select all matching" uses the exclusion model (03 §6.1).
- Selected rows get `aria-selected="true"`, `data-selected`, and background `--tk-row-selected-bg` (classic `#EAF6FF`). **Pinned cells inherit it** (fixes B19).
- Tests: single vs multi; range; cascade; disabled rows; page vs all; exclusion model; row click ignores action buttons.

## 6. Expansion: collapsible rows, detail panels, tree data

### 6.1 Detail panels (collapsible row content)
- `renderDetailPanel({ row, table })` renders a full-width `<tr class="tk-detail-row"><td colSpan=all>` directly after the row.
- Lazy by default (it isn't rendered until expanded). `keepMounted` keeps the DOM after collapse.
- Animated open/close with a CSS `grid-template-rows: 0fr → 1fr` transition (200ms, disabled under `prefers-reduced-motion`).
- The panel content is **not** inside the horizontal scroll area when `fullWidth` (default). It is sticky-left with `width: var(--tk-container-width)`, so wide tables don't scroll the panel away.
- `useDetailPanelData(row, loader)` loads data for the panel, cached by row id.

### 6.2 Tree data (sub-rows)
- `getSubRows` in client mode, or `dataSource.fetchChildren` for lazy loading (a spinner in the toggle while loading, errors inline).
- Indentation is `depth * --tk-tree-indent` (default 20px), applied to the **first visible data column** (or `treeColumnId`).
- `getRowCanExpand(row)` handles lazy rows whose children aren't loaded yet.
- `filterFromLeafRows` (default `false`): when `true`, a parent shows if any descendant matches, with ancestors auto-expanded. `maxLeafRowFilterDepth` limits the depth.

### 6.3 Expand toggle
- The auto-inserted display column `tk-expand` (position `positionExpandColumn`, width 48px) holds a chevron button that rotates 90° when open.
- The button has `aria-expanded` and `aria-controls` (the detail row id), and `aria-label` "Expand row" / "Collapse row".
- The header can have an "Expand all" toggle (`enableExpandAll`, default `true` in multiple mode).
- `expandMode: 'single'` collapses the others (accordion).
- `expandOnRowClick` toggles on a row click (with the same interactive-descendant exclusion as selection).
- Keyboard: `→` expands and `←` collapses when a row or cell is focused (with keyboard navigation), and Enter/Space works on the toggle.

### 6.4 Tests
Lazy mounting; keepMounted; single mode; lazy children cached and invalidated on a query change; a11y attributes; reduced motion; filterFromLeafRows.

## 7. Grouping and aggregation

- `enableGrouping`, with `state.grouping: string[]` (multi-level).
- A group row shows the grouping cell (value + `(count)` + toggle), aggregated cells for the other columns (`aggregationFn`), and placeholders elsewhere.
- Group rows can be expanded/collapsed (they use the expansion state with ids `group:colId:value`).
- `groupedColumnMode: 'reorder' | 'remove' | false`: move grouped columns to the front, or hide them.
- An optional drop zone in the toolbar ("Drag a column here to group") appears when `enableColumnOrdering`. There's also a "Group by" column-menu item.
- In server mode (03 §6) the server returns group rows. The table renders them using `getGroupingValue`/aggregates from the row data.
- Footers: `enableColumnFooters` shows `<tfoot>` with `footer` renderers or column-wide aggregates (computed over the filtered rows, not only the page; `footerAggregationScope: 'page' | 'filtered'`).

## 8. Column pinning and static columns

This is the declarative replacement for a hand-rolled "sticky actions" flag.

- `column.pin: 'left' | 'right' | false`, or `state.columnPinning = { left: [...], right: [...] }`. Both work together: the column prop is the initial/locked value and the state is the runtime value.
- Any number of columns can be pinned on each side. Offsets are stacked (`left` = the sum of the preceding left-pinned widths).
- Pinned cells: `position: sticky`, a background from `--tk-row-bg` (which follows hover/selected/striped states), `z-index: var(--tk-z-pinned)`. Pinned header cells use `--tk-z-pinned-header`.
- An **edge shadow** appears on the last left-pinned column and the first right-pinned column **only when content is scrolled underneath** (a scroll listener toggles `data-scrolled-left/right` on the container). The shadow is a token (`--tk-pinned-shadow`). In classic the token is `none`, so it matches today's look.
- **Responsive pinning:** `pin: { base: 'right', md: false }` pins on desktop and releases on mobile. The classic preset applies this to the actions column automatically (`rowActionsColumn.pin` default `{ base: 'right', md: 'right' }` when `stickyActions` is enabled). Consumers can pass `stickyActions` (a boolean) as a documented convenience alias that sets the actions column pin to `'right'`.
- UI (with `enableColumnActions`): "Pin left", "Pin right" and "Unpin" in the header menu, unless `lockPin`/`static`.
- **Static column** (`static: true`): can't be unpinned, hidden, reordered, resized or menu-edited (04 §3). Typical uses are the selection, expand and actions columns, and a frozen identifier column.
- Tests: multiple left/right pins with stacked offsets (visual); a selected row's background covers the pinned cells; RTL flips sides; the scroll shadow appears only when overflowed; a responsive pin switches at 960px.

## 9. Column sizing and resizing

- **Width model:** by default (`tableLayout: 'auto'`) the CSS widths `width`/`minWidth`/`maxWidth` accept `%` or px, applied through `<colgroup>` and cells consistently (fixes B13).
- When `enableColumnResizing` is on, the table switches to px sizing: `size` (initial), `minSize`, `maxSize`. `%` widths are converted to px on the first measurement.
- The resize handle sits on the header's right edge (`role="separator"`, `aria-valuenow` = px, and it's keyboard-focusable: ←/→ change by 10px, Shift for 50px). Double-click auto-sizes it to fit the content of the rendered rows.
- `columnResizeMode: 'onChange'` resizes live. `'onEnd'` shows a guide line and applies on release.
- Sizing state is persisted with `syncState.storage` when configured.

## 10. Column ordering

- `enableColumnOrdering`: drag header cells (pointer events, with no HTML5 DnD quirks) or use the columns menu with drag handles and ↑/↓ buttons for keyboard users.
- Pinned groups reorder only within their side. A `lockPosition: 'first'|'last'` column stays at the edge. `enableOrdering: false` columns can't be moved.
- Announcement via the live region: "Moved Company name to position 3 of 8".

## 11. Column visibility and column actions menu

- A toolbar **Columns** button opens a menu with a checkbox per column (`enableHiding !== false`), "Show all", "Hide all" and "Reset". It can be searched when there are more than 10 columns.
- `defaultHidden`, `state.columnVisibility`.
- `hideBelow`/`hideAbove` is responsive hiding that's independent of state (it doesn't show in the menu as hidden).
- The per-header **column actions menu** (`enableColumnActions`, a "⋮" button visible on hover/focus) contains: Sort asc/desc/clear, Filter…, Group by, Pin left/right/unpin, Hide column, Autosize, Reset size, plus `renderColumnActionsMenuItems({ column, table, defaultItems })` to add, remove or reorder items.

## 12. Row pinning

- `enableRowPinning`: rows can be pinned to the top or bottom (`row.pin('top')`). Pinned rows stay visible across pages, sorting and filtering (`keepPinnedRows`, default `true`).
- They are rendered sticky under the header (top) or above the footer (bottom) when `enableStickyHeader`.

## 13. Responsive behaviour and mobile

```ts
responsive?: {
  breakpoints?: { xs: 0; sm: 600; md: 960; lg: 1280; xl: 1440 };  // classic defaults
  mobileBreakpoint?: Breakpoint;                                   // default 'md' (below = mobile)
  mobileLayout?: 'scroll' | 'cards';                               // default 'scroll'
  cardColumns?: string[];                                          // columns shown in card layout
  renderCard?: (ctx: { row, table }) => ReactNode;                 // full card override
  ssrBreakpoint?: Breakpoint;                                      // default 'lg'
}
```

- `ResponsiveValue<T> = T | { base?: T; xs?: T; sm?: T; md?: T; lg?: T; xl?: T }` (mobile-first) is accepted by `pin`, `headerShort`, `pagination.variant`, `showFirstLast`, `density` and `maxWidth`.
- `scroll` layout (default): horizontal scroll inside the container, pinned columns, compact pagination below `md`, and header/cell padding that shrinks below `sm` (classic tokens 12px vs 20px).
- `cards` layout: each row renders as a card (label/value pairs from the visible columns), with actions in the card footer and selection as a checkbox in the card header. Sorting moves to a "Sort by" select in the toolbar.
- Tests: switching at exactly 600 and 960; SSR snapshot uses `ssrBreakpoint`; card layout a11y (a list of articles).

## 14. Virtualization

- Rows: in-house `useVirtualRows` with a fixed `estimateRowHeight` (per density) or a dynamic measurement via `ResizeObserver`, overscan 8, and `scrollToIndex`.
- It requires a bounded height (`maxHeight`, or a parent with a height). A dev warning is shown otherwise.
- It auto-enables above `virtualizationThreshold` visible rows unless `enableRowVirtualization: false`.
- It works with detail panels (measured), grouping, sticky header, pinned columns and infinite pagination.
- It uses `layout: 'grid'` semantics (`role="grid"`, `aria-rowcount`, `aria-rowindex` on every row), so screen readers still get the correct totals.
- *(v1.x)* Column virtualization for more than 50 columns.

## 15. Keyboard navigation

When `enableKeyboardNavigation` is on, the grid pattern follows WAI-ARIA APG "Data Grid":

| Key | Action |
|---|---|
| Tab | Enters the grid (the last focused cell, or the first cell). Tab again leaves the grid (roving tabindex) |
| ←/→/↑/↓ | Move between cells (header included) |
| Home/End | First/last cell in the row. Ctrl+Home/End moves to the first/last cell in the grid |
| PageUp/PageDown | Moves by the visible page of rows (virtualization-aware) |
| Enter | Activates: sort on a header; `onRowClick` on a row; enter edit mode *(v1.x)*; if the cell has interactive content, moves focus inside it (Escape returns) |
| Space | Toggles selection of the focused row (when selection is enabled). Shift+Space selects a range |
| Ctrl/Cmd+A | Select all (per `selectAllMode`) |
| → / ← on a row with children/panel | Expand / collapse |
| Escape | Clears the focus-inside state; closes menus |

Without keyboard navigation, everything is still reachable by Tab (buttons, checkboxes, sort buttons, links), and rows are not focusable unless `onRowClick` is set.

## 16. Accessibility (always on)

- Semantic `<table>` by default: `<caption>` (visually hidden) or `aria-label`, `<th scope="col">`, the first cell `<th scope="row">` (`firstColumnAsRowHeader`), `aria-sort`, `aria-rowcount`/`aria-rowindex` when paginated or virtualized (the real totals), and `aria-busy` while fetching.
- Interactive controls have accessible names from `localization` (no hard-coded English, fixes B9).
- Focus-visible ring tokens (`--tk-focus-ring`) on every interactive element.
- Live region announcements (polite, debounced) for: sort changes ("Sorted by Name, ascending"), page changes ("Page 3 of 10"), results count after search/filter ("12 results"), loading ("Loading…"/"Loaded"), selection count, and column moves.
- Colour contrast: all default token pairs meet WCAG AA (4.5:1 for text). The classic `#717680` on `#FAFAFA` header text is ≈4.6:1 (OK). This is verified in tests.
- `prefers-reduced-motion` disables the animations.
- Tests: axe with no violations on every demo page; keyboard-only e2e scripts for sort, paginate, select, expand and filter.

## 17. Loading, empty and error states

Specified in 03 §8. Slots: `LoadingRow` (text), `SkeletonRows`, `LoadingOverlay`, `EmptyState`, `ErrorState`, `ErrorBanner`. The overlay:
- is positioned from the bottom of the header to the bottom of the container, covering the body only;
- uses the background token `--tk-overlay-bg` (classic `rgba(255,255,255,.7)`), with a spinner of 40px in `--tk-color-accent`;
- blocks interaction by default (fixes B7) and sets `aria-busy="true"` on the table;
- has an optional delay (`loadingOverlayDelayMs`, default 150ms), so it doesn't flash on fast responses. The classic preset uses 0.

## 18. Toolbar and selection bar

- **Toolbar** layout: `[start: search, filters button, active chips] … [end: custom actions, density, columns, export]`. It wraps on narrow screens.
- Each built-in control can be toggled (`enableGlobalFilter`, `filterDisplayMode`, `enableHiding`, `enableDensityToggle`, `enableExport`) and replaced via slots.
- `toolbarActions` / `renderToolbarStart` / `renderToolbarEnd` for custom content, e.g. an "Add" button.
- Composable parts let you place the toolbar pieces anywhere: `<DataTable.Search/>`, `<DataTable.FiltersButton/>`, `<DataTable.FilterPanel/>`, `<DataTable.ColumnsButton/>`, `<DataTable.ExportButton/>`, `<DataTable.Pagination/>`, `<DataTable.SelectionBar/>`.

## 19. Density, sticky header and sticky footer

- Density tokens scale the cell padding and row height: `compact` (py 6px, px 12px), `standard` (classic: py 12px, px 20px; header py 8px), `comfortable` (py 16px, px 24px). Toggle via the toolbar button or `state.density`.
- `enableStickyHeader`: `<thead>` cells are `position: sticky; top: 0` inside the scroll container (fixes B14). Pinned header cells are stuck in both axes.
- `enableStickyFooter`: the same for `<tfoot>`. Pagination is outside the scroll container, so it is always visible.

## 20. Export

- `enableExport` adds a toolbar button with a menu: "Export CSV (current page)", "Export CSV (all matching)", "Export selected rows", "Copy to clipboard".
- CSV rules: RFC 4180 quoting; an optional UTF-8 BOM (`bom: true` default, for Excel); headers from `meta.exportHeader ?? string header ?? id`; values from `exportValue ?? format ?? String(value)`; `enableExport: false` columns and display columns are excluded.
- Server "all matching" exports go through `dataSource.fetch` in chunks of `exportChunkSize` (1000) up to `exportMaxRows` (10000), with progress in the button and cancellation. Alternatively use `onExport(query, scope)` to delegate to a backend export.
- Downloads use a Blob plus a temporary `<a download>`. An `onExportFile(blob, fileName)` override is available for custom saving.

## 21. Persistence

`syncState` (03 §7) persists any state slice to the URL and/or storage. Recommended storage keys: `columnVisibility`, `columnOrder`, `columnSizing`, `columnPinning`, `density`, `pagination.pageSize`. Migrations: a `version` in the stored payload, with `migrate(old, version)`.

## 22. Inline editing *(v1.x)*

- `enableEditing`, `editDisplayMode: 'cell' | 'row' | 'modal'`, `editTrigger: 'doubleClick' | 'click' | 'enter' | 'manual'`.
- Column: `enableEditing`, `editVariant` (`text`/`number`/`select`/`date`/`checkbox`/`custom`), `renderEditCell`, `validate(value, row) => string | null`, `editOptions`.
- Events: `onCellEditCommit({ row, column, value, previousValue }) => void | Promise<void>` (optimistic, with rollback on reject), `onRowEditSave`, `onRowEditCancel`.
- Keyboard: Enter commits and moves down, Tab commits and moves right, Escape cancels.

## 23. Misc

- **Row numbers** (`enableRowNumbers`): a `#` display column whose values are absolute across pages (`pageIndex * pageSize + index + 1`) or relative (`rowNumberMode`).
- **Striped rows** (`enableStriped`) and **hover** (`enableHover`), both tokenized.
- **Row drag reordering** *(v1.x)*: `enableRowOrdering`, `onRowOrderChange(fromId, toId)`, client mode only.
- **Cell range selection and copy** *(v1.x)*.
- **RTL**: logical CSS properties everywhere (`inset-inline-start`, `padding-inline`). Pinning sides flip in RTL.
- **Performance debug**: `debugTable` logs the row-model timings.
