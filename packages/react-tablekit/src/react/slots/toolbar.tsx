import { forwardRef } from 'react';
import { useView } from '../context';
import { renderIcon } from '../renderIcon';
import type { SlotPropsMap } from '../types';
import { cx } from '../utils';

type P<K extends keyof SlotPropsMap<unknown>> = SlotPropsMap<unknown>[K];

/* eslint-disable @typescript-eslint/no-unused-vars -- context props are destructured to keep them off the DOM */

/**
 * Default `SearchInput` slot: `type="search"`, a start icon, a clear button and the optional
 * hotkey hint chip.
 */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  label,
  clearLabel,
  hotkeyHint,
  inputRef,
  className,
  style,
  icon,
  onKeyDown,
  ...rest
}: P<'SearchInput'>) {
  const { icons, slots } = useView();
  return (
    <div
      className={cx('tk-search', className)}
      style={style}
      data-has-value={value ? true : undefined}
    >
      <span className="tk-search__icon" aria-hidden="true">
        {icon ?? renderIcon(icons.search)}
      </span>
      <input
        ref={inputRef}
        type="search"
        className="tk-search__input"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            onClear();
          }
        }}
        {...rest}
      />
      {value ? (
        <slots.IconButton
          label={clearLabel}
          size="small"
          className="tk-search__clear"
          onClick={onClear}
        >
          {renderIcon(icons.clear)}
        </slots.IconButton>
      ) : (
        hotkeyHint && (
          <kbd className="tk-search__hint" aria-hidden="true">
            {hotkeyHint}
          </kbd>
        )
      )}
    </div>
  );
}

/** Default `SelectionCheckbox` slot (row and header). */
export function SelectionCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
  type,
  className,
  style,
}: P<'SelectionCheckbox'>) {
  const { slots } = useView();
  return (
    <slots.Checkbox
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      onChange={onChange}
      aria-label={label}
      type={type ?? 'checkbox'}
      className={cx('tk-selection-checkbox', className)}
      {...(style ? { style } : {})}
    />
  );
}

/** Default `FiltersButton` slot: toggles the filter section and shows the active-count badge. */
export const FiltersButton = forwardRef<HTMLButtonElement, P<'FiltersButton'>>(
  function FiltersButton({ activeCount, open, onToggle, className, children, ...rest }, ref) {
    const { t, icons, slots } = useView();
    return (
      <slots.Button
        ref={ref}
        variant="outlined"
        size="small"
        className={cx('tk-filters-button', className)}
        aria-expanded={open}
        startIcon={renderIcon(activeCount ? icons.filterActive : icons.filter)}
        onClick={onToggle}
        {...rest}
      >
        {children ?? t('filters')}
        {activeCount > 0 && (
          <span className="tk-badge" aria-label={t('filtersActive', { count: activeCount })}>
            {activeCount}
          </span>
        )}
      </slots.Button>
    );
  },
);

/** Default `ColumnsButton` slot. */
export const ColumnsButton = forwardRef<HTMLButtonElement, P<'ColumnsButton'>>(
  function ColumnsButton({ columns, table, className, children, ...rest }, ref) {
    const { t, icons, slots } = useView();
    return (
      <slots.Button
        ref={ref}
        variant="outlined"
        size="small"
        className={cx('tk-columns-button', className)}
        startIcon={renderIcon(icons.columns)}
        {...rest}
      >
        {children ?? t('columns')}
      </slots.Button>
    );
  },
);

/** Default `DensityButton` slot: cycles compact → standard → comfortable. */
export const DensityButton = forwardRef<HTMLButtonElement, P<'DensityButton'>>(
  function DensityButton({ density, setDensity, className, color: _color, ...rest }, ref) {
    const { t, icons, slots } = useView();
    const next =
      density === 'compact' ? 'standard' : density === 'standard' ? 'comfortable' : 'compact';
    const label = `${t('density')}: ${t(density === 'compact' ? 'densityCompact' : density === 'standard' ? 'densityStandard' : 'densityComfortable')}`;
    return (
      <slots.IconButton
        ref={ref}
        label={label}
        className={cx('tk-density-button', className)}
        onClick={() => setDensity(next)}
        {...rest}
      >
        {renderIcon(icons.density)}
      </slots.IconButton>
    );
  },
);

