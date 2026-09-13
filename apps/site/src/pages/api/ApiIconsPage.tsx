import { defaultIcons } from 'react-tablekit';
import { iconNames } from 'react-tablekit/meta';
import { useDocumentTitle } from '../../layout/useDocumentTitle';

/** `/api/icons`: every built-in icon, previewed from the package's own icon set. */
export function ApiIconsPage() {
  useDocumentTitle('Icons');
  const icons = defaultIcons as unknown as Record<string, React.ComponentType>;

  return (
    <article className="site-prose site-prose--wide">
      <h1>Icons</h1>
      <p className="site-lead">
        Replace any icon through the <code>icons</code> prop — with an element, a component, or a
        string. Each one below is rendered from the package&apos;s default set.
      </p>
      <ul className="api-icon-grid">
        {iconNames.map((name) => {
          const Icon = icons[name];
          return (
            <li key={name} className="api-icon">
              <span className="api-icon__preview" aria-hidden="true">
                {Icon ? <Icon /> : null}
              </span>
              <code>{name}</code>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
