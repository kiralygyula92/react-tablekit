/**
 * react-tablekit/meta: runtime metadata consumed by the docs site (slot, handler, token,
 * localization-key and icon lists). Not part of the main bundle.
 *
 * Everything here is derived from the implementation itself, so the documentation can never drift
 * from the code: the lists are either read off the real registries or checked against their types
 * at compile time.
 *
 * @packageDocumentation
 */
import { defaultIcons } from './icons';
import { en } from './locales/en';
import { defaultSlots } from './react/slots';
import type { TableHandlers } from './react/types';
import { presets, TOKEN_VARS, type TokenPath } from './themes';

export { version } from './version';

/* ── slots ────────────────────────────────────────────────────────────── */

/** Every replaceable slot name, read from the default registry. */
export const slotNames: string[] = Object.keys(defaultSlots).sort();

/** One slot's metadata. */
export interface SlotMeta {
  name: string;
  /** The element the default implementation renders. */
  element: string;
}

/** The element each default slot renders, for the API pages. */
const SLOT_ELEMENTS: Record<string, string> = {
  Root: 'div',
  Container: 'div',
  Table: 'table',
  Head: 'thead',
  HeaderRow: 'tr',
  HeaderCell: 'th',
  Body: 'tbody',
  Row: 'tr',
  Cell: 'td',
  Foot: 'tfoot',
  FooterRow: 'tr',
  FooterCell: 'td',
  DetailRow: 'tr',
  DetailPanel: 'div',
  GroupRow: 'tr',
  GroupCell: 'td',
  FilterRow: 'tr',
  FilterRowCell: 'th',
  Toolbar: 'div',
  SelectionBar: 'div',
  Pagination: 'nav',
  LoadingRow: 'tr',
  SkeletonRows: 'tr',
  LoadingOverlay: 'div',
  EmptyState: 'tr',
  ErrorState: 'tr',
  ErrorBanner: 'div',
  ResizeHandle: 'span',
};

/** Slot metadata for the `/api/slots` page. */
export const slotMeta: SlotMeta[] = slotNames.map((name) => ({
  name,
  element: SLOT_ELEMENTS[name] ?? 'button',
}));

/* ── handlers ─────────────────────────────────────────────────────────── */

/**
 * Every handler name. The `satisfies` clause plus the exhaustiveness check below make this list a
 * compile error if a handler is added to `TableHandlers` and not documented here.
 */
export const handlerNames = [
  'onSortToggle',
  'onGlobalFilterInput',
  'onColumnFilterChange',
  'onClearFilters',
  'onPageChange',
  'onPageSizeChange',
  'onRowClick',
  'onRowDoubleClick',
  'onRowSelect',
  'onSelectAll',
  'onRowExpand',
  'onColumnResize',
  'onColumnMove',
  'onColumnPin',
  'onColumnHide',
  'onExport',
  'onRefresh',
  'onHotkey',
  'onCellActivate',
] as const satisfies readonly (keyof TableHandlers<unknown>)[];

/**
 * Resolves to `true` only while every handler in `TableHandlers` appears in `handlerNames`;
 * adding a handler without documenting it makes this type `never`, which fails the build.
 */
export type HandlerListIsComplete =
  Exclude<keyof TableHandlers<unknown>, (typeof handlerNames)[number]> extends never ? true : never;
const handlerListIsComplete: HandlerListIsComplete = true;
export { handlerListIsComplete };

/** Handler metadata for the `/api/handlers` page. */
export const handlerMeta: { name: string }[] = handlerNames.map((name) => ({ name }));

/* ── theme tokens ─────────────────────────────────────────────────────── */

/** One token: its path, CSS variable and value in each built-in preset. */
export interface TokenMeta {
  /** Dotted path in the theme object, e.g. `color.surface`. */
  path: TokenPath;
  /** The CSS variable it is written to, e.g. `--tk-color-surface`. */
  cssVar: string;
  /** The value in each built-in preset, keyed by preset name. */
  values: Record<string, string>;
}

const tokenValue = (theme: object, path: string): string => {
  const value = path
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], theme);
  // Tokens are strings or numbers; anything else has no place in a CSS variable.
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

/** Every token with its per-preset values, for the `/api/theme-tokens` page. */
export const tokenMeta: TokenMeta[] = (Object.entries(TOKEN_VARS) as [TokenPath, string][]).map(
  ([path, cssVar]) => ({
    path,
    cssVar,
    values: Object.fromEntries(
      Object.entries(presets).map(([name, theme]) => [name, tokenValue(theme, path)]),
    ),
  }),
);

/* ── localization ─────────────────────────────────────────────────────── */

/** Every localization key (nested groups flattened to `operators.contains` form). */
export const localeKeys: string[] = Object.entries(en)
  .flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? Object.keys(value as Record<string, unknown>).map((child) => `${key}.${child}`)
      : [key],
  )
  .sort();

/** Every localization key with its English default, for the `/api/localization` page. */
export const localeMeta: { key: string; english: string }[] = localeKeys.map((key) => {
  const [group, child] = key.split('.');
  const value = child
    ? (en as unknown as Record<string, Record<string, string>>)[group!]?.[child]
    : (en as unknown as Record<string, unknown>)[group!];
  // A `LocalizedString` is either a template or a function of the interpolation variables.
  return { key, english: typeof value === 'string' ? value : '(function)' };
});

/* ── icons ────────────────────────────────────────────────────────────── */

/** Every built-in icon name. */
export const iconNames: string[] = Object.keys(defaultIcons).sort();
