import { Link } from 'react-router';
import { pluginConfig } from '../nav/nav';
import { useNavDrawer } from './navDrawer';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Get started',
    links: [
      { label: 'Installation', href: '/react-tablekit/getting-started/installation/' },
      { label: 'Quickstart', href: '/react-tablekit/getting-started/quickstart/' },
      { label: 'Requirements', href: '/react-tablekit/getting-started/requirements/' },
      { label: 'FAQ', href: '/react-tablekit/getting-started/faq/' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'All features', href: '/react-tablekit/all-features/' },
      { label: 'Customization', href: '/react-tablekit/customization/' },
      { label: 'Guides', href: '/react-tablekit/guides/' },
      { label: 'Integrations', href: '/react-tablekit/integrations/' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Demos', href: '/react-tablekit/demos/' },
      { label: 'Playground', href: '/react-tablekit/demos/playground/' },
      { label: 'Theme editor', href: '/react-tablekit/demos/theme-editor/' },
      { label: 'API reference', href: '/react-tablekit/api/' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Support', href: '/react-tablekit/getting-started/support/' },
      { label: 'Changelog', href: '/react-tablekit/discover-more/changelog/' },
      { label: 'Roadmap', href: '/react-tablekit/discover-more/roadmap/' },
      { label: 'Licence (MIT)', href: `${pluginConfig.repo}/blob/main/LICENSE` },
    ],
  },
];

/** The footer every page shares. */
export function SiteFooter() {
  const drawer = useNavDrawer();
  return (
    <footer className="site-footer" inert={drawer?.open}>
      <div className="site-footer__columns">
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="site-footer__title">{column.title}</p>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith('/') ? (
                    <Link to={link.href}>{link.label}</Link>
                  ) : (
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  )}
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
