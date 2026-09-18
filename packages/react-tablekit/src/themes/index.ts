import type { DeepPartial, TableTheme, TableThemeTokens } from './types';

export type * from './types';

/**
 * Token path → CSS variable. The single source of truth for the token catalogue;
 * `tokenMeta` in `react-tablekit/meta` and the preset CSS files are derived from it.
 */
export const TOKEN_VARS = {
  'font.family': '--tk-font-family',
  'font.size': '--tk-font-size',
  'font.sizeSm': '--tk-font-size-sm',
  'font.sizeXs': '--tk-font-size-xs',
  'font.lineHeight': '--tk-line-height',
  'font.weightRegular': '--tk-font-weight',
  'font.weightStrong': '--tk-font-weight-strong',
  'font.numeric': '--tk-font-variant-numeric',
  'color.surface': '--tk-color-surface',
  'color.surfaceMuted': '--tk-color-surface-muted',
  'color.surfaceRaised': '--tk-color-surface-raised',
  'color.surfaceSubtle': '--tk-color-surface-subtle',
  'color.text': '--tk-color-text',
  'color.textMuted': '--tk-color-text-muted',
  'color.textDisabled': '--tk-color-text-disabled',
  'color.textOnAccent': '--tk-color-text-on-accent',
  'color.border': '--tk-color-border',
  'color.borderStrong': '--tk-color-border-strong',
  'color.accent': '--tk-color-accent',
  'color.accentSoft': '--tk-color-accent-soft',
  'color.accentBorder': '--tk-color-accent-border',
  'color.danger': '--tk-color-danger',
  'color.dangerSoft': '--tk-color-danger-soft',
  'color.dangerBorder': '--tk-color-danger-border',
  'color.highlight': '--tk-color-highlight',
  'header.bg': '--tk-header-bg',
  'header.color': '--tk-header-color',
  'header.fontSize': '--tk-header-font-size',
  'header.fontWeight': '--tk-header-font-weight',
  'header.textTransform': '--tk-header-text-transform',
  'header.letterSpacing': '--tk-header-letter-spacing',
  'header.sortIconIdleOpacity': '--tk-sort-icon-idle-opacity',
  'row.bg': '--tk-row-bg-default',
  'row.hoverBg': '--tk-row-hover-bg',
  'row.selectedBg': '--tk-row-selected-bg',
  'row.selectedHoverBg': '--tk-row-selected-hover-bg',
  'row.stripedBg': '--tk-row-striped-bg',
  'row.disabledOpacity': '--tk-row-disabled-opacity',
  'row.divider': '--tk-row-divider',
  'space.cellX': '--tk-cell-px',
  'space.cellXSm': '--tk-cell-px-sm',
  'space.cellY': '--tk-cell-py',
  'space.headerY': '--tk-header-py',
  'space.headerYSm': '--tk-header-py-sm',
  'space.toolbarGap': '--tk-toolbar-gap',
  'space.toolbarY': '--tk-toolbar-py',
  'space.treeIndent': '--tk-tree-indent',
  'space.stateY': '--tk-state-py',
  'space.densityCompact': '--tk-density-compact',
  'space.densityComfortable': '--tk-density-comfortable',
  'radius.container': '--tk-radius',
  'radius.control': '--tk-radius-sm',
  'radius.chip': '--tk-radius-chip',
  'container.border': '--tk-container-border',
  'container.shadow': '--tk-container-shadow',
  'container.minTableWidth': '--tk-table-min-width',
  'pinned.shadowLeft': '--tk-pinned-shadow-left',
  'pinned.shadowRight': '--tk-pinned-shadow-right',
  'overlay.bg': '--tk-overlay-bg',
  'overlay.spinnerSize': '--tk-spinner-size',
  'overlay.spinnerColor': '--tk-spinner-color',
  'focus.ring': '--tk-focus-ring',
  'control.height': '--tk-control-height',
  'control.checkboxSize': '--tk-checkbox-size',
  'control.checkboxBorder': '--tk-checkbox-border',
  'control.searchWidth': '--tk-search-width',
  'action.color': '--tk-action-color',
  'action.hoverBg': '--tk-action-hover-bg',
  'action.hoverBorder': '--tk-action-hover-border',
  'action.radius': '--tk-action-radius',
  'action.padding': '--tk-action-padding',
  'tooltip.bg': '--tk-tooltip-bg',
  'tooltip.color': '--tk-tooltip-color',
  'tooltip.radius': '--tk-tooltip-radius',
  'tooltip.padding': '--tk-tooltip-padding',
  'tooltip.fontSize': '--tk-tooltip-font-size',
  'pagination.padding': '--tk-pagination-padding',
  'pagination.navPadding': '--tk-page-nav-padding',
  'pagination.itemSize': '--tk-page-item-size',
  'pagination.compactItemSize': '--tk-page-item-size-compact',
  'pagination.itemGap': '--tk-page-item-gap',
  'pagination.itemRadius': '--tk-page-item-radius',
  'pagination.itemPadding': '--tk-page-item-padding',
  'pagination.itemColor': '--tk-page-item-color',
  'pagination.itemHoverBg': '--tk-page-item-hover-bg',
  'pagination.activeBg': '--tk-page-item-active-bg',
  'pagination.activeColor': '--tk-page-item-active-color',
  'pagination.activeBorder': '--tk-page-item-active-border',
  'pagination.activeHoverBg': '--tk-page-item-active-hover-bg',
  'pagination.navBorder': '--tk-page-nav-border',
  'pagination.navColor': '--tk-page-nav-color',
  'pagination.navIcon': '--tk-page-nav-icon',
  'pagination.navHoverBorder': '--tk-page-nav-hover-border',
  'pagination.navHoverBg': '--tk-page-nav-hover-bg',
  'pagination.navDisabledBorder': '--tk-page-nav-disabled-border',
  'pagination.navDisabledColor': '--tk-page-nav-disabled-color',
  'pagination.navDisabledIcon': '--tk-page-nav-disabled-icon',
  'z.pinned': '--tk-z-pinned',
  'z.header': '--tk-z-header',
  'z.pinnedHeader': '--tk-z-pinned-header',
  'z.overlay': '--tk-z-overlay',
  'z.popover': '--tk-z-popover',
  'motion.duration': '--tk-motion-duration',
  'motion.easing': '--tk-motion-easing',
} as const satisfies Record<string, `--tk-${string}`>;

