import { defaultIcons } from 'react-tablekit';
import { iconNames } from 'react-tablekit/meta';
import { UsedBy } from './UsedBy';

/** `/api/icons`: every built-in icon, previewed from the package's own icon set. */
export function ApiIconsPage() {
  const icons = defaultIcons as unknown as Record<string, React.ComponentType>;

  return (
    <>
      <UsedBy symbol="TableIcons" />
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
    </>
  );
}
