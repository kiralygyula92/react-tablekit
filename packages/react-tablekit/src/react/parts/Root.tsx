import type { CSSProperties, ReactNode } from 'react';
import type { TableInstance } from '../../core/types';
import { TableContext, ViewContext } from '../context';
import type { DataTableViewProps } from '../types';
import { cx } from '../utils';
import { useResolvedView } from '../view';
import { LayoutContext, useAnnouncer, useLayoutRegistry, useTableVersion } from './layout';

/** Props of `DataTable.Root`: a table instance plus any view props. */
export type RootProps<TData> = DataTableViewProps<TData> & {
  table: TableInstance<TData>;
  children?: ReactNode;
  'data-theme'?: string;
};

/**
 * Provides the table, the resolved view (slots, theme, localization…) and the layout registry to
 * the composable parts (06 §9).
 */
export function Root<TData>({ table, children, ...viewProps }: RootProps<TData>) {
  const anyTable = table as TableInstance<unknown>;
  useTableVersion(anyTable);
  const { message, announce } = useAnnouncer();
  const view = useResolvedView(anyTable, viewProps as DataTableViewProps<unknown>, announce);
  const layout = useLayoutRegistry();
  const { props, slots, theme, cssVars } = view;
  const state = table.getState();
  const status = table.getDataStatus();
  const dataTheme = viewProps['data-theme'] ?? (cssVars ? theme.name : undefined);

  // A card is rounded unless told otherwise; a plain surface is square unless asked, because
  // rounding something with no border or fill only shows up where a cell has a background.
  const rounded = props.rounded ?? props.surface !== 'plain';

  const base = {
    className: cx('tk-root', props.className),
    style: {
      ...(cssVars as CSSProperties | undefined),
      // The radius is a token, so squaring the corners is one variable rather than a rule per
      // surface. It has to be set here rather than in the stylesheet: a resolved theme writes its
      // tokens as inline styles, which no stylesheet rule can outrank.
      ...(rounded ? undefined : { '--tk-radius': '0px' }),
      ...props.style,
    } as CSSProperties,
    'data-theme': dataTheme,
    'data-color-scheme': view.colorScheme,
    'data-density': state.density,
    'data-breakpoint': view.breakpoint,
    'data-mobile': view.isMobile || undefined,
    'data-loading': status.loading || status.fetching || undefined,
    'data-unstyled': props.unstyled || undefined,
    'data-surface': props.surface,
    'data-rounded': String(rounded),
    'data-hover': props.enableHover === false ? undefined : true,
    'data-striped': props.enableStriped || undefined,
    'data-nowrap': props.noWrap === false ? undefined : true,
    dir: props.dir,
  };

  return (
    <TableContext.Provider value={anyTable}>
      <ViewContext.Provider value={view}>
        <LayoutContext.Provider value={layout}>
          <slots.Root {...(view.slot('Root', {}, base) as typeof base)} table={anyTable}>
            {children}
            <div className="tk-sr-live tk-visually-hidden" aria-live="polite" aria-atomic="true">
              {message}
            </div>
          </slots.Root>
        </LayoutContext.Provider>
      </ViewContext.Provider>
    </TableContext.Provider>
  );
}
