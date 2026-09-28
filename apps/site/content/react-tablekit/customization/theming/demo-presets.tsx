import { useState } from 'react';
import { DataTable, presets } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(40);
const PRESET_NAMES = Object.keys(presets) as (keyof typeof presets)[];
const SCHEMES = ['light', 'dark', 'auto'] as const;

/**
 * The five built-in presets. The preset supplies the token values; `colorScheme`
 * decides whether the light or the dark half of it is used; `'auto'` follows the OS.
 */
export default function ThemingPresetsExample() {
  const [preset, setPreset] = useState<keyof typeof presets>('light');
  const [scheme, setScheme] = useState<(typeof SCHEMES)[number]>('light');

  return (
    <div className="example-stack">
      <div className="example-controls">
        <label className="site-field">
          <span>Preset</span>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as keyof typeof presets)}
          >
            {PRESET_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="site-field">
          <span>Colour scheme</span>
          <select
            value={scheme}
            onChange={(e) => setScheme(e.target.value as (typeof SCHEMES)[number])}
          >
            {SCHEMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        theme={presets[preset]}
        colorScheme={scheme}
        enableRowSelection
        enableDensityToggle
        initialState={{ pagination: { pageIndex: 0, pageSize: 6 } }}
      />
    </div>
  );
}
