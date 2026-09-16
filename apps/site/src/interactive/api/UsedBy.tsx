import { Link } from 'react-router';
import { pageByPath } from '../../content/pages';
import usedByData from '../../generated/content/used-by.json';

/**
 * Which pages cite each symbol, inverted at build time from their `symbols` frontmatter (PPDS
 * check 12). It is the only reverse link on the site that nobody has to remember to write.
 */
const usedBy = usedByData as Record<string, string[] | undefined>;

/** The pages that document this symbol in use. Renders nothing for an internal-only symbol. */
export function UsedBy({ symbol }: { symbol: string }) {
  const pages = usedBy[symbol] ?? [];
  if (pages.length === 0) return null;
  return (
    <p className="api-used-by">
      <span className="site-muted">Used by</span>{' '}
      {pages.map((pathname, index) => (
        <span key={pathname}>
          {index > 0 && ', '}
          <Link to={pathname}>{pageByPath.get(pathname)?.frontmatter.title ?? pathname}</Link>
        </span>
      ))}
    </p>
  );
}
