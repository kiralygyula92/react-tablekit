# 01: Current Implementation (Reverse-Engineered)

This file describes **exactly** how the Skimmer Retail tables work today. It is written so the table can be rebuilt without access to the original repo. All spacing values are given in **px**. The source MUI theme uses `spacing: 4`, so `sx={{ px: 5 }}` means `20px`, and the conversions below are already applied.

---

## 1. Tech context of the source app

| Item | Value |
|---|---|
| React | 19.1 |
| UI kit | MUI 7 (`@mui/material` `Table`, `TableHead`, `TableRow`, `TableCell`, `TableSortLabel`, `Checkbox`, `Pagination`, `Button`, `Tooltip`, `Autocomplete`, `CircularProgress`) |
| State | Zustand stores (`useCustomerStore`, `useWaterTestStore`) hold rows, total count, the search request and loading flags |
| i18n | `react-i18next`, namespaces `customers`, `lab`, `common` |
| Icons | FontAwesome (`pen`, `microscope`, `paper-plane`, `file`, `magnifying-glass`), MUI icons (`ArrowBack`, `ArrowForward`) |
| Theme spacing | `4px` per unit |
| Breakpoints | `xs 0`, `sm 600`, `md 960`, `lg 1280`, `xl 1440` |
| "Mobile" | `useIsMobile()` returns `true` below **960px** (`theme.breakpoints.down('md')`) |
| Font | `"Open Sans Variable", "Open Sans", Arial, sans-serif`; base `fontSize: 13`; `body1` = 14px / 400 / line-height 1.25 |
| Drawer | Left nav drawer `210px` wide |

## 2. Architecture overview

There is **no single table component**. Instead:

```
<XxxTable> (page-specific, ~300–450 lines each, all near-identical)
 ├─ builds TableConfig via createXxxTableConfig(t, handlers, stickyActions, isMobile)
 ├─ maps config.columns → HeadCell[]
 ├─ reads rows / total / listingCriteria / loading flags from a Zustand store
 ├─ handles page change → calls API → writes store
 └─ renders:
    <Box maxWidth=...>
      <Box position:relative>                        (missing in PoolHistoryTable; see bug B6)
        <TableContainer component=Paper ref=tableRef>
          <Table minWidth=650 tableLayout=auto>
            <EnhancedTableHead .../>                 (shared)
            <TableBody>
              loading → single "Loading..." text row
              rows    → <TableRow> × N
                          [checkbox cell]            (only if config.showCheckbox)
                          <PaddedCell> × columns     (shared; first one is <th scope=row>)
              empty   → single "No items found" text row
            </TableBody>
          </Table>
          [searching overlay: spinner over tbody area, top = measured thead height]
        </TableContainer>
      </Box>
      <CustomPagination .../>                        (shared)
      [page-specific modals]
    </Box>
```

The parts that are shared are `EnhancedTableHead`, `PaddedCell`, `CustomPagination`, `TableFilterToolbar` (not used in retail today), the cell render helpers and the style helpers. Everything else is duplicated in each table.

## 3. Types (verbatim semantics)