/** Default `ExportButton` slot (the menu is rendered by the Export part). */
export const ExportButton = forwardRef<HTMLButtonElement, P<'ExportButton'>>(function ExportButton(
  { onExport, progress, className, children, ...rest },
  ref,
) {
  const { t, icons, slots } = useView();
  return (
    <slots.Button
      ref={ref}
      variant="outlined"
      size="small"
      className={cx('tk-export-button', className)}
      startIcon={progress === null ? renderIcon(icons.export) : <slots.Spinner size={14} />}
      aria-haspopup="menu"
      {...rest}
    >
      {children ??
        (progress === null
          ? t('export')
          : t('exportProgress', { percent: Math.round(progress * 100) }))}
    </slots.Button>
  );
});

/** Default `FilterChip` slot. */
export const FilterChip = forwardRef<HTMLSpanElement, P<'FilterChip'>>(function FilterChip(
  { label, color, textColor, onRemove, removeLabel, className, ...rest },
  ref,
) {
  const { slots } = useView();
  return (
    <slots.Chip
      ref={ref}
      label={label}
      {...(color ? { color } : {})}
      {...(textColor ? { textColor } : {})}
      {...(onRemove ? { onDelete: onRemove } : {})}
      deleteLabel={removeLabel}
      className={cx('tk-filter-chip', className)}
      {...rest}
    />
  );
});

/** Default `ActiveFilterChips` slot: one chip per active filter plus "Clear all". */
export const ActiveFilterChips = forwardRef<HTMLDivElement, P<'ActiveFilterChips'>>(
  function ActiveFilterChips({ filters, onRemove, onClearAll, className, ...rest }, ref) {
    const { t, slots } = useView();
    if (!filters.length) return null;
    return (
      <div ref={ref} className={cx('tk-filter-chips', className)} {...rest}>
        {filters.map((f) => (
          <slots.FilterChip
            key={f.id}
            label={f.label}
            {...(f.color ? { color: f.color } : {})}
            {...(f.textColor ? { textColor: f.textColor } : {})}
            onRemove={() => onRemove(f.id)}
            removeLabel={`${t('dismiss')}: ${f.label}`}
          />
        ))}
        <slots.Button
          variant="text"
          size="small"
          className="tk-filter-chips__clear"
          onClick={onClearAll}
        >
          {t('clearAllFilters')}
        </slots.Button>
      </div>
    );
  },
);

/** Default `SelectionBar` slot: "3 selected · Select all 235 matching · Clear" + bulk actions. */
export const SelectionBar = forwardRef<HTMLDivElement, P<'SelectionBar'>>(function SelectionBar(
  {
    selectedCount,
    totalCount,
    allMatchingSelected,
    onSelectAllMatching,
    onClear,
    bulkActions,
    table,
    className,
    ...rest
  },
  ref,
) {
  const { t, slots, formatters, locale } = useView();
  if (selectedCount === 0) return null;
  return (
    <div
      ref={ref}
      className={cx('tk-selection-bar', className)}
      role="region"
      aria-label={t('selectedCount', { count: selectedCount })}
      {...rest}
    >
      <span className="tk-selection-bar__count" aria-live="polite">
        {t('selectedCount', {
          count: selectedCount < 0 ? t('many') : formatters.number(selectedCount, locale),
        })}
      </span>
      {onSelectAllMatching && !allMatchingSelected && totalCount !== 0 && (
        <slots.Button variant="text" size="small" onClick={onSelectAllMatching}>
          {t('selectAllMatching', {
            total: totalCount < 0 ? t('many') : formatters.number(totalCount, locale),
          })}
        </slots.Button>
      )}
      <slots.Button variant="text" size="small" onClick={onClear}>
        {t('clearSelection')}
      </slots.Button>
      {bulkActions && <div className="tk-selection-bar__actions">{bulkActions}</div>}
    </div>
  );
});
