import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { Badge } from '../components/Badge';
import { isGroup, nav, pluginConfig, titleFor, type NavNode } from '../nav/nav';

/** The section a path belongs to, so the reader always opens inside the part they are reading. */
function sectionOf(pathname: string): string | undefined {
  const contains = (nodes: NavNode[]): boolean =>
    nodes.some((node) => node.pathname === pathname || (node.children && contains(node.children)));
  return nav.find((section) => contains(section.children ?? []))?.pathname;
}

/** One page, or a nested group rendered as a labelled block of pages. */
function SidebarNode({ node }: { node: NavNode }) {
  if (isGroup(node)) {
    return (
      <li className="site-sidebar__group">
        <p className="site-sidebar__subheader">{node.subheader}</p>
        <ul>
          {(node.children ?? []).map((child) => (
            <SidebarNode key={child.pathname} node={child} />
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li>
      <NavLink to={node.pathname} end className="site-sidebar__link">
        {titleFor(node.pathname)}
        <Badge node={node} />
      </NavLink>
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <SidebarNode key={child.pathname} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The documentation navigation: nine sections, one open at a time by default.
 *
 * A sidebar that lists all 83 pages at once is a wall rather than a map. Collapsing to the
 * sections and opening the one being read keeps the whole shape of the documentation visible —
 * the reader can see that Integrations exists without scrolling past every capability.
 *
 * Opening a second section does not close the first: a reader comparing two sections is a normal
 * thing to be doing, and an accordion would fight them.
 */
export function Sidebar({ pathname }: { pathname: string }) {
  const current = sectionOf(pathname);
  const [open, setOpen] = useState<readonly string[]>(() => (current ? [current] : []));

  // Arriving in another section opens it, without closing what the reader opened. This reacts to
  // the section *changing*, not to the open list: reacting to the list would re-open the current
  // section the instant the reader collapsed it, which is a section you could never close.
  const lastSection = useRef(current);
  useEffect(() => {
    if (current && current !== lastSection.current) {
      lastSection.current = current;
      setOpen((previous) => (previous.includes(current) ? previous : [...previous, current]));
    }
  }, [current]);

  return (
    <nav aria-label="Documentation" className="site-sidebar">
      <ul className="site-sidebar__sections">
        {nav.map((section) => {
          const id = section.pathname;
          const expanded = open.includes(id);
          return (
            <li key={id} className="site-sidebar__section">
              <button
                type="button"
                className="site-sidebar__section-toggle"
                aria-expanded={expanded}
                aria-controls={`section-${id}`}
                data-current={id === current || undefined}
                onClick={() =>
                  setOpen((previous) =>
                    previous.includes(id) ? previous.filter((p) => p !== id) : [...previous, id],
                  )
                }
              >
                {section.subheader}
              </button>
              <ul id={`section-${id}`} hidden={!expanded}>
                {(section.children ?? []).map((child) => (
                  <SidebarNode key={child.pathname} node={child} />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Where the reader is, as a trail: the namespace, then the section, then this page. */
export function Breadcrumbs({ pathname, title }: { pathname: string; title: string }) {
  const section = nav.find((s) => s.pathname === sectionOf(pathname));
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        <li>
          <NavLink to="/react-tablekit/">{pluginConfig.name}</NavLink>
        </li>
        {section && (
          <li aria-current={pathname === section.pathname ? 'page' : undefined}>
            {section.subheader}
          </li>
        )}
        <li className="site-visually-hidden" aria-current="page">
          {title}
        </li>
      </ol>
    </nav>
  );
}
