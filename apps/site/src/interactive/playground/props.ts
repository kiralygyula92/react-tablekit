import schemaJson from '../../generated/api/playground.json';

/**
 * The playground's prop controls, generated from the package's own type declarations by
 * `scripts/build-api.mjs`. Nothing here lists props by hand, so the playground cannot fall behind
 * the component: a new prop appears as a control on the next build.
 */

export type PropControlKind = 'boolean' | 'select' | 'number' | 'text' | 'numberList';

export interface PropControl {
  /** The prop, or `parent.child` for a field of an option object such as `pagination`. */
  path: string;
  group: string;
  kind: PropControlKind;
  /** The declared type, for display. */
  type: string;
  description: string;
  /** Choices for `select` controls. */
  options?: (string | number | boolean)[];
  /** `text` / `numberList`: the type also accepts `false` (e.g. `pageSizeOptions`, `searchHotkey`). */
  allowFalse?: boolean;
  /** `text`: the type also accepts a number (e.g. `maxHeight`), so numeric input becomes one. */
  numeric?: boolean;
  /** The documented default, when it is a plain literal. */
  default?: string | number | boolean;
  /** The documented default as written, including conditional ones. */
  defaultText?: string;
}

export interface CodeOnlyProp {
  name: string;
  type: string;
  description: string;
}

export interface PropSchema {
  controls: PropControl[];
  codeOnly: CodeOnlyProp[];
}

export const PROP_SCHEMA = schemaJson as PropSchema;

/** A prop value the user set. */
export type PropValue = string | number | boolean | number[];

/**
 * Props the user changed, keyed by path. A path that is absent is **not passed** to the table,
 * so the library's own default applies — many defaults depend on other props, which is why the
 * playground never pretends to know them by pre-filling a value.
 */
export type PropValues = Record<string, PropValue>;

/** Whether a value fits a control; the URL hash is untrusted, so it is validated on the way in. */
export function isValidValue(control: PropControl, value: unknown): value is PropValue {
  switch (control.kind) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'select':
      return (control.options ?? []).some((option) => option === value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'text':
      return (
        typeof value === 'string' ||
        (control.allowFalse === true && value === false) ||
        (control.numeric === true && typeof value === 'number' && Number.isFinite(value))
      );
    case 'numberList':
      return (
        (control.allowFalse === true && value === false) ||
        (Array.isArray(value) && value.every((n) => typeof n === 'number' && Number.isFinite(n)))
      );
  }
}

/** `{ 'pagination.pageSizeOptions': false }` → `{ pagination: { pageSizeOptions: false } }`. */
export function unflatten(values: PropValues): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(values)) {
    const dot = path.indexOf('.');
    if (dot === -1) {
      result[path] = value;
      continue;
    }
    const parent = path.slice(0, dot);
    const existing = result[parent];
    const bag =
      existing !== null && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
    bag[path.slice(dot + 1)] = value;
    result[parent] = bag;
  }
  return result;
}

const HASH_PREFIX = 'p.';

/** Writes the changed props into URL search params as `p.<path>=<json>`. */
export function writePropParams(values: PropValues, params: URLSearchParams): void {
  for (const [path, value] of Object.entries(values)) {
    params.set(`${HASH_PREFIX}${path}`, JSON.stringify(value));
  }
}

/** Reads props back from URL search params, keeping only known paths with valid values. */
export function readPropParams(
  params: URLSearchParams,
  controls: readonly PropControl[] = PROP_SCHEMA.controls,
): PropValues {
  const byPath = new Map(controls.map((control) => [control.path, control]));
  const values: PropValues = {};
  for (const [key, raw] of params) {
    if (!key.startsWith(HASH_PREFIX)) continue;
    const control = byPath.get(key.slice(HASH_PREFIX.length));
    if (!control) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (isValidValue(control, parsed)) values[control.path] = parsed;
  }
  return values;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A value as JavaScript source: single-quoted strings and unquoted keys, as people write it. */
export function jsLiteral(value: unknown): string {
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map(jsLiteral).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, v]) => `${IDENTIFIER.test(key) ? key : jsLiteral(key)}: ${jsLiteral(v)}`,
    );
    return entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`;
  }
  return 'undefined';
}

/** JSX attribute lines for a props object, in the order given. */
export function propsToJsx(props: Record<string, unknown>): string[] {
  return Object.entries(props).map(([name, value]) => {
    if (value === true) return `  ${name}`;
    if (typeof value === 'string' && !/["{}]/.test(value)) return `  ${name}="${value}"`;
    return `  ${name}={${jsLiteral(value)}}`;
  });
}

/** The group order in the panel: the features people reach for first come first. */
export const GROUP_ORDER = [
  'Data modes',
  'Pagination',
  'Pagination options',
  'Compact pagination options',
  'Sorting',
  'Search',
  'Filtering',
  'Selection',
  'Expansion',
  'Grouping',
  'Columns',
  'Layout and scrolling',
  'Toolbar',
  'States',
  'Export',
  'Responsive options',
  'Appearance',
  'Keyboard and accessibility',
  'Other',
];

/** Controls grouped for display, in {@link GROUP_ORDER}; unknown groups go last. */
export function groupControls(controls: readonly PropControl[]): [string, PropControl[]][] {
  const groups = new Map<string, PropControl[]>();
  for (const control of controls) {
    const list = groups.get(control.group);
    if (list) list.push(control);
    else groups.set(control.group, [control]);
  }
  const rank = (group: string) => {
    const index = GROUP_ORDER.indexOf(group);
    return index === -1 ? GROUP_ORDER.length : index;
  };
  return [...groups].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Matches a control against the filter box: its path, type or description. */
export function matchesFilter(control: PropControl, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  return (
    control.path.toLowerCase().includes(q) ||
    control.type.toLowerCase().includes(q) ||
    control.description.toLowerCase().includes(q)
  );
}
