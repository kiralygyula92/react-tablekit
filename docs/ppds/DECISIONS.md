# PPDS restructure — decisions

Answers to the four Phase 1 gate questions, plus the architectural choices they imply. Recorded here because the standard is explicit that slugs and taxonomy never change again (P2, R3) — the reasoning needs to outlive the decision.

Owner answers, 2026-09-16: (1) MIT, everything free for now. (2)(3)(4) delegated, with the instruction "whatever is best for a professionally made site", and the deployment target named as **Vercel**.

---

## D-01 — Single free tier. No pricing surface.

**Decision.** One tier, `id: free`, `badge: null`. PPDS archetype **D** (feature matrix) and **H** (pricing) are omitted, along with plan badges and flow **F6** (Convert). Conformance checks 13–15 are not applicable.

**Why.** The library is MIT and there is nothing to sell. Building a pricing page would mean inventing prices, and a feature matrix with one column carries no information.

**Consequence.** Recorded in `EXCEPTIONS.md` as deviations E-01…E-03. If a commercial tier ever appears, the tier vocabulary is already in `plugin.config.json` and the matrix can be added without moving any URL.

---

## D-02 — Adopt the `/react-tablekit/` namespace.

**Decision.** Docs live under `/react-tablekit/…` exactly as PPDS §3 specifies. The marketing surface keeps `/`. No extra capability prefix (`urlPrefix: ""`).

**Why.** The namespace looks redundant for a single product, and that is the strongest argument against it. Three reasons outweigh it:

1. **The standard exists for a portfolio.** Another plugin site is already in development on this machine (a "React PDF Viewer" preview server was occupying port 4173 during the Phase 1 crawl). The moment a second product shares this design system, an un-namespaced docs tree has to move — and P12 says URLs never move.
2. **It costs nothing today.** Nothing is deployed, so there are no external inbound links to preserve.
3. It keeps `/` free for a real marketing surface rather than mixing both surfaces at the root (P1).

**Consequence.** Every current docs URL changes. `migration/url-map.csv` carries the full mapping; Vercel serves the 301s.

---

## D-03 — Merge guides and examples into one capability page.

**Decision.** The 22 prose guides and the 46 demos collapse into **30 capability pages** at `/react-tablekit/{slug}/`, each following archetype B: demo first, then variations, recipes, customization, limitations, API.

**Why.** This is the central finding of Phase 1: today a capability is documented in two places that share no slug, one with prose and no demo (0 of 22 guides has a runnable demo) and one with a demo and almost no prose. Neither half is usable alone, and P4 ("runnable before explainable") is violated by every guide.

**Allocation.** 38 audited capabilities → 30 pages:

- 2 folded as variation axes of an existing page (sub-row cascade and range selection belong on Row selection, not on pages of their own).
- 5 move to the **Customization** section, which PPDS models as its own section rather than as features: theming, slots, handler middleware, row and cell overrides, cell building blocks.
- 1 moves to **Guides** (accessibility is a cross-cutting concern, not a toggle).
- 30 remain as feature pages, grouped with the portfolio vocabulary: Core features · Advanced features · Display & layout · Interaction · Automation · Developer tools.

The 3 end-to-end showcase demos become the **Demos** section (PPDS §5 №3) rather than capability pages, which is what they already are.

---

## D-04 — Markdown content with colocated demos.

**Decision.** Page content moves from TSX into `content/react-tablekit/**/index.md` with the frontmatter of PPDS §8.3, and each page's demos sit **next to it** (`demo-basics.tsx`, `demo-{variant}.tsx`) per §7.2.

**Why.** Four required deliverables are impossible without it: the `.md` twins (§7.7), `llms.txt` generated from real page content, the `symbols` frontmatter that drives both the `## API` block and the reverse `usedBy` list (§8.3), and the title/description pair that must feed H1 subtitle, meta and `llms.txt` from one field (P10). Today all 22 guides are JSX inside a single 1,000-line registry file, which cannot produce any of those.

**Consequence.** This is the largest single piece of work in the restructure and it is why Phase 3 is not cheap here. The 46 existing demo components are **kept as they are** and moved next to their page; only the prose is re-authored.

---

## D-05 — Keep React, add static prerendering. Deploy to Vercel. **Needs a spike.**

