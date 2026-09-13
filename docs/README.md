# react-tablekit: Handoff Documentation

> **Audience:** an AI coding agent (or a developer) starting in a **fresh, empty repository**.
> **Goal:** build a production-grade, publishable React data-table library (working name **`react-tablekit`**) plus a **demo site** and an **API docs site**. It must reproduce the table currently used in the Skimmer Retail app **1:1** and then go far beyond it.

---

## 1. What this is

The Skimmer Retail client (`src/skimmer.retail.client`, React 19 + MUI 7 + Zustand) has a small, copy-pasted table system used on four screens: **Customer List**, **Pool List**, **Water-Test (Pool) History**, and the **Body-of-Water Selection** modal. Every screen re-implements roughly 300 lines of the same rendering, loading, pagination and sticky-column logic around a `TableConfig` object.

This documentation set does three things:

1. **Reverse-engineers** the current implementation in full: props, types, behaviours, every pixel and colour value, and every known bug. With it, a builder can reproduce the tables without access to the original code.
2. **Specifies a new standalone library** that covers the current look and behaviour as one of its presets. It is headless-core + styled components, fully typed, themable, overridable at every level, and supports **client-side and server-side** operation for every data feature.
3. **Specifies the demo app and API docs site** that showcase it, plus testing, packaging and release.

## 2. Reading order

| # | File | What it gives you |
|---|------|-------------------|
| 00 | `README.md` (this file) | Index, principles, the **agent kick-off prompt** |
| 01 | `01-current-implementation.md` | Full reverse-engineering of the existing Skimmer table: files, types, render tree, behaviours, exact style values, consumers, bugs |
| 02 | `02-architecture.md` | Package architecture, repo layout, tech stack, engine design, row-model pipeline, state model, performance rules |
| 03 | `03-data-modes-client-server.md` | **Client vs. server vs. hybrid** operation for pagination, search, filtering, sorting, grouping, expansion and selection. Includes the `dataSource` adapter |
| 04 | `04-api-reference.md` | Full TypeScript API: `<DataTable>` props, `ColumnDef`, state, instance API, hooks, utilities |
| 05 | `05-features.md` | Detailed behavioural spec of every feature (sorting, filtering, search, pagination, selection, expansion, collapsible rows, pinning/static columns, sizing, ordering, visibility, grouping, virtualization, editing, export, persistence, keyboard, a11y) |
| 06 | `06-customization-overrides.md` | The override system: slots, slotProps, render props, row/cell/header overrides, handler middleware, function registries, icons, localization |
| 07 | `07-theming-styling.md` | Design tokens, CSS variables, presets (incl. the 1:1 **`classic`** preset with exact values), dark mode, density, class names, data attributes, unstyled mode |
| 08 | `08-demo-and-docs-site.md` | Demo app and API docs site: routes, every example page, playground, mock server, doc generation |
| 09 | `09-quality-testing-release.md` | Testing strategy, parity/visual tests, a11y, performance budgets, CI, versioning, npm publishing |
| 10 | `10-roadmap-and-migration.md` | Milestones with acceptance criteria, Definition of Done, and the migration guide from Skimmer's `TableConfig` to the new API |

Files 01, 03, 04 and 06 are the most important. If anything conflicts, **04 (API reference)** is the source of truth for names and signatures, and **05** is the source of truth for behaviour.

## 3. Non-negotiable principles

1. **Parity means the same look and behaviour, with the known bugs fixed.** The `classic` theme preset plus the parity demo pages must look pixel-equivalent to the Skimmer screens (see 01 §8 and 07 §4). Bugs listed in 01 §10 are fixed, not reproduced.
2. **Every data feature works in client mode and server mode.** This covers pagination, global search, column filters, sorting, grouping, row expansion (lazy children), selection ("select all" across pages) and faceting. Mode can be set per feature (see 03).
3. **Everything visible is overridable.** Every sub-component is a *slot*. Every slot accepts props, className and style overrides, and every interaction goes through an overridable *handler* that can call the default behaviour (see 06).
4. **Headless first.** All logic lives in a framework-agnostic core. React components are a thin, replaceable rendering layer. A consumer can build a completely custom UI from the hooks alone.
5. **Zero runtime dependencies** besides `react` / `react-dom` (peer). No MUI, no CSS-in-JS runtime. Styling uses plain CSS with CSS custom properties inside a cascade layer.
6. **Strict TypeScript, generics everywhere.** No `any` in the public API. `ColumnDef<TData, TValue>` infers `TValue` from the accessor.
7. **Accessible by default.** Correct table/grid semantics, `aria-sort`, keyboard support, focus management, live-region announcements, reduced motion.
8. **Publishable.** ESM + CJS + `.d.ts`, subpath exports, tree-shakeable, SSR-safe, React 18 & 19, and documented bundle-size budgets.

## 4. Naming conventions (apply everywhere)

