import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { TableInstance } from '../core/types';
import type { TableFormatters, TableLocalization } from '../locales/types';
import type { DeepPartial, TableTheme } from '../themes/types';
import { mergeTableProps } from './options';
import type { DataTableProps, TableSlots } from './types';
import type { ResolvedView } from './view';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- provider defaults apply to tables of any row type
type AnyProps = Partial<DataTableProps<any>>;

/** App-wide defaults. Nested providers merge. */
export const DefaultsContext = createContext<AnyProps>({});
/** The table instance of the nearest `DataTable.Root`. */
export const TableContext = createContext<TableInstance<unknown> | null>(null);
/** Resolved view (slots, localization, theme, …) of the nearest `DataTable.Root`. */
export const ViewContext = createContext<ResolvedView | null>(null);

/**
 * App-wide defaults for every table (e.g. `theme`, `localization`, `icons`, `pagination`,
 * `slots`, `handlers`). Props always win over the provider; nested providers merge.
 *
 * @example
 * ```tsx
 * <TableDefaultsProvider value={{ theme: classicTheme, localization: useTablekitI18n() }}>
 *   <App />
 * </TableDefaultsProvider>
 * ```
 */
export function TableDefaultsProvider({
  value,
  children,
}: {
  value: AnyProps;
  children: ReactNode;
}) {
  const parent = useContext(DefaultsContext);
  const merged = useMemo(() => mergeTableProps<AnyProps>(parent, value), [parent, value]);
  return <DefaultsContext.Provider value={merged}>{children}</DefaultsContext.Provider>;
}

/** Theme tokens only (`theme`, `colorScheme`, `darkTheme`). */
export function TableThemeProvider({
  theme,
  colorScheme,
  darkTheme,
  children,
}: {
  theme?: TableTheme | DeepPartial<TableTheme>;
  colorScheme?: 'light' | 'dark' | 'auto';
  darkTheme?: TableTheme;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const v: AnyProps = {};
    if (theme) v.theme = theme;
    if (colorScheme) v.colorScheme = colorScheme;
    if (darkTheme) v.darkTheme = darkTheme;
    return v;
  }, [theme, colorScheme, darkTheme]);
  return <TableDefaultsProvider value={value}>{children}</TableDefaultsProvider>;
}

/** Strings and formatters only (wire i18next here once). */
export function TableLocaleProvider({
  localization,
  formatters,
  locale,
  children,
}: {
  localization?: Partial<TableLocalization>;
  formatters?: Partial<TableFormatters>;
  locale?: string;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const v: AnyProps = {};
    if (localization) v.localization = localization;
    if (formatters) v.formatters = formatters;
    if (locale) v.locale = locale;
    return v;
  }, [localization, formatters, locale]);
  return <TableDefaultsProvider value={value}>{children}</TableDefaultsProvider>;
}

/** The table instance inside slots and composable parts. */
export function useTableContext<TData = unknown>(): TableInstance<TData> {
  const table = useContext(TableContext);
  if (!table)
    throw new Error(
      '[react-tablekit] useTableContext must be used inside <DataTable> or <DataTable.Root>.',
    );
  return table as TableInstance<TData>;
}

/** The table from context, or an explicit one (composable parts accept `table`). */
export function useOptionalTable<TData>(table?: TableInstance<TData>): TableInstance<TData> {
  const ctx = useContext(TableContext);
  const resolved = table ?? (ctx as TableInstance<TData> | null);
  if (!resolved)
    throw new Error('[react-tablekit] Pass `table` or render inside <DataTable.Root>.');
  return resolved;
}

/** The resolved view (internal). */
export function useView(): ResolvedView {
  const view = useContext(ViewContext);
  if (!view)
    throw new Error(
      '[react-tablekit] This component must be rendered inside <DataTable> or <DataTable.Root>.',
    );
  return view;
}

/**
 * Inside a custom slot: the resolved slots plus the library defaults, so a replacement can
 * wrap the default.
 */
export function useTableSlots<TData = unknown>(): TableSlots<TData> & {
  defaults: TableSlots<TData>;
} {
  const view = useView();
  return { ...(view.slots as TableSlots<TData>), defaults: view.defaultSlots as TableSlots<TData> };
}
