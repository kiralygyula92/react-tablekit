import { Link } from 'react-router';
import { pageByPath } from '../content/pages';
import { isGroup, nav, titleFor, type NavNode } from '../nav/nav';
import { Badge } from './Badge';

/**
 * The features index and the sidebar are rendered from the same nav data, so the two can never
 * disagree about what exists or how it is grouped (PPDS archetype C).
 */
export function FeaturesIndex({
  sectionPath = '/react-tablekit/features-group',
}: {
  sectionPath?: string;
}) {
  const section = nav.find((node) => node.pathname === sectionPath);
  const groups = (section?.children ?? []).filter((child) => isGroup(child));

  return (
    <>
      {groups.map((group: NavNode) => (
        <section key={group.pathname} aria-labelledby={`group-${group.pathname}`}>
          <h2 id={`group-${group.pathname}`}>{group.subheader}</h2>
          <ul className="site-feature-grid">
            {(group.children ?? []).map((page) => (
              <li key={page.pathname} className="site-card">
                <p className="site-card__title">
                  <Link to={page.pathname}>{titleFor(page.pathname)}</Link>
                  <Badge node={page} />
                </p>
                <p>{pageByPath.get(page.pathname)?.frontmatter.description ?? ''}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
