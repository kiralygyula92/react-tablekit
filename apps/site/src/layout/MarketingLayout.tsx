import { MDXProvider } from '@mdx-js/react';
import { Suspense } from 'react';
import { mdxComponents } from '../components/mdx';
import { componentFor, pageByPath } from '../content/pages';
import { PageMeta } from '../head/PageMeta';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** The marketing surface never renders docs chrome — no sidebar, no ToC (PPDS P1). */
export function MarketingPage({ pathname }: { pathname: string }) {
  const page = pageByPath.get(pathname);
  const Component = componentFor(pathname);
  if (!page || !Component) return null;
  const { frontmatter: fm } = page;
  return (
    <div className="site site--marketing">
      <a className="site-skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader surface="marketing" />
      <PageMeta title={fm.title} description={fm.description} pathname={pathname} type="website" />
      <main id="main" className="marketing-main" tabIndex={-1}>
        <MDXProvider components={mdxComponents}>
          <Suspense fallback={<p className="site-muted">Loading…</p>}>
            {/* eslint-disable-next-line react-hooks/static-components --
                a lookup, not a creation: every lazy component is built once at module scope, so
                its identity is stable and its state survives re-renders. */}
            <Component />
          </Suspense>
        </MDXProvider>
      </main>
      <SiteFooter />
    </div>
  );
}