```ts
// types/uiInterfaces.ts
type Alignment = 'left' | 'center' | 'right' | 'justify' | 'inherit' | undefined;

export type HeadCell = {
  id: string;
  alignment: Alignment;
  label: string;
  xsLabel?: string;        // label shown below 600px (supported, unused by any config)
  disablePadding?: boolean; // declared, never read
  width?: string;          // e.g. '15%'
  minWidth?: string;       // e.g. '160px'
  sortable?: boolean;      // default TRUE (header treats `sortable !== false` as sortable)
};

export type EnhancedTableHeadProps = {
  order: 'desc' | 'asc';
  orderBy: string;
  onRequestSort: (e: any, property: string) => void;
  headCells: HeadCell[];
  numSelected?: number;     // default 0
  rowCount?: number;        // default 0
  onSelectAllClick?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showCheckbox?: boolean;   // default false
  stickyActions?: boolean;  // default false
};

export interface TableColumnConfig {
  id: string;
  alignment: Alignment;
  label: string;
  width: string;
  minWidth?: string;
  xsLabel?: string;
  disablePadding?: boolean;
  sortable?: boolean;
  renderCell: (data: any, theme: any, isSelected?: boolean,
               onSelect?: (id: string) => void, onEditContact?: (c: any) => void) => React.ReactNode;
  //            ^ last three params are legacy leftovers; never passed
  getSortValue?: (data: any) => any; // used only for client-side sort (modal)
}

export interface TableConfig {
  columns: TableColumnConfig[];
  stickyActions?: boolean;  // makes the column with id === 'actions' sticky right
  showCheckbox?: boolean;   // adds a leading checkbox column
}

export interface CustomPaginationProps {
  currentPage: number;  // 0-based
  totalPages: number;
  onPageChange: (page: number) => void; // 0-based
}

export interface FilterOption { label: string; background?: string; lightText?: boolean; }
export interface TableFilterProps { label?: string; options: FilterOption[]; onFilterChange: (filter: string[]) => void; }

// Server paging contract (types/apiInterfaces.ts)
export interface ListingCriteria { ascending?: boolean; pageNumber: number; pageSize: number; sortColumn?: string; }
export interface SearchCustomerRequest { listingCriteria?: ListingCriteria; queryCriteria?: string; }
// Response shape: { items: T[]; totalItemCount: number; requestCriteria: ListingCriteria }
```

## 4. Shared components in detail

### 4.1 `EnhancedTableHead`

- Wrapped in `React.memo`.
- Renders `<TableHead><TableRow>`.
- **Checkbox header cell** (only when `showCheckbox`): `padding="checkbox"`, background `grey50`. The checkbox has `indeterminate = numSelected > 0 && numSelected < rowCount` and `checked = rowCount > 0 && numSelected === rowCount`, calls `onChange={onSelectAllClick}`, uses `aria-label` **hard-coded** as `"select all contacts"`, and sets `py: 0`.
- **Each head cell:**
  - `align={alignment}`
  - padding: x `12px` (<600) / `20px` (≥600); y `12px` (<600) / `8px` (≥600)
  - background `#FAFAFA` (grey50), text `#717680` (grey500), `font-size: 0.875rem`, `line-height: 1.5`, `font-weight: 600`
  - `width = headCell.width`, `minWidth = headCell.minWidth`, `maxWidth = headCell.width`, `white-space: nowrap`
  - If `stickyActions && id === 'actions'`: `position: sticky; right: 0; z-index: 1000`. The background stays grey50.
  - `sortDirection` is set only when sortable and active (this produces MUI's `aria-sort`).
  - Label: if `< sm (600px)` and `xsLabel` is set, it uses `xsLabel`, otherwise `label`.
  - Sortable: `<TableSortLabel active={orderBy===id} direction={active ? order : 'asc'} onClick={() => onRequestSort(e, id)}>`. Non-sortable: a plain `<span>`.

### 4.2 `PaddedCell`

```tsx
<TableCell sx={{ px: { xs: '12px', sm: '20px' }, py: '12px', ...sx }} {...rest} />
```

### 4.3 Body rows (duplicated in each table)

```tsx
<TableRow key={rowId}
  // CustomerListTable only: role="checkbox" aria-checked={false} tabIndex={-1} selected={false}  ← bug B8
  sx={{
    '&:last-child td, &:last-child th': { borderBottom: 0 },
    borderBottom: `1px solid #E9EAEB`,
    cursor: 'default',                      // 'pointer' in the modal (row click selects)
    '&.Mui-selected': {
      backgroundColor: '#EAF6FF',           // blue1100
      '& td[data-column="actions"]': { backgroundColor: '#EAF6FF' }, // keep sticky cell in sync
    },
  }}>
  {showCheckbox && <TableCell padding="none" sx={{ pl: '4px' }}><Checkbox .../></TableCell>}
  {columns.map((column, index) => (
    <PaddedCell key={column.id}
      component={index === 0 ? 'th' : 'td'}   // first column = row header
      scope={index === 0 ? 'row' : undefined}
      align={column.alignment}
      data-column={column.id}
      sx={{
        width: column.width, minWidth: column.minWidth,
        maxWidth: column.width /* CustomerListTable */ | 'none' /* others */,
        whiteSpace: 'nowrap',
        ...(stickyActions && column.id === 'actions' && {
          position: 'sticky', right: 0, zIndex: 1, backgroundColor: '#FFFFFF',
        }),
      }}>
      {column.renderCell(row, theme)}
    </PaddedCell>
  ))}
