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
