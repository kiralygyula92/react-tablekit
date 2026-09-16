# Audit — reconciled capability list

Phase 1 artefact (`03-agent-implementation-brief.md` §1.3). One row per user-facing capability.

**How the evidence was gathered.** Every cell is computed, not asserted:

- **Code** — the listed identifiers were string-matched against `packages/react-tablekit/src/**`. `n/m` means n of m identifiers were found.
- **Guide / Example** — resolved against the live route data (`pages/guides/registry.tsx`, `src/examples/*/`), so a broken slug shows up as missing.
- **Controls** — number of generated playground controls whose prop path matches the capability (`src/generated/api/playground.json`).
- **Listing** — the nearest thing this project has to a marketplace listing: the published package README and its npm `keywords`. The package is **not published**, so there is no store listing to reconcile against (see `GAPS.md`, G-01).

**Totals.** 38 capabilities · 22 guides · 46 example demos · 151 playground controls · 34 generated API symbols.

| #   | Capability                         | Proposed group (PPDS §5) | Code | Guide                                                                                            | Example(s)                                                                                                                                                                                                           | Controls | Listing                 |
| --- | ---------------------------------- | ------------------------ | ---- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| 1   | Client / server data modes         | Core features            | 4/4  | [`client-vs-server`](/docs/guides/client-vs-server/), [`server-data`](/docs/guides/server-data/) | [`client-vs-server`](/examples/client-vs-server/), [`hybrid-mode`](/examples/hybrid-mode/), [`react-query-recipe`](/examples/react-query-recipe/)                                                                    | 1        | README: server mode     |
| 2   | Column definitions and types       | Core features            | 4/4  | [`columns`](/docs/guides/columns/)                                                               | [`basic`](/examples/basic/), [`column-types`](/examples/column-types/)                                                                                                                                               | 1        | README: Columns         |
| 3   | Sorting                            | Core features            | 4/4  | [`sorting`](/docs/guides/sorting/)                                                               | [`client-sorting`](/examples/client-sorting/), [`server-sorting`](/examples/server-sorting/)                                                                                                                         | 3        | keyword: sorting        |
| 4   | Global search                      | Core features            | 4/4  | [`search`](/docs/guides/search/)                                                                 | [`global-search`](/examples/global-search/)                                                                                                                                                                          | 4        | README: Data            |
| 5   | Column filters                     | Core features            | 4/4  | [`filtering`](/docs/guides/filtering/)                                                           | [`filters-panel`](/examples/filters-panel/), [`filters-row`](/examples/filters-row/), [`filters-popover-and-column-menu`](/examples/filters-popover-and-column-menu/), [`filters-server`](/examples/filters-server/) | 3        | keyword: filtering      |
| 6   | Faceted values and counts          | Core features            | 3/3  | **none**                                                                                         | [`filters-server`](/examples/filters-server/)                                                                                                                                                                        | 2        | -                       |
| 7   | Pagination                         | Core features            | 4/4  | [`pagination`](/docs/guides/pagination/)                                                         | [`pagination-variants`](/examples/pagination-variants/), [`cursor-pagination`](/examples/cursor-pagination/), [`infinite-scroll`](/examples/infinite-scroll/)                                                        | 3        | keyword: pagination     |
| 8   | Row selection                      | Core features            | 3/4  | [`selection`](/docs/guides/selection/)                                                           | [`row-selection`](/examples/row-selection/), [`showcase-asset-picker`](/examples/showcase-asset-picker/)                                                                                                             | 3        | README: Data            |
| 9   | Expansion and detail panels        | Core features            | 4/4  | [`expansion`](/docs/guides/expansion/)                                                           | [`detail-panels`](/examples/detail-panels/)                                                                                                                                                                          | 2        | README: Data            |
| 10  | Sub-row selection cascade          | Advanced features        | 1/1  | **none**                                                                                         | **none**                                                                                                                                                                                                             | 1        | -                       |
| 11  | Range selection                    | Advanced features        | 1/1  | **none**                                                                                         | [`row-selection`](/examples/row-selection/)                                                                                                                                                                          | 1        | -                       |
| 12  | Tree data and lazy children        | Advanced features        | 3/3  | **none**                                                                                         | [`tree-data`](/examples/tree-data/), [`tree-lazy-server`](/examples/tree-lazy-server/)                                                                                                                               | 1        | README: Data            |
| 13  | Grouping and aggregation           | Advanced features        | 3/3  | [`grouping`](/docs/guides/grouping/)                                                             | [`grouping-aggregation`](/examples/grouping-aggregation/)                                                                                                                                                            | 2        | README: Data            |
| 14  | Column pinning                     | Display & layout         | 3/3  | [`pinning`](/docs/guides/pinning/)                                                               | [`column-pinning`](/examples/column-pinning/)                                                                                                                                                                        | 1        | README: Columns         |
| 15  | Row pinning                        | Display & layout         | 3/3  | **none**                                                                                         | **none**                                                                                                                                                                                                             | 1        | -                       |
| 16  | Column sizing and resizing         | Display & layout         | 4/4  | [`sizing`](/docs/guides/sizing/)                                                                 | [`column-sizing`](/examples/column-sizing/)                                                                                                                                                                          | 2        | README: Columns         |
| 17  | Column ordering                    | Display & layout         | 3/3  | [`ordering-and-visibility`](/docs/guides/ordering-and-visibility/)                               | [`column-ordering-visibility`](/examples/column-ordering-visibility/)                                                                                                                                                | 1        | README: Columns         |
| 18  | Column visibility and actions menu | Display & layout         | 3/3  | [`ordering-and-visibility`](/docs/guides/ordering-and-visibility/)                               | [`column-features`](/examples/column-features/), [`column-ordering-visibility`](/examples/column-ordering-visibility/)                                                                                               | 2        | README: Columns         |
| 19  | Column footers and aggregates      | Display & layout         | 2/2  | **none**                                                                                         | [`sticky-header-footer`](/examples/sticky-header-footer/), [`grouping-aggregation`](/examples/grouping-aggregation/)                                                                                                 | 1        | -                       |
| 20  | Row numbers                        | Display & layout         | 2/2  | **none**                                                                                         | **none**                                                                                                                                                                                                             | 2        | -                       |
| 21  | Sticky header and footer           | Display & layout         | 3/3  | **none**                                                                                         | [`sticky-header-footer`](/examples/sticky-header-footer/)                                                                                                                                                            | 3        | README: Rendering       |
| 22  | Density                            | Display & layout         | 2/2  | **none**                                                                                         | [`density`](/examples/density/)                                                                                                                                                                                      | 1        | -                       |
| 23  | Zebra striping and hover           | Display & layout         | 2/2  | **none**                                                                                         | **none**                                                                                                                                                                                                             | 2        | -                       |
| 24  | Row virtualization                 | Display & layout         | 3/3  | [`virtualization`](/docs/guides/virtualization/)                                                 | [`virtualization-100k`](/examples/virtualization-100k/), [`infinite-scroll`](/examples/infinite-scroll/)                                                                                                             | 2        | keyword: virtualization |
| 25  | Responsive and cards layout        | Display & layout         | 4/4  | [`responsive`](/docs/guides/responsive/)                                                         | [`responsive-cards`](/examples/responsive-cards/)                                                                                                                                                                    | 1        | README: Rendering       |
| 26  | Loading, empty and error states    | Interaction              | 4/4  | **none**                                                                                         | [`states`](/examples/states/)                                                                                                                                                                                        | 2        | -                       |
| 27  | Toolbar and selection bar          | Interaction              | 4/4  | **none**                                                                                         | [`composable-layout`](/examples/composable-layout/)                                                                                                                                                                  | **0**    | -                       |
| 28  | Keyboard navigation                | Interaction              | 2/2  | [`keyboard`](/docs/guides/keyboard/)                                                             | [`keyboard-navigation`](/examples/keyboard-navigation/)                                                                                                                                                              | 1        | README: Accessibility   |
| 29  | Accessibility semantics            | Interaction              | 4/4  | [`accessibility`](/docs/guides/accessibility/)                                                   | **none**                                                                                                                                                                                                             | **0**    | README: Accessibility   |
| 30  | CSV export and clipboard           | Automation               | 4/4  | [`export`](/docs/guides/export/)                                                                 | [`export`](/examples/export/)                                                                                                                                                                                        | 2        | README: Rendering       |
| 31  | URL and storage persistence        | Automation               | 4/4  | [`persistence`](/docs/guides/persistence/)                                                       | [`url-sync`](/examples/url-sync/)                                                                                                                                                                                    | **0**    | README: Rendering       |
| 32  | Theming and design tokens          | Customization            | 5/5  | [`theming`](/docs/guides/theming/)                                                               | [`theming-presets`](/examples/theming-presets/), [`theming-custom`](/examples/theming-custom/)                                                                                                                       | 2        | README: Customization   |
| 33  | Slots and class overrides          | Customization            | 4/4  | [`customization`](/docs/guides/customization/)                                                   | [`slots-custom-components`](/examples/slots-custom-components/), [`slots-design-system`](/examples/slots-design-system/)                                                                                             | **0**    | README: Customization   |
| 34  | Handler middleware                 | Customization            | 3/3  | **none**                                                                                         | [`handlers-middleware`](/examples/handlers-middleware/)                                                                                                                                                              | **0**    | README: Customization   |
| 35  | Row and cell overrides             | Customization            | 4/4  | **none**                                                                                         | [`row-overrides`](/examples/row-overrides/)                                                                                                                                                                          | **0**    | -                       |
| 36  | Cell building blocks               | Customization            | 5/5  | **none**                                                                                         | [`cell-building-blocks`](/examples/cell-building-blocks/)                                                                                                                                                            | **0**    | -                       |
| 37  | Headless usage                     | Developer tools          | 3/3  | **none**                                                                                         | [`headless`](/examples/headless/), [`composable-layout`](/examples/composable-layout/)                                                                                                                               | **0**    | README: Customization   |
| 38  | Localization and formatters        | Developer tools          | 3/3  | [`localization`](/docs/guides/localization/)                                                     | [`localization`](/examples/localization/)                                                                                                                                                                            | **0**    | -                       |

