import { useContext, useId, useMemo, type CSSProperties } from 'react';
import { isAtLeast, resolveResponsive } from '../core/responsive';
import type { Breakpoint, ResponsiveValue, TableInstance } from '../core/types';
import { defaultIcons, type TableIcons } from '../icons';
import type { TableFormatters, TableLocalization } from '../locales/types';
import { createTheme, darkTheme as darkPreset, lightTheme, toCssVars } from '../themes';
import type { DeepPartial, TableTheme } from '../themes/types';
import { DefaultsContext } from './context';
import {
  createTranslate,
  defaultFormatters,
  mergeLocalization,
  type Translate,
} from './localization';
import { mergeTableProps, runHandler } from './options';
import { defaultSlots } from './slots';
import type {
  CompactPaginationOptions,
  DataTableProps,
  DataTableViewProps,
  HandlerContexts,
  PaginationDisplayOptions,
  PaginationVariant,
  SlotName,
  SlotPropsMap,
  TableSlots,
} from './types';
import { mergeProps } from './utils';

type AnyView = DataTableViewProps<unknown>;

/** Library view defaults (04 §2). Presets and providers layer on top. */
export const VIEW_DEFAULTS: AnyView = {
  layout: 'table',
  tableLayout: 'auto',
  surface: 'card',
  firstColumnAsRowHeader: true,
  noWrap: true,
  loadingDisplay: 'skeleton',
  loadingOverlayBlocksInteraction: true,
  disablePaginationWhileFetching: true,
  loadingOverlayDelayMs: 150,
  enableHover: true,
  filterDisplayMode: 'panel',
  showActiveFilterChips: true,
  filterApplyMode: 'instant',
  multiSelectDisplay: 'list',
  showFacetCounts: true,
  scrollToTopOnPageChange: true,
  enableRangeSelection: true,
  positionActionsColumn: 'last',
  positionExpandColumn: 'first',
  positionSelectionColumn: 'first',
  enableRowVirtualization: 'auto',
  virtualizationThreshold: 200,
  overscan: 8,
  rowNumberMode: 'absolute',
  exportMode: 'page',
  detailPanelProps: { lazy: true, keepMounted: false, animate: true, fullWidth: true },
  pagination: {
    variant: { base: 'compact', md: 'numbered' },
    position: 'bottom',
    pageSizeOptions: false,
    showRowRange: false,
    showFirstLast: { base: true, md: false },
    showPrevNextLabels: { base: false, md: true },
    siblingCount: 1,
    boundaryCount: 2,
    pageItemsAlgorithm: 'classic',
    hideOnSinglePage: true,
    align: 'space-between',
  },
  compactPagination: { siblingCount: 0, boundaryCount: 2, pageItemsAlgorithm: 'stable' },
};

/** Pagination display options resolved for the current breakpoint. */
export interface ResolvedPagination {
  variant: PaginationVariant;
  position: 'bottom' | 'top' | 'both';
  pageSizeOptions: number[] | false;
  showRowRange: boolean;
  showFirstLast: boolean;
  showPrevNextLabels: boolean;
  siblingCount: number;
  boundaryCount: number;
  pageItemsAlgorithm: PaginationDisplayOptions['pageItemsAlgorithm'];
  hideOnSinglePage: boolean;
  align: NonNullable<PaginationDisplayOptions['align']>;
  compact: Required<CompactPaginationOptions>;
}

/** Everything slots and parts need, resolved once per render of `DataTable.Root`. */
export interface ResolvedView {
  table: TableInstance<unknown>;
  /** View props with defaults applied (engine options are on `table.options`). */
  props: AnyView & Record<string, unknown>;
  theme: TableTheme;
  /** Inline CSS variables when a JS theme is active. */
  cssVars: Record<string, string> | undefined;
  colorScheme: 'light' | 'dark';
  breakpoint: Breakpoint;
  isMobile: boolean;
  slots: TableSlots<unknown>;
  defaultSlots: TableSlots<unknown>;
  icons: TableIcons;
  /** The merged localization (for records like `operators` and `datePresets`). */
  localization: TableLocalization;
  t: Translate;
  formatters: TableFormatters;
  locale: string;
  id: string;
  pagination: ResolvedPagination;
  /** Merges `classNames` / `styles` / `slotProps` for a slot into the computed base props. */
  slot<K extends SlotName>(
    name: K,
    ctx: Record<string, unknown>,
    base: Record<string, unknown>,
  ): Record<string, unknown>;
  /** Runs a handler middleware around the default behaviour. */
  handle<K extends keyof HandlerContexts<unknown>>(
    name: K,
    ctx: HandlerContexts<unknown>[K],
    impl: (ctx: HandlerContexts<unknown>[K]) => void | Promise<void>,
  ): void | Promise<void>;
  /** Polite live-region announcement. */
  announce(message: string): void;
}

/** Resolves the effective theme from props / provider and the colour scheme (07 §2, §5). */
export function resolveTheme(
  themeProp: TableTheme | DeepPartial<TableTheme> | undefined,
  providerTheme: TableTheme | DeepPartial<TableTheme> | undefined,
  scheme: 'light' | 'dark',
  darkThemeProp: TableTheme | undefined,
): TableTheme {
  const base = providerTheme ? createTheme(lightTheme, providerTheme) : lightTheme;
  const themed = themeProp ? createTheme(base, themeProp) : base;
  if (scheme === 'dark' && themed.colorScheme !== 'dark') return darkThemeProp ?? darkPreset;
  return themed;
}

