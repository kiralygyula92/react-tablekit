# Flow walkthroughs — PPDS v1.0 §9

Every required flow, walked by clicking rather than by typing a URL: a path that only works when
you already know the address is not a flow.

Each one is an automated test in `apps/site/e2e/flows.spec.ts`, so these paths are re-walked on
every run rather than checked once. `pnpm --filter site e2e` runs them.

The sidebar is collapsed to its nine sections with the current one open (D-12), so opening a
section is a step in the path rather than something the tests work around.

**7 of 8 flows complete. F6 is not applicable — see [EXCEPTIONS.md](../EXCEPTIONS.md) E-01.**

---

## F1 Evaluate — the root → install decision

| Step | Click                             | Lands on                        |
| ---- | --------------------------------- | ------------------------------- |
| 1    | Open `/`                          | 301 to `/react-tablekit/`       |
| 2    | Sidebar → **Features**            | The section opens               |
| 3    | Sidebar → **All features**        | `/react-tablekit/all-features/` |
| 4    | **Sorting** in the features index | `/react-tablekit/sorting/`      |

**Exit:** the Overview's "Start now" links lead to installation. There is no landing page in
front of the documentation (E-16) and nothing to buy (E-01), so the flow starts at the Overview
and ends at install rather than at purchase.

## F2 Adopt — overview → working installation

| Step | Click                                    | Lands on                                        |
| ---- | ---------------------------------------- | ----------------------------------------------- |
| 1    | Open `/react-tablekit/`                  | Overview                                        |
| 2    | Sidebar → **Installation**               | `/react-tablekit/getting-started/installation/` |
| 3    | Sidebar → **Quickstart**                 | `/react-tablekit/getting-started/quickstart/`   |
| 4    | Sidebar → **Features**, then **Columns** | `/react-tablekit/columns/`                      |

**Exit:** a working installation. The quickstart's example is asserted to be complete — it
contains `createColumnHelper` and no ellipsis, so it can be pasted rather than filled in.

## F3 Implement — search → copied working code

| Step | Click                                 | Lands on                                 |
| ---- | ------------------------------------- | ---------------------------------------- |
| 1    | Search (Ctrl+K), type `row selection` | Palette results                          |
| 2    | First result                          | `/react-tablekit/row-selection/`         |
| 3    | Demo toolbar → **Show source**        | The demo's own source, in place          |
| 4    | `## API` → **DataTableProps**         | `/react-tablekit/api/data-table-props/`  |
| 5    | The symbol's **Used by** line         | Back to the capability pages that use it |

**Exit:** copied working code. Step 5 is the generated reverse link, so the round trip needs no
hand-maintained "see also".

## F4 Customise — capability → customised instance

| Step | Click                                       | Lands on                                  |
| ---- | ------------------------------------------- | ----------------------------------------- |
| 1    | Open `/react-tablekit/sorting/`             | Sorting                                   |
| 2    | `## Customization` → **Handler middleware** | `/react-tablekit/customization/handlers/` |
| 3    | Sidebar → **Theming**                       | `/react-tablekit/customization/theming/`  |
| 4    | **Design tokens**                           | `/react-tablekit/customization/tokens/`   |

**Exit:** a customised instance. The theme editor at `/react-tablekit/demos/theme-editor/` hands
back the CSS or theme object to paste.

## F5 Upgrade — version selector → migrated project

| Step | Click                                            | Lands on                                    |
| ---- | ------------------------------------------------ | ------------------------------------------- |
| 1    | Any docs page                                    | The version selector is in the header       |
| 2    | Sidebar → **Getting started**, then **Versions** | `/react-tablekit/getting-started/versions/` |
| 3    | Sidebar → **Migration** twice                    | `/react-tablekit/migration/`                |
| 4    | Sidebar → **Discover more**, then **Changelog**  | `/react-tablekit/discover-more/changelog/`  |

**Exit:** a migrated project. The selector has one entry and there is no version to migrate from
yet (E-08, E-09); the path exists so that v2 needs no structural change.

## F6 Convert — not applicable

The library is MIT and single-tier. There is no badge to click, no tier explanation and nothing
to purchase, so there is no flow to walk. Recorded as **E-01**, **E-02** and **E-03**: the `plan`
field is on every nav node and the badge component exists, so introducing a tier is a data change
rather than a restructure.

## F7 Support — any docs page → a ticket or an answer

| Step | Click                                           | Lands on                                   |
| ---- | ----------------------------------------------- | ------------------------------------------ |
| 1    | Open any docs page                              | Sidebar carries **Getting started**        |
| 2    | Sidebar → **Getting started**, then **Support** | `/react-tablekit/getting-started/support/` |
| 3    | **Open an issue on GitHub**                     | The issue tracker                          |

**Exit:** a ticket. There is no paid channel, and the page says so rather than implying one.
Security reports have their own private route to GitHub's advisories.

## F8 Agent — `llms.txt` → complete corpus

| Step | Request                                | Returns                                               |
| ---- | -------------------------------------- | ----------------------------------------------------- |
| 1    | `GET /llms.txt`                        | 200, one entry per published page, grouped by section |
| 2    | `GET` the first listed entry           | 200, Markdown beginning with an H1                    |
| 3    | `GET /react-tablekit/sorting/index.md` | 200, the page including `## Limitations`              |

**Exit:** the complete corpus. Every page has a twin at its own URL plus `index.md`, which
conformance checks 16 and 17 assert for all 84 of them. The optional MCP endpoint is not shipped
(E-12).
