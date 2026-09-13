import { createElement, isValidElement, type ComponentType, type ReactNode } from 'react';
import type { Cell, ColumnTemplate, Header } from '../core/types';

const isComponentLike = (fn: unknown): boolean => {
  if (typeof fn !== 'function') return false;
  const proto = (fn as { prototype?: { isReactComponent?: unknown } }).prototype;
  return !!proto?.isReactComponent;
};

/**
 * Renders a column template (`header` / `cell` / `footer`) with its context. Functions are called;
 * class components are created; values are rendered as-is.
 */
export function flexRender<TProps extends object>(
  template: ColumnTemplate<TProps> | undefined,
  props: TProps,
): ReactNode {
  if (template === undefined || template === null) return null;
  if (isComponentLike(template))
    return createElement(template as unknown as ComponentType<TProps>, props);
  if (typeof template === 'function') return (template as (p: TProps) => ReactNode)(props);
  if (isValidElement(template) || typeof template !== 'object') return template as ReactNode;
  return template as ReactNode;
}

/** Renders a cell's `cell` template (06 §10 headless usage). */
export function renderCell<TData>(cell: Cell<TData>): ReactNode {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

/** Renders a header's `header` template. */
export function renderHeader<TData>(header: Header<TData>): ReactNode {
  return flexRender(header.column.columnDef.header, header.getContext());
}