</TableRow>
```

- There is **no hover highlight**, because the MUI `hover` prop is not set.
- Row key: `customer.identifiers.id`, `test.id` or `bodyOfWater.id`.

### 4.4 Container and table

| Property | Value |
|---|---|
| Outer `Box` | `width: 100%`, `maxWidth: isMobile ? 100% : calc(100vw - 210px - 40px)`, `box-sizing: border-box` |
| `TableContainer` (`Paper`) | `box-shadow: none`, `border: 1px solid #E9EAEB`, `border-bottom: none`, `border-radius: 8px`. Bottom-left and bottom-right radius are `0` when rows exist (the pagination bar attaches below) and `8px` otherwise. Also `overflow-x: auto`, `width: 100%` |
| `Table` | `min-width: 650px`, `table-layout: auto`, `width: 100%`, `position: relative` |
| Modal variant | `TableContainer` has a full border, `border-radius: 8px`, `max-height: 400px`, `overflow: auto`. The header is **not** sticky, so it scrolls away (improvement: sticky header) |
| `aria-label` | `"customer list table"`, `"pool list table"`, `"water test history table"`, `"bodies of water table"` |

### 4.5 Loading, searching and empty states

There are **two distinct loading states**, and the rebuild must keep them separate:

| State | Trigger (store flag) | Rendering |
|---|---|---|
| **Initial load** | `isLoadingX` (first fetch) | The body is replaced by one row: `<TableCell colSpan={cols + (checkbox?1:0)} align=center sx={{ py: 16px }}>` with `Typography body1 color=text.secondary` "Loading..." (i18n `customerList.loading` / `waterTest.loading`) |
| **Refetch / searching** | `isSearchingX` (page change, search) | Existing rows **stay visible**. An absolutely positioned overlay covers the body only: `top = <measured thead offsetHeight>px`, `left/right/bottom: 0`, `background: rgba(255,255,255,0.7)`, `z-index: 10`, flex-centred `<CircularProgress/>` (40px, primary colour), `pointer-events: none` (bug B7). The header height is measured via `querySelector('thead').offsetHeight` on mount and on `window.resize` |
| **Empty** | No rows | A single centred text row, `py: 16px`, secondary colour: "No customers found" / "No items found" / "No water test history found" |
| **Precondition** (modal) | No service location chosen | A single centred text row: "Please select a service location" |

When the page is reloaded (`isReloadNavigation()`) and the store already has data, the initial fetch is skipped.

### 4.6 `CustomPagination`

- Returns **`null` when `totalPages <= 1`** (see bug B5 for the resulting visual issue).
- Page index is **0-based** in the props and displayed **1-based**.

