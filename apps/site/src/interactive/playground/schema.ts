/**
 * The playground's **setup** controls: the things around the table that are not props of
 * it — which data to show, whether it comes from memory or a simulated API, the preset, the
 * language and the initial state. Every actual prop is generated from the package's types in
 * `./props.ts`, so none is listed here.
 */
export type ControlKind = 'boolean' | 'select' | 'number';

export interface Control {
  id: string;
  label: string;
  kind: ControlKind;
  default: string | number | boolean;
  options?: (string | number)[];
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

export interface ControlGroup {
  id: string;
  label: string;
  controls: Control[];
}

export const DATASETS = ['people', 'accounts', 'tree', 'generated-10k'] as const;
export type DatasetName = (typeof DATASETS)[number];

export const SCHEMA: ControlGroup[] = [
  {
    id: 'setup',
    label: 'Setup',
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
        id: 'source',
        label: 'Data from',
        kind: 'select',
        default: 'memory',
        options: ['memory', 'api'],
        hint: '"api" passes a dataSource that simulates a server with latency.',
      },
      {
        id: 'latencyMs',
        label: 'API latency (ms)',
        kind: 'number',
        default: 300,
        min: 0,
        max: 3000,
      },
      {
        id: 'failRate',
        label: 'API failure rate',
        kind: 'number',
        default: 0,
        min: 0,
        max: 1,
        step: 0.1,
      },
      {
        id: 'theme',
        label: 'Preset',
        kind: 'select',
        default: 'light',
        options: ['light', 'classic', 'dark', 'compact', 'minimal'],
      },
      {
        id: 'locale',
        label: 'Language',
        kind: 'select',
        default: 'en',
        options: ['en', 'hu', 'de', 'es'],
      },
      {
        id: 'pageSize',
        label: 'Initial page size',
        kind: 'number',
        default: 10,
        min: 1,
        max: 100,
      },
      {
        id: 'density',
        label: 'Initial density',
        kind: 'select',
        default: 'standard',
        options: ['compact', 'standard', 'comfortable'],
      },
    ],
  },
];

/** Every setup control, flattened. */
export const ALL_CONTROLS: Control[] = SCHEMA.flatMap((group) => group.controls);

export type PlaygroundValues = Record<string, string | number | boolean>;

/** The default value of every setup control. */
export function defaultValues(): PlaygroundValues {
  return Object.fromEntries(ALL_CONTROLS.map((c) => [c.id, c.default]));
}

/** Only the setup values that differ from their defaults. */
export function changedValues(values: PlaygroundValues): PlaygroundValues {
  return Object.fromEntries(
    ALL_CONTROLS.filter((c) => values[c.id] !== c.default).map((c) => [c.id, values[c.id]!]),
  );
}

/** Writes the changed setup values into URL search params. */
export function writeSetupParams(values: PlaygroundValues, params: URLSearchParams): void {
  for (const [key, value] of Object.entries(changedValues(values))) params.set(key, String(value));
}

/** Keeps numeric setup values inside the same bounds for controls and shared URLs. */
export function normalizeSetupNumber(control: Control, value: number): number {
  if (!Number.isFinite(value)) return Number(control.default);
  return Math.min(control.max ?? Infinity, Math.max(control.min ?? -Infinity, value));
}

/** Reads setup values back from URL search params, falling back to the defaults. */
export function readSetupParams(params: URLSearchParams): PlaygroundValues {
  const values = defaultValues();
  for (const control of ALL_CONTROLS) {
    const raw = params.get(control.id);
    if (raw === null) continue;
    if (control.kind === 'number') {
      values[control.id] = normalizeSetupNumber(control, Number(raw));
    } else if (control.kind === 'boolean') {
      values[control.id] = raw === 'true';
    } else if (control.options?.map(String).includes(raw)) {
      values[control.id] = raw;
    }
  }
  return values;
}
