import type { ComponentType, ReactNode, SVGProps } from 'react';

/** Props every icon component accepts. */
export interface IconProps {
  className?: string;
  'aria-hidden'?: boolean;
}

/** An icon: a node, or a component rendered with `IconProps`. */
export type TableIcon = ReactNode | ComponentType<IconProps>;

/** Every icon key. */
export interface TableIcons {
  sortAsc: TableIcon;
  sortDesc: TableIcon;
  sortNone: TableIcon;
  filter: TableIcon;
  filterActive: TableIcon;
  search: TableIcon;
  clear: TableIcon;
  columns: TableIcon;
  density: TableIcon;
  export: TableIcon;
  expand: TableIcon;
  collapse: TableIcon;
  expandAll: TableIcon;
  collapseAll: TableIcon;
  dragHandle: TableIcon;
  pinLeft: TableIcon;
  pinRight: TableIcon;
  unpin: TableIcon;
  hide: TableIcon;
  more: TableIcon;
  first: TableIcon;
  prev: TableIcon;
  next: TableIcon;
  last: TableIcon;
  chevronLeft: TableIcon;
  chevronRight: TableIcon;
  check: TableIcon;
  indeterminate: TableIcon;
  spinner: TableIcon;
  error: TableIcon;
  info: TableIcon;
  close: TableIcon;
  chevronDown: TableIcon;
}

type SvgProps = SVGProps<SVGSVGElement> & IconProps;

/** Creates a 16px `currentColor` icon from SVG path data. */
function icon(name: string, d: string, props: Partial<SVGProps<SVGPathElement>> = {}) {
  const Icon = ({ className, ...rest }: SvgProps) => (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `tk-icon ${className}` : 'tk-icon'}
      {...rest}
    >
      <path d={d} {...props} />
    </svg>
  );
  Icon.displayName = `${name}Icon`;
  return Icon;
}

export const SortAscIcon = icon('SortAsc', 'M8 13V3M4 7l4-4 4 4');
export const SortDescIcon = icon('SortDesc', 'M8 3v10M4 9l4 4 4-4');
export const SortNoneIcon = icon('SortNone', 'M5 6l3-3 3 3M5 10l3 3 3-3');
export const FilterIcon = icon('Filter', 'M2.5 3.5h11l-4.25 5v4l-2.5 1v-5z');
export const FilterActiveIcon = icon('FilterActive', 'M2.5 3.5h11l-4.25 5v4l-2.5 1v-5z', {
  fill: 'currentColor',
});
export const SearchIcon = icon('Search', 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.5-3.5');
export const ClearIcon = icon('Clear', 'M4 4l8 8M12 4l-8 8');
export const ColumnsIcon = icon('Columns', 'M2.5 3h11v10h-11zM6.2 3v10M9.8 3v10');
export const DensityIcon = icon('Density', 'M2.5 4h11M2.5 8h11M2.5 12h11');
export const ExportIcon = icon('Export', 'M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10');
export const ExpandIcon = icon('Expand', 'M6 4l4 4-4 4');
export const CollapseIcon = icon('Collapse', 'M4 6l4 4 4-4');
export const ExpandAllIcon = icon('ExpandAll', 'M4 4l4 4 4-4M4 8.5l4 4 4-4');
export const CollapseAllIcon = icon('CollapseAll', 'M4 12l4-4 4 4M4 7.5l4-4 4 4');
export const DragHandleIcon = icon(
  'DragHandle',
  'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01',
  { strokeWidth: 2.5 },
);
export const PinLeftIcon = icon('PinLeft', 'M3 2.5v11M13 8H6M9 5L6 8l3 3');
export const PinRightIcon = icon('PinRight', 'M13 2.5v11M3 8h7M7 5l3 3-3 3');
export const UnpinIcon = icon('Unpin', 'M2.5 2.5l11 11M6 3h4l-.5 4 2 2H9M7 9H4.5l2-2');
export const HideIcon = icon(
  'Hide',
  'M2 2l12 12M6.6 6.6a2 2 0 0 0 2.8 2.8M4.3 4.3C3 5.2 2 6.5 1.5 8c1.1 3 3.8 5 6.5 5 1.3 0 2.5-.4 3.6-1.1M13.4 10.7c.5-.8.9-1.7 1.1-2.7-1.1-3-3.8-5-6.5-5-.6 0-1.2.1-1.8.3',
);
export const MoreIcon = icon('More', 'M8 3.5h.01M8 8h.01M8 12.5h.01', { strokeWidth: 3 });
export const FirstIcon = icon('First', 'M11.5 4l-4 4 4 4M4.5 4v8');
export const PrevIcon = icon('Prev', 'M13 8H3M7 4L3 8l4 4');
export const NextIcon = icon('Next', 'M3 8h10M9 4l4 4-4 4');
export const LastIcon = icon('Last', 'M4.5 4l4 4-4 4M11.5 4v8');
export const ChevronLeftIcon = icon('ChevronLeft', 'M10 4L6 8l4 4');
export const ChevronRightIcon = icon('ChevronRight', 'M6 4l4 4-4 4');
export const CheckIcon = icon('Check', 'M3.5 8.5l3 3 6-7', { strokeWidth: 2 });
export const IndeterminateIcon = icon('Indeterminate', 'M4 8h8', { strokeWidth: 2 });
export const SpinnerIcon = icon('Spinner', 'M8 1.75A6.25 6.25 0 1 1 1.75 8');
export const ErrorIcon = icon(
  'Error',
  'M8 14.5A6.5 6.5 0 1 0 8 1.5a6.5 6.5 0 0 0 0 13zM8 5v3.5M8 11h.01',
);
export const InfoIcon = icon(
  'Info',
  'M8 14.5A6.5 6.5 0 1 0 8 1.5a6.5 6.5 0 0 0 0 13zM8 7.5V11M8 5h.01',
);
export const CloseIcon = icon('Close', 'M4 4l8 8M12 4l-8 8');
export const ChevronDownIcon = icon('ChevronDown', 'M4 6l4 4 4-4');

/** The built-in icon set. */
export const defaultIcons: TableIcons = {
  sortAsc: SortAscIcon,
  sortDesc: SortDescIcon,
  sortNone: SortNoneIcon,
  filter: FilterIcon,
  filterActive: FilterActiveIcon,
  search: SearchIcon,
  clear: ClearIcon,
  columns: ColumnsIcon,
  density: DensityIcon,
  export: ExportIcon,
  expand: ExpandIcon,
  collapse: CollapseIcon,
  expandAll: ExpandAllIcon,
  collapseAll: CollapseAllIcon,
  dragHandle: DragHandleIcon,
  pinLeft: PinLeftIcon,
  pinRight: PinRightIcon,
  unpin: UnpinIcon,
  hide: HideIcon,
  more: MoreIcon,
  first: FirstIcon,
  prev: PrevIcon,
  next: NextIcon,
  last: LastIcon,
  chevronLeft: ChevronLeftIcon,
  chevronRight: ChevronRightIcon,
  check: CheckIcon,
  indeterminate: IndeterminateIcon,
  spinner: SpinnerIcon,
  error: ErrorIcon,
  info: InfoIcon,
  close: CloseIcon,
  chevronDown: ChevronDownIcon,
};
