# react-tablekit

## 1.0.0

### Major Changes

- M7: hardening and the 1.0 release.

  The API is stable and the library is ready for a first stable release. This changeset takes the
  package to 1.0.0; the semver promise it starts is documented on `/docs/versioning`.

  **Release readiness**

  - **Cross-browser end-to-end:** the full suite runs on Chromium, Firefox and WebKit — 702 tests,
    all passing. CI runs Chromium on pull requests and all three on `main`.
  - **SSR:** the smoke test now renders a table with `renderToString` in a Node environment and
    asserts what actually reaches the first paint — real rows, `role="grid"` for a selectable
    table, and the cards layout when `ssrBreakpoint` says the viewport is small. It previously only
    checked that the module could be imported without `window`.
  - **Packaging:** `publint --strict` and `@arethetypeswrong/cli` pass on the packed tarball, and
    `homepage` now points at the documentation site rather than the repository readme.
  - **Tree-shaking, verified and recorded** in ADR-003: locale packs and CSS presets are separate
    entry points and never reachable from the main entry, the derived themes carry 373
    `/* @__PURE__ */` annotations, and a basic `import { DataTable }` measures below the full
    import.

  **Bundle budgets**

  The lean `DataTableLite` entry scheduled by ADR-003 is **deferred to 1.x**, and the docs/09 §4
  size targets for the JS entries are revised to the measured guards (58 / 61.5 / 21 kB;
  `styles.css` keeps its original 7 kB budget). Reaching the 24 kB basic-usage target requires
  extracting the engine and the view layer into per-feature side-effect-free modules — a refactor
  underneath 396 unit tests and 234 end-to-end tests, which is not something to do immediately
  before a first stable release. `react-tablekit/core` (20.75 kB) is the documented small-bundle
  path in the meantime, and the reasoning is recorded in ADR-003.

  **Documentation**

  - The package README is rewritten for consumers: what it is, a client-mode quick start, a
    server-mode example, the feature list, the real bundle numbers, and the support matrix. It
    previously still said that nothing but the `version` export was available.
  - A **versioning policy** page states what the public API covers — not just the exported names,
    but the `tk-*` class names, the `--tk-*` variables, the `data-*` attributes, and the slot,
    handler and localization key names — plus what a minor may change (token values, except the
    frozen `classic` preset) and how deprecations are handled.

### Minor Changes

- M3: selection, expansion, collapsible rows and tree data.

  - Single-selection mode now renders **radios** instead of checkboxes, as 05 §5 specifies (the slot
    already supported `type`, but the row cell never passed it).
  - Named regression tests for B14 (sticky header inside a `maxHeight` scroll container), B18 (typed,
    locale-aware sort comparators with nulls last in both directions) and B19 (pinned cells inherit
    the row background through `--tk-row-bg` instead of a hard-coded white).
  - New examples: the reading history and asset picker showcase pages, plus row
    selection, detail panels, tree data, lazily loaded server children, row overrides and handler
    middleware. All four showcase pages now have locked visual baselines at 1440 and 390.

- M1: core engine, basic rendering and the first showcase screen.

  - Headless core: store with controlled/uncontrolled state slices and updaters, column model
    (`accessorKey` / `accessorFn` / display / group), core row model with `getRowId`, memoized
    row-model pipeline, and the normalized `TableQuery` tracker (debounce, min length, page reset).
  - Features: pagination (client + manual), sorting (client + manual), basic column visibility,
    column pinning with stacked offsets and responsive `pin`, and density.
  - Server mode: the `dataSource` adapter with abort, race guard, dedupe, server echo and
    out-of-range correction, plus `createRestDataSource` / `createLocalDataSource`.
  - React: `useDataTable`, `<DataTable>` with the full slot registry, `slotProps` / `classNames` /
    `styles` merging with handler middleware, `<colgroup>` widths, `<DataTable.Search>` with a scoped
    hotkey, the loading / fetching / empty / error states, and the `numbered`, `compact` and `simple`
    pagination variants.
  - Theming: the token system, the `light` and `classic` presets, and CSS `@layer tablekit`.
  - Cell building blocks: `ActionButton`, `Tooltip`, `TwoLineText`, `MultiLineList`, `Chip`,
    `ChipList`, `TruncatedText`.
  - Fixes the known bugs B1, B2, B4, B5, B6, B7, B8, B9, B10, B11, B13 and B16, each with a named
    regression test.

