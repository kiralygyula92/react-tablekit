import { useState, type ReactNode } from 'react';
import { classicTheme, lightTheme, type TableTheme } from 'react-tablekit';

/**
 * The theme switch shared by the showcase pages: the dense `classic` preset against the modern
 * `light` defaults, with the same configuration either way.
 *
 * A showcase is an application's own light screen whatever the documentation's appearance, so its
 * table is always given the light colour scheme. Left to follow the site, dark mode would put a
 * dark table on the light page around it.
 */
export function useShowcaseTheme(): {
  theme: TableTheme;
  colorScheme: 'light';
  toggle: ReactNode;
} {
  const [mode, setMode] = useState<'classic' | 'light'>('classic');
  const toggle = (
    <fieldset className="showcase-toggle">
      <legend>Theme</legend>
      {(['classic', 'light'] as const).map((m) => (
        <label key={m}>
          <input
            type="radio"
            name="showcase-theme"
            value={m}
            checked={mode === m}
            onChange={() => setMode(m)}
          />
          {m === 'classic' ? 'Classic (dense)' : 'Light (modern defaults)'}
        </label>
      ))}
    </fieldset>
  );
  return { theme: mode === 'classic' ? classicTheme : lightTheme, colorScheme: 'light', toggle };
}

/** An application-like page canvas, so the table is shown in the context it is used in. */
export function ShowcasePage({ children }: { children: ReactNode }) {
  return <div className="showcase-page">{children}</div>;
}
