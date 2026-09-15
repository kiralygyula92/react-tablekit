# 08: Demo App and API Docs Site (`apps/site`)

A single Vite + React 19 + React Router 7 app serves three things: the **examples gallery**, the **playground**, and the **documentation** (guides + API reference). It consumes the library from the workspace (`"react-tablekit": "workspace:*"`), so it always runs against the current source. It deploys as a static site (GitHub Pages / Netlify / Vercel).

## 1. Information architecture

```
/                               Landing: hero table (live), feature grid, install snippet, links
/docs/getting-started           Install, CSS import, first table, TypeScript tips
/docs/guides/client-vs-server   03 in guide form, with live side-by-side example
/docs/guides/server-data        dataSource, createRestDataSource, React Query recipe
/docs/guides/columns            ColumnDef, helper, types, formatting, fallback values
/docs/guides/sorting            … one guide per feature in 05 (filtering, search, pagination, selection,
/docs/guides/…                    expansion, grouping, pinning, sizing, ordering, visibility, virtualization,
                                  keyboard, a11y, export, persistence, responsive)
/docs/guides/customization      06 levels 0–8, with an example per level
/docs/guides/theming            07, presets, dark mode, Tailwind recipe, unstyled
/docs/guides/localization       Locales, i18next recipe, formatters
/examples                       Gallery grid (filterable by tag), each card links to an example page
/examples/:slug                 Example page (live demo + source tabs + "Open in playground")
/playground                     Full-options playground
/theme-editor                   Token editor
/api                            API index (search box)
/api/data-table                 <DataTable> props table
/api/column-def                 ColumnDef fields
/api/instance                   TableInstance methods, grouped by feature
/api/state                      TableState slices + TableQuery
/api/hooks                      One section per hook
/api/slots                      Every slot: name, default element, context props, example
/api/handlers                   Every handler: context, default behaviour
/api/theme-tokens               Every token: key, CSS var, light/dark/classic values, live swatch
/api/localization               Every key with the English default
/api/icons                      Every icon with a preview
/api/utilities                  createColumnHelper, data sources, getPageItems, exportToCsv, fns registries
/changelog                      Rendered from CHANGELOG.md
```

Global UI: a top bar (logo, Docs, Examples, API, Playground, version selector, GitHub, a theme toggle for light/dark/classic), a left sidebar in docs/api, a right "On this page" TOC, and **Ctrl+K search** (over headings, API symbols and examples, using an in-memory index built at build time; no external service).

## 2. Example page template

Each example lives in `src/examples/<slug>/`:

```
index.tsx      default export: the live demo component
meta.ts        { title, description, tags: ['server','filtering',...], features: [...], related: [...] }
notes.mdx      optional explanation rendered under the demo
```

The page shows: title and description; the live demo (resizable preview frame with width presets 375 / 768 / 1280 / full, so responsive behaviour can be demonstrated); tabs for **Preview | Code | Data** (the source is imported with `?raw` and highlighted with Shiki; Data shows a sample of the dataset JSON); a **State inspector** panel (collapsible, shows `table.getState()` and `getQuery()` live and logs `onQueryChange` / handler calls with timestamps); an "Open in playground" button (serializes the relevant options); and "Related examples".

## 3. Examples (all required for v1.0)

### 3.1 Showcase examples: full application screens (theme `classic`, mock server)

These have the highest priority: they show the table in the context it is actually used in,
rather than one feature at a time. Each is visually compared against baseline screenshots (09 §3).

| Slug | Must show |
|---|---|
| `showcase-account-list` | Page header (title, search with the Ctrl+K chip via `<DataTable.Search/>`, an "Add account" button); 8 columns with percentage widths; two-line addresses; email/phone lists; the site stack; the right-aligned count; the edit action pinned right; server pagination (numbered/compact); the initial "Loading..." row; the refetch overlay; the empty state; search debounce 300ms with min length 3 and page reset |
| `showcase-asset-list` | A chip list with max 3 and `+N`; clickable chips (open a demo dialog); a row action opening a dialog |
| `showcase-readings` | 18 columns, horizontal scroll, server sorting, pinned right actions (resend, view report) with per-row disabled states |
| `showcase-asset-picker` | As it would appear in a dialog: client sort and pagination, single selection by row click and radio, the selected row colour under the pinned action cell, `maxHeight 400` with a **sticky header** |

A theme toggle on these pages switches between `classic` and `light`, to show the modern defaults with the same configuration.

### 3.2 Feature examples