**Desktop (≥ 960px), "numbered" variant:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [← Previous]           [1] [2] [3] [4]  …  [9] [10]            [Next →] │
└──────────────────────────────────────────────────────────────────────────┘
```

| Part | Style |
|---|---|
| Bar | flex, `justify-content: space-between`, `align-items: center`, padding `10px 20px`, background `#FFF`, `border: 1px solid #E9EAEB`, `border-top: none`, radius `0 0 8px 8px`, `width: 100%` |
| Prev / Next | MUI `Button variant=outlined size=small`, padding `6px 12px`, background `#FFF`, border `#D5D7DA` (grey300), text `#252B37` (grey800), `font-size: 0.875rem`, `line-height: 1.5`, icon `#A4A7AE` (grey400). **Hover:** background `#F5F5F5`, border `#252B37`, icon `#252B37`. **Disabled:** background `#FFF`, border `#E9EAEB`, text `#A4A7AE`, icon `#D5D7DA`. Labels come from i18n `common.buttons.previous` / `next`. Icons: `ArrowBack` (start) and `ArrowForward` (end) |
| Page numbers group | flex, `gap: 2px`, centred |
| Page button | `min-width: 40px`, `height: 40px`, radius `4px`, `font-size: 0.875rem`, `line-height: 1.5`, padding `10px 16px`. **Active:** background `#F5F5F5`, border `1px solid #E9EAEB`, text `#252B37`, hover background `#D5D7DA`. **Inactive:** transparent background, `1px solid transparent`, text `#717680`, hover background `#F5F5F5` |
| Ellipsis | `…` inside a `40×40` flex-centred box, colour `#717680`, `0.875rem` |
| Prev disabled | when `currentPage === 0`; Next disabled when `currentPage >= totalPages - 1` |

**Mobile (< 960px), "compact" variant:** MUI `<Pagination count page={current+1} siblingCount={0} boundaryCount={2} color=primary shape=rounded size=small variant=outlined showFirstButton showLastButton>`. The bar style is the same as desktop but with `justify-content: center`. Items: radius `4px`, border transparent, text grey500. Selected: background grey100, text grey800, border grey200, hover grey300. Hover: grey100. Previous/next icons are `#6B7280`, disabled `#D1D5DB` (hard-coded hex, not tokens).

**Page-list algorithm (`calculatePagesToShow`)** uses the constants `MAX_PAGES_TO_SHOW_ALL = 7` and `FIRST_LAST_PAGES_COUNT = 2`:

```
if n <= 7 → [0 .. n-1]
items = [0, 1]
if c <= 1        → items += [2, 3, '…']
elif c >= n - 2  → items += ['…', n-4, n-3]
else             → items += ['…', c-1, c, c+1, '…']
items += [n-2, n-1]
then: dedupe numbers, drop an ellipsis that has no number before it or sits at the end,
      sort numbers inside each ellipsis-separated group
```

Actual outputs for `n = 10` (0-based; `…` = ellipsis). ✗ marks bug B1:

| c | legacy output | correct |
|---|---|---|
| 0, 1 | `0 1 2 3 … 8 9` | same |
| 2 | `0 1 … 2 3 … 8 9` ✗ | `0 1 2 3 … 8 9` |
| 3 | `0 1 … 2 3 4 … 8 9` ✗ | `0 1 2 3 4 … 8 9` |
| 4 | `0 1 … 3 4 5 … 8 9` | `0 1 2 3 4 5 … 8 9` (never hide exactly one page) |
| 5 | `0 1 … 4 5 6 … 8 9` | `0 1 … 4 5 6 7 8 9` |
| 6 | `0 1 … 5 6 7 8 9` | same |
| 7 | `0 1 … 6 7 8 … 9` ✗ | `0 1 … 6 7 8 9` |
| 8, 9 | `0 1 … 6 7 8 9` | same |

`totalPages = ceil(totalItemCount / ITEMS_PER_PAGE)`, where `ITEMS_PER_PAGE = 10` is **hard-coded** (bug B4). There is no page-size selector.

### 4.7 `TableFilterToolbar` (exists; unused in retail, used in Portal)

- MUI `Autocomplete` with `multiple`, `fullWidth`, `filterSelectedOptions`, **uncontrolled** (`defaultValue={[]}`), and a hard-coded `id="status-filter"`.
- Margins: `mt 24px`, `mb 16px`, `ml 4px`. Input label default `"Select filter"`.
- Options: `FilterOption { label, background?, lightText? }`, compared by `label`.
- Selected values render as small `Chip`s. If `background` is set it's applied, and if `lightText` is set the text is white and the delete icon is grey100 (grey300 on hover).
- `onFilterChange(labels: string[])` fires on every change.

