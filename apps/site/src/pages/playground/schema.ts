/**
 * The playground's control schema (08 §4). Each control maps to one prop; only values that differ
 * from the default are written into the generated code and the shareable URL hash.
 */
export type ControlKind = 'boolean' | 'select' | 'number';

export interface Control {
  /** The prop this control sets. */
  id: string;
  label: string;
  kind: ControlKind;
  /** The value the library uses when the prop is absent. */
  default: string | number | boolean;
  /** Options for `select` controls. */
  options?: (string | number)[];
  min?: number;
  max?: number;
  /** Short explanation shown under the control. */
  hint?: string;
}

export interface ControlGroup {
  id: string;
  label: string;
  controls: Control[];
}

export const DATASETS = ['people', 'customers', 'tree', 'generated-10k'] as const;
export type DatasetName = (typeof DATASETS)[number];

/** Groups mirror the feature sections of docs/05. */
export const SCHEMA: ControlGroup[] = [
  {
    id: 'data',
    label: 'Data',
    controls: [
      {
        id: 'dataset',
        label: 'Dataset',
        kind: 'select',
        default: 'people',
        options: [...DATASETS],
      },
      { id: 'rowCount', label: 'Rows', kind: 'number', default: 200, min: 0, max: 10000 },
      {
        id: 'dataMode',
        label: 'Mode',
        kind: 'select',
        default: 'client',
        options: ['client', 'server'],
        hint: 'Server mode runs against a simulated API with latency.',
      },
      { id: 'latencyMs', label: 'Latency (ms)', kind: 'number', default: 300, min: 0, max: 3000 },
      { id: 'failRate', label: 'Failure rate', kind: 'number', default: 0, min: 0, max: 1 },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    controls: [
      { id: 'enableSorting', label: 'Sorting', kind: 'boolean', default: true },
      { id: 'enableMultiSort', label: 'Multi-sort', kind: 'boolean', default: true },
      { id: 'enableGlobalFilter', label: 'Global search', kind: 'boolean', default: true },
      { id: 'highlightSearchMatches', label: 'Highlight matches', kind: 'boolean', default: false },
      { id: 'enableColumnFilters', label: 'Column filters', kind: 'boolean', default: true },
      {
        id: 'filterDisplayMode',
        label: 'Filter display',
        kind: 'select',
        default: 'panel',
        options: ['panel', 'popover', 'row', 'none'],
      },
      { id: 'showActiveFilterChips', label: 'Filter chips', kind: 'boolean', default: false },
      { id: 'enableRowSelection', label: 'Row selection', kind: 'boolean', default: false },
      { id: 'enableMultiRowSelection', label: 'Multi-selection', kind: 'boolean', default: true },
      { id: 'enableExpanding', label: 'Expansion', kind: 'boolean', default: false },
      { id: 'enableGrouping', label: 'Grouping', kind: 'boolean', default: false },
      { id: 'enableHiding', label: 'Columns menu', kind: 'boolean', default: false },
      { id: 'enableColumnActions', label: 'Column menu', kind: 'boolean', default: false },
      { id: 'enableColumnResizing', label: 'Resizing', kind: 'boolean', default: false },
      { id: 'enableColumnOrdering', label: 'Reordering', kind: 'boolean', default: false },
      { id: 'enableDensityToggle', label: 'Density toggle', kind: 'boolean', default: false },
      { id: 'enableExport', label: 'Export', kind: 'boolean', default: false },
      { id: 'enableKeyboardNavigation', label: 'Keyboard grid', kind: 'boolean', default: false },
      { id: 'enableStickyHeader', label: 'Sticky header', kind: 'boolean', default: false },
      { id: 'enableRowVirtualization', label: 'Virtualization', kind: 'boolean', default: false },
    ],
  },
  {
    id: 'pagination',
    label: 'Pagination',
    controls: [
      { id: 'enablePagination', label: 'Enabled', kind: 'boolean', default: true },
      {
        id: 'paginationVariant',
        label: 'Variant',
        kind: 'select',
        default: 'numbered',
        options: ['numbered', 'compact', 'simple', 'loadMore', 'infinite'],
      },
      { id: 'pageSize', label: 'Page size', kind: 'number', default: 10, min: 1, max: 100 },
      { id: 'showRowRange', label: 'Row range', kind: 'boolean', default: true },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    controls: [
      {
        id: 'theme',
        label: 'Preset',
        kind: 'select',
        default: 'light',
        options: ['light', 'classic', 'dark', 'compact', 'minimal'],
      },
      {
        id: 'density',
        label: 'Density',
        kind: 'select',
        default: 'standard',
        options: ['compact', 'standard', 'comfortable'],
      },
      {
        id: 'locale',
        label: 'Language',
        kind: 'select',
        default: 'en',
        options: ['en', 'hu', 'de', 'es'],
      },
      {
        id: 'mobileLayout',
        label: 'Mobile layout',
        kind: 'select',
        default: 'scroll',
        options: ['scroll', 'cards'],
      },
    ],
  },
];

/** Every control, flattened. */
export const ALL_CONTROLS: Control[] = SCHEMA.flatMap((group) => group.controls);

export type PlaygroundValues = Record<string, string | number | boolean>;

/** The default value of every control. */
export function defaultValues(): PlaygroundValues {
  return Object.fromEntries(ALL_CONTROLS.map((c) => [c.id, c.default]));
}

/** Only the values that differ from the defaults — what the code and the URL need. */
export function changedValues(values: PlaygroundValues): PlaygroundValues {
  return Object.fromEntries(
    ALL_CONTROLS.filter((c) => values[c.id] !== c.default).map((c) => [c.id, values[c.id]!]),
  );
}

/** Serializes the changed values into a URL hash. */
export function encodeHash(values: PlaygroundValues): string {
  const changed = changedValues(values);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(changed)) params.set(key, String(value));
  return params.toString();
}

/** Reads values back from a URL hash, falling back to the defaults. */
export function decodeHash(hash: string): PlaygroundValues {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const values = defaultValues();
  for (const control of ALL_CONTROLS) {
    const raw = params.get(control.id);
    if (raw === null) continue;
    values[control.id] =
      control.kind === 'boolean' ? raw === 'true' : control.kind === 'number' ? Number(raw) : raw;
  }
  return values;
}