/** A token path such as `'color.accent'`. */
export type TokenPath = keyof typeof TOKEN_VARS;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function deepMerge<T>(base: T, override: unknown): T {
  if (!isObject(override)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    out[key] = isObject(value) && isObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out as T;
}

/** Deep-merges overrides onto a base theme and returns a complete `TableTheme`. */
export function createTheme(base: TableTheme, ...overrides: DeepPartial<TableTheme>[]): TableTheme {
  return overrides.reduce<TableTheme>((acc, o) => deepMerge(acc, o), base);
}

/** Reads one token value by path. */
export function getToken(theme: TableThemeTokens, path: TokenPath): string {
  const [group, key] = path.split('.') as [keyof TableThemeTokens, string];
  return (theme[group] as Record<string, string>)[key] ?? '';
}

/** Tokens as CSS variables (for inline `style`, SSR or static CSS). */
export function toCssVars(theme: TableThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [path, cssVar] of Object.entries(TOKEN_VARS)) {
    vars[cssVar] = getToken(theme, path as TokenPath);
  }
  return vars;
}

/** The default preset: a neutral palette with hover, pinned shadows and richer defaults. */
export const lightTheme: TableTheme = {
  name: 'light',
  colorScheme: 'light',
  breakpoints: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1440 },
  font: {
    family: 'inherit',
    size: '14px',
    sizeSm: '0.875rem',
    sizeXs: '0.75rem',
    lineHeight: '1.5',
    weightRegular: '400',
    weightStrong: '600',
    numeric: 'tabular-nums',
  },
  color: {
    surface: '#FFFFFF',
    surfaceMuted: '#FAFAFA',
    surfaceRaised: '#FFFFFF',
    surfaceSubtle: '#F5F5F5',
    text: '#252B37',
    // #6B7079 is 4.77:1 on #FAFAFA (AA). Classic keeps #717680 (4.37:1), whose values are frozen.
    textMuted: '#6B7079',
    textDisabled: '#A4A7AE',
    textOnAccent: '#FFFFFF',
    border: '#E9EAEB',
    borderStrong: '#D5D7DA',
    accent: '#2196F3',
    accentSoft: '#369AE91A',
    accentBorder: '#2196F380',
    danger: '#F04438',
    dangerSoft: '#F044381A',
    dangerBorder: '#F0443880',
    highlight: '#FFF3BF',
  },
  header: {
    bg: 'var(--tk-color-surface-muted)',
    color: 'var(--tk-color-text-muted)',
    fontSize: 'var(--tk-font-size-sm)',
    fontWeight: '600',
    textTransform: 'none',
    letterSpacing: 'normal',
    sortIconIdleOpacity: '0.35',
  },
  row: {
    bg: 'var(--tk-color-surface)',
    hoverBg: '#F5F5F5',
    selectedBg: '#EAF6FF',
    selectedHoverBg: '#DDEFFD',
    stripedBg: '#FAFAFA',
    disabledOpacity: '0.5',
    divider: '1px solid var(--tk-color-border)',
  },
  space: {
    cellX: '20px',
    cellXSm: '12px',
    cellY: '12px',
    headerY: '8px',
    headerYSm: '12px',
    toolbarGap: '12px',
    toolbarY: '16px',
    treeIndent: '20px',
    stateY: '16px',
    densityCompact: '0.5',
    densityComfortable: '1.33',
  },
  radius: { container: '8px', control: '4px', chip: '16px' },
  container: { border: '1px solid var(--tk-color-border)', shadow: 'none', minTableWidth: 'auto' },
  pinned: {
    shadowLeft: '4px 0 6px -4px rgb(0 0 0 / 0.12)',
    shadowRight: '-4px 0 6px -4px rgb(0 0 0 / 0.12)',
  },
  overlay: {
    bg: 'rgb(255 255 255 / 0.7)',
    spinnerSize: '40px',
    spinnerColor: 'var(--tk-color-accent)',
  },
  focus: { ring: '0 0 0 2px var(--tk-color-surface), 0 0 0 4px var(--tk-color-accent)' },
  control: {
    height: '40px',
    checkboxSize: '22px',
    checkboxBorder: '#D5D7DA',
    searchWidth: '500px',
  },
  action: {
    color: 'var(--tk-color-accent)',
    hoverBg: 'var(--tk-color-accent-soft)',
    hoverBorder: 'var(--tk-color-accent-border)',
    radius: '4px',
    padding: '6px 4px',
  },
  tooltip: {
    bg: '#181D27',
    color: '#FFFFFF',
    radius: '8px',
    padding: '8px 12px',
    fontSize: '0.75rem',
  },
  pagination: {
    padding: '10px 20px',
    navPadding: '6px 12px',
    itemSize: '40px',
    compactItemSize: '26px',
    itemGap: '2px',
    itemRadius: '4px',
    itemPadding: '10px 16px',
    itemColor: '#717680',
    itemHoverBg: '#F5F5F5',
    activeBg: '#F5F5F5',
    activeColor: '#252B37',
    activeBorder: '#E9EAEB',
    activeHoverBg: '#D5D7DA',
    navBorder: '#D5D7DA',
    navColor: '#252B37',
    navIcon: '#A4A7AE',
    navHoverBorder: '#252B37',
    navHoverBg: '#F5F5F5',
    navDisabledBorder: '#E9EAEB',
    navDisabledColor: '#A4A7AE',
    navDisabledIcon: '#D5D7DA',
  },
  z: { pinned: '1', header: '2', pinnedHeader: '3', overlay: '10', popover: '1300' },
  motion: { duration: '200ms', easing: 'cubic-bezier(.2,0,0,1)' },
  defaults: {
    pagination: { pageSizeOptions: [10, 25, 50, 100], showRowRange: true },
  },
};