### 4.8 Global search (outside the table, `CustomersSearchInput` + `useSearchInputController`)

This is the table's de-facto "global filter" and must become a built-in toolbar feature:

- `TextField type="search" size=small`, width `500px` on desktop and `100%` on mobile. Start adornment is a magnifying-glass icon (`#A4A7AE`). End adornment is a `Chip` reading `"Ctrl+K"` (height 20px, 0.75rem, radius 2px, text grey500, border grey200, background grey100).
- Controlled by `store.searchRequest.queryCriteria`.
- Typing builds a new request with **page reset to 0** and the page size preserved.
- **Debounce 300ms.** The search fires only when the length is `0` (reset) or `>= 3` (`MIN_SEARCH_QUERY_LENGTH`).
- **Hotkey:** `Ctrl+K` / `Cmd+K` focuses and selects the first `input[type="search"]` in the document. This is a global listener (bug B10).
- The search sets `isSearching` (overlay), not `isLoading`.

### 4.9 Style helpers and cell renderers (the look of cell content)

| Helper | Output |
|---|---|
| `getTypographySx(theme, fontWeight?)` | `color: #252B37; line-height: 1.5; [font-weight]`. Every text cell uses `Typography variant=body1` (14px) with this |
| `getActionButtonSx(theme)` | `IconButton size=small` with padding `6px 4px`, `border: 1px solid transparent`, colour `#2196F3`. **Hover:** background `#369AE91A`, `border: 1px solid #2196F380`, radius `4px` |
| `CustomTooltip` | MUI Tooltip. Background `#181D27`, text `#FFF`, radius `8px`, padding `8px 12px`, `font-size: 0.75rem`, `max-width: none`, `margin-top: 4px`. All action tooltips use `placement="top"` |
| `renderEmailList(emails)` | A column (`gap 4px`) with one line per email, or `-` if empty |
| `renderPhoneList(phones)` | Grouped and sorted by type (`Work 1, Mobile 2, Home 3, Unknown 4`) and formatted per type/index; one line each (gap 4px), or `-` |
| `renderAddress(line1, short)` | Two lines. Line 1 is weight **600** and grey800 (`-` if missing). Line 2 is grey500 at line-height 1.5 (short format "City, ST 12345") |
| Multi-address cell | Stack of `renderAddress` blocks, `gap 12px` |
| Notes cell | Truncated to 30 chars + `…`. Tooltip shows the full text, and `cursor: help` applies when truncated |
| Chip list (`PoolTags`) | Wrapping flex, `gap 2px`. Chips: height `22px`, `font-size 0.75rem`, radius `16px`, label padding `2px 8px`, colours per pool type (background/text/border/hover background). Label: `"{type or name or 'Unknown'} - {gallons} gal"`. Maximum **3** are visible, followed by a grey `+N` chip (background grey50, text grey700, border grey200). Chips are clickable (they open a modal), with `stopPropagation` |
| Numeric cell | Right-aligned (`alignment: 'right'`), e.g. the bodies-of-water count, or `12,000 gal` via `toLocaleString()` |
| Chemical value cell | `Typography` weight 600 |
| Empty values | Always rendered as `-` |
| Action cells | `Box display=flex gap=0 justify-content=flex-end` containing `CustomTooltip > IconButton > FontAwesomeIcon`. `onClick` calls `e.stopPropagation()` and then the handler. Buttons are disabled when data is missing (e.g. no `pdfUrl`) |

### 4.10 Width tokens used by column configs

