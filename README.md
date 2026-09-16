# react-tablekit

A production-grade, headless-core React data table: client **and** server modes for every data
feature, replaceable slots, handler middleware and CSS-variable theming. Zero runtime dependencies.

> Status: **1.0.0 is prepared but not published.** Every milestone (M0–M7) is complete, the
> documentation site is built and deploy-ready, and `pnpm verify` is green; publishing to npm and
> pointing Vercel at this repository are the remaining steps.
> See `docs/10-roadmap-and-migration.md` for the plan and `docs/adr/` for the decisions taken
> along the way.

## Repository layout

| Path                      | What                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/react-tablekit` | The published library                                                                              |
| `apps/site`               | The documentation site: 84 prerendered pages, 53 live demos, playground and generated reference    |
| `docs/`                   | The specification (00–10), architecture decisions (`docs/adr`) and the docs standard (`docs/ppds`) |
| `api/`                    | The one serverless function: per-page social images                                                |

## Development

```sh
pnpm install
pnpm dev     # the site at http://localhost:5173, against the library source
```

`pnpm dev` generates what it needs first — the API reference from the library's TSDoc, the
content index, the machine surface and the redirect table — so a fresh checkout needs no setup
step. Editing a page under `apps/site/content/` hot-reloads; adding, renaming or deleting one
changes the route table, so restart the server.

```sh
pnpm test                       # unit and component tests (Vitest)
pnpm e2e                        # end-to-end (Playwright, Chromium)
pnpm --filter site e2e:visual   # the locked visual baselines
pnpm verify                     # every gate, in the order CI runs them
```

Playwright needs its browser once: `pnpm --filter site exec playwright install chromium`.

To look at exactly what deploys — prerendered HTML, the Markdown twins, `llms.txt` — build and
serve it:

```sh
pnpm --filter site build
pnpm --filter site preview      # http://localhost:4183
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Deploying the site

The site is a static build plus one edge function (`apps/site/api/og.tsx`, the social preview
images), configured entirely by `apps/site/vercel.json` — build command, output directory,
trailing-slash canonicalisation, cache headers and 133 permanent redirects generated from
`apps/site/content/react-tablekit/migration/url-map.csv`.

**The Vercel project's Root Directory must be `apps/site`.** Vercel reads `vercel.json` from that
directory and resolves every path in it against it; the function directory is discovered the
same way. The build command is then simply:

```sh
pnpm run build
```

run in `apps/site`. pnpm finds the workspace root two levels up and installs all of it; the site
aliases the library to its source and generates its own reference data, so nothing has to run
first. It produces `apps/site/dist`: an HTML document per route with its metadata in `<head>`,
the Markdown twin of every page, `llms.txt`, `sitemap.xml`, `robots.txt` and `changelog.xml`.

**One setting.** `VITE_SITE_ORIGIN` is the origin canonical URLs, social images and the machine
surface are built from. On Vercel it defaults to the project's own production domain, so a first
deployment is correct without configuring anything; set it explicitly once a custom domain is in
place.

```sh
pnpm --filter site conformance   # the 26 conformance checks, against the built site
pnpm --filter site exec node scripts/check-redirects.mjs   # every redirect, against a running server
```

## License

MIT — see [LICENSE](LICENSE).
