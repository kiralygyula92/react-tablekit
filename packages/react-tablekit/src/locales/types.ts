import type { FilterOperator } from '../core/types';

/**
 * A localized string: a template with `{name}` placeholders, or a function of the variables
 * (for complex plural rules).
 */
export type LocalizedString = string | ((vars: Record<string, string | number>) => string);

/** Every user-visible string (06 §8). No hard-coded English anywhere else (fixes B9). */
export interface TableLocalization {
  // toolbar & search
  search: LocalizedString;
  searchPlaceholder: LocalizedString;
  clearSearch: LocalizedString;
  /** `{key}` = the platform hotkey label, e.g. "Ctrl+K". */
  searchHotkeyHint: LocalizedString;
  toolbar: LocalizedString;
  filters: LocalizedString;
  /** `{count}` */
  filtersActive: LocalizedString;
  clearAllFilters: LocalizedString;
  applyFilters: LocalizedString;
  columns: LocalizedString;
  showAll: LocalizedString;
  hideAll: LocalizedString;
  resetColumns: LocalizedString;
  searchColumns: LocalizedString;
  density: LocalizedString;
  densityCompact: LocalizedString;
  densityStandard: LocalizedString;
  densityComfortable: LocalizedString;
  export: LocalizedString;
  exportPage: LocalizedString;
  exportAll: LocalizedString;
  exportSelected: LocalizedString;
  copyToClipboard: LocalizedString;
  /** `{percent}` */
  exportProgress: LocalizedString;
  cancel: LocalizedString;
  // header
  sortAscending: LocalizedString;
  sortDescending: LocalizedString;
  clearSort: LocalizedString;
  sortedAscending: LocalizedString;
  sortedDescending: LocalizedString;
  /** `{index}` */
  sortPriority: LocalizedString;
  columnActions: LocalizedString;
  filterColumn: LocalizedString;
  pinLeft: LocalizedString;
  pinRight: LocalizedString;
  unpin: LocalizedString;
  hideColumn: LocalizedString;
  groupBy: LocalizedString;
  ungroup: LocalizedString;
  autosize: LocalizedString;
  resetSize: LocalizedString;
  resizeColumn: LocalizedString;
  moveColumnLeft: LocalizedString;
  moveColumnRight: LocalizedString;
  dropToGroup: LocalizedString;
  // body
  noRows: LocalizedString;
  noResults: LocalizedString;
  loading: LocalizedString;
  loaded: LocalizedString;
  errorTitle: LocalizedString;
  retry: LocalizedString;
  dismiss: LocalizedString;
  expandRow: LocalizedString;
  collapseRow: LocalizedString;
  expandAll: LocalizedString;
  collapseAll: LocalizedString;
  selectRow: LocalizedString;
  selectAllOnPage: LocalizedString;
  selectAll: LocalizedString;
  deselectAll: LocalizedString;
  /** `{count}` */
  selectedCount: LocalizedString;
  /** `{total}` */
  selectAllMatching: LocalizedString;
  clearSelection: LocalizedString;
  rowActions: LocalizedString;
  moreActions: LocalizedString;
  /** `{column}`, `{value}` */
  groupedBy: LocalizedString;
  rowNumber: LocalizedString;
  // pagination
  pagination: LocalizedString;
  previous: LocalizedString;
  next: LocalizedString;
  first: LocalizedString;
  last: LocalizedString;
  /** `{page}` */
  page: LocalizedString;
  /** `{page}`, `{count}` */
  pageOf: LocalizedString;
  rowsPerPage: LocalizedString;
  /** `{from}`, `{to}`, `{total}` */
  rowRange: LocalizedString;
  many: LocalizedString;
  /** `{remaining}` */
  loadMore: LocalizedString;
  // filters
  operators: Record<FilterOperator, string>;
  operator: LocalizedString;
  any: LocalizedString;
  yes: LocalizedString;
  no: LocalizedString;
  min: LocalizedString;
  max: LocalizedString;
  from: LocalizedString;
  to: LocalizedString;
  /** `{count}` */
  moreOptions: LocalizedString;
  noOptions: LocalizedString;
  datePreset: LocalizedString;
  datePresets: Record<string, string>;
  // announcements
  /** `{column}`, `{direction}` */
  announceSort: LocalizedString;
  announceSortCleared: LocalizedString;
  /** `{page}`, `{count}` */
  announcePage: LocalizedString;
  /** `{count}` */
  announceResults: LocalizedString;
  /** `{column}`, `{position}`, `{count}` */
  announceMove: LocalizedString;
  /** `{count}` */
  announceSelection: LocalizedString;
}

/** Number / date / range formatters (06 §8). Defaults use `Intl` with the table's `locale`. */
export interface TableFormatters {
  /** Formats a numeric cell value. */
  number: (value: number, locale: string) => string;
  /** Formats a date cell value. */
  date: (value: Date | string | number, locale: string) => string;
  /** Formats the three parts of the "11–20 of 235" row range. */
  rowRange: (
    from: number,
    to: number,
    total: number,
    locale: string,
  ) => { from: string; to: string; total: string };
  /** Formats a page number for the pagination controls. */
  page: (n: number, locale: string) => string;
}
