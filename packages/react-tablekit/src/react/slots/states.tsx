import { forwardRef, useEffect, useRef } from 'react';
import { useView } from '../context';
import { renderIcon } from '../renderIcon';
import type { SlotPropsMap } from '../types';
import { cx } from '../utils';

type P<K extends keyof SlotPropsMap<unknown>> = SlotPropsMap<unknown>[K];

/* eslint-disable @typescript-eslint/no-unused-vars -- context props are destructured to keep them off the DOM */

/** Initial-load text row. */
export const LoadingRow = forwardRef<HTMLTableRowElement, P<'LoadingRow'>>(function LoadingRow(
  { table, colSpan, className, children, ...rest },
  ref,
) {
  const { t, slots } = useView();
  const display = useView().props.loadingDisplay;
  return (
    <tr ref={ref} className={cx('tk-state-row', className)} {...rest}>
      <td className="tk-state" data-state="loading" colSpan={colSpan}>
        {children ??
          (display === 'spinner' ? <slots.Spinner label={t('loading')} /> : t('loading'))}
      </td>
    </tr>
  );
});

/** Skeleton rows shown during the initial load. */
export function SkeletonRows({ rowCount, columns, className, style }: P<'SkeletonRows'>) {
  const { t } = useView();
  return (
    <>
      {Array.from({ length: rowCount }, (_, r) => (
        <tr
          key={r}
          className={cx('tk-row tk-skeleton-row', className)}
          style={style}
          aria-hidden={r > 0 ? true : undefined}
        >
          {columns.map((c, i) => (
            <td key={c.id} className="tk-cell">
              {r === 0 && i === 0 && <span className="tk-visually-hidden">{t('loading')}</span>}
              <span className="tk-skeleton" style={{ width: `${40 + ((r * 7 + i * 13) % 45)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Refetch overlay: covers the body from the bottom of the header and blocks
 * interaction by default.
 */
export const LoadingOverlay = forwardRef<HTMLDivElement, P<'LoadingOverlay'>>(
  function LoadingOverlay({ table, visible, blocking, className, ...rest }, ref) {
    const { t, slots } = useView();
    if (!visible) return null;
    return (
      <div
        ref={ref}
        className={cx('tk-overlay', className)}
        data-blocking={blocking || undefined}
        role="status"
        {...rest}
      >
        <slots.Spinner />
        <span className="tk-visually-hidden">{t('loading')}</span>
      </div>
    );
  },
);

/** Empty state row (no rows / no results / custom). */
export const EmptyState = forwardRef<HTMLTableRowElement, P<'EmptyState'>>(function EmptyState(
  { reason, onClearFilters, colSpan, className, children, ...rest },
  ref,
) {
  const { t, slots } = useView();
  return (
    <tr ref={ref} className={cx('tk-state-row', className)} {...rest}>
      <td className="tk-state" data-state={reason} colSpan={colSpan}>
        {children ?? (reason === 'noResults' ? t('noResults') : t('noRows'))}
        {reason === 'noResults' && onClearFilters && (
          <slots.Button
            variant="text"
            size="small"
            className="tk-state__action"
            onClick={onClearFilters}
          >
            {t('clearAllFilters')}
          </slots.Button>
        )}
      </td>
    </tr>
  );
});

/** Error row shown instead of rows when there is no previous data. */
export const ErrorState = forwardRef<HTMLTableRowElement, P<'ErrorState'>>(function ErrorState(
  { error, retry, colSpan, className, children, ...rest },
  ref,
) {
  const { t, slots, icons } = useView();
  return (
    <tr ref={ref} className={cx('tk-state-row', className)} {...rest}>
      <td className="tk-state" data-state="error" colSpan={colSpan}>
        {children ?? (
          <span role="alert">
            <span className="tk-state__icon">{renderIcon(icons.error)}</span>
            {t('errorTitle')}
            <slots.Button
              variant="outlined"
              size="small"
              className="tk-state__action"
              onClick={retry}
            >
              {t('retry')}
            </slots.Button>
          </span>
        )}
      </td>
    </tr>
  );
});

/** Dismissible banner above the rows when a refetch fails but stale data is shown. */
export const ErrorBanner = forwardRef<HTMLDivElement, P<'ErrorBanner'>>(function ErrorBanner(
  { error, retry, dismiss, className, children, ...rest },
  ref,
) {
  const { t, slots, icons } = useView();
  return (
    <div ref={ref} className={cx('tk-error-banner', className)} role="alert" {...rest}>
      <span className="tk-error-banner__icon">{renderIcon(icons.error)}</span>
      <span className="tk-error-banner__message">{children ?? t('errorTitle')}</span>
      <slots.Button variant="text" size="small" onClick={retry}>
        {t('retry')}
      </slots.Button>
      <slots.IconButton label={t('dismiss')} size="small" onClick={dismiss}>
        {renderIcon(icons.close)}
      </slots.IconButton>
    </div>
  );
});

/** Sets the `inert` property (version-agnostic across React 18/19). */
export function useInert<T extends HTMLElement>(inert: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.inert = inert;
  }, [inert]);
  return ref;
}