| Pattern | Meaning | Example |
|---|---|---|
| `enableX` | Boolean feature flag (table or column level) | `enableSorting`, `enableColumnPinning` |
| `manualX` | "Server handles X" (engine skips the computation) | `manualPagination`, `manualFiltering` |
| `xMode` | Per-feature data mode shortcut: `'client' \| 'server'` | `paginationMode`, `filterMode` |
| `state.x` / `initialState.x` / `onXChange` | Controlled / uncontrolled state slice | `state.sorting`, `onSortingChange` |
| `renderX` | Render prop returning `ReactNode` | `renderDetailPanel`, `renderRowActions` |
| `getXProps` | Prop getter returning HTML/React props | `getRowProps`, `getCellProps` |
| `xFn` / `xFns` | Pluggable function / registry | `sortingFn`, `filterFns` |
| `slots.X` / `slotProps.X` | Component replacement / props for a slot | `slots.Pagination`, `slotProps.headerCell` |
| `handlers.onX` | Interaction middleware `(ctx, next) => void` | `handlers.onSortToggle` |
| CSS class | `tk-` prefix, BEM-ish | `tk-table`, `tk-cell`, `tk-cell--pinned-right` |
| CSS variable | `--tk-` prefix | `--tk-color-border` |
| Data attribute | State hooks for CSS | `data-sorted="asc"`, `data-selected`, `data-pinned="right"` |

## 5. Package name

The working name is **`react-tablekit`** (imports: `import { DataTable } from 'react-tablekit'`). Before the first publish, check availability on npm. Fallbacks: `@<your-scope>/react-tablekit`, `react-table-forge`, `tablekit-react`. Keep the name in **one** place (root `package.json` plus a `PKG_NAME` constant in the docs site) so it's a one-line rename.

## 6. Agent kick-off prompt (copy-paste into the new repo's agent)

```
You are building "react-tablekit", a production-grade, headless-core React data-table
library published to npm, plus a demo site and an API-docs site, in this empty repository.

The complete specification is in /docs (files 00–10). Read README.md first, then 01–10
in order before writing code. Treat 04-api-reference.md as the source of truth for names
and signatures and 05-features.md as the source of truth for behaviour.

Hard requirements:
- pnpm monorepo: packages/react-tablekit (the library) and apps/site (demo + API docs).
- TypeScript strict, React 18/19 peer deps, zero runtime deps, plain CSS + CSS variables
  inside @layer tablekit. ESM+CJS+d.ts via tsup. Subpath exports as specified.
- Every data feature (pagination, global search, column filters, sorting, grouping,
  expansion, selection, faceting) must work in client mode AND server mode (see 03).
- Every sub-component is a replaceable slot; every interaction goes through an
  overridable handler middleware (see 06).
- Ship the "classic" theme preset that reproduces the Skimmer tables 1:1 (see 01 §8,
  07 §4), and the four parity demo pages (see 08 §3.1) running against the mock server.
- Fix every bug listed in 01 §10; do not reproduce them.
- Follow the milestones in 10-roadmap-and-migration.md in order. At the end of each
  milestone, run lint, typecheck, unit tests, e2e tests and size-limit, and make sure they
  all pass before starting the next one.
- Write tests alongside code (Vitest + Testing Library; Playwright for e2e/visual; axe).

Start with Milestone 0 (scaffold). Report progress per milestone with the checklist
from 10-roadmap-and-migration.md.
```

## 7. Scope summary

**In scope for v1.0:** everything in 05 that is not marked *(v1.x)*.
**Marked *(v1.x)*:** inline editing, column virtualization, row drag-reordering, spreadsheet-style cell range selection, MUI adapter package. These are specified, but they may ship after 1.0.
**Out of scope:** pivot tables, charts, and built-in data-fetching libraries. The `dataSource` adapter is fetch-agnostic, so it works with `fetch`, `ky`, React Query or anything else.

## 8. Where the source material came from

All facts in `01-current-implementation.md` come from the Skimmer monorepo, path `src/skimmer.retail.client/src/`:

```
components/tables/EnhandedTableHead.tsx     (sic, "Enhanded")
components/tables/PaddedCell.tsx
components/tables/CustomPagination.tsx
components/tables/TableFilterToolbar.tsx
components/common/CustomTooltip.tsx
components/search/CustomersSearchInput.tsx
hooks/useSearchInputController.ts
hooks/useIsMobile.tsx
utils/paginationUtils.ts
utils/tableRenderHelpers.tsx
utils/tableStyleHelpers.ts
utils/searchCustomerRequestUtils.ts
types/uiInterfaces.ts                        (HeadCell, TableConfig, TableColumnConfig, ...)
constants.ts                                 (TABLE_*, PAGINATION_*, widths, radii, fonts)
theme/{index,variants,typography,breakpoints,components}.ts
pages/customers/sections/CustomerListTable.tsx
pages/customers/tableConfigs/customerListTableConfig.tsx
pages/customers/CustomerList.tsx
pages/lab/sections/PoolListTable.tsx
pages/lab/sections/PoolHistoryTable.tsx
pages/lab/components/BodyOfWaterSelectionModal.tsx
pages/lab/components/PoolTags.tsx
pages/lab/tableConfigs/{poolListTableConfig,poolHistoryTableConfig,bodyOfWaterTableConfig}.tsx
```

`Skimmer.Portal.Web` also contains copies of `EnhandedTableHead.tsx` and `TableFilterToolbar.tsx` with the same lineage. Once the library exists, it can replace both.
