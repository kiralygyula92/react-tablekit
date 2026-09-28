import { pluginConfig } from '../nav/nav';

const SITE_ORIGIN: string =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ?? 'https://react-tablekit.vercel.app';

const HOME = `/${pluginConfig.id}/`;

/**
 * The whole metadata contract from one title and one description.
 *
 * React 19 hoists these tags into `<head>`, so no helmet-style library is needed and every tag
 * is present in the prerendered HTML rather than appearing only after hydration.
 */
export function PageMeta({
  title,
  description,
  pathname,
  type = 'article',
  noindex = false,
}: {
  title: string;
  description: string;
  pathname: string;
  type?: 'website' | 'article';
  /** Set on pages that must never appear in search results, such as the 404 page. */
  noindex?: boolean;
}) {
  // The front page is titled "Overview" in the sidebar, which says nothing in a tab, a search
  // result or a link preview; there the product's own name leads.
  const home = pathname === HOME;
  const full = home
    ? `${pluginConfig.name} · ${pluginConfig.shortTagline}`
    : `${title} · ${pluginConfig.name}`;
  const cardTitle = home ? pluginConfig.name : title;
  const url = `${SITE_ORIGIN}${pathname}`;
  // The trailing slash matters: the host adds one to every path, so `/api/og?…` answers with a
  // redirect, and several link previewers show no image at all rather than follow it.
  const ogImage = `${SITE_ORIGIN}/api/og/?title=${encodeURIComponent(cardTitle)}&description=${encodeURIComponent(description)}`;
  const imageAlt = `${cardTitle}: ${description}`;

  return (
    <>
      <title>{full}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={pluginConfig.name} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={imageAlt} />
    </>
  );
}
