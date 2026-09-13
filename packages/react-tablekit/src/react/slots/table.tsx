import { forwardRef } from 'react';
import { useView } from '../context';
import { renderIcon } from '../renderIcon';
import type { SlotPropsMap } from '../types';
import { cx } from '../utils';

type P<K extends keyof SlotPropsMap<unknown>> = SlotPropsMap<unknown>[K];

/* eslint-disable @typescript-eslint/no-unused-vars -- context props are destructured to keep them off the DOM */

export const Root = forwardRef<HTMLDivElement, P<'Root'>>(function Root({ table, ...rest }, ref) {
  return <div ref={ref} {...rest} />;
});

export const Toolbar = forwardRef<HTMLDivElement, P<'Toolbar'>>(function Toolbar(
  { table, ...rest },
  ref,
) {
  return <div ref={ref} role="toolbar" {...rest} />;
});

export const Container = forwardRef<HTMLDivElement, P<'Container'>>(function Container(
  { hasFooter, scrolledLeft, scrolledRight, ...rest },
  ref,
) {
  return <div ref={ref} {...rest} />;
});

export const Table = forwardRef<HTMLTableElement, P<'Table'>>(function Table(
  { layout, ...rest },
  ref,
) {
  return <table ref={ref} {...rest} />;
});

export const Head = forwardRef<HTMLTableSectionElement, P<'Head'>>(function Head(props, ref) {
  return <thead ref={ref} {...props} />;
});

export const HeaderRow = forwardRef<HTMLTableRowElement, P<'HeaderRow'>>(function HeaderRow(
  { headerGroup, ...rest },
  ref,
) {
  return <tr ref={ref} {...rest} />;
});

export const HeaderCell = forwardRef<HTMLTableCellElement, P<'HeaderCell'>>(function HeaderCell(
  { header, column, isSorted, sortIndex, isPinned, canSort, onSort, ...rest },
  ref,
) {
  return <th ref={ref} {...rest} />;
});

export const SortButton = forwardRef<HTMLButtonElement, P<'SortButton'>>(function SortButton(
  { direction, index, column, type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} {...rest} />;
});

export function SortIcon({ direction, index, className, style }: P<'SortIcon'>) {
  const { icons } = useView();
  const icon =
    direction === 'asc' ? icons.sortAsc : direction === 'desc' ? icons.sortDesc : icons.sortNone;
  return (
    <span
      className={cx('tk-sort-icon', className)}
      style={style}
      data-direction={direction || undefined}
      aria-hidden="true"
    >
      {renderIcon(icon)}
      {index > 0 && <span className="tk-sort-badge">{index + 1}</span>}
    </span>
  );
}

export const ColumnActionsButton = forwardRef<HTMLButtonElement, P<'ColumnActionsButton'>>(
  function ColumnActionsButton({ column, type = 'button', ...rest }, ref) {
    return <button ref={ref} type={type} {...rest} />;
  },
);

export const ResizeHandle = forwardRef<HTMLSpanElement, P<'ResizeHandle'>>(function ResizeHandle(
  { column, isResizing, ...rest },
  ref,
) {
  return <span ref={ref} {...rest} />;
});

export const FilterRow = forwardRef<HTMLTableRowElement, P<'FilterRow'>>(
  function FilterRow(props, ref) {
    return <tr ref={ref} {...props} />;
  },
);

export const FilterRowCell = forwardRef<HTMLTableCellElement, P<'FilterRowCell'>>(
  function FilterRowCell({ column, ...rest }, ref) {
    return <th ref={ref} {...rest} />;
  },
);

export const Body = forwardRef<HTMLTableSectionElement, P<'Body'>>(function Body(
  { rows, ...rest },
  ref,
) {
  return <tbody ref={ref} {...rest} />;
});

export const Row = forwardRef<HTMLTableRowElement, P<'Row'>>(function Row(
  { row, isSelected, isExpanded, isDisabled, depth, index, ...rest },
  ref,
) {
  return <tr ref={ref} {...rest} />;
});

export const Cell = forwardRef<HTMLTableCellElement, P<'Cell'>>(function Cell(
  { cell, column, row, isPinned, as = 'td', ...rest },
  ref,
) {
  const Tag = as;
  return <Tag ref={ref} {...rest} />;
});

export const DetailRow = forwardRef<HTMLTableRowElement, P<'DetailRow'>>(function DetailRow(
  { row, open, ...rest },
  ref,
) {
  return <tr ref={ref} {...rest} />;
});

export const DetailPanel = forwardRef<HTMLDivElement, P<'DetailPanel'>>(function DetailPanel(
  { row, open, ...rest },
  ref,
) {
  return <div ref={ref} {...rest} />;
});

export const GroupRow = forwardRef<HTMLTableRowElement, P<'GroupRow'>>(function GroupRow(
  { row, groupingColumn, value, count, ...rest },
  ref,
) {
  return <tr ref={ref} {...rest} />;
});

export const GroupCell = forwardRef<HTMLTableCellElement, P<'GroupCell'>>(function GroupCell(
  { row, groupingColumn, value, count, ...rest },
  ref,
) {
  return <td ref={ref} {...rest} />;
});

export const Foot = forwardRef<HTMLTableSectionElement, P<'Foot'>>(function Foot(props, ref) {
  return <tfoot ref={ref} {...props} />;
});

export const FooterRow = forwardRef<HTMLTableRowElement, P<'FooterRow'>>(function FooterRow(
  { headerGroup, ...rest },
  ref,
) {
  return <tr ref={ref} {...rest} />;
});

export const FooterCell = forwardRef<HTMLTableCellElement, P<'FooterCell'>>(function FooterCell(
  { header, ...rest },
  ref,
) {
  return <td ref={ref} {...rest} />;
});

export const ExpandButton = forwardRef<HTMLButtonElement, P<'ExpandButton'>>(function ExpandButton(
  { expanded, canExpand, loading, onToggle, row, type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} {...rest} />;
});

export const Card = forwardRef<HTMLElement, P<'Card'>>(function Card({ row, ...rest }, ref) {
  return <article ref={ref} {...rest} />;
});
