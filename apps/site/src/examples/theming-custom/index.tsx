import { useState } from 'react';
import { createTheme, DataTable, lightTheme } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const data = generatePeople(40);

/** A brand theme: start from a preset and override only what differs (07 §5). */
const brand = createTheme(lightTheme, {
  color: { accent: '#7C3AED', surface: '#FDFCFF' },
  header: { bg: '#F3EEFF', color: '#3B2A63' },
  radius: { container: '12px' },
});

/**
 * Three ways to change the look (07 §5–§7):
 *
 * - `theme` with `createTheme` — typed, and the same object works in every table;
 * - a CSS class that sets the `--tk-*` variables — no JavaScript involved;
 * - `unstyled`, which drops the visual layer entirely and keeps the structure, so a
 *   utility framework or a design system can own every class.
 */
export default function ThemingCustomExample() {
  const [mode, setMode] = useState<'theme' | 'css' | 'unstyled'>('theme');

  return (
    <div className="example-stack">
      <div className="example-controls" role="radiogroup" aria-label="Styling approach">
        {(['theme', 'css', 'unstyled'] as const).map((value) => (
          <label key={value} className="site-field site-field--inline">
            <input
              type="radio"
              name="theming-custom-mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            <span>
              {value === 'theme' ? 'createTheme()' : value === 'css' ? 'CSS variables' : 'unstyled'}
            </span>
          </label>
        ))}
      </div>

      {/* The CSS variables below live in the site's stylesheet as `.demo-brand`. */}
      <div className={mode === 'css' ? 'demo-brand' : undefined}>
        <DataTable<DemoPerson>
          aria-label="People"
          data={data}
          columns={peopleColumns}
          getRowId={(p) => p.id}
          {...(mode === 'theme' ? { theme: brand } : {})}
          unstyled={mode === 'unstyled'}
          enableRowSelection
          initialState={{ pagination: { pageIndex: 0, pageSize: 6 } }}
        />
      </div>
    </div>
  );
}
