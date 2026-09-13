/**
 * react-tablekit: headless-core React data table with client and server modes, slots, handler
 * middleware and CSS-variable theming.
 *
 * @packageDocumentation
 */
export { version } from './version';

// components
export { DataTable, type DataTableComponent } from './react/DataTable';
export {
  ActionButton,
  RowActionsMenu,
  Tooltip,
  Checkbox,
  Chip,
  ChipList,
  TruncatedText,
  MultiLineList,
  TwoLineText,
  type ActionButtonProps,
  type RowActionsMenuProps,
  type TooltipProps,
  type CheckboxProps,
  type ChipProps,
  type ChipListProps,
  type TruncatedTextProps,
  type MultiLineListProps,
  type TwoLineTextProps,
} from './react/components';

// hooks
export {
  useDataTable,
  useTableState,
  useDataSource,
  useDetailPanelData,
  useBreakpoint,
  useVirtualRows,
  useRouterSync,
  useSyncState,
  encodeState,
  decodeState,
  type DataSourceState,
  type UseVirtualRowsOptions,
  type VirtualRow,
  type VirtualRowsResult,
  type RouterSyncAdapter,
} from './react/hooks';
export { useTableContext, useTableSlots } from './react/context';

// providers
export { TableThemeProvider, TableLocaleProvider, TableDefaultsProvider } from './react/context';

// rendering helpers
export { flexRender, renderCell, renderHeader } from './react/flexRender';

// utilities
export {
  createColumnHelper,
  defineColumns,
  createRestDataSource,
  createLocalDataSource,
  exportToCsv,
  getPageItems,
  type ColumnHelper,
  type RestRequest,
  type RestDataSourceOptions,
  type LocalDataSourceOptions,
} from './utils';
export { createTable, functionalUpdate } from './core';
export { sortingFns, filterFns, aggregationFns } from './core/fns';

// themes
export {
  classicTheme,
  lightTheme,
  darkTheme,
  compactTheme,
  minimalTheme,
  createTheme,
  toCssVars,
  presets,
  TOKEN_VARS,
  type TokenPath,
} from './themes';

// localization
export { en as defaultLocalization } from './locales/en';
export type { TableLocalization, TableFormatters, LocalizedString } from './locales/types';

// icons
export { defaultIcons, type TableIcons, type TableIcon, type IconProps } from './icons';

// types
export type * from './core/types';
export type * from './themes/types';
export type * from './react/types';
