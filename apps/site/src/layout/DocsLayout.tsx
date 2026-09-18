import { MDXProvider } from '@mdx-js/react';
import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Badge } from '../components/Badge';
import { mdxComponents } from '../components/mdx';
import { componentFor, pageByPath } from '../content/pages';
import { PageMeta } from '../head/PageMeta';
import { orderedPages, pluginConfig, titleFor } from '../nav/nav';
import { Breadcrumbs, Sidebar } from './Sidebar';
import { TableOfContents } from './TableOfContents';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

const REPO_EDIT_BASE = `${pluginConfig.repo}/edit/main/apps/site/content`;

/** Prev/next follow sidebar order, which is the order a reader is expected to meet the pages. */
function PageNav({ pathname }: { pathname: string }) {
  const index = orderedPages.findIndex((p) => p.pathname === pathname);
  const previous = index > 0 ? orderedPages[index - 1] : undefined;
  const next = index >= 0 && index < orderedPages.length - 1 ? orderedPages[index + 1] : undefined;
  return (
    <nav aria-label="Pages" className="page-nav">
      {previous ? (
        <NavLink to={previous.pathname}>← {titleFor(previous.pathname)}</NavLink>
      ) : (
        <span />
      )}
      {next && <NavLink to={next.pathname}>{titleFor(next.pathname)} →</NavLink>}
    </nav>
  );
}

/** Edit-this-page and per-page feedback. Layout, never content. */
function FooterActions({ pathname, sourceFile }: { pathname: string; sourceFile: string }) {
  const feedback = `${pluginConfig.links?.issues ?? pluginConfig.repo}/new?title=${encodeURIComponent(
    `Docs feedback: ${pathname}`,
  )}&body=${encodeURIComponent(`Page: ${pathname}\n\nWhat was unclear or missing?`)}`;
  return (
    <div className="page-actions">
      <a href={`${REPO_EDIT_BASE}/${sourceFile}`} target="_blank" rel="noreferrer">
        Edit this page
      </a>
      <a href={feedback} target="_blank" rel="noreferrer">
        Was this page helpful?
      </a>
    </div>
  );
}

export function DocsPage({ pathname }: { pathname: string }) {
  const page = pageByPath.get(pathname);
  const Component = componentFor(pathname);
  const location = useLocation();
  if (!page || !Component) return null;

  const { frontmatter: fm, headings: toc } = page;
  const navNode = orderedPages.find((p) => p.pathname === pathname);

  return (
    <>
      <PageMeta title={fm.title} description={fm.description} pathname={pathname} />
      <div className={fm.wide ? 'docs-body docs-body--wide' : 'docs-body'}>
        <Sidebar pathname={pathname} />

        <main id="main" className="docs-main" tabIndex={-1} key={location.pathname}>
          <article className="site-prose">
            <header className="page-header">
              <Breadcrumbs pathname={pathname} title={fm.title} />
              <h1>
                {fm.title}
                {navNode && <Badge node={navNode} />}
              </h1>
              <p className="site-lead">{fm.description}</p>
              {fm.links && (
                <p className="resource-chips">
                  {fm.links.issues && (
                    <a href={fm.links.issues} target="_blank" rel="noreferrer">
                      Report an issue
                    </a>
                  )}
                  {fm.links.source && (
                    <a
                      href={`${pluginConfig.repo}/tree/main/${fm.links.source}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source
                    </a>
                  )}
                  {fm.links.spec && (
                    <a href={fm.links.spec} target="_blank" rel="noreferrer">
                      Standard
                    </a>
                  )}
                </p>
              )}
            </header>
            <MDXProvider components={mdxComponents}>
              <Suspense fallback={<p className="site-muted">Loading…</p>}>
                {/* eslint-disable-next-line react-hooks/static-components --
                    a lookup, not a creation: every lazy component is built once at module scope, so
                    its identity is stable and its state survives re-renders. */}
                <Component />
              </Suspense>
            </MDXProvider>
            <FooterActions pathname={pathname} sourceFile={page.file} />
            <PageNav pathname={pathname} />
          </article>
        </main>

        {!fm.wide && <TableOfContents headings={toc} />}
      </div>
    </>
  );
}

/** The chrome every documentation page shares; the page itself renders into the outlet. */
export function DocsLayout() {
  return (
    <div className="site">
      <a className="site-skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </div>
  );
}