```ts
TABLE_COLUMN_WIDTH     = { SMALL: '5%', MEDIUM: '10%', MEDIUM_LARGE: '15%', LARGE: '20%', EXTRA_LARGE: '40%' };
TABLE_COLUMN_MIN_WIDTH = { XS: '48px', SMALL: '80px', MEDIUM: '96px', MEDIUM_LARGE: '128px', LARGE: '160px', XL: '200px' };
TABLE_MIN_WIDTH = 650; // px
```

## 5. The four consumers (the parity targets)

### 5.1 Customer List (`CustomerListTable`): server mode

- **Data:** `store.customers`, `totalCustomersItemCount`, `customerSearchRequest = { queryCriteria, listingCriteria }`.
- **Page change:** `searchCustomers({ queryCriteria, listingCriteria: { ...lc, pageNumber, pageSize: 10 } })` → the store is updated with items, total, and the normalized request echoed back by the server.
- **Sorting:** all columns have `sortable: false`, and the handler is a no-op. `order`/`orderBy` are derived from `listingCriteria.ascending` / `sortColumn || 'id'`.
- **Sticky actions:** `stickyActions || isMobile`. The page passes `stickyActions={true}`.
- **Page header** (outside the table): an "All Customers" h3 (1.5rem/600), the search input, and an "Add customer" button. The page background is grey100 and the content padding is 20px.

| id | header | align | width | minWidth | content |
|---|---|---|---|---|---|
| customerName | Customer name | left | 15% | 160px | formatted name |
| companyName | Company name | left | 15% | 160px | text or `-` |
| billingAddress | Billing address | left | 15% | 128px | two-line address |
| emails | Emails | left | 10% | 128px | email list |
| phones | Phones | left | 15% | 128px | phone list |
| serviceLocations | Service locations | left | 15% | 128px | stack of addresses |
| bodiesOfWater | Bodies of water | **right** | 5% | 96px | count |
| actions | Actions | **right** | 5% | 48px | ✏️ edit (tooltip "Edit") → `onEditCustomer(customer)` |

### 5.2 Pool List (`PoolListTable`): server mode

Same data flow as 5.1, using `searchCustomers` against `useWaterTestStore`. The page passes `stickyActions={true}`.

| id | align | width | minWidth | content |
|---|---|---|---|---|
| customerName | left | 15% | 200px | name |
| companyName | left | 15% | 200px | text |
| billingAddress | left | 20% | 200px | two-line address |
| phones | left | 15% | 200px | phone list |
| bodiesOfWater | left | 40% | 200px | **PoolTags** chip list (max 3 + `+N`) |
| actions | right | 10% | 48px | 🔬 "Test water" → opens the Body-of-Water Selection modal for that customer |

### 5.3 Water-test history (`PoolHistoryTable`): server mode, wide

- A lazy-loaded component, fetched by `bodyOfWaterId` from the route `poolId = "{customerId}_{bodyOfWaterId}"`. Status filter: `Closed`.
- `stickyActions` defaults to **true**. The table is wide: 18 columns.
- Columns: `date` (10%, 128px), then 16 chemical columns (widths 5–8%, min 80–128px, values weight 600): `pH, totalChlorine, freeChlorine, salt, cyanuricAcid, totalAlkalinity, calciumHardness (label "Total hardness"), totalDissolvedSolids, phosphates, iron, totalBromine, borate, copper, biguanide, biguanideShock, waterTemperature`, then `actions` (6%, 90px): ✉️ "Resend" (opens the resend-email modal; disabled without `pdfId`) and 📄 "View report" (`window.open(pdfUrl)`; disabled without `pdfUrl`).
- The cells are memoized `React.memo` components (`DateCell`, `ChemicalTestValueCell`, `ActionsCell`). Translations are pre-computed outside `renderCell`.

### 5.4 Body-of-Water Selection modal (`BodyOfWaterSelectionModal`): client mode

