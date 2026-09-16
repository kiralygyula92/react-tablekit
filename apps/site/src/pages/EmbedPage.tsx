import { useParams } from 'react-router';
import { Demo } from '../components/Demo';

/**
 * A chrome-less demo for the width-preset iframes. Not a documentation page: it is excluded from
 * the sitemap and llms.txt, and carries noindex plus a canonical to the page that embeds it.
 */
export function EmbedPage() {
  const params = useParams();
  const id = params['*'] ?? '';
  return (
    <>
      <meta name="robots" content="noindex" />
      <main id="main" className="embed-main">
        <h1 className="site-visually-hidden">Embedded example</h1>
        <Demo id={id} label="Embedded example" />
      </main>
    </>
  );
}