## Reconciliation findings

### A. Implemented, but the site documents it nowhere

Shipped and reachable through the public API, with no guide and no demo. A user can only discover these by reading the generated API reference or by toggling a playground control.

- **Sub-row selection cascade** — `enableSubRowSelection`
- **Row pinning** — `enableRowPinning`, `RowPinningState`, `getTopRows`
- **Row numbers** — `enableRowNumbers`, `rowNumberMode`
- **Zebra striping and hover** — `enableStriped`, `enableHover`

### B. Implemented and demonstrated, but no written guide

12 capabilities have a runnable demo but no prose page, so there is nowhere that explains when or why to use them.

- **Faceted values and counts** — demo(s): [`filters-server`](/examples/filters-server/)
- **Range selection** — demo(s): [`row-selection`](/examples/row-selection/)
- **Tree data and lazy children** — demo(s): [`tree-data`](/examples/tree-data/), [`tree-lazy-server`](/examples/tree-lazy-server/)
- **Column footers and aggregates** — demo(s): [`sticky-header-footer`](/examples/sticky-header-footer/), [`grouping-aggregation`](/examples/grouping-aggregation/)
- **Sticky header and footer** — demo(s): [`sticky-header-footer`](/examples/sticky-header-footer/)
- **Density** — demo(s): [`density`](/examples/density/)
- **Loading, empty and error states** — demo(s): [`states`](/examples/states/)
- **Toolbar and selection bar** — demo(s): [`composable-layout`](/examples/composable-layout/)
- **Handler middleware** — demo(s): [`handlers-middleware`](/examples/handlers-middleware/)
- **Row and cell overrides** — demo(s): [`row-overrides`](/examples/row-overrides/)
- **Cell building blocks** — demo(s): [`cell-building-blocks`](/examples/cell-building-blocks/)
- **Headless usage** — demo(s): [`headless`](/examples/headless/), [`composable-layout`](/examples/composable-layout/)