- The only table that does **client-side sort + client-side pagination + single selection**.
- `showCheckbox: true`, `stickyActions: true`, all columns except notes and actions are `sortable: true`.
- Sort: `[...rows].sort()` using `column.getSortValue` with the `<`/`>` comparator. Toggle rule: clicking the active column while it's `asc` sets `desc`, anything else sets `asc`.
- Pagination: slices `sorted.slice(page*10, page*10+10)`, with `totalPages = ceil(rows/10)` and a local `currentPage` state.
- Selection is **single**. A row click or checkbox toggles `selectedBodyOfWaterId`. The row gets `selected`, `aria-checked` and `cursor: pointer`. The header checkbox shows `numSelected = selected ? 1 : 0` with `rowCount = page length`, and select-all is a no-op.
- The container is scrollable (`max-height 400px`). Empty state colSpan is `headCells.length + 1`.

| id | align | width | min | sortable | content |
|---|---|---|---|---|---|
| type | left | 10% | 80px | ✓ | option label or `-` |
| volume | right | 10% | 96px | ✓ | `12,000 gal` |
| surfaceType | left | 15% | 128px | ✓ | label |
| sanitizer | left | 15% | 128px | ✓ | label |
| classification | left | 15% | 128px | ✓ | label |
| location | left | 10% | 96px | ✓ | label |
| groundLevel | left | 15% | 128px | ✓ | label |
| filter | left | 10% | 96px | ✓ | label |
| buildDate | left | 15% | 128px | ✓ | formatted date |
| builder | left | 15% | 128px | ✓ | text |
| notes | left | 15% | 160px | ✗ | truncated 30 + tooltip |
| actions | right | 5% | 48px | ✗ | ✏️ edit |

## 6. Configuration pattern

```ts
export const createCustomerListTableConfig = (
  t: (key: string) => string,
  onEditCustomer?: (c: Customer) => void,
  stickyActions = false,
  isMobile = false,
): TableConfig => ({ columns: [ /* ... */ ], stickyActions: stickyActions || isMobile, showCheckbox: false });
```

Consumers wrap this in `useMemo([t, handlers, stickyActions, isMobile])`, then map `columns` to `HeadCell[]` in another `useMemo`.

## 7. Performance techniques already in use (keep them)

- `React.memo` on every table component and on `EnhancedTableHead`.
- Granular Zustand selectors (`store.use.x()`).
- Memoized config, head cells, order/orderBy and page values.
- Memoized cell components in the history table, with translations pre-computed outside render functions.
- Sorting copies the array (`[...rows]`) instead of mutating it.

## 8. Visual reference: the `classic` look in one place

| Token | Value |
|---|---|
| Surface | `#FFFFFF` |
| Page background (around table) | `#F5F5F5` |
| Border (container, row dividers, pagination bar) | `1px solid #E9EAEB` |
| Container radius | `8px` (the table's top corners, the pagination bar's bottom corners) |
| Header background / text | `#FAFAFA` / `#717680`, 0.875rem, 600, line-height 1.5 |
| Header padding | `8px 20px` (≥600) / `12px 12px` (<600) |
| Body cell padding | `12px 20px` (≥600) / `12px 12px` (<600) |
| Body text | `#252B37`, 14px, 400, line-height 1.5 |
| Secondary text | `#717680` |
| Emphasis text | weight 600 |
| Selected row | `#EAF6FF` |
| Row hover | none |
| Accent / action icon | `#2196F3` |
| Action hover | background `#369AE91A`, border `#2196F380`, radius 4px |
| Checkbox | 22px icon, unchecked `#D5D7DA`, checked/indeterminate `#2196F3`, radius 4px |
| Tooltip | `#181D27` background, white text, 0.75rem, radius 8px, padding 8px 12px |
| Overlay | `rgba(255,255,255,0.7)` + 40px spinner `#2196F3` |
| Table min-width | 650px |
| White space | `nowrap` in all cells (multi-line content is achieved with stacked block elements) |
| Font | Open Sans Variable |

The rebuild's `classic` preset must render these exact values (see 07 §4).

## 9. Responsive behaviour

