import { SITE_THEMES, useSiteTheme, type SiteTheme } from '../theme/SiteTheme';

const LABELS: Record<SiteTheme, string> = { light: 'Light', dark: 'Dark', classic: 'Classic' };

/** Segmented light / dark / classic switch (radio-group semantics). */
export function ThemeToggle() {
  const { theme, setTheme } = useSiteTheme();
  return (
    <fieldset className="site-theme-toggle">
      <legend className="site-visually-hidden">Site theme</legend>
      {SITE_THEMES.map((t) => (
        <label key={t} className="site-theme-toggle__option" data-active={t === theme || undefined}>
          <input
            type="radio"
            name="site-theme"
            value={t}
            checked={t === theme}
            onChange={() => setTheme(t)}
          />
          {LABELS[t]}
        </label>
      ))}
    </fieldset>
  );
}
