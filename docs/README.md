# react-tablekit: Specification

> **Audience:** an AI coding agent (or a developer) starting in a **fresh, empty repository**.
> **Goal:** build a production-grade, publishable React data-table library (working name **`react-tablekit`**) plus a **demo site** and an **API docs site**.

---

## 1. What this is

A complete specification for a standalone data-table library: headless-core plus styled
components, fully typed, themable, overridable at every level, and supporting **client-side and
server-side** operation for every data feature.

It exists because the same table logic — rendering, loading, pagination, sticky columns — tends to
be re-implemented per screen in application code, a few hundred lines at a time. This library
replaces that with one component whose every part can be swapped.

The documents specify the library, the demo app and the API docs site, plus testing, packaging and
release.

## 2. Reading order

| #   | File                             | What it gives you                                                                                                                                                                                                        |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00  | `README.md` (this file)          | Index, principles, the **agent kick-off prompt**                                                                                                                                                                       |
| 02  | `02-architecture.md`             | Package architecture, repo layout, tech stack, engine design, row-model pipeline, state model, performance rules                                                                                                        |
| 03  | `03-data-modes-client-server.md` | **Client vs. server vs. hybrid** operation for pagination, search, filtering, sorting, grouping, expansion and selection. Includes the `dataSource` adapter                                                             |
| 04  | `04-api-reference.md`            | Full TypeScript API: `<DataTable>` props, `ColumnDef`, state, instance API, hooks, utilities                                                                                                                            |
| 05  | `05-features.md`                 | Detailed behavioural spec of every feature (sorting, filtering, search, pagination, selection, expansion, collapsible rows, pinning/static columns, sizing, ordering, visibility, grouping, virtualization, editing, export, persistence, keyboard, a11y) |
| 06  | `06-customization-overrides.md`  | The override system: slots, slotProps, render props, row/cell/header overrides, handler middleware, function registries, icons, localization                                                                            |
| 07  | `07-theming-styling.md`          | Design tokens, CSS variables, presets (including the dense **`classic`** preset), dark mode, density, class names, data attributes, unstyled mode                                                                       |
| 08  | `08-demo-and-docs-site.md`       | Demo app and API docs site: routes, every example page, playground, mock server, doc generation                                                                                                                         |
| 09  | `09-quality-testing-release.md`  | Testing strategy, visual tests, a11y, performance budgets, CI, versioning, npm publishing                                                                                                                               |
| 10  | `10-roadmap-and-migration.md`    | Milestones with acceptance criteria and the Definition of Done                                                                                                                                                         |

Files 03, 04 and 06 are the most important. If anything conflicts, **04 (API reference)** is the
source of truth for names and signatures, and **05** is the source of truth for behaviour.

## 3. Non-negotiable principles