const keyOf = (name: string) => (name.charAt(0).toLowerCase() + name.slice(1)) as keyof AnyView;

const resolveSlotValue = (value: unknown, ctx: unknown): unknown =>
  typeof value === 'function' ? (value as (c: unknown) => unknown)(ctx) : value;

/** Builds the resolved view for a table and the props of `DataTable.Root`. */
export function useResolvedView(
  table: TableInstance<unknown>,
  rootProps: AnyView,
  announce: (message: string) => void,
): ResolvedView {
  const provider = useContext(DefaultsContext) as AnyView;
  const reactId = useId();
  const options = table.options as unknown as AnyView & { _viewMerged?: boolean; locale: string };
  const renderContext = table.options._renderContext;
  const breakpoint = renderContext?.breakpoint ?? 'lg';

  const theme = useMemo(() => {
    if (rootProps.theme) {
      return resolveTheme(
        rootProps.theme,
        provider.theme,
        rootProps.colorScheme === 'dark' ? 'dark' : 'light',
        rootProps.darkTheme,
      );
    }
    return renderContext?.theme ?? resolveTheme(undefined, provider.theme, 'light', undefined);
  }, [
    rootProps.theme,
    rootProps.colorScheme,
    rootProps.darkTheme,
    provider.theme,
    renderContext?.theme,
  ]);

  const merged = useMemo(
    () =>
      mergeTableProps<AnyView>(
        VIEW_DEFAULTS,
        ...(options._viewMerged ? [] : [theme.defaults as AnyView | undefined, provider]),
        options,
        rootProps,
      ) as AnyView & Record<string, unknown>,
    [options, rootProps, provider, theme],
  );

  return useMemo<ResolvedView>(() => {
    const localization = mergeLocalization(merged.localization);
    const t = createTranslate(localization);
    const slots = { ...defaultSlots, ...merged.slots } as TableSlots<unknown>;
    const icons = { ...defaultIcons, ...merged.icons };
    const formatters = { ...defaultFormatters, ...merged.formatters };
    const pagination = merged.pagination ?? {};
    const rp = <T>(value: T | Record<string, T> | undefined, fallback: T): T =>
      resolveResponsive<T>(value as ResponsiveValue<T>, breakpoint) ?? fallback;
    const compact = merged.compactPagination ?? {};
    const themed = !!(merged.theme ?? provider.theme) || theme.colorScheme === 'dark';
    const { classNames, styles, slotProps, handlers } = merged;

    return {
      table,
      props: merged,
      theme,
      cssVars: themed ? toCssVars(theme) : undefined,
      colorScheme: theme.colorScheme,
      breakpoint,
      isMobile: !isAtLeast(breakpoint, merged.responsive?.mobileBreakpoint ?? 'md'),
      slots,
      defaultSlots: defaultSlots,
      icons,
      localization,
      t,
      formatters,
      locale: options.locale,
      id: merged.id ?? `tk${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      pagination: {
        variant: rp<PaginationVariant>(pagination.variant, 'numbered'),
        position: pagination.position ?? 'bottom',
        pageSizeOptions: pagination.pageSizeOptions ?? false,
        showRowRange: pagination.showRowRange ?? false,
        showFirstLast: rp(pagination.showFirstLast, false),
        showPrevNextLabels: rp(pagination.showPrevNextLabels, true),
        siblingCount: pagination.siblingCount ?? 1,
        boundaryCount: pagination.boundaryCount ?? 2,
        pageItemsAlgorithm: pagination.pageItemsAlgorithm ?? 'classic',
        hideOnSinglePage: pagination.hideOnSinglePage ?? true,
        align: pagination.align ?? 'space-between',
        compact: {
          siblingCount: compact.siblingCount ?? 0,
          boundaryCount: compact.boundaryCount ?? 2,
          pageItemsAlgorithm: compact.pageItemsAlgorithm ?? 'stable',
        },
      },
      slot(name, ctx, base) {
        const key = keyOf(name) as string;
        const cn = (classNames as Record<string, unknown> | undefined)?.[key];
        const st = (styles as Record<string, unknown> | undefined)?.[key];
        const sp = (slotProps as Record<string, unknown> | undefined)?.[key];
        if (cn === undefined && st === undefined && sp === undefined) return base;
        const c = { ...ctx, table };
        return mergeProps(
          base,
          {
            className: resolveSlotValue(cn, c) as string | undefined,
            style: resolveSlotValue(st, c) as CSSProperties | undefined,
          },
          resolveSlotValue(sp, c) as Record<string, unknown> | undefined,
        );
      },
      handle(name, ctx, impl) {
        return runHandler((handlers as Record<string, never> | undefined)?.[name], ctx, impl);
      },
      announce,
    };
  }, [merged, theme, breakpoint, table, provider.theme, reactId, options.locale, announce]);
}

/** Props accepted by a slot component, for internal rendering helpers. */
export type SlotProps<K extends SlotName> = SlotPropsMap<unknown>[K];

/** Exported for `useDataTable`: engine + view option layering. */
export type AnyDataTableProps = DataTableProps<unknown>;
