import { Link } from 'react-router';
import { pluginConfig } from '../nav/nav';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Products',
    links: [{ label: pluginConfig.name, href: '/react-tablekit/' }],
  },
  {
    title: 'Resources',
    links: [
      { label: 'All features', href: '/react-tablekit/all-features/' },
      { label: 'Customization', href: '/react-tablekit/customization/' },
      { label: 'Requirements', href: '/react-tablekit/getting-started/requirements/' },
      { label: 'Integrations', href: '/react-tablekit/integrations/' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Documentation', href: '/react-tablekit/' },
      { label: 'Demos', href: '/react-tablekit/demos/' },
      { label: 'API reference', href: '/react-tablekit/api/' },
      { label: 'Roadmap', href: '/react-tablekit/discover-more/roadmap/' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Support', href: '/react-tablekit/getting-started/support/' },
      { label: 'Changelog', href: '/react-tablekit/discover-more/changelog/' },
      { label: 'Versions', href: '/react-tablekit/getting-started/versions/' },
      { label: 'Licence (MIT)', href: '/react-tablekit/getting-started/faq/#licence' },
    ],
  },
];

/** The footer every page shares. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__columns">
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="site-footer__title">{column.title}</p>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link to={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="site-footer__end">
        <p>
          MIT licensed. {pluginConfig.name} v{pluginConfig.currentVersion}.
        </p>
        <a href={pluginConfig.repo} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href="/llms.txt">llms.txt</a>
      </div>
    </footer>
  );
}