| Slug | Content |
|---|---|
| `basic` | Minimal `data + columns` |
| `column-types` | text/number/date/boolean/custom, formatting, fallback values, alignment |
| `client-sorting` | Single and multi-sort, custom sortingFn, sortUndefined, natural sort |
| `server-sorting` | Manual sorting with `sortServerKey` mapping; shows the emitted query |
| `global-search` | Client search with highlight, diacritics, hotkey, min length; two tables on one page to prove hotkey scoping |
| `filters-panel` | All variants in `panel` mode, the chips, "Clear all", facet counts |
| `filters-row` | The filter row mode |
| `filters-popover-and-column-menu` | Popover mode + the column actions menu filter |
| `filters-server` | Server filtering + faceting via `fetchFacets`; network log |
| `pagination-variants` | numbered / compact / simple / loadMore / infinite side by side; the page-size selector; the `classic` vs `stable` algorithm visualizer (a slider over pageIndex that shows items) |
| `cursor-pagination` | A cursor-based dataSource with unknown total |
| `client-vs-server` | The **same dataset twice**: left client mode, right `createLocalDataSource` with latency. Identical interactions give identical results (sync controls button) |
| `hybrid-mode` | Server pagination + client page-local sorting, with the acknowledgement flag |
| `row-selection` | multi/single, range, disabled rows, the selection bar with bulk actions, select all page vs all matching (server exclusion model) |
| `detail-panels` | Collapsible rows with a rich panel (tabs, nested mini-table), lazy data via `useDetailPanelData`, single/multiple expand mode, animation |
| `tree-data` | `getSubRows` (org chart), `filterFromLeafRows`, expand all |
| `tree-lazy-server` | `fetchChildren` with spinners and error retry |
| `grouping-aggregation` | Multi-level grouping, aggregates, footers |
| `column-pinning` | Multiple left/right pins, static columns, responsive pin, scroll shadows, RTL toggle |
| `column-sizing` | % widths vs resizing, onChange/onEnd, autosize, keyboard resizing |
| `column-ordering-visibility` | Drag reorder, the columns menu, locked columns, persistence to localStorage |
| `sticky-header-footer` | maxHeight, sticky header/footer with pinned columns |
| `virtualization-100k` | 100,000 rows client mode, dynamic row heights, scrollToRow, an FPS meter |
| `infinite-scroll` | Server infinite + virtualization |
| `row-overrides` | `getRowProps`, `renderRow` (inserted alert rows, section header rows), disabled rows, row click navigation |
| `cell-building-blocks` | ActionButton, RowActionsMenu, ChipList, TruncatedText, TwoLineText, MultiLineList |
| `slots-custom-components` | Replacing Pagination, HeaderCell (wrapping the default), EmptyState, SearchInput |
| `slots-design-system` | Re-skin the primitive slots with Tailwind classes (or simple custom components) |
| `handlers-middleware` | Analytics logging, a confirm on page change, single-sort enforcement, row click override (log panel) |
| `theming-presets` | light / dark / classic / compact / minimal switcher |
| `theming-custom` | `createTheme` brand theme; CSS-variable overrides; unstyled + Tailwind |
| `density` | The density toggle |
| `responsive-cards` | `mobileLayout: 'cards'` with renderCard |
| `states` | loading text/skeleton/spinner, overlay, empty (noRows vs noResults), error with retry, error banner with stale data; buttons to trigger each |
| `keyboard-navigation` | The grid navigation with a key legend |
| `localization` | en/hu/de/es switcher + the i18next recipe |
| `export` | CSV page/all/selected, copy, server chunked export with progress |
| `url-sync` | State in the URL (copy link and reopen) |
| `composable-layout` | The composable parts arranged in a custom layout (search in the page header, pagination on top) |
| `headless` | useDataTable with a custom card grid UI |
| `react-query-recipe` | The dataSource wrapping React Query (devDependency of the site only) |
| `editing` *(v1.x)* | Cell/row editing with validation |

## 4. Playground (`/playground`)

