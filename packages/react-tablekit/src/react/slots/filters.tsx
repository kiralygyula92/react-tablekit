import { forwardRef, useState, type ReactNode } from 'react';
import type { FilterOperator, FilterOption } from '../../core/types';
import { toText } from '../../core/text';
import { fold } from '../../core/utils';
import { useView } from '../context';
import { renderIcon } from '../renderIcon';
import type { SlotPropsMap } from '../types';
import { cx } from '../utils';

type P<K extends keyof SlotPropsMap<unknown>> = SlotPropsMap<unknown>[K];

/* eslint-disable @typescript-eslint/no-unused-vars -- context props are destructured to keep them off the DOM */

const DEFAULT_OPERATORS: Partial<Record<string, FilterOperator[]>> = {
  number: ['equals', 'neq', 'gt', 'gte', 'lt', 'lte'],
  date: ['on', 'before', 'after'],
};

const optionKey = (value: unknown) =>
  typeof value === 'string' ? `s:${value}` : `j:${JSON.stringify(value)}`;

function OperatorSelect({
  operators,
  value,
  onChange,
  labelledBy,
}: {
  operators: FilterOperator[];
  value: FilterOperator;
  onChange: (op: FilterOperator) => void;
  labelledBy: string;
}) {
  const { t, slots, localization } = useView();
  const labels = localization.operators;
  return (
    <slots.Select
      className="tk-filter__operator"
      aria-label={t('operator')}
      aria-describedby={labelledBy}
      value={value}
      options={operators.map((op) => ({ value: op, label: labels[op] }))}
      onValueChange={(v) => onChange(v as FilterOperator)}
    />
  );
}

function optionLabel(o: FilterOption, showCounts: boolean): string {
  return showCounts && o.count !== undefined ? `${o.label} (${o.count})` : o.label;
}

