import { forwardRef, useId } from 'react';
import { useView } from '../context';
import { renderIcon } from '../renderIcon';
import type { SlotPropsMap } from '../types';
import { cx } from '../utils';

type P<K extends keyof SlotPropsMap<unknown>> = SlotPropsMap<unknown>[K];

export const PageButton = forwardRef<HTMLButtonElement, P<'PageButton'>>(function PageButton(
  { index, selected, className, type = 'button', ...rest },
  ref,
) {
  const { t, formatters, locale } = useView();
  return (
    <button
      ref={ref}
      type={type}
      className={cx('tk-page-button', className)}
      aria-current={selected ? 'page' : undefined}
      aria-label={t('page', { page: index + 1 })}
      data-selected={selected || undefined}
      {...rest}
    >
      {formatters.page(index + 1, locale)}
    </button>
  );
});

export const PrevButton = forwardRef<HTMLButtonElement, P<'PrevButton'>>(function PrevButton(
  { showLabel, className, type = 'button', ...rest },
  ref,
) {
  const { t, icons } = useView();
  return (
    <button
      ref={ref}
      type={type}
      className={cx('tk-page-nav', className)}
      data-nav="prev"
      data-icon-only={!showLabel || undefined}
      aria-label={showLabel ? undefined : t('previous')}
      {...rest}
    >
      <span className="tk-page-nav__icon">
        {renderIcon(showLabel ? icons.prev : icons.chevronLeft)}
      </span>
      {showLabel && t('previous')}
    </button>
  );
});

export const NextButton = forwardRef<HTMLButtonElement, P<'NextButton'>>(function NextButton(
  { showLabel, className, type = 'button', ...rest },
  ref,
) {
  const { t, icons } = useView();
  return (
    <button
      ref={ref}
      type={type}
      className={cx('tk-page-nav', className)}
      data-nav="next"
      data-icon-only={!showLabel || undefined}
      aria-label={showLabel ? undefined : t('next')}
      {...rest}
    >
      {showLabel && t('next')}
      <span className="tk-page-nav__icon">
        {renderIcon(showLabel ? icons.next : icons.chevronRight)}
      </span>
    </button>
  );
});

export const FirstButton = forwardRef<HTMLButtonElement, P<'FirstButton'>>(function FirstButton(
  { className, type = 'button', ...rest },
  ref,
) {
  const { t, icons } = useView();
  return (
    <button
      ref={ref}
      type={type}
      className={cx('tk-page-nav', className)}
      data-nav="first"
      data-icon-only
      aria-label={t('first')}
      {...rest}
    >
      <span className="tk-page-nav__icon">{renderIcon(icons.first)}</span>
    </button>
  );
});

export const LastButton = forwardRef<HTMLButtonElement, P<'LastButton'>>(function LastButton(
  { className, type = 'button', ...rest },
  ref,
) {
  const { t, icons } = useView();
  return (
    <button
      ref={ref}
      type={type}
      className={cx('tk-page-nav', className)}
      data-nav="last"
      data-icon-only
      aria-label={t('last')}
      {...rest}
    >
      <span className="tk-page-nav__icon">{renderIcon(icons.last)}</span>
    </button>
  );
});

export const Ellipsis = forwardRef<HTMLSpanElement, P<'Ellipsis'>>(function Ellipsis(
  { className, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={cx('tk-ellipsis', className)} aria-hidden="true" {...rest}>
      …
    </span>
  );
});

export function PageSizeSelect({
  value,
  options,
  onChange,
  label,
  disabled,
  className,
  style,
}: P<'PageSizeSelect'>) {
  const id = useId();
  const { slots } = useView();
  return (
    <span className={cx('tk-page-size', className)} style={style}>
      <label htmlFor={id} className="tk-page-size__label">
        {label}
      </label>
      <slots.Select
        id={id}
        value={String(value)}
        disabled={disabled}
        options={options.map((o) => ({ value: String(o), label: String(o) }))}
        onValueChange={(v) => onChange(Number(v))}
      />
    </span>
  );
}