- M2: search, filtering, faceting, toolbar and localization.

  - Locale packs for Hungarian, German and Spanish (`react-tablekit/locales/hu` | `/de` | `/es`),
    each locked to the English key set and its message placeholders by tests.
  - `highlightSearchMatches` is now part of the public props (it was implemented but not typed).
  - `initialState` accepts partial object slices, so `initialState: { columnPinning: { left: ['name'] } }`
    type-checks and merges with the defaults, like `pagination` and `columnVisibility` already did.
  - **Hybrid mode fixes (03 §1.2).** Client-side features no longer reach the data source: a
    client-side sort or filter under server pagination sorts or filters the page that was fetched
    instead of triggering a server round-trip, the query sent to the server carries only the parts
    the server owns, and such a change no longer resets the page index. Client pagination with a
    server data source likewise stops refetching on every page change.
  - A selectable table now exposes `role="grid"`, and one with tree data or grouping `role="treegrid"`,
    so that `aria-selected` and `aria-level` on rows are valid ARIA (serious axe violation otherwise).
  - Property-based tests (fast-check) covering client-vs-reference equality for search, filters,
    sorting and pagination, the pagination invariants, sort stability, and client-vs-server
    equivalence through the emitted `TableQuery`.
  - Unit-level a11y tests with `vitest-axe` across feature configurations and states.
  - New examples: the asset list showcase, global search, filter panel / row / popover+column menu /
    server, server sorting, hybrid mode and localization.

- M4: column power features and large data.

  - **Column actions menu and resize handle are now rendered** (they had slots and options, but
    nothing wired them up): a per-header “⋮” menu with sort, filter, group, pin, hide, autosize and
    reset — customizable through `renderColumnActionsMenuItems` — and a `role="separator"` resize
    handle that works with the pointer, with ←/→ (Shift for 50px) and by double-click to autosize.
  - **Column reordering** by dragging a header (`enableColumnOrdering`), with a live-region
    announcement of the new position.
  - **`useVirtualRows`** and built-in row virtualization: a windowed body with spacer rows, dynamic
    measurement, `scrollToIndex`, automatic activation above `virtualizationThreshold`, and grid
    semantics so screen readers still get the real totals.
  - **`loadMore` / `infinite` pages now accumulate** instead of replacing the previous page
    (`appendPages` sets it explicitly), duplicates are ignored, and a query change starts the list
    again. `infinite` loads the next page as you approach the end of the scroll area.
  - Examples: column features, sticky header and footer, 100k virtualized rows, infinite scroll and
    cursor pagination.
  - Performance budgets (09 §4) are now enforced as tests: sort and search over 10k rows, the
    initial-render cost relative to plain React markup, and a long-task check while scrolling 100k
    virtualized rows in Chromium.
  - Size guards raised for these features (ADR-003 requires the reason in the changeset): full import
    55 → 58.5 kB and `import { DataTable }` 51.5 → 55 kB, for the column actions menu, the resize
    handle, drag reordering and the virtualizer (+3.2 kB gzipped in total). `core` and `styles.css`
    are unchanged.