/** Checkbox list with an inner search when there are many options. */
function MultiSelectList({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: FilterOption[];
  value: unknown[];
  onChange: (v: unknown[]) => void;
}) {
  const { t, slots, props } = useView();
  const [query, setQuery] = useState('');
  const visible = query ? options.filter((o) => fold(o.label).includes(fold(query))) : options;
  const selected = new Set(value.map(optionKey));
  return (
    <div className="tk-filter__multi" role="group" aria-labelledby={id}>
      {options.length > 8 && (
        <slots.TextInput
          value={query}
          onValueChange={setQuery}
          placeholder={t('search')}
          aria-label={`${t('search')} ${label}`}
          className="tk-filter__multi-search"
        />
      )}
      <div className="tk-filter__options">
        {visible.length === 0 && <span className="tk-filter__empty">{t('noOptions')}</span>}
        {visible.map((o) => {
          const k = optionKey(o.value);
          return (
            <label key={k} className="tk-filter__option">
              <slots.Checkbox
                checked={selected.has(k)}
                onChange={(checked) =>
                  onChange(checked ? [...value, o.value] : value.filter((v) => optionKey(v) !== k))
                }
              />
              <span className="tk-filter__option-label">
                {optionLabel(o, props.showFacetCounts !== false)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Autocomplete with chips (the Skimmer `TableFilterToolbar` equivalent): ARIA combobox. */
function MultiSelectAutocomplete({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: FilterOption[];
  value: unknown[];
  onChange: (v: unknown[]) => void;
}) {
  const { t, slots, props } = useView();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = `${id}-list`;
  const selected = new Set(value.map(optionKey));
  const available = options.filter(
    (o) => !selected.has(optionKey(o.value)) && (!query || fold(o.label).includes(fold(query))),
  );
  const add = (o: FilterOption) => {
    onChange([...value, o.value]);
    setQuery('');
    setActive(0);
  };
  const chips = value.map(
    (v) =>
      options.find((o) => optionKey(o.value) === optionKey(v)) ?? { value: v, label: String(v) },
  );
  return (
    <div className="tk-filter__autocomplete">
      <div className="tk-filter__chips">
        {chips.map((o) => (
          <slots.Chip
            key={optionKey(o.value)}
            label={o.label}
            {...(o.color ? { color: o.color } : {})}
            {...(o.textColor ? { textColor: o.textColor } : {})}
            onDelete={() => onChange(value.filter((v) => optionKey(v) !== optionKey(o.value)))}
            deleteLabel={`${t('dismiss')}: ${o.label}`}
          />
        ))}
        <input
          className="tk-input tk-filter__combobox"
          role="combobox"
          aria-expanded={open && available.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={label}
          aria-activedescendant={open && available[active] ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, available.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && open && available[active]) {
              e.preventDefault();
              add(available[active]);
            } else if (e.key === 'Backspace' && !query && value.length) {
              onChange(value.slice(0, -1));
            } else if (e.key === 'Escape') setOpen(false);
          }}
        />
      </div>
      {open && available.length > 0 && (
        <ul id={listId} role="listbox" className="tk-filter__listbox" aria-label={label}>
          {available.map((o, i) => (
            <li
              key={optionKey(o.value)}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="tk-filter__listbox-option"
              data-active={i === active || undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                add(o);
              }}
            >
              {optionLabel(o, props.showFacetCounts !== false)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const toInputValue = (v: unknown): string => toText(v);
const numOrNull = (s: string): number | null =>
  s === '' || Number.isNaN(Number(s)) ? null : Number(s);
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Built-in date presets (05 §3.3); labels come from `localization.datePresets`. */
export function defaultDatePresets(labels: Record<string, string>) {
  const today = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const add = (d: Date, days: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  const ranges: Record<string, () => [Date, Date]> = {
    today: () => [today(), today()],
    last7Days: () => [add(today(), -6), today()],
    last30Days: () => [add(today(), -29), today()],
    thisMonth: () => {
      const t = today();
      return [
        new Date(t.getFullYear(), t.getMonth(), 1),
        new Date(t.getFullYear(), t.getMonth() + 1, 0),
      ];
    },
    lastMonth: () => {
      const t = today();
      return [
        new Date(t.getFullYear(), t.getMonth() - 1, 1),
        new Date(t.getFullYear(), t.getMonth(), 0),
      ];
    },
    thisYear: () => [
      new Date(today().getFullYear(), 0, 1),
      new Date(today().getFullYear(), 11, 31),
    ],
  };
  return Object.entries(ranges).map(([id, range]) => ({ id, label: labels[id] ?? id, range }));
}

/** Default `FilterControl` slot: the input for one column's filter variant (05 §3.3). */
export function FilterControl({
  column,
  variant,
  value,
  setValue,
  operator,
  setOperator,
  options,
  loading,
  table,
  id,
  label,
  className,
  style,
}: P<'FilterControl'>) {
  const { t, slots, props, localization } = useView();
  const labelId = `${id}-label`;
  const def = column.columnDef;
  const operators = def.filterOperators ?? DEFAULT_OPERATORS[variant];
  const placeholder = def.filterPlaceholder ?? '';
  let control: ReactNode;

  if (def.renderFilter) {
    control = def.renderFilter({
      table,
      column,
      value,
      setValue,
      operator,
      setOperator,
      options,
    }) as ReactNode;
  } else
    switch (variant) {
      case 'select':
        control = (
          <slots.Select
            id={id}
            value={value === undefined ? '' : optionKey(value)}
            options={[
              { value: '', label: t('any') },
              ...options.map((o) => ({
                value: optionKey(o.value),
                label: optionLabel(o, props.showFacetCounts !== false),
              })),
            ]}
            onValueChange={(k) =>
              setValue(k === '' ? undefined : options.find((o) => optionKey(o.value) === k)?.value)
            }
          />
        );
        break;
      case 'multiSelect': {
        const list = Array.isArray(value) ? (value as unknown[]) : [];
        control =
          (def.multiSelectDisplay ?? props.multiSelectDisplay) === 'autocomplete' ? (
            <MultiSelectAutocomplete
              id={id}
              label={label}
              options={options}
              value={list}
              onChange={(v) => setValue(v)}
            />
          ) : (
            <MultiSelectList
              id={labelId}
              label={label}
              options={options}
              value={list}
              onChange={(v) => setValue(v)}
            />
          );
        break;
      }
      case 'boolean':
        control = (
          <slots.Select
            id={id}
            value={value === true ? 'true' : value === false ? 'false' : ''}
            options={[
              { value: '', label: t('any') },
              { value: 'true', label: t('yes') },
              { value: 'false', label: t('no') },
            ]}
            onValueChange={(v) => setValue(v === '' ? null : v === 'true')}
          />
        );
        break;
      case 'range':
      case 'rangeSlider': {
        const [min, max] = (Array.isArray(value) ? value : [null, null]) as [unknown, unknown];
        const facets = column.getServerFacets();
        const bounds =
          facets?.type === 'range'
            ? [Number(facets.min), Number(facets.max)]
            : column.getFacetedMinMaxValues();
        if (variant === 'rangeSlider' && bounds) {
          const [lo, hi] = bounds as [number, number];
          const vMin = min === null || min === undefined ? lo : Number(min);
          const vMax = max === null || max === undefined ? hi : Number(max);
          control = (
            <div className="tk-filter__slider">
              <input
                type="range"
                min={lo}
                max={hi}
                value={vMin}
                aria-label={`${label} ${t('min')}`}
                onChange={(e) => setValue([Math.min(Number(e.target.value), vMax), max ?? null])}
              />
              <input
                type="range"
                min={lo}
                max={hi}
                value={vMax}
                aria-label={`${label} ${t('max')}`}
                onChange={(e) => setValue([min ?? null, Math.max(Number(e.target.value), vMin)])}
              />
              <span className="tk-filter__slider-values">
                {vMin} – {vMax}
              </span>
            </div>
          );
        } else {
          control = (
            <div className="tk-filter__range">
              <slots.TextInput
                type="number"
                id={id}
                value={toInputValue(min)}
                placeholder={bounds ? String(bounds[0]) : t('min')}
                aria-label={`${label} ${t('min')}`}
                onValueChange={(v) => setValue([numOrNull(v), max ?? null])}
              />
              <span aria-hidden="true">–</span>
              <slots.TextInput
                type="number"
                value={toInputValue(max)}
                placeholder={bounds ? String(bounds[1]) : t('max')}
                aria-label={`${label} ${t('max')}`}
                onValueChange={(v) => setValue([min ?? null, numOrNull(v)])}
              />
            </div>
          );
        }
        break;
      }
      case 'dateRange': {
        const [from, to] = (Array.isArray(value) ? value : [null, null]) as [unknown, unknown];
        const presets = props.datePresets ?? defaultDatePresets(localization.datePresets);
        control = (
          <div className="tk-filter__range">
            <slots.TextInput
              type="date"
              id={id}
              value={toInputValue(from)}
              aria-label={`${label} ${t('from')}`}
              onValueChange={(v) => setValue([v || null, to ?? null])}
            />
            <span aria-hidden="true">–</span>
            <slots.TextInput
              type="date"
              value={toInputValue(to)}
              aria-label={`${label} ${t('to')}`}
              onValueChange={(v) => setValue([from ?? null, v || null])}
            />
            <slots.Select
              className="tk-filter__presets"
              aria-label={`${label}: ${t('datePreset')}`}
              value=""
              options={[
                { value: '', label: t('datePreset') },
                ...presets.map((p) => ({ value: p.id, label: p.label })),
              ]}
              onValueChange={(pid) => {
                const preset = presets.find((p) => p.id === pid);
                if (preset) {
                  const [a, b] = preset.range();
                  setValue([isoDate(a), isoDate(b)]);
                }
              }}
            />
          </div>
        );
        break;
      }
      case 'number':
      case 'date':
      case 'text':
      default: {
        const inputType = variant === 'number' ? 'number' : variant === 'date' ? 'date' : 'text';
        const valueless = operator === 'empty' || operator === 'notEmpty';
        control = (
          <div className="tk-filter__with-operator">
            {operators && operators.length > 1 && (
              <OperatorSelect
                operators={operators}
                value={operator ?? operators[0]!}
                onChange={setOperator}
                labelledBy={labelId}
              />
            )}
            {!valueless && (
              <slots.TextInput
                id={id}
                type={inputType}
                value={toInputValue(value)}
                placeholder={placeholder}
                onValueChange={(v) =>
                  setValue(variant === 'number' ? (numOrNull(v) ?? undefined) : v)
                }
              />
            )}
          </div>
        );
      }
    }

  return (
    <div
      className={cx('tk-filter', className)}
      style={style}
      data-variant={variant}
      aria-busy={loading || undefined}
    >
      <label
        className="tk-filter__label"
        id={labelId}
        htmlFor={variant === 'multiSelect' ? undefined : id}
      >
        {label}
      </label>
      {loading && <slots.Spinner size={14} label={t('loading')} />}
      {control}
    </div>
  );
}

/** Default `FilterPanel` slot: a responsive grid of filter controls with "Clear all" / "Apply". */
export const FilterPanel = forwardRef<HTMLDivElement, P<'FilterPanel'>>(function FilterPanel(
  { columns, table, open, onApply, onClearAll, className, children, ...rest },
  ref,
) {
  const { t, slots, props } = useView();
  return (
    <div ref={ref} className={cx('tk-filter-panel', className)} hidden={!open} {...rest}>
      <div className="tk-filter-panel__grid">{children}</div>
      <div className="tk-filter-panel__actions">
        <slots.Button variant="text" size="small" onClick={onClearAll}>
          {t('clearAllFilters')}
        </slots.Button>
        {props.filterApplyMode === 'manual' && (
          <slots.Button variant="contained" size="small" onClick={onApply}>
            {t('applyFilters')}
          </slots.Button>
        )}
      </div>
    </div>
  );
});

/** Default `ColumnsMenu` slot: visibility checkboxes, "Show all", "Hide all", "Reset" (05 §11). */
export const ColumnsMenu = forwardRef<HTMLDivElement, P<'ColumnsMenu'>>(function ColumnsMenu(
  { columns, table, onClose, className, ...rest },
  ref,
) {
  const { t, slots, icons, handle } = useView();
  const [query, setQuery] = useState('');
  const headerText = (id: string, header: unknown) => (typeof header === 'string' ? header : id);
  const hideable = columns.filter((c) => c.getCanHide());
  const shown = query
    ? hideable.filter((c) => fold(headerText(c.id, c.columnDef.header)).includes(fold(query)))
    : hideable;
  const ordering = table.options.enableColumnOrdering;
  return (
    <div ref={ref} className={cx('tk-columns-menu', className)} {...rest}>
      {hideable.length > 10 && (
        <slots.TextInput
          value={query}
          onValueChange={setQuery}
          placeholder={t('searchColumns')}
          aria-label={t('searchColumns')}
          className="tk-columns-menu__search"
        />
      )}
      <ul className="tk-columns-menu__list">
        {shown.map((c) => {
          const index = table.getAllLeafColumns().indexOf(c);
          return (
            <li key={c.id} className="tk-columns-menu__item">
              <label className="tk-columns-menu__label">
                <slots.Checkbox
                  checked={c.getIsVisible()}
                  onChange={(visible) =>
                    void handle('onColumnHide', { column: c, visible }, (x) =>
                      x.column.toggleVisibility(x.visible),
                    )
                  }
                />
                {headerText(c.id, c.columnDef.header)}
              </label>
              {ordering && c.getCanOrder() && (
                <span className="tk-columns-menu__order">
                  <slots.IconButton
                    size="small"
                    label={`${t('moveColumnLeft')}: ${headerText(c.id, c.columnDef.header)}`}
                    onClick={() =>
                      void handle('onColumnMove', { columnId: c.id, toIndex: index - 1 }, (x) =>
                        table.moveColumn(x.columnId, x.toIndex),
                      )
                    }
                  >
                    {renderIcon(icons.chevronLeft)}
                  </slots.IconButton>
                  <slots.IconButton
                    size="small"
                    label={`${t('moveColumnRight')}: ${headerText(c.id, c.columnDef.header)}`}
                    onClick={() =>
                      void handle('onColumnMove', { columnId: c.id, toIndex: index + 1 }, (x) =>
                        table.moveColumn(x.columnId, x.toIndex),
                      )
                    }
                  >
                    {renderIcon(icons.chevronRight)}
                  </slots.IconButton>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="tk-columns-menu__actions">
        <slots.Button
          variant="text"
          size="small"
          onClick={() => table.toggleAllColumnsVisible(true)}
        >
          {t('showAll')}
        </slots.Button>
        <slots.Button
          variant="text"
          size="small"
          onClick={() => table.toggleAllColumnsVisible(false)}
        >
          {t('hideAll')}
        </slots.Button>
        <slots.Button
          variant="text"
          size="small"
          onClick={() => {
            table.resetColumnVisibility();
            table.resetColumnOrder();
          }}
        >
          {t('resetColumns')}
        </slots.Button>
      </div>
    </div>
  );
});

/** Default `ColumnActionsMenu` slot: renders the (possibly customized) menu items. */
export const ColumnActionsMenu = forwardRef<HTMLDivElement, P<'ColumnActionsMenu'>>(
  function ColumnActionsMenu({ column, items, onClose, className, ...rest }, ref) {
    return (
      <div ref={ref} role="none" className={cx('tk-column-actions', className)} {...rest}>
        {items}
      </div>
    );
  },
);

export { optionKey };
