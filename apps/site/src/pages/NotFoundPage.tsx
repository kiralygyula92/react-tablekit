import { Link } from 'react-router';
import { useDocumentTitle } from '../layout/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Not found');
  return (
    <article className="site-prose">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to the home page</Link>
      </p>
    </article>
  );
}
