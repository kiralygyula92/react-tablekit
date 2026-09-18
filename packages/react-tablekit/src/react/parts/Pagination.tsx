import { useContext, useEffect, useRef, type CSSProperties } from 'react';
import { getPageItems } from '../../core/pageItems';
import type { TableInstance } from '../../core/types';
import { useOptionalTable, useView } from '../context';
import type { PaginationVariant } from '../types';
import { cx, useIsomorphicLayoutEffect } from '../utils';
import { LayoutContext, useTableVersion } from './layout';

/** Props of `DataTable.Pagination`. */
export interface PaginationProps<TData> {
  table?: TableInstance<TData>;
  /** Where this bar sits relative to the container (bottom bars attach to it). */
  position?: 'top' | 'bottom';
  /** Overrides the responsive `pagination.variant`. */
  variant?: PaginationVariant;
  className?: string;
  style?: CSSProperties;
}

/** `DataTable.Pagination`. */
export function Pagination<TData>({
  table: tableProp,
  position = 'bottom',
  variant: variantProp,
  className,
  style,
}: PaginationProps<TData>) {
  const table = useOptionalTable(tableProp) as TableInstance<unknown>;
  useTableVersion(table);
  const view = useView();
  const layout = useContext(LayoutContext);
  const navRef = useRef<HTMLElement | null>(null);
  const focusAfterChange = useRef(false);
  const { slots, pagination, t, props } = view;

  const cursor = table.options.paginationType === 'cursor';
  let variant = variantProp ?? pagination.variant;
  // Cursor pagination cannot jump to arbitrary pages: numbered/compact fall back to simple.
  if (cursor && (variant === 'numbered' || variant === 'compact')) variant = 'simple';

  const state = table.getState().pagination;
  const pageCount = table.getPageCount();
  const rowCount = table.getRowCount();
  const status = table.getDataStatus();
  const disabled = props.disablePaginationWhileFetching !== false && status.fetching;
  const enabled = table.options.enablePagination !== false && variant !== 'none';
  const multiPage =
    pageCount > 1 ||
    pageCount === -1 ||
    (cursor && (table.getCanNextPage() || table.getCanPreviousPage()));
  const visible =
    enabled &&
    (multiPage || !pagination.hideOnSinglePage || variant === 'loadMore') &&
    rowCount !== 0;

  // A visible bottom bar attaches to the container, which then drops its bottom border.
  const register = layout?.registerFooter;
  useIsomorphicLayoutEffect(() => {
    if (
      !visible ||
      position !== 'bottom' ||
      variant === 'loadMore' ||
      variant === 'infinite' ||
      !register
    )
      return;
    return register();
  }, [visible, position, variant, register]);

  useEffect(() => {
    if (!focusAfterChange.current) return;
    focusAfterChange.current = false;
    navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
  }, [state.pageIndex]);

  const goTo = (pageIndex: number, reason: 'button' | 'keyboard' | 'infinite' = 'button') =>
    void view.handle('onPageChange', { pageIndex, reason }, (ctx) => {
      if (navRef.current?.contains(document.activeElement)) focusAfterChange.current = true;
      if (cursor) {
        if (ctx.pageIndex > state.pageIndex) table.nextPage();
        else if (ctx.pageIndex < state.pageIndex) table.previousPage();
      } else table.setPageIndex(ctx.pageIndex);
      // Infinite pagination appends, so the scroll position must stay where the reader is.
      if (
        reason !== 'infinite' &&
        props.scrollToTopOnPageChange !== false &&
        layout?.containerRef.current
      )
        layout.containerRef.current.scrollTop = 0;
      const next = table.getState().pagination.pageIndex;
      view.announce(
        t('announcePage', { page: next + 1, count: pageCount < 0 ? t('many') : pageCount }),
      );
    });

  // The scroll listener below must call the latest `goTo` without re-subscribing every render.
  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  });

  // `infinite`: load the next page as the end of the scroll area comes into view.
  const container = layout?.containerRef.current ?? null;
  const canNext = table.getCanNextPage();
  const fetching = status.fetching;
  const pageIndex = state.pageIndex;
  useEffect(() => {
    if (variant !== 'infinite' || !canNext || fetching) return;
    // The bounded container scrolls when it has one; otherwise the page does.
    const el = container && container.scrollHeight > container.clientHeight ? container : null;
    const scroller: HTMLElement | Window = el ?? window;
    const nearEnd = () =>
      el
        ? el.scrollTop + el.clientHeight >= el.scrollHeight - 300
        : window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
    const onScroll = () => {
      if (nearEnd()) goToRef.current(pageIndex + 1, 'infinite');
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [variant, canNext, fetching, container, pageIndex, goToRef]);

  if (!visible) return null;

  if (variant === 'loadMore' || variant === 'infinite') {
    const loaded = table.getRowModel().rows.length;
    const remaining = rowCount < 0 ? -1 : Math.max(0, rowCount - loaded);
    if (remaining === 0 || !table.getCanNextPage()) return null;
    return (
      <div className={cx('tk-load-more-bar', className)} style={style}>
        <slots.LoadMoreButton
          remaining={remaining}
          loading={status.fetching}
          disabled={status.fetching}
          onLoadMore={() =>
            goTo(state.pageIndex + 1, variant === 'infinite' ? 'infinite' : 'button')
          }
        />
      </div>
    );
  }

  const settings = variant === 'compact' ? pagination.compact : pagination;
  const items = getPageItems({
    pageIndex: state.pageIndex,
    pageCount: Math.max(0, pageCount),
    siblingCount: settings.siblingCount,
    boundaryCount: settings.boundaryCount,
    algorithm: settings.pageItemsAlgorithm ?? 'classic',
  });

  const base = {
    className: cx('tk-pagination', className),
    style,
    'aria-label': t('pagination'),
    'data-position': position,
    variant,
    pageIndex: state.pageIndex,
    pageCount,
    pageSize: state.pageSize,
    rowCount,
    items,
    canPrev: table.getCanPreviousPage(),
    canNext: table.getCanNextPage(),
    goTo: (i: number) => goTo(i),
    next: () => goTo(state.pageIndex + 1),
    prev: () => goTo(state.pageIndex - 1),
    first: () => goTo(0),
    last: () => goTo(Math.max(0, pageCount - 1)),
    setPageSize: (pageSize: number) =>
      void view.handle('onPageSizeChange', { pageSize }, (ctx) => table.setPageSize(ctx.pageSize)),
    disabled,
  };
  const { className: _c, style: _s, ...ctx } = base;
  // eslint-disable-next-line react-hooks/refs -- view.slot only merges props; it never reads refs or calls handlers during render
  return <slots.Pagination {...(view.slot('Pagination', ctx, base) as typeof base)} ref={navRef} />;
}
