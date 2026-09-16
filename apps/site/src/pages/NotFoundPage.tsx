import { Link } from 'react-router';
import { PageMeta } from '../head/PageMeta';

export function NotFoundPage() {
  return (
    <article className="site-prose">
      <PageMeta
        title="Page not found"
        description="That page does not exist on this site."
        pathname="/404/"
        noindex
      />
      <h1>Page not found</h1>
      <p>
        The page you asked for is not here. It may have moved — try the{' '}
        <Link to="/react-tablekit/">documentation home</Link> or the{' '}
        <Link to="/react-tablekit/all-features/">feature index</Link>.
      </p>
    </article>
  );
}
