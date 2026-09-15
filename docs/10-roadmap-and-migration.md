# 10: Roadmap, Definition of Done, and Migration Guide

## 1. Milestones (build in this order)

Each milestone ends with all CI gates green (09 §5) and a short progress report listing its checklist.

### M0: Scaffold
- [ ] A pnpm monorepo with `packages/react-tablekit` and `apps/site` (02 §1), TypeScript strict configs, ESLint/Prettier, Vitest, Playwright, tsup, size-limit, Changesets and the CI workflow.
- [ ] The site shell: routing, layout, theme toggle, an empty examples gallery, and a placeholder API page.
- [ ] Mock data generator + MSW mock server (08 §7) with a paged search contract.
- [ ] ADR-001 (architecture) and ADR-002 (own engine) written.
**Accept when:** `pnpm build && pnpm test && pnpm e2e` pass on an empty library that exports a `version` constant; the site deploys.

### M1: Core engine + basic rendering + classic preset (account list showcase)
- [ ] Core: store, column model (accessorKey/accessorFn/display/group), core row model, `getRowId`, state controlled/uncontrolled, `memo`, updater.
- [ ] Features: Pagination (client + manual), Sorting (client + manual), ColumnVisibility (basic), ColumnPinning (left/right, stacked offsets, responsive `pin`), Density.
- [ ] React: `useDataTable`, `<DataTable>` with slots infrastructure (all slot names registered, defaults for the ones used so far), `slotProps`/`classNames`/`styles` merging, `<colgroup>` widths.
- [ ] States: `loading` (text + skeleton), `fetching` overlay (ResizeObserver header height, blocking), empty, error.
- [ ] Pagination UI: `numbered`, `compact`, `simple`; `getPageItems` classic + stable; hideOnSinglePage with the container border fix.
- [ ] Theme: tokens, `light` + `classic` presets, CSS layers.
- [ ] Cell building blocks: `ActionButton`, `Tooltip`, `TwoLineText`, `MultiLineList`, `Chip`, `ChipList`, `TruncatedText`.
- [ ] Server mode (controlled style, 03 §4) + the `dataSource` adapter (03 §5) with debounce/min length/abort/race/page reset/server echo.
- [ ] `<DataTable.Search/>` composable part with the scoped hotkey + hint chip.
- [ ] Example: `showcase-account-list`, `basic`, `pagination-variants`, `client-vs-server`.
**Accept when:** the account list showcase has locked visual baselines (09 §3) at 1440 and 390 widths; the B1, B2, B4, B5, B6, B7, B8, B9, B10, B11, B13 and B16 regression tests pass.

### M2: Search, filtering, faceting, toolbar
- [ ] GlobalFilter (client/server, highlight, match modes), ColumnFilters (all variants), Faceting (client + `fetchFacets`), active filter chips, filter panel/popover/row modes, the toolbar layout + composable toolbar parts, Columns menu, density toggle.
- [ ] Localization system + `en`, `hu`, `de`, `es`; formatters; the pseudo-locale test.
- [ ] Examples: `global-search`, `filters-*`, `server-sorting`, `hybrid-mode`, `localization`, `showcase-asset-list`.
**Accept when:** client/server equivalence property tests pass for search + filters + sort + pagination; the asset list showcase baseline is locked.

### M3: Selection, expansion, collapsible rows, tree data
- [ ] RowSelection (single/multi/range/cascade/disabled, page/all, server exclusion model, selection bar + bulk actions).
- [ ] Expanding: detail panels (lazy, keepMounted, animation, fullWidth sticky), tree data (client + lazy `fetchChildren`), expand column/all, single mode.
- [ ] `renderRow` with `defaultRender`, `getRowProps`, disabled rows, row events.
- [ ] Handler middleware for every handler in 06 §5.
- [ ] Examples: `row-selection`, `detail-panels`, `tree-data`, `tree-lazy-server`, `row-overrides`, `handlers-middleware`, `showcase-asset-picker`, `showcase-readings`.
**Accept when:** all four showcase pages are locked; B8, B14, B18 and B19 regressions pass.

### M4: Column power features + large data
- [ ] Column sizing/resizing (keyboard too), ordering (pointer DnD + menu), the column actions menu, static/locked columns, sticky header/footer, row pinning.
- [ ] Row virtualization (fixed + dynamic), `layout: 'grid'`, infinite pagination, cursor pagination.
- [ ] Examples: `column-*`, `sticky-header-footer`, `virtualization-100k`, `infinite-scroll`, `cursor-pagination`.
**Accept when:** the performance budgets (09 §4) are met; axe is clean with virtualization.

### M5: Grouping, aggregation, export, persistence, keyboard grid
- [ ] Grouping (client + server rows), aggregation fns, footers.
- [ ] Export (CSV page/all/selected, clipboard, server chunked).
- [ ] `syncState` URL + storage with migrations; `useRouterSync`.
- [ ] Keyboard grid navigation (05 §15); live-region announcements complete.
- [ ] Responsive cards layout.
- [ ] Examples: `grouping-aggregation`, `export`, `url-sync`, `keyboard-navigation`, `responsive-cards`, `states`.

### M6: Theming completeness + docs site
- [ ] `dark`, `compact` and `minimal` presets; `colorScheme: 'auto'`; the unstyled mode + Tailwind recipe.
- [ ] Theme editor; playground; the API docs pipeline (TypeDoc + runtime meta); every guide page from 08 §1; search.
- [ ] Remaining examples (`slots-*`, `theming-*`, `composable-layout`, `headless`, `react-query-recipe`, `cell-building-blocks`, `density`, `column-types`).
**Accept when:** every public symbol is documented; every slot, handler, token, locale key and icon appears on the API pages from metadata; the site Lighthouse score is ≥ 90.

### M7: Hardening and 1.0 release
- [ ] Cross-browser e2e; SSR smoke; bundle audits (publint, attw); tree-shaking verified.
- [ ] README, CONTRIBUTING, LICENSE, CHANGELOG; semver policy page.
- [ ] `1.0.0` published via Changesets with provenance; the docs site deployed.

### v1.x (after 1.0, names already reserved)
Inline editing (05 §22), column virtualization, row drag reordering, cell range selection/copy, the `react-tablekit-mui` adapter package, and more locales.

## 2. Definition of Done (per feature)

A feature is done when it has:

1. The core implementation, with client **and** server semantics where applicable (03 §6 matrix).
2. Public API names exactly as in 04, with TSDoc (description, `@default`, `@example`).
3. Default UI slot(s) registered with metadata. All strings are localized, all visuals are tokenized, and state is exposed via data attributes.
4. Handler(s) routed through the middleware where there is user interaction.
5. Keyboard and screen-reader support per 05 §15–16.
6. Unit, component, a11y and (where visual) screenshot tests, plus a regression test for any related known bug (B1–B19).
7. A demo example page and a guide section; the playground controls updated.
8. A changeset entry.