**Decision (provisional).** Stay on Vite + React Router 7, move to its framework mode with `prerender`, and deploy static output to Vercel. `vercel.json` carries the redirects and the trailing-slash canonicalisation (R4).

**Why not Astro/Starlight**, which would be the reflexive choice for a docs site: the differentiator of this product's documentation is 46 live React demos, a 151-control playground and a live theme editor. They are the reason to keep React at the centre. A rewrite would put the most valuable part of the site at risk to gain Markdown handling that a plugin already provides.

**Why not stay a pure SPA:** PPDS §7.8 wants content and navigation to render without JavaScript, §7.6 wants per-page canonical/OG metadata, and §7.7 wants Markdown twins. All three need prerendering. Today the served HTML is an empty root div and every one of the 134 pages shares a single meta description.

**Open risk.** React Router 7 framework mode on Vite 8 has not been verified in this repository. **Phase 3 opens with a timeboxed spike**: prerender three routes (a static page, a data-driven capability page, a demo-heavy page), confirm the demos still hydrate, and confirm `.md` resource routes work. If the spike fails, the fallback is a build-time prerender pass over the existing SPA — same outputs, more moving parts. This decision is not final until the spike passes.

---

## D-06 — Marketing surface: real, but nothing invented.

**Decision.** Build archetype G at `/` with hero, capability showcase, value pillars and a live demo. **Omit** the credibility strip, metrics block and testimonials.

**Why.** Operating rule 4 forbids inventing metrics or testimonials, and the project has no users, no downloads and no ratings to cite. An empty logo wall is worse than none.

**Consequence.** `EXCEPTIONS.md` E-04. These blocks become available the moment the package is published and has real numbers.

---

## D-07 — `/embed/{slug}` stays where it is.

**Decision.** The 46 chrome-less iframe targets keep their current paths, are excluded from the sitemap and `llms.txt`, and carry `noindex` plus a canonical pointing at their capability page.

**Why.** They are infrastructure for the width-preset previews, not documentation. Namespacing them would generate 46 redirects for URLs no human visits, and listing them would put 46 near-duplicates in front of crawlers and agents (Phase 1, G-37).

**Revised, Phase 6.** The demo ids changed when demos moved beside the pages they belong to:
`/embed/showcase-account-list` became `/embed/react-tablekit/demos/account-list/demo-basics`. The
46 legacy embed URLs therefore do move, and `migration/url-map.csv` now 301s each one to its new
id — the decision that they are infrastructure rather than documentation is unchanged, and they
are still excluded from the sitemap and from `llms.txt`.

---

## D-08 — Prerender the existing SPA rather than adopt a framework.

**Decision.** D-05 left this open pending a spike. The site keeps its own router and gains a
build-time prerender pass: `vite build` produces the client bundle, a second Vite SSR build
produces `entry-server.js`, and `scripts/prerender.mjs` renders all 84 routes to static HTML with
the metadata hoisted into `<head>`. The browser hydrates that HTML.

**Why.** React Router 7 framework mode would have restructured the whole application to obtain an
output the existing one can produce in about sixty lines. The prerender pass has no runtime
component: what ships is static HTML plus the same JavaScript.

**Consequence.** Three constraints follow, and all three are enforced in code:

1. **Page bodies must render synchronously on both sides.** `React.lazy` suspends on first
   render even for a module already in memory, so `content/pages.ts` keeps a `preloaded` map and
   both the prerender and the browser fill it before rendering. Without it the prerendered HTML
   would say "Loading…".
2. **Interactive, code-split surfaces must not render on the server.** A string render emits a
   Suspense fallback the server can never finish, which forces the browser to discard that
   subtree. Demos, the playground, the theme editor and the generated reference tables are behind
   `<ClientOnly>`; prose never is.
3. **The prerendered route is stamped on the container.** A host that falls back to `index.html`
   for an unknown URL would otherwise hand the home page's markup to another route. `main.tsx`
   hydrates only when the stamp matches, and client-renders otherwise.

**Also found by this.** Hydration is a correctness check that an SPA never runs: it caught a
`<p>` nested inside a `<p>` on the marketing landing, produced by a `<p className="…">` in MDX
whose content sat on its own line. Browsers reparse that, so the DOM never matched the tree.

---

