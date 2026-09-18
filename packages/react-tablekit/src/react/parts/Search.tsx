import { useEffect, useRef, type CSSProperties } from 'react';
import type { TableInstance } from '../../core/types';
import { useOptionalTable, useView } from '../context';
import { hotkeyLabel, registerHotkey } from '../hotkeys';
import { cx } from '../utils';
import { useTableVersion } from './layout';

/** Props of `DataTable.Search`. */
export interface SearchProps<TData> {
  /** Defaults to the table from context. */
  table?: TableInstance<TData>;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
}

/**
 * The global search input. Render it anywhere inside `DataTable.Root` (for example in a
 * page header) or pass `table` explicitly.
 */
export function Search<TData>({
  table: tableProp,
  className,
  style,
  placeholder,
}: SearchProps<TData>) {
  const table = useOptionalTable(tableProp) as TableInstance<unknown>;
  useTableVersion(table);
  const view = useView();
  const { slots, t, props } = view;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hotkey = props.searchHotkey || undefined;
  const showHint = props.showSearchHotkeyHint ?? !!hotkey;

  useEffect(() => {
    const input = inputRef.current;
    if (!hotkey || !input) return;
    const reg = registerHotkey(hotkey, input.ownerDocument, (event) => {
      void view.handle('onHotkey', { key: hotkey, event }, () => {
        input.focus();
        input.select();
      });
    });
    // The table root (or the search's own wrapper) marks this instance as the active one.
    const scope = input.closest('.tk-root') ?? input.parentElement;
    const touch = () => reg.touch();
    scope?.addEventListener('pointerenter', touch);
    scope?.addEventListener('focusin', touch);
    input.addEventListener('focus', touch);
    return () => {
      reg.dispose();
      scope?.removeEventListener('pointerenter', touch);
      scope?.removeEventListener('focusin', touch);
      input.removeEventListener('focus', touch);
    };
  }, [hotkey, view]);

  if (table.options.enableGlobalFilter === false || table.options.enableFilters === false)
    return null;

  const value = table.getState().globalFilter;
  const setValue = (next: string) =>
    view.handle('onGlobalFilterInput', { value: next, event: undefined }, (ctx) =>
      table.setGlobalFilter(ctx.value),
    );

  const base = {
    value,
    onChange: (v: string) => void setValue(v),
    onClear: () => {
      void setValue('');
      table.flushQuery();
      inputRef.current?.focus();
    },
    placeholder: placeholder ?? props.searchPlaceholder ?? t('searchPlaceholder'),
    label: t('search'),
    clearLabel: t('clearSearch'),
    hotkeyHint:
      showHint && hotkey ? t('searchHotkeyHint', { key: hotkeyLabel(hotkey) }) : undefined,
    inputRef,
    className: cx('tk-search--toolbar', className),
    style,
  };
  // eslint-disable-next-line react-hooks/refs -- view.slot only merges props; it never reads refs or calls handlers during render
  return <slots.SearchInput {...(view.slot('SearchInput', base, base) as typeof base)} />;
}
