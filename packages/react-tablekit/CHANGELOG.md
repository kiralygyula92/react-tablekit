# react-tablekit

## 1.0.0

The first stable release: a React data table with a framework-agnostic core and no runtime
dependencies. React and React DOM 18.2 or newer are peer dependencies; React 18 and 19 are both
supported, with ESM and CJS builds and type definitions for each.

- **Data:** sorting (multi-sort, natural and locale-aware comparators), global search with
  highlighting and diacritic folding, column filters with operators and facet counts, grouping
  with aggregation, expansion and tree data with lazily loaded children, and row selection with an
  exclusion model that works across server pages.
- **Client or server:** each of those runs in the browser or through a data source. REST data
  sources, cursor pagination and load-more are built in, and a hybrid mode keeps the client-side
  features local.
- **Columns:** typed accessors, formatting and fallbacks, pinning, resizing, reordering,
  visibility and a per-column actions menu.
- **Rendering:** row virtualization, a sticky header and footer, a mobile cards layout, CSV export
  (the page, everything or the selection, with chunked server export), and URL or `localStorage`
  persistence.
- **Accessibility:** real table semantics, the `grid` and `treegrid` roles when the state calls for
  them, the WAI-ARIA data-grid keyboard pattern and polite live-region announcements. A table wider
  than its container is a keyboard-reachable scroll region. Every string is localized; English,
  German, Spanish and Hungarian are included.
- **Customization:** props and CSS variables, five theme presets, a card or plain surface with
  rounded or square corners (`surface`, `rounded`), replaceable slots, handler middleware,
  `useDataTable` (the engine, rendering nothing) and `createTable` (no React at all).
- **Server rendering:** the first paint uses the breakpoint the client will hydrate into
  (`responsive.ssrBreakpoint`), so the layout does not shift on hydration.

The public API is the exported names plus the `tk-*` class names, the `--tk-*` variables, the
`data-*` attributes, and the slot, handler and localization key names. Changing or removing any of
them is a major change. Token values may change in a minor release, except in the `classic`
preset, whose values are frozen.
