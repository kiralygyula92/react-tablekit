import { useMemo, useState } from 'react';
import {
  createTheme,
  DataTable,
  presets,
  toCssVars,
  type TableTheme,
  type TokenPath,
} from 'react-tablekit';
import { tokenMeta } from 'react-tablekit/meta';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

type Overrides = Partial<Record<TokenPath, string>>;
type PresetName = keyof typeof presets;

const PREVIEW_ROWS = generatePeople(12);
const PRESET_NAMES = Object.keys(presets) as PresetName[];

/** Token groups come from the first segment of the path (`color.surface` → "color"). */
const GROUPS: { id: string; label: string }[] = [
  { id: 'color', label: 'Colour' },
  { id: 'header', label: 'Header' },
  { id: 'row', label: 'Rows' },
  { id: 'space', label: 'Spacing' },
  { id: 'radius', label: 'Shape' },
  { id: 'container', label: 'Container' },
  { id: 'pagination', label: 'Pagination' },
  { id: 'control', label: 'Controls' },
  { id: 'action', label: 'Action button' },
  { id: 'tooltip', label: 'Tooltip' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'pinned', label: 'Pinning' },
  { id: 'focus', label: 'Focus' },
  { id: 'font', label: 'Font' },
  { id: 'motion', label: 'Motion' },
  { id: 'z', label: 'Z-index' },
];

const isColour = (value: string) => /^#([0-9a-f]{3,8})$/i.test(value.trim());

/* ── contrast (05 §16) ────────────────────────────────────────────────── */

function luminance(hex: string): number | null {
  const raw = hex.trim().replace('#', '');
  if (raw.length !== 3 && raw.length !== 6 && raw.length !== 8) return null;
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.slice(0, 6);
  const channels = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255);
  if (channels.some((c) => Number.isNaN(c))) return null;
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** The text/background pairs that must reach WCAG AA. */
const PAIRS: { label: string; fg: TokenPath; bg: TokenPath }[] = [
  { label: 'Body text', fg: 'color.text', bg: 'color.surface' },
  { label: 'Muted text', fg: 'color.textMuted', bg: 'color.surface' },
  { label: 'Header', fg: 'header.color', bg: 'header.bg' },
  { label: 'Active page', fg: 'pagination.activeColor', bg: 'pagination.activeBg' },
  { label: 'Tooltip', fg: 'tooltip.color', bg: 'tooltip.bg' },
];

/** `/theme-editor`: edit the tokens live, check contrast, and export the result (08 §5). */
export function ThemeEditorPage() {
  const [base, setBase] = useState<PresetName>('light');
  const [overrides, setOverrides] = useState<Overrides>({});

  const theme = useMemo<TableTheme>(() => {
    const start = presets[base];
    if (Object.keys(overrides).length === 0) return start;
    // Rebuild the nested shape from the dotted paths.
    const patch: Record<string, Record<string, string>> = {};
    for (const [path, value] of Object.entries(overrides)) {
      const [group, key] = path.split('.');
      if (!group || !key) continue;
      patch[group] ??= {};
      patch[group][key] = value;
    }
    return createTheme(start, patch);
  }, [base, overrides]);

  const cssVars = useMemo(() => toCssVars(theme), [theme]);
  const current = (path: TokenPath) =>
    overrides[path] ?? tokenMeta.find((t) => t.path === path)?.values[base] ?? '';

  const set = (path: TokenPath, value: string) =>
    setOverrides((prev) => ({ ...prev, [path]: value }));

  const cssBlock = `:root {\n${Object.entries(cssVars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')}\n}`;
  const snippet = `import { createTheme, ${base}Theme } from 'react-tablekit';\n\nexport const myTheme = createTheme(${base}Theme, ${JSON.stringify(
    Object.entries(overrides).reduce<Record<string, Record<string, string>>>((acc, [path, v]) => {
      const [g, k] = path.split('.');
      if (g && k) (acc[g] ??= {})[k] = v;
      return acc;
    }, {}),
    null,
    2,
  )});`;

  const download = () => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'react-tablekit-theme.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="editor-controls">
        <label className="site-field">
          <span>Start from</span>
          <select value={base} onChange={(e) => setBase(e.target.value as PresetName)}>
            {PRESET_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setOverrides({})}>
          Reset changes
        </button>
        <button type="button" onClick={download}>
          Download JSON
        </button>
        <p className="site-muted">
          {Object.keys(overrides).length} token
          {Object.keys(overrides).length === 1 ? '' : 's'} changed
        </p>
      </div>

      <section aria-labelledby="contrast-title">
        <h2 id="contrast-title">Contrast</h2>
        <ul className="editor-contrast">
          {PAIRS.map((pair) => {
            const ratio = contrast(current(pair.fg), current(pair.bg));
            const pass = ratio !== null && ratio >= 4.5;
            return (
              <li key={pair.label}>
                <span>{pair.label}</span>
                <strong data-pass={pass || undefined}>
                  {ratio === null ? 'n/a' : `${ratio.toFixed(2)}:1 ${pass ? 'AA' : 'below AA'}`}
                </strong>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="preview-title">
        <h2 id="preview-title">Preview</h2>
        <div style={cssVars}>
          <DataTable<DemoPerson>
            aria-label="Theme preview"
            data={PREVIEW_ROWS}
            columns={peopleColumns}
            getRowId={(p) => p.id}
            theme={theme}
            enableRowSelection
            enableHiding
            enableDensityToggle
            initialState={{
              pagination: { pageIndex: 0, pageSize: 5 },
              columnPinning: { left: ['name'] },
            }}
          />
        </div>
      </section>

      <section aria-labelledby="tokens-title">
        <h2 id="tokens-title">Tokens</h2>
        {GROUPS.map((group) => {
          const tokens = tokenMeta.filter((t) => t.path.split('.')[0] === group.id);
          if (tokens.length === 0) return null;
          return (
            <details key={group.id} className="editor-group" open={group.id === 'color'}>
              <summary>
                {group.label} <span className="site-muted">({tokens.length})</span>
              </summary>
              <div className="editor-tokens">
                {tokens.map((token) => {
                  const value = current(token.path);
                  return (
                    <label key={token.path} className="editor-token">
                      <span className="editor-token__name">{token.path}</span>
                      <span className="editor-token__inputs">
                        {isColour(value) && (
                          <input
                            type="color"
                            aria-label={`${token.path} colour`}
                            value={value.slice(0, 7)}
                            onChange={(e) => set(token.path, e.target.value)}
                          />
                        )}
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => set(token.path, e.target.value)}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </section>

      <section aria-labelledby="export-title">
        <h2 id="export-title">Export</h2>
        <h3>createTheme()</h3>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (axe) */}
        <pre className="site-code" tabIndex={0}>
          <code>{snippet}</code>
        </pre>
        <h3>CSS variables</h3>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (axe) */}
        <pre className="site-code" tabIndex={0}>
          <code>{cssBlock}</code>
        </pre>
      </section>
    </>
  );
}
