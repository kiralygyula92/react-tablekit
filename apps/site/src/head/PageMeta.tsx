import { pluginConfig } from '../nav/nav';

const SITE_ORIGIN: string =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ?? 'https://react-tablekit.vercel.app';

/**
 * The whole metadata contract (PPDS §7.6) from one title and one description (P10).
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
  const full =
    pathname === '/'
      ? `${pluginConfig.name} — ${pluginConfig.tagline}`
      : `${title} · ${pluginConfig.name}`;
  const url = `${SITE_ORIGIN}${pathname}`;
  const ogImage = `${SITE_ORIGIN}/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`;

  return (
    <>
      <title>{full}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={url} />}
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="search:language" content="en" />
      <meta name="search:version" content={pluginConfig.currentVersion} />
      <meta name="plugin:id" content={pluginConfig.id} />
      <meta name="plugin:categoryId" content={pluginConfig.categoryId ?? ''} />
    </>
  );
}