export const RowRange = forwardRef<HTMLSpanElement, P<'RowRange'>>(function RowRange(
  { from, to, total, className, ...rest },
  ref,
) {
  const { t, formatters, locale } = useView();
  const f = formatters.rowRange(from, to, total, locale);
  return (
    <span ref={ref} className={cx('tk-row-range', className)} {...rest}>
      {t('rowRange', { from: f.from, to: f.to, total: total < 0 ? t('many') : f.total })}
    </span>
  );
});

export const LoadMoreButton = forwardRef<HTMLButtonElement, P<'LoadMoreButton'>>(
  function LoadMoreButton(
    { remaining, loading, onLoadMore, className, type = 'button', ...rest },
    ref,
  ) {
    const { t, slots, formatters, locale } = useView();
    return (
      <button
        ref={ref}
        type={type}
        className={cx('tk-button tk-load-more', className)}
        data-variant="outlined"
        aria-busy={loading || undefined}
        onClick={onLoadMore}
        {...rest}
      >
        {loading && <slots.Spinner size={16} />}
        {t('loadMore', {
          remaining: remaining < 0 ? t('many') : formatters.number(remaining, locale),
        })}
      </button>
    );
  },
);

/**
 * Default `Pagination` slot: renders the numbered, compact and simple bars.
 * `loadMore` / `infinite` are rendered by the Pagination part itself.
 */
export const Pagination = forwardRef<HTMLElement, P<'Pagination'>>(function Pagination(
  {
    variant,
    pageIndex,
    pageCount,
    pageSize,
    rowCount,
    items,
    canPrev,
    canNext,
    goTo,
    next,
    prev,
    first,
    last,
    setPageSize,
    disabled,
    className,
    ...rest
  },
  ref,
) {
  const { slots, t, pagination } = useView();
  const showFirstLast = pagination.showFirstLast;
  const showLabels = variant === 'numbered' && pagination.showPrevNextLabels;
  const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to =
    rowCount < 0 ? pageIndex * pageSize + pageSize : Math.min(rowCount, (pageIndex + 1) * pageSize);
  const meta = (pagination.pageSizeOptions || pagination.showRowRange) && (
    <div className="tk-pagination__meta">
      {pagination.pageSizeOptions && (
        <slots.PageSizeSelect
          value={pageSize}
          options={pagination.pageSizeOptions}
          onChange={setPageSize}
          label={t('rowsPerPage')}
          disabled={disabled}
        />
      )}
      {pagination.showRowRange && variant !== 'simple' && (
        <slots.RowRange from={from} to={to} total={rowCount} />
      )}
    </div>
  );
  const pages = (
    <div className="tk-pagination__pages">
      {items.map((item) =>
        item.type === 'ellipsis' ? (
          <slots.Ellipsis key={item.key} />
        ) : (
          <slots.PageButton
            key={item.index}
            index={item.index}
            selected={item.selected}
            disabled={disabled}
            onClick={() => goTo(item.index)}
          />
        ),
      )}
    </div>
  );
  return (
    <nav
      ref={ref}
      className={cx('tk-pagination', className)}
      data-variant={variant}
      data-align={pagination.align}
      {...rest}
    >
      {meta}
      <div className="tk-pagination__controls">
        {showFirstLast && variant !== 'simple' && (
          <slots.FirstButton disabled={disabled || !canPrev} onClick={first} />
        )}
        <slots.PrevButton showLabel={showLabels} disabled={disabled || !canPrev} onClick={prev} />
        {variant === 'simple' ? <slots.RowRange from={from} to={to} total={rowCount} /> : pages}
        <slots.NextButton showLabel={showLabels} disabled={disabled || !canNext} onClick={next} />
        {showFirstLast && variant !== 'simple' && pageCount > 0 && (
          <slots.LastButton disabled={disabled || !canNext} onClick={last} />
        )}
      </div>
    </nav>
  );
});