| Width | Behaviour |
|---|---|
| `< 600px` (xs) | Cell/header horizontal padding 12px; header y-padding 12px; `xsLabel` headers (if defined) |
| `< 960px` (mobile) | Container `max-width: 100%`; the actions column is **forced sticky** (`stickyActions \|\| isMobile`); pagination switches to the compact MUI variant; the modal goes full-screen |
| `≥ 960px` | Container `max-width: calc(100vw - 210px - 40px)`; numbered pagination |
| All | Horizontal scroll inside the container (`overflow-x: auto`); `min-width: 650px` |

## 10. Known bugs and weaknesses: FIX in the rebuild

| # | Issue | Fix in new library |
|---|---|---|
| B1 | The pagination algorithm inserts spurious ellipses between adjacent pages (c=2, 3, 7 for n=10) and can hide exactly one page behind `…` | Correct algorithm (05 §4.4): an ellipsis only when ≥2 pages are hidden; a table-driven unit test |
| B2 | `stickyActions` is hard-wired to `column.id === 'actions'` | Generic column pinning (`pin: 'left' \| 'right'`) for any column, any count, with stacked offsets |
| B3 | Every table duplicates ~300 lines of render/loading/pagination code | One `<DataTable>` component |
| B4 | `totalPages` uses a hard-coded 10 instead of the server's `pageSize`; there is no page-size selector | Page count is derived from `state.pagination.pageSize` / `rowCount`; optional page-size selector |
| B5 | When `totalPages <= 1`, pagination returns `null` but the container keeps `border-bottom: none` and square bottom corners, so the table can look "cut off" | The container computes its bottom border/radius from whether a footer is actually rendered |
| B6 | `PoolHistoryTable` lacks the `position: relative` wrapper, so the searching overlay positions against an unrelated ancestor | The overlay lives inside the table's own positioned scroll container |
| B7 | The overlay has `pointer-events: none`, so rows and actions remain clickable during refetch | Overlay blocks interaction (configurable `loadingOverlayBlocksInteraction`, default `true`); `aria-busy` on the table |
| B8 | Rows have `role="checkbox"` / `aria-checked` even when there is no checkbox (Customer List) | Semantic `<tr>` with `aria-selected` only when selection is enabled |
| B9 | The select-all aria-label is hard-coded `"select all contacts"`; empty/loading strings are per-table | All strings live in `localization` |
| B10 | The Ctrl+K hotkey is global and focuses the *first* search input in the document | The hotkey is scoped per table instance, opt-in (`searchHotkey`), and focuses that table's own input |
| B11 | The header height is measured via DOM query plus a `window.resize` listener | `ResizeObserver` on the header, or pure CSS positioning |
| B12 | `disablePadding` is declared but unused; `renderCell` has 3 dead params; `any` types everywhere | Typed generics, no dead API |
| B13 | Head `maxWidth = width` (percent) clips headers in some layouts; inconsistent body `maxWidth` (`width` vs `none`) | Explicit `width/minWidth/maxWidth`, applied consistently to header and body via `<colgroup>` |
| B14 | The modal header is not sticky inside a `max-height` scroll container | `stickyHeader` option |
| B15 | No hover state, no focus-visible styles, no keyboard sorting feedback beyond MUI defaults | Tokenized hover/focus styles; full keyboard support |
| B16 | Mobile pagination uses hard-coded hex colours (`#6B7280`, `#D1D5DB`) | Tokens |
| B17 | The number of pagination items varies (7–9), which shifts the layout | Optional `'stable'` page-item algorithm (constant slot count) |
| B18 | Client sort comparator uses `<`/`>` on mixed/undefined values and is locale-unaware | Typed `sortingFns` (`alphanumeric`, `text` with `Intl.Collator`, `datetime`, `basic`) plus `sortUndefined` handling |
| B19 | Sticky-cell background is hard-coded white, so the selected-row colour must be patched via `td[data-column="actions"]` | Pinned cells inherit the row state background through CSS variables (`--tk-row-bg`) |
