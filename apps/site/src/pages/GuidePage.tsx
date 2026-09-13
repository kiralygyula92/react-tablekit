import { Link, useParams } from 'react-router';
import { useDocumentTitle } from '../layout/useDocumentTitle';
import { findGuide, GUIDES } from './guides/registry';
import { NotFoundPage } from './NotFoundPage';

/** `/docs/guides/:slug` — one guide, with links to the next and previous one. */
export function GuidePage() {
  const { slug } = useParams();
  const guide = findGuide(slug);
  useDocumentTitle(guide?.title);

  if (!guide) return <NotFoundPage />;
  const index = GUIDES.indexOf(guide);
  const previous = GUIDES[index - 1];
  const next = GUIDES[index + 1];

  return (
    <article className="site-prose">
      <h1>{guide.title}</h1>
      <p className="site-lead">{guide.lead}</p>
      {guide.body}
      <nav aria-label="Guides" className="guide-nav">
        {previous ? <Link to={`/docs/guides/${previous.slug}`}>← {previous.title}</Link> : <span />}
        {next && <Link to={`/docs/guides/${next.slug}`}>{next.title} →</Link>}
      </nav>
    </article>
  );
}