- **Left:** a control panel with two parts. **Setup** holds what is not a prop: the dataset (people / accounts / 10k generated / tree), row count, in-memory data vs. a simulated API (latency, failure rate), preset, language and initial page size/density. **Props** holds a control for **every prop of `<DataTable>` whose type allows one**, generated at build time from the package's TypeDoc output (`scripts/build-api.mjs` → `playground.json`), so it can never fall behind the component: booleans, string unions, numbers and strings, mixed unions (`boolean | 'auto'`), `ResponsiveValue<T>`, lists such as `pagination.pageSizeOptions` (with an off state for `false`), and the fields of the `pagination`, `compactPagination` and `responsive` option objects. Every control has a "default" state in which the prop is not passed, shown next to the documented default. Props that cannot be toggled (callbacks, render functions, registries, data) are listed as code only. A filter box, a "changed only" switch and per-prop reset keep ~150 controls usable, and an error boundary keeps any combination from breaking the page.
- **Centre:** the live table.
- **Right:** tabs for **Code** (generated TSX reflecting only non-default options, with a copy button), **State**, **Query log** and **Handler log**.
- The state of the controls is serialized into the URL hash, so it's shareable.

## 5. Theme editor (`/theme-editor`)

- Token groups from 07 §3 are shown as colour pickers, length inputs and selects.
- It has a live preview (a table with toolbar, selection, pinned columns, pagination, states).
- A preset starting point can be chosen.
- An AA contrast checker badge is shown next to the text/background token pairs.
- Export: a `createTheme()` snippet, a CSS variables block, or a JSON download.

## 6. API docs generation

1. `pnpm --filter react-tablekit docs:json` runs **TypeDoc** with `--json dist/api.json` over `src/index.ts`, plus the `typedoc-plugin-missing-exports` equivalent config, and it includes TSDoc tags `@default`, `@example`, `@since`, `@deprecated`, `@see`, and a custom `@group` tag (feature grouping).
2. `apps/site/scripts/build-api.ts` transforms `api.json` into compact per-page JSON: props (name, type string, default, description, since, deprecated, group), and methods (signature, params, returns).
3. The API pages render **props tables** with a filter box, group headers, a type popover (expanding referenced types), and anchors per prop (`/api/data-table#enableRowSelection`).
4. Slots, handlers, tokens, localization keys and icons are generated from **runtime metadata** exported by the package for docs (`react-tablekit/meta`, not in the main bundle: `slotMeta`, `handlerMeta`, `tokenMeta`, `localeKeys`, `iconNames`), so the lists can never drift from the implementation.
5. CI fails if a public symbol lacks a TSDoc description (`typedoc --validation.notDocumented`).

## 7. Mock data and mock server (`apps/site/src/mock`)

- **Seeded generator** (a tiny PRNG such as mulberry32; no faker needed, although `@faker-js/faker` is acceptable as a site-only devDependency) producing domain-faithful data:

```ts
interface Account {
  identifiers: { id: string };
  displayName: { firstName: string; lastName: string; companyName?: string };
  billingAddress?: Address;                       // { address1, address2?, city, region, postalCode, country }
  contactInformation?: { emailAddresses: { email: string }[];
                         phoneNumbers: { number: string; phoneType: 'Work'|'Mobile'|'Home'|'Unknown' }[] };
  sites?: { identifiers: { id: string }; address: Address; assets: Asset[] }[];
}
interface Asset {
  id: string; name?: string; kind: 'Server'|'Switch'|'Sensor'|'Gateway'; capacity: number;
  enclosure?: string; powerSource?: string; tier?: string; placement?: string;
  mounting?: string; coolingType?: string; installedAtUTC?: string; vendor?: string; notes?: string; accountId: string;
}
interface Reading {
  id: string; date: string; reportUrl?: string; reportId?: string; workOrderId?: string;
  // sixteen numeric metrics, so the table is wider than any viewport
  loadFactor: number; inputVoltage: number; outputVoltage: number; throughput: number; /* … */ temperature: number;
}
```

  The datasets are: 235 accounts (so there are 24 pages at size 10, which exercises ellipses), the assets of those accounts, 57 readings per asset, and generic datasets (10k people, 100k rows, an org tree, orders for grouping). Some fields are intentionally missing, to exercise the `-` fallbacks.

- **Mock server:** MSW handlers at `/api/accounts/search` (POST, a `{ queryCriteria, listingCriteria }` contract, responding `{ items, totalItemCount, requestCriteria }`), `/api/assets/:id/readings`, `/api/generic/:dataset` (the generic `TableQuery` contract) and `/api/generic/:dataset/facets/:column`. The latency is configurable (default 400ms ±200) and an error rate can be injected from the demo UI. All handlers reuse the library's `filterFns`/`sortingFns` via `createLocalDataSource` logic, so server and client results match.

## 8. Site quality bar

- The site is itself accessible (axe clean) and responsive down to 375px, and it supports dark mode.
- Lighthouse performance ≥ 90 on the landing page. Examples are code-split per route.
- Every example has an e2e smoke test (it renders, has no console errors, and passes axe).