## D-09 — Per-page social images from an edge function.

**Decision.** `og:image` points at `/api/og?title=…&description=…`, an edge function using
`@vercel/og`. Its two inputs are the page's own title and description — the same strings the
metadata, the navigation and `llms.txt` use (P10).

**Why.** 84 pages need 84 preview images or one generic one. Drawing them from the text that
already exists is the only version of this that stays correct as pages change.

**Consequence.** `@vercel/og` pulls in `sharp`, whose native build is declined in
`pnpm-workspace.yaml` — the edge runtime rasterizes with WASM and never loads it. The function is
the one part of the site that is not static; if it ever fails, previews degrade to no image and
nothing else changes.

---

## D-10 — The reference is generated from TSDoc, without a strings overlay.

**Decision.** PPDS §8.5 splits reference data into a generated `.schema.json` and a
human-edited `.strings.json`. This project generates both halves from one source: the prose is
the TSDoc in the library, read by TypeDoc.

**Why.** The split exists so that regeneration cannot destroy hand-written prose. Here there is
no hand-written prose to destroy — the description of a prop lives next to the prop, and moving
it into a strings file would create the second copy the standard is trying to prevent.

**Consequence.** `EXCEPTIONS.md` E-14. Check 10 is satisfied more strongly than by a checksum:
the generated tree is gitignored and rebuilt on every build, so there is no committed file for
anyone to hand-edit. The half of §8.4 that carries information the source cannot — `usedBy` — is
generated by inverting every page's `symbols` frontmatter, and check 12 fails if a reference page
ends up with nobody pointing at it.

---

## D-11 — One surface. The documentation is the site.

**Decision.** The marketing landing at `/` is removed and `/` 301s to `/react-tablekit/`. The
header is the product name, the version selector, search, the repository and the appearance
toggle. It carries no section links. This reverses **D-06**.

**Why.** Owner decision, 2026-09-16: _"there is no need for a home page, with a lot of links in
nav."_ The landing page was a second front door to the same 83 pages, and the two headers between
them listed the sections three times — in the marketing nav, in the footer and in the sidebar,
which is the only one generated from `nav.json`. Every duplicate was a place the navigation could
drift from the data.

**Consequence.** `EXCEPTIONS.md` E-16: PPDS §2.1 assumes two surfaces and archetype G describes a
landing page; neither applies to a site with one. The landing page's content is not lost —
what it said about client and server, replaceability, headless use and accessibility is the
Overview's job, and each claim already had a capability page behind it.

The footer still lists the sections, because a footer is a site map rather than navigation a
reader uses to move: it is the one duplicate that earns its place.

---

## D-12 — The layout follows the portfolio's reference site.

**Decision.** The chrome adopts the shape and palette already used by the sibling plugin site: a
slate-navy scale with a blue accent, a header of product / version / search / source /
appearance, a sidebar collapsed to its nine sections with the current one open, breadcrumbs above
the title, and a right rail that marks the heading being read.

**Why.** PPDS §12 exists so plugin sites differ only in data. A second site that looks like a
different product would defeat the standard on the first occasion it had to prove itself.

**Consequence.** Three things changed beyond colour:

1. **The sidebar collapses.** All 83 pages at once is a wall, not a map — a reader could not see
   that Integrations existed without scrolling past every capability. Opening a second section
   does not close the first, because comparing two sections is a normal thing to be doing.
2. **The site theme is light or dark.** `classic` was a _table_ preset masquerading as a site
   appearance. It stays where a reader is actually comparing presets: the theming page, the theme
   editor and the showcase demos.
3. **A page may ask for the full width** (`wide: true`). The playground and the theme editor show
   a wide thing, and 220px of table is worth more than a rail listing three headings.

---

## D-13 — The playground stacks: options above, table below.

**Decision.** The playground is a panel of options across the top and the table at full width
underneath, rather than a rail of controls beside a narrowed table.

**Why.** Owner instruction. The table is the thing being demonstrated: squeezed into what is left
beside a 340px column it cannot show column pinning, horizontal scroll or a wide column set —
which is most of what the props being toggled actually do.

**Consequence.** 151 prop controls would push the table off the screen, so the prop list scrolls
inside its own panel with the filter pinned to the top of it, and the six setup groups lay out
across the width instead of down a column.