### C. Explained in prose, but no runnable demo

Capabilities with neither are listed in A, not here.

- **Accessibility semantics** — guide: [`accessibility`](/docs/guides/accessibility/)

### D. Claimed by the site but absent from the library

These are documentation defects: the site names an API that does not exist.

- Row selection: source tokens not found in library: getSelectionPayload

### E. Pages not claimed by any capability

- Guides: none
- Examples: [`showcase-account-list`](/examples/showcase-account-list/), [`showcase-asset-list`](/examples/showcase-asset-list/), [`showcase-readings`](/examples/showcase-readings/) — end-to-end scenario demos rather than single capabilities; they map to PPDS §5 section 3 (Demos / Showcase), not to a capability page.

## Structural observation: capability content is split across two URL families

PPDS archetype B expects **one** capability page that opens with a runnable demo and then explains variations, customization, limitations and API. This site splits that in half:

- `/docs/guides/{slug}/` — prose and static code blocks, **no runnable demo**
- `/examples/{slug}/` — a runnable demo with source, **almost no prose**

The two families do not share slugs (`ordering-and-visibility` vs `column-ordering-visibility`, `search` vs `global-search`, `keyboard` vs `keyboard-navigation`), so neither is derivable from the other. Merging them is the central content decision for Phase 2.

## Source-of-truth for the generated reference (brief §1.5)

**Present and already wired.** TypeDoc emits `dist/api.json`; `apps/site/scripts/build-api.mjs` transforms it into per-page JSON plus a generated playground control set. Runtime metadata (`react-tablekit/meta`) supplies slots (65), handlers (19), tokens (104), locale keys (119) and icons (33). Phase 4 has a real extractor to build on rather than hand-written tables — with the caveats in `GAPS.md` (G-07, G-08).
