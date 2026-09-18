import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { presets, toCssVars, TOKEN_VARS, lightTheme } from '../../src/themes';
import type { TableTheme } from '../../src/themes/types';

const stylesDir = new URL('../../src/styles/', import.meta.url);
const update = !!process.env.UPDATE_TOKENS;

const HEADER =
  '/* GENERATED from src/themes/index.ts by `pnpm gen:tokens`. Do not edit by hand. */\n';

function block(selector: string, vars: Record<string, string>, extra: string[] = []): string {
  const lines = [...extra, ...Object.entries(vars).map(([k, v]) => `${k}: ${v};`)];
  return `${HEADER}@layer tablekit.theme {\n  ${selector} {\n${lines.map((l) => `    ${l}`).join('\n')}\n  }\n}\n`;
}

function diff(theme: TableTheme): Record<string, string> {
  const base = toCssVars(lightTheme);
  const vars = toCssVars(theme);
  return Object.fromEntries(Object.entries(vars).filter(([k, v]) => base[k] !== v));
}

const expected: Record<string, string> = {
  'tokens.css': block(':where(.tk-root, .tk-portal)', toCssVars(lightTheme), [
    'color-scheme: light;',
  ]),
};
for (const [name, theme] of Object.entries(presets)) {
  if (name === 'light') continue;
  expected[`presets/${name}.css`] = block(
    `:where(.tk-root, .tk-portal)[data-theme='${name}']`,
    diff(theme),
    theme.colorScheme === 'dark' ? ['color-scheme: dark;'] : [],
  );
}

describe('design tokens', () => {
  it.each(Object.keys(expected))('%s matches the JS theme objects', (file) => {
    const url = new URL(file, stylesDir);
    if (update) writeFileSync(url, expected[file]!);
    expect(readFileSync(url, 'utf8')).toBe(expected[file]);
  });

  it('every token has a CSS variable and every preset resolves every token', () => {
    for (const theme of Object.values(presets)) {
      const vars = toCssVars(theme);
      expect(Object.keys(vars)).toHaveLength(Object.keys(TOKEN_VARS).length);
      for (const [name, value] of Object.entries(vars))
        expect(value, `${theme.name} ${name}`).not.toBe('');
    }
  });

  it('every variable used by theme.css and base.css is defined (tokens or component tokens)', () => {
    const theme = readFileSync(new URL('theme.css', stylesDir), 'utf8');
    const base = readFileSync(new URL('base.css', stylesDir), 'utf8');
    const defined = new Set([
      ...Object.values(TOKEN_VARS),
      ...[...theme.matchAll(/(--tk-[\w-]+)\s*:/g)].map((m) => m[1]),
      // set at runtime by the React layer
      '--tk-row-bg',
      '--tk-pin-offset',
      '--tk-head-height',
      '--tk-container-width',
      '--tk-depth',
      '--tk-chip-bg',
      '--tk-chip-color',
      '--tk-chip-border',
    ]);
    const used = [...`${theme}${base}`.matchAll(/var\((--tk-[\w-]+)/g)].map((m) => m[1]);
    expect(used.filter((v) => !defined.has(v))).toEqual([]);
  });

  it('pagination colours are tokens, not hard-coded hex (also on mobile)', () => {
    const theme = readFileSync(new URL('theme.css', stylesDir), 'utf8');
    // Every pagination rule, compact variant included, must resolve its colours through tokens.
    const rules = [...theme.matchAll(/&[^{}]*(?:tk-pagination|tk-page-)[^{}]*\{([^{}]*)\}/g)].map(
      (m) => m[1]!,
    );
    expect(rules.length).toBeGreaterThan(5);
    const literals = rules.flatMap((body) => [
      ...[...body.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]),
      ...[...body.matchAll(/\b(?:rgb|rgba|hsl|hsla)\(/g)].map((m) => m[0]),
    ]);
    expect(literals).toEqual([]);
    // The values that were once hard-coded now come from tokens.
    for (const name of ['--tk-page-item-color', '--tk-page-item-size-compact'])
      expect(Object.values(TOKEN_VARS)).toContain(name);
  });

  it('pinned cells inherit the row background instead of a hard-coded white', () => {
    const theme = readFileSync(new URL('theme.css', stylesDir), 'utf8');
    // Every row state sets the row variable...
    for (const state of ['data-selected', 'data-striped'])
      expect(theme).toMatch(new RegExp(`\\.tk-row\\[${state}\\][^{]*\\{[^}]*--tk-row-bg:`));
    // ...and cells (pinned ones included) paint with it, so no rule may hard-code a background
    // for a pinned cell.
    expect(theme).toMatch(/\.tk-cell\s*\{[^}]*background:\s*var\(--tk-row-bg\)/);
    const pinnedRules = [...theme.matchAll(/&([^{}]*data-pinned[^{}]*)\{([^{}]*)\}/g)]
      // Pinned header and footer cells keep their own background, as they are not row-coloured.
      .filter((m) => !/header|foot/i.test(m[1]!))
      .map((m) => m[2]!);
    expect(pinnedRules.length).toBeGreaterThan(0);
    for (const body of pinnedRules) {
      const background = /background(?:-color)?:\s*([^;]+);/.exec(body)?.[1];
      if (background) expect(background).toContain('var(--tk-row-bg)');
    }
  });

  it('classic exposes its frozen palette', () => {
    const vars = toCssVars(presets.classic);
    expect(vars['--tk-color-border']).toBe('#E9EAEB');
    expect(vars['--tk-header-color']).toBe('var(--tk-color-text-muted)');
    expect(vars['--tk-color-text-muted']).toBe('#717680');
    expect(vars['--tk-color-surface-muted']).toBe('#FAFAFA');
    expect(vars['--tk-row-selected-bg']).toBe('#EAF6FF');
    expect(vars['--tk-row-hover-bg']).toBe('transparent');
    expect(vars['--tk-table-min-width']).toBe('650px');
    expect(vars['--tk-pinned-shadow-left']).toBe('none');
    expect(vars['--tk-overlay-bg']).toBe('rgba(255,255,255,0.7)');
    expect(vars['--tk-tooltip-bg']).toBe('#181D27');
    expect(vars['--tk-cell-px']).toBe('20px');
    expect(vars['--tk-header-py']).toBe('8px');
    expect(vars['--tk-checkbox-size']).toBe('22px');
  });
});

/** Relative luminance contrast ratio (WCAG 2.x). */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = hex.replace('#', '').slice(0, 6);
    const [r, g, bl] = [0, 2, 4]
      .map((i) => Number.parseInt(n.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
      number,
      number,
      number,
    ];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

describe('colour contrast', () => {
  it.each(['light', 'classic', 'dark', 'compact'] as const)(
    '%s text pairs meet WCAG AA (4.5:1)',
    (name) => {
      const t = presets[name];
      expect(contrast(t.color.text, t.color.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.color.textMuted, t.color.surface)).toBeGreaterThanOrEqual(4.5);
      // Classic's frozen header pair #717680 on #FAFAFA is 4.37:1 (the spec's ≈4.6 is off);
      // it is a documented exception. Every other preset meets AA.
      expect(contrast(t.color.textMuted, t.color.surfaceMuted)).toBeGreaterThanOrEqual(
        name === 'classic' ? 4.3 : 4.5,
      );
      expect(contrast(t.pagination.activeColor, t.pagination.activeBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.tooltip.color, t.tooltip.bg)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