1. **Every data feature works in client mode and server mode.** This covers pagination, global
   search, column filters, sorting, grouping, row expansion (lazy children), selection ("select
   all" across pages) and faceting. Mode can be set per feature (see 03).
2. **Everything visible is overridable.** Every sub-component is a _slot_. Every slot accepts
   props, className and style overrides, and every interaction goes through an overridable
   _handler_ that can call the default behaviour (see 06).
3. **Headless first.** All logic lives in a framework-agnostic core. React components are a thin,
   replaceable rendering layer. A consumer can build a completely custom UI from the hooks alone.
4. **Zero runtime dependencies** besides `react` / `react-dom` (peer). No component framework, no
   CSS-in-JS runtime. Styling uses plain CSS with CSS custom properties inside a cascade layer.
5. **Strict TypeScript, generics everywhere.** No `any` in the public API.
   `ColumnDef<TData, TValue>` infers `TValue` from the accessor.
6. **Accessible by default.** Correct table/grid semantics, `aria-sort`, keyboard support, focus
   management, live-region announcements, reduced motion.
7. **Publishable.** ESM + CJS + `.d.ts`, subpath exports, tree-shakeable, SSR-safe, React 18 & 19,
   and documented bundle-size budgets.

## 4. Naming conventions (apply everywhere)

| Pattern                                      | Meaning                                                     | Example                                  |
| -------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| `enableX`                                    | Boolean feature flag (table or column level)                | `enableSorting`, `enableColumnPinning`   |
| `manualX`                                    | "Server handles X" (engine skips the computation)           | `manualPagination`, `manualFiltering`    |
| `xMode`                                      | Per-feature data mode shortcut: `'client' \| 'server'`      | `paginationMode`, `filterMode`           |
| `state.x` / `initialState.x` / `onXChange`   | Controlled / uncontrolled state slice                       | `state.sorting`, `onSortingChange`       |
| `renderX`                                    | Render prop returning `ReactNode`                           | `renderDetailPanel`, `renderRowActions`  |
| `getXProps`                                  | Prop getter returning HTML/React props                      | `getRowProps`, `getCellProps`            |
| `xFn` / `xFns`                               | Pluggable function / registry                               | `sortingFn`, `filterFns`                 |
| `slots.X` / `slotProps.X`                    | Component replacement / props for a slot                    | `slots.Pagination`, `slotProps.headerCell` |
| `handlers.onX`                               | Interaction middleware `(ctx, next) => void`                | `handlers.onSortToggle`                  |
| CSS class                                    | `tk-` prefix, BEM-ish                                       | `tk-table`, `tk-cell`, `tk-cell--pinned-right` |
| CSS variable                                 | `--tk-` prefix                                              | `--tk-color-border`                      |
| Data attribute                               | State hooks for CSS                                         | `data-sorted="asc"`, `data-selected`, `data-pinned="right"` |

## 5. Package name

The working name is **`react-tablekit`** (imports: `import { DataTable } from 'react-tablekit'`).
Before the first publish, check availability on npm. Fallbacks: `@<your-scope>/react-tablekit`,
`react-table-forge`, `tablekit-react`. Keep the name in **one** place (root `package.json` plus a
`PKG_NAME` constant in the docs site) so it's a one-line rename.

## 6. Agent kick-off prompt (copy-paste into the new repo's agent)

```
You are building "react-tablekit", a production-grade, headless-core React data-table
library published to npm, plus a demo site and an API-docs site, in this empty repository.

The complete specification is in /docs. Read README.md first, then 02–10 in order before
writing code. Treat 04-api-reference.md as the source of truth for names and signatures
and 05-features.md as the source of truth for behaviour.

Hard requirements:
- pnpm monorepo: packages/react-tablekit (the library) and apps/site (demo + API docs).
- TypeScript strict, React 18/19 peer deps, zero runtime deps, plain CSS + CSS variables
  inside @layer tablekit. ESM+CJS+d.ts via tsup. Subpath exports as specified.
- Every data feature (pagination, global search, column filters, sorting, grouping,
  expansion, selection, faceting) must work in client mode AND server mode (see 03).
- Every sub-component is a replaceable slot; every interaction goes through an
  overridable handler middleware (see 06).
- Ship the "classic" theme preset (a dense, compact look; see 07 §4) and the showcase
  demo pages (see 08 §3.1) running against the mock server.
- Follow the milestones in 10-roadmap-and-migration.md in order. At the end of each
  milestone, run lint, typecheck, unit tests, e2e tests and size-limit, and make sure they
  all pass before starting the next one.
- Write tests alongside code (Vitest + Testing Library; Playwright for e2e/visual; axe).

Start with Milestone 0 (scaffold). Report progress per milestone with the checklist
from 10-roadmap-and-migration.md.
```

## 7. Scope summary

**In scope for v1.0:** everything in 05 that is not marked _(v1.x)_.
**Marked _(v1.x)_:** inline editing, column virtualization, row drag-reordering, spreadsheet-style
cell range selection, an adapter package for a component framework. These are specified, but they
may ship after 1.0.
**Out of scope:** pivot tables, charts, and built-in data-fetching libraries. The `dataSource`
adapter is fetch-agnostic, so it works with `fetch`, `ky`, React Query or anything else.