/**
 * `classic`: a dense, compact look. Values are frozen by the semver
 * policy.
 */
export const classicTheme: TableTheme = /* @__PURE__ */ createTheme(lightTheme, {
  name: 'classic',
  font: {
    family: '"Open Sans Variable", "Open Sans", Arial, sans-serif',
    size: '14px',
    lineHeight: '1.5',
  },
  color: { textMuted: '#717680' },
  header: { sortIconIdleOpacity: '0' },
  row: { hoverBg: 'transparent', selectedBg: '#EAF6FF', selectedHoverBg: '#EAF6FF' },
  pinned: { shadowLeft: 'none', shadowRight: 'none' },
  container: { minTableWidth: '650px', border: '1px solid #E9EAEB', shadow: 'none' },
  focus: { ring: '0 0 0 2px #FFFFFF, 0 0 0 4px #2196F3' },
  overlay: { bg: 'rgba(255,255,255,0.7)', spinnerSize: '40px', spinnerColor: '#2196F3' },
});
classicTheme.defaults = {
  renderFallbackValue: '-',
  loadingDisplay: 'text',
  loadingOverlayDelayMs: 0,
  enableHover: false,
  minWidth: 650,
  noWrap: true,
  firstColumnAsRowHeader: true,
  pagination: {
    variant: { base: 'compact', md: 'numbered' },
    showFirstLast: { base: true, md: false },
    showPrevNextLabels: { base: false, md: true },
    siblingCount: 1,
    boundaryCount: 2,
    pageItemsAlgorithm: 'classic',
    hideOnSinglePage: true,
    pageSizeOptions: false,
    showRowRange: false,
  },
  compactPagination: { siblingCount: 0, boundaryCount: 2 },
  searchMinLength: 3,
  searchDebounceMs: 300,
};

