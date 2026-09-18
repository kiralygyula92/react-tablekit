import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router';
import { Callout } from './Callout';
import { Demo } from './Demo';
import { FeaturesIndex } from './FeaturesIndex';
import { ApiReference, Playground, ThemeEditor } from './interactive';

/** Internal links go through the router; external ones open normally. */
/**
 * A site path with a file extension (`/llms-full.md`, `/react-tablekit/sorting/index.md`) is a
 * static file, not a route. It has to be a full document request: through the router it would
 * render the not-found page instead of the file.
 */
const isRoute = (href: string) =>
  href.startsWith('/') && !/\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0] ?? '');

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

/** Components available to every MDX page without an import. */
export const mdxComponents: MDXComponents = {
  a: Anchor,
  pre: Pre,
  Demo,
  Callout,
  Playground,
  ThemeEditor,
  ApiReference,
  FeaturesIndex,
};
