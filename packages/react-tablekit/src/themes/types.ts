/** Named breakpoints (mobile-first). Classic defaults: xs 0, sm 600, md 960, lg 1280, xl 1440. */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Breakpoint → min-width in px. */
export type Breakpoints = Record<Breakpoint, number>;

/**
 * A value that can vary by breakpoint (mobile-first). `base` applies below the first listed
 * breakpoint; each key applies from that breakpoint upwards.
 *
 * @example `{ base: 'compact', md: 'numbered' }`
 */
export type ResponsiveValue<T> = T | { base?: T; xs?: T; sm?: T; md?: T; lg?: T; xl?: T };

/** Recursive partial, used for theme overrides. */
export type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

/**
 * Design tokens. Every leaf maps to one `--tk-*` CSS variable (see `tokenMeta` in
 * `react-tablekit/meta`). Values are CSS strings.
 */
export interface TableThemeTokens {
  font: {
    family: string;
    size: string;
    sizeSm: string;
    sizeXs: string;
    lineHeight: string;
    weightRegular: string;
    weightStrong: string;
    numeric: string;
  };
  color: {
    surface: string;
    surfaceMuted: string;
    surfaceRaised: string;
    surfaceSubtle: string;
    text: string;
    textMuted: string;
    textDisabled: string;
    textOnAccent: string;
    border: string;
    borderStrong: string;
    accent: string;
    accentSoft: string;
    accentBorder: string;
    danger: string;
    dangerSoft: string;
    dangerBorder: string;
    highlight: string;
  };
  header: {
    bg: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    textTransform: string;
    letterSpacing: string;
    sortIconIdleOpacity: string;
  };
  row: {
    bg: string;
    hoverBg: string;
    selectedBg: string;
    selectedHoverBg: string;
    stripedBg: string;
    disabledOpacity: string;
    divider: string;
  };
  space: {
    cellX: string;
    cellXSm: string;
    cellY: string;
    headerY: string;
    headerYSm: string;
    toolbarGap: string;
    toolbarY: string;
    treeIndent: string;
    stateY: string;
    densityCompact: string;
    densityComfortable: string;
  };
  radius: { container: string; control: string; chip: string };
  container: { border: string; shadow: string; minTableWidth: string };
  pinned: { shadowLeft: string; shadowRight: string };
  overlay: { bg: string; spinnerSize: string; spinnerColor: string };
  focus: { ring: string };
  control: { height: string; checkboxSize: string; checkboxBorder: string; searchWidth: string };
  action: { color: string; hoverBg: string; hoverBorder: string; radius: string; padding: string };
  tooltip: { bg: string; color: string; radius: string; padding: string; fontSize: string };
  pagination: {
    padding: string;
    navPadding: string;
    itemSize: string;
    compactItemSize: string;
    itemGap: string;
    itemRadius: string;
    itemPadding: string;
    itemColor: string;
    itemHoverBg: string;
    activeBg: string;
    activeColor: string;
    activeBorder: string;
    activeHoverBg: string;
    navBorder: string;
    navColor: string;
    navIcon: string;
    navHoverBorder: string;
    navHoverBg: string;
    navDisabledBorder: string;
    navDisabledColor: string;
    navDisabledIcon: string;
  };
  z: { pinned: string; header: string; pinnedHeader: string; overlay: string; popover: string };
  motion: { duration: string; easing: string };
}

/**
 * A complete theme: tokens + breakpoints + optional prop defaults applied by the preset
 * (e.g. the classic preset sets `loadingDisplay: 'text'`).
 */
export interface TableTheme extends TableThemeTokens {
  /** Preset name, rendered as `data-theme` on the root. */
  name: string;
  /** `'light'` or `'dark'`; rendered as `data-color-scheme`. */
  colorScheme: 'light' | 'dark';
  breakpoints: Breakpoints;
  /** Prop defaults a preset may set. Typed loosely here; `DataTable` validates known keys. */
  defaults?: Record<string, unknown>;
}

/** The theme after merging provider + props: always complete. */
export type ResolvedTableTheme = TableTheme;