/** `dark`: AA-verified dark palette. */
export const darkTheme: TableTheme = /* @__PURE__ */ createTheme(lightTheme, {
  name: 'dark',
  colorScheme: 'dark',
  color: {
    surface: '#0F1115',
    surfaceMuted: '#161A20',
    surfaceRaised: '#1B2028',
    surfaceSubtle: '#1B2028',
    text: '#E6E8EB',
    textMuted: '#9AA1AC',
    textDisabled: '#6B7280',
    textOnAccent: '#0F1115',
    border: '#262B33',
    borderStrong: '#3A414C',
    accent: '#4DA3FF',
    accentSoft: '#4DA3FF26',
    accentBorder: '#4DA3FF80',
    danger: '#FF6B61',
    dangerSoft: '#FF6B6126',
    dangerBorder: '#FF6B6180',
    highlight: '#5C4A00',
  },
  row: {
    hoverBg: '#1B2028',
    selectedBg: '#13263B',
    selectedHoverBg: '#17304A',
    stripedBg: '#13161B',
  },
  pinned: {
    shadowLeft: '4px 0 6px -4px rgb(0 0 0 / 0.6)',
    shadowRight: '-4px 0 6px -4px rgb(0 0 0 / 0.6)',
  },
  overlay: { bg: 'rgb(15 17 21 / 0.6)' },
  control: { checkboxBorder: '#4B5563' },
  tooltip: { bg: '#E6E8EB', color: '#0F1115' },
  pagination: {
    itemColor: '#9AA1AC',
    itemHoverBg: '#1B2028',
    activeBg: '#1B2028',
    activeColor: '#E6E8EB',
    activeBorder: '#262B33',
    activeHoverBg: '#262B33',
    navBorder: '#3A414C',
    navColor: '#E6E8EB',
    navIcon: '#9AA1AC',
    navHoverBorder: '#E6E8EB',
    navHoverBg: '#1B2028',
    navDisabledBorder: '#262B33',
    navDisabledColor: '#6B7280',
    navDisabledIcon: '#4B5563',
  },
});

/** `compact`: dense by default, 13px font, 32px controls. */
export const compactTheme: TableTheme = /* @__PURE__ */ createTheme(lightTheme, {
  name: 'compact',
  font: { size: '13px' },
  space: {
    cellX: '12px',
    cellXSm: '8px',
    cellY: '6px',
    headerY: '6px',
    headerYSm: '6px',
    toolbarY: '8px',
  },
  control: { height: '32px', checkboxSize: '18px' },
  pagination: { itemSize: '32px', itemPadding: '6px 10px', padding: '6px 12px' },
});
compactTheme.defaults = { ...lightTheme.defaults, density: 'compact' };

/** `minimal`: no outer border, no header background, dividers only. */
export const minimalTheme: TableTheme = /* @__PURE__ */ createTheme(lightTheme, {
  name: 'minimal',
  header: { bg: 'transparent' },
  container: { border: 'none' },
  radius: { container: '0px' },
});

/** All built-in presets by name. */
export const presets = {
  light: lightTheme,
  classic: classicTheme,
  dark: darkTheme,
  compact: compactTheme,
  minimal: minimalTheme,
} as const;