- M5: grouping, export, persistence, keyboard grid and the cards layout.

  - **Keyboard grid navigation** (`enableKeyboardNavigation`, 05 §15) following the WAI-ARIA data-grid
    pattern: the grid is one tab stop with a roving tabindex, arrows move between cells (header
    included), Home/End and Ctrl+Home/End jump, PageUp/PageDown move by a page, Enter sorts from a
    header or steps into a cell's controls (Escape returns), Space selects the row, Shift+Space
    selects a range and Ctrl/⌘+A selects the page. ArrowLeft collapses an expanded row first.
  - **State persistence** (`syncState`, 03 §7): the compact, documented URL format
    (`?tk.page=2&tk.sort=name.asc&tk.q=smith&tk.f.status=active,pending`) plus storage, with the URL
    winning over storage and storage over `initialState`, versioned payloads and `migrate`.
    `useRouterSync` plugs the same thing into a router instead of the History API, and `encodeState` /
    `decodeState` are exported for custom wiring.
  - **Cards layout** (`responsive.mobileLayout: 'cards'`, 05 §13): below the mobile breakpoint each
    row renders as an article of label/value pairs — a list, not a table — with selection in the card
    header, actions in the footer, `cardColumns` to choose the fields and `renderCard` to replace the
    whole card.
  - Examples: grouping and aggregation, export (client plus a chunked server export), URL and storage
    sync, keyboard navigation, responsive cards, and a states playground covering skeleton/text
    loading, the refetch overlay, both empty states and the error state.
  - Size guards raised for these features (ADR-003 requires the reason in the changeset): full import
    58.5 → 61.5 kB and `import { DataTable }` 55 → 58 kB, for the keyboard grid, the state
    synchronizer and the cards layout (+1.6 kB gzipped each). `core` (20.8 kB) and `styles.css`
    (6.1 kB) stay within their existing limits.

### Patch Changes

- M6: the documentation site — guides, examples, API reference and search.

  The milestone is almost entirely `apps/site`, which is not published. The one change to the
  package itself is a documentation-tooling fix:

  - **The generated API reference was nearly empty, and nothing caught it.** `build-api.mjs` kept
    the first declaration it saw for each name, and the `core` entry point contributes re-export
    stubs (`kind: reference`, no children) that shadowed the real interfaces in `index`. It also
    collected only properties, so `TableInstance` — which is 113 methods — documented nothing, and
    it ignored type aliases over intersections, so `DataTableProps` documented nothing either.
    `/api/instance`, `/api/state`, `/api/column-def` and `/api/data-table` rendered a heading and no
    members. The generator now keeps whichever declaration carries content, renders methods as their
    signatures, and follows `extends` and intersection members (own members winning over inherited
    ones): 912 documented entries where there were 101. A page that resolves its symbols but
    documents nothing now fails the build instead of passing silently, and the e2e suite asserts
    that each API page shows real members rather than only a heading.

  Site work in this milestone:

  - Eighteen more guides, one per feature in 05 — sorting, filtering, search, pagination, selection,
    expansion, grouping, pinning, sizing, ordering and visibility, virtualization, keyboard, export,
    persistence, responsive — plus customization and localization.
  - The last fourteen examples: column types, client sorting, column pinning, sizing, ordering and
    visibility, cell building blocks, custom slots, a design-system re-skin, theming presets and
    custom theming, density, composable layout, headless, and the React Query recipe.
  - **Ctrl+K search** over the pages, guide headings, examples, API symbols and members, theme
    tokens, slots, handlers, localization keys and icons — one in-memory index built from the same
    sources the pages render from, so it cannot drift. A table on the page keeps the hotkey for its
    own search (the library claims the event on `document`, which bubbles before `window`).
  - A worked **Tailwind recipe** in the theming guide: `unstyled` plus `classNames` keyed by the
    camelCase slot names, including a per-row class function, and a note that the stylesheet import
    stays (what `unstyled` drops is the visual theme, not the structural rules that position
    pinning, sticky headers and virtualization).
  - `apps/site/src/generated/` is no longer committed, and `verify` generates it before the static
    checks so a clean checkout does not lint and typecheck against missing files.
  - Lighthouse performance on the landing page: **99** (desktop preset, measured against the
    production build), meeting the ≥ 90 bar in 08 §8. `pnpm --filter site lighthouse` repeats it.
