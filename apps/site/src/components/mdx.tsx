import type { MDXComponents } from 'mdx/types';
import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router';
import { Callout } from './Callout';
import { Demo } from './Demo';
import { FeaturesIndex } from './FeaturesIndex';
import { ApiReference, Playground, ThemeEditor } from './interactive';

/**
 * A site path with a file extension (`/llms-full.md`, `/react-tablekit/sorting/index.md`) is a
 * static file, not a route. It has to be a full document request: through the router it would
 * render the not-found page instead of the file.
 */
const isRoute = (href: string) =>
  href.startsWith('/') && !/\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0] ?? '');

/** Internal links go through the router; external ones open normally. */
function Anchor({ href = '', children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  if (isRoute(href)) {
    return (
      <Link to={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

/** A code block: scrollable, and therefore focusable so it can be reached by keyboard. */
function Pre(props: ComponentPropsWithoutRef<'pre'>) {
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be focusable
  return <pre {...props} className="site-code" tabIndex={0} />;
}

/**
 * A Markdown table. On a phone a table wider than the column scrolls inside its own box instead of
 * pushing the whole page sideways; only while it actually scrolls is the box a labelled, focusable
 * region, so a keyboard can scroll it and a wide screen gains no extra tab stop.
 */
function Table(props: ComponentPropsWithoutRef<'table'>) {
  const box = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={box}
      className="prose-table"
      {...(scrolls
        ? { role: 'region', 'aria-label': 'Table (scrolls sideways)', tabIndex: 0 }
        : {})}
    >
      <table {...props} />
    </div>
  );
}

/** Components available to every MDX page without an import. */
export const mdxComponents: MDXComponents = {
  a: Anchor,
  pre: Pre,
  table: Table,
  Demo,
  Callout,
  Playground,
  ThemeEditor,
  ApiReference,
  FeaturesIndex,
};
