/**
 * Transforms TypeDoc's `api.json` into the compact per-page JSON the API pages render (08 §6.2).
 *
 * It runs TypeDoc itself when that file is missing, so there is no build order to get right: the
 * script that needs the data produces it, in development, in CI and on the host. Getting that
 * order wrong used to fail the deployment — or, worse, ship twelve empty reference pages.
 *
 * Usage: `node scripts/build-api.mjs`. Output: `src/generated/api/<page>.json`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = resolve(here, '../../../packages/react-tablekit');
const API_JSON = resolve(LIB_DIR, 'dist/api.json');
const OUT_DIR = resolve(here, '../src/generated/api');

/** Runs TypeDoc over the library's source, the same way its own `docs:json` script does. */
function generateApiJson() {
  const require = createRequire(resolve(LIB_DIR, 'package.json'));
  const bin = resolve(dirname(require.resolve('typedoc/package.json')), 'bin/typedoc');
  console.log('[build-api] dist/api.json not found — running TypeDoc');
  execFileSync(process.execPath, [bin, '--json', API_JSON], { cwd: LIB_DIR, stdio: 'inherit' });
}

/** TypeDoc reflection kinds we care about. */
const KIND = {
  variable: 32,
  function: 64,
  interface: 256,
  property: 1024,
  method: 2048,
  typeAlias: 2097152,
};

/** The pages we generate, and which exported symbols belong to each. */
/**
 * Symbols documented by a page that is rendered from runtime metadata rather than from TypeDoc.
 * They still have to resolve, because a capability page may cite them in its `symbols`
 * frontmatter (conformance check 11).
 */
const METADATA_SYMBOLS = {
  TableSlots: 'slots',
  SlotName: 'slots',
  SlotPropsMap: 'slots',
  TableHandlers: 'handlers',
  TableTheme: 'theme-tokens',
  TableThemeTokens: 'theme-tokens',
  TokenPath: 'theme-tokens',
  TableLocalization: 'localization-keys',
  TableFormatters: 'localization-keys',
  TableIcons: 'icons',
};

/** A page id under /api/ → its URL. */
const routeOf = (page) =>
  `/react-tablekit/api/${
    { 'data-table': 'data-table-props', instance: 'table-instance', state: 'table-state' }[page] ??
    page
  }/`;

const PAGES = [
  { page: 'data-table', symbols: ['DataTableProps', 'DataTableViewProps', 'DataTableHandle'] },
  {
    page: 'column-def',
    symbols: [
      'ColumnDef',
      'ColumnDefBase',
      'AccessorKeyColumnDef',
      'AccessorFnColumnDef',
      'DisplayColumnDef',
      'GroupColumnDef',
    ],
  },
  { page: 'instance', symbols: ['TableInstance', 'Row', 'Column', 'Cell', 'Header'] },
  {
    page: 'state',
    symbols: [
      'TableState',
      'TableQuery',
      'TableOptions',
      'SelectionQuery',
      'DataSource',
      'DataSourceResult',
      'DataSourceState',
    ],
  },
  {
    page: 'hooks',
    symbols: [
      'useDataTable',
      'useDataSource',
      'useTableState',
      'useDetailPanelData',
      'useBreakpoint',
      'useVirtualRows',
      'useSyncState',
      'useRouterSync',
      'useTableSlots',
      'useTableContext',
    ],
  },
  {
    page: 'utilities',
    symbols: [
      'createColumnHelper',
      'defineColumns',
      'createRestDataSource',
      'createLocalDataSource',
      'exportToCsv',
      'getPageItems',
      'createTable',
      'createTheme',
      'toCssVars',
      'functionalUpdate',
      'sortingFns',
      'filterFns',
      'aggregationFns',
      'flexRender',
      'ActionButton',
      'RowActionsMenu',
      'Tooltip',
      'Checkbox',
      'Chip',
      'ChipList',
      'TruncatedText',
      'MultiLineList',
      'TwoLineText',
    ],
  },
];

/** Renders a TypeDoc type reflection as a readable type string. */
function typeString(type) {
  if (!type) return 'unknown';
  switch (type.type) {
    case 'intrinsic':
    case 'literal':
      return type.type === 'literal' ? JSON.stringify(type.value) : type.name;
    case 'reference':
      return type.typeArguments?.length
        ? `${type.name}<${type.typeArguments.map(typeString).join(', ')}>`
        : type.name;
    case 'union':
      return type.types.map(typeString).join(' | ');
    case 'intersection':
      return type.types.map(typeString).join(' & ');
    case 'array':
      return `${typeString(type.elementType)}[]`;
    case 'reflection':
      return type.declaration?.signatures?.length ? 'function' : 'object';
    case 'tuple':
      return `[${(type.elements ?? []).map(typeString).join(', ')}]`;
    case 'indexedAccess':
      return `${typeString(type.objectType)}[${typeString(type.indexType)}]`;
    case 'templateLiteral':
      return 'template literal';
    case 'typeOperator':
      return `${type.operator} ${typeString(type.target)}`;
    default:
      return type.name ?? type.type;
  }
}

/** Joins a TypeDoc comment into plain text. */
const commentText = (comment) =>
  (comment?.summary ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

/** Reads a block tag such as `@default`. */
function blockTag(comment, tag) {
  const block = (comment?.blockTags ?? []).find((b) => b.tag === tag);
  return block ? commentText({ summary: block.content }) : undefined;
}

/** Renders a method's signature as its "type", e.g. `(id: string) => Row | undefined`. */
function methodType(signature) {
  const params = (signature?.parameters ?? [])
    .map((p) => `${p.name}${p.flags?.isOptional === true ? '?' : ''}: ${typeString(p.type)}`)
    .join(', ');
  return `(${params}) => ${typeString(signature?.type)}`;
}

/** One documented member: a property, or a method rendered as its signature. */
function memberOf(child) {
  const signature = child.signatures?.[0];
  const isMethod = child.kind === KIND.method;
  return {
    name: child.name,
    type: isMethod ? methodType(signature) : typeString(child.type),
    optional: child.flags?.isOptional === true,
    description: commentText(child.comment) || commentText(signature?.comment),
    default: blockTag(child.comment, '@default') ?? blockTag(signature?.comment, '@default'),
    deprecated:
      blockTag(child.comment, '@deprecated') ?? blockTag(signature?.comment, '@deprecated'),
  };
}

/**
 * Collects a declaration's documented members.
 *
 * Three things make this more than "read `children`":
 *
 * - `TableInstance` is mostly **methods**, not properties;
 * - `DataTableProps` is a type alias over an **intersection**, so it has no children of its own
 *   and its props live in the types it intersects;
 * - an interface that `extends` another would otherwise lose every inherited prop.
 *
 * Own members win over inherited ones, which is what an override means.
 */
function collectMembers(node, declarations) {
  return [...collectChildren(node, declarations).values()]
    .map(memberOf)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The raw reflection nodes behind {@link collectMembers}, keyed by name. The API pages turn them
 * into display strings; the playground needs the structured types to decide which control fits.
 */
function collectChildren(node, declarations, seen = new Set()) {
  const byName = new Map();
  if (!node || seen.has(node)) return byName;
  seen.add(node);

  const isMember = (child) => child.kind === KIND.property || child.kind === KIND.method;
  const own = (node.children ?? []).filter(isMember);

  /** The literal key names of `Omit` / `Pick`'s second type argument. */
  const keysOf = (type) => {
    if (!type) return [];
    if (type.type === 'literal') return [String(type.value)];
    if (type.type === 'union') return type.types.flatMap(keysOf);
    return [];
  };

  /**
   * Follows a type back to the members it contributes.
   *
   * Plain references are the easy case. The public props are also built from mapped types —
   * `DataTableProps` is `Omit<TableOptions, …> & DataTableViewProps & { … }` — and because `Omit`
   * is not a declaration in its own right, ignoring it silently dropped every engine option from
   * the page, `enableRowSelection` included.
   */
  const membersFrom = (type) => {
    if (!type) return [];
    if (type.type === 'reflection') return (type.declaration?.children ?? []).filter(isMember);
    if (type.type !== 'reference') return [];
    if (declarations.has(type.name)) {
      return [...collectChildren(declarations.get(type.name), declarations, seen).values()];
    }
    const args = type.typeArguments ?? [];
    switch (type.name) {
      case 'Omit': {
        const dropped = new Set(keysOf(args[1]));
        return membersFrom(args[0]).filter((member) => !dropped.has(member.name));
      }
      case 'Pick': {
        const kept = new Set(keysOf(args[1]));
        return membersFrom(args[0]).filter((member) => kept.has(member.name));
      }
      case 'Partial':
      case 'Required':
      case 'Readonly':
      case 'NonNullable':
        return membersFrom(args[0]);
      default:
        return [];
    }
  };

  const inherited = [
    ...(node.extendedTypes ?? []).flatMap(membersFrom),
    ...(node.type?.type === 'intersection'
      ? node.type.types.flatMap(membersFrom)
      : membersFrom(node.type)),
  ];

  for (const member of [...inherited, ...own]) byName.set(member.name, member);
  return byName;
}

/** Flattens one declaration into `{ name, kind, description, members, signatures }`. */
function declarationOf(node, declarations) {
  const signatures = (node.signatures ?? []).map((sig) => ({
    name: sig.name,
    returns: typeString(sig.type),
    description: commentText(sig.comment),
    params: (sig.parameters ?? []).map((p) => ({
      name: p.name,
      type: typeString(p.type),
      optional: p.flags?.isOptional === true,
    })),
  }));

  return {
    name: node.name,
    kind:
      node.kind === KIND.interface
        ? 'interface'
        : node.kind === KIND.function
          ? 'function'
          : node.kind === KIND.typeAlias
            ? 'type'
            : 'variable',
    description: commentText(node.comment) || commentText(node.signatures?.[0]?.comment),
    example:
      blockTag(node.comment, '@example') ?? blockTag(node.signatures?.[0]?.comment, '@example'),
    members: collectMembers(node, declarations),
    signatures,
  };
}

if (!existsSync(API_JSON)) generateApiJson();

const root = JSON.parse(readFileSync(API_JSON, 'utf8'));

/**
 * Both entry points (`index` and `core`) contribute declarations, and a symbol re-exported from
 * the other one appears as an empty `reference` node. Keeping whichever declaration actually
 * carries content is what stops those stubs shadowing the real interface — the bug that left
 * every member table on /api/instance, /api/state and /api/column-def empty.
 */
const contentOf = (node) => (node.children?.length ?? 0) + (node.signatures?.length ?? 0);
const declarations = new Map();
for (const module of root.children ?? []) {
  for (const child of module.children ?? []) {
    const existing = declarations.get(child.name);
    if (!existing || contentOf(child) > contentOf(existing)) declarations.set(child.name, child);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
const emptyPages = [];
for (const { page, symbols } of PAGES) {
  const found = symbols
    .map((name) => declarations.get(name))
    .filter(Boolean)
    .map((node) => declarationOf(node, declarations));
  const missing = symbols.filter((name) => !declarations.has(name));
  if (missing.length > 0) {
    console.warn(`[build-api] ${page}: not exported by the package: ${missing.join(', ')}`);
  }

  const documented = found.reduce((n, s) => n + s.members.length + s.signatures.length, 0);
  if (documented === 0) emptyPages.push(page);

  writeFileSync(resolve(OUT_DIR, `${page}.json`), `${JSON.stringify(found, null, 2)}\n`);
  total += found.length;
  console.log(`[build-api] ${page}.json (${found.length} symbols, ${documented} documented)`);
}
console.log(`[build-api] ${total} symbols written to src/generated/api`);

/* ── symbol index ───────────────────────────────────────────────────────────
   Which reference page documents which symbol. `scripts/build-content.mjs` reads it to resolve
   every `symbols` entry in a page's frontmatter, and to invert those into each symbol's
   `usedBy` list. Written from the same PAGES table the pages themselves come from, so the two
   cannot disagree. */
const symbolIndex = {};
for (const { page, symbols } of PAGES) {
  for (const name of symbols) {
    if (declarations.has(name)) symbolIndex[name] = routeOf(page);
  }
}
for (const [name, page] of Object.entries(METADATA_SYMBOLS)) symbolIndex[name] = routeOf(page);
writeFileSync(
  resolve(OUT_DIR, 'symbols.json'),
  `${JSON.stringify(symbolIndex, null, 2)}
`,
);
console.log(`[build-api] symbols.json (${Object.keys(symbolIndex).length} symbols)`);

/* ── playground schema ──────────────────────────────────────────────────────
   Every prop of <DataTable> becomes a playground control when its type allows one, so the
   playground can never fall behind the component. Props whose type is a function, a component
   or arbitrary data are listed as "code only" instead of being silently left out. */

/** Named type aliases (`DataMode`, `Breakpoint`, `PaginationVariant`) → their types. */
const aliases = new Map();
for (const module of root.children ?? []) {
  for (const child of module.children ?? []) {
    if (child.kind === KIND.typeAlias && child.type && !aliases.has(child.name)) {
      aliases.set(child.name, child.type);
    }
  }
}

/** Option objects that are expanded into their own controls (`pagination.pageSizeOptions`). */
const NESTED = {
  pagination: { type: 'PaginationDisplayOptions', group: 'Pagination options' },
  compactPagination: { type: 'CompactPaginationOptions', group: 'Compact pagination options' },
  responsive: { type: 'ResponsiveOptions', group: 'Responsive options' },
};

/** Props the playground itself supplies, so a control for them would only break the demo. */
const MANAGED = new Set([
  'data',
  'dataSource',
  'columns',
  'getRowId',
  'theme',
  'localization',
  'initialState',
  'state',
  'table',
  'tableRef',
]);

/** Breaks a type down into the atoms a control can represent. */
function atomsOf(type, depth = 0) {
  if (!type || depth > 6) return [{ kind: 'other' }];
  switch (type.type) {
    case 'intrinsic':
      if (type.name === 'boolean') return [{ kind: 'bool' }];
      if (type.name === 'number') return [{ kind: 'num' }];
      if (type.name === 'string') return [{ kind: 'str' }];
      return [{ kind: 'other' }];
    case 'literal':
      return type.value === null ? [] : [{ kind: 'lit', value: type.value }];
    case 'union':
      return type.types.flatMap((t) => atomsOf(t, depth + 1));
    case 'array':
      return type.elementType?.type === 'intrinsic' && type.elementType.name === 'number'
        ? [{ kind: 'numList' }]
        : [{ kind: 'other' }];
    case 'reference': {
      if (type.name === 'ResponsiveValue') return atomsOf(type.typeArguments?.[0], depth + 1);
      if (type.name === 'ReactNode' || type.name === 'Renderable') return [{ kind: 'node' }];
      if (aliases.has(type.name)) return atomsOf(aliases.get(type.name), depth + 1);
      return [{ kind: 'other' }];
    }
    default:
      return [{ kind: 'other' }];
  }
}

/**
 * An `@default` tag as display text. TypeDoc wraps a lone code value in a fence (`` ```ts\n'auto'\n``` ``)
 * and inline code in single backticks, neither of which belongs in a control's hint.
 */
function cleanDefault(text) {
  if (text === undefined) return undefined;
  return text
    .replace(/^`{2,3}\w*\n?/, '')
    .replace(/\n?`{2,3}$/, '')
    .replace(/^`([^`]*)`$/, '$1')
    .trim();
}

/** Parses an `@default` tag into a real value when it is a plain literal. */
function parseDefault(text) {
  const raw = cleanDefault(text);
  if (raw === undefined) return undefined;
  if (raw === 'true' || raw === 'false') return raw === 'true';
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const quoted = /^['"](.*)['"]$/.exec(raw);
  return quoted ? quoted[1] : undefined;
}

/** Picks a playground group from the prop name. */
function groupOf(name) {
  const rules = [
    [
      /^(dataMode|paginationMode|sortingMode|filterMode|searchMode|groupingMode|facetingMode)$|^manual|^rowCount$|^pageCount$/,
      'Data modes',
    ],
    [/search|globalFilter|highlight/i, 'Search'],
    [/filter|facet/i, 'Filtering'],
    [/sort/i, 'Sorting'],
    [/select/i, 'Selection'],
    [/expand|subRow|detail/i, 'Expansion'],
    [/group|aggregat/i, 'Grouping'],
    [/virtual|overscan|estimateRow|maxHeight|minWidth|maxWidth|sticky/i, 'Layout and scrolling'],
    [/column|pin|resiz|order|hiding|header|footer/i, 'Columns'],
    [/pagination|page/i, 'Pagination'],
    [/loading|skeleton|empty|error|overlay|fetch/i, 'States'],
    [/export|csv|clipboard/i, 'Export'],
    [/keyboard|hotkey|aria|announce|caption/i, 'Keyboard and accessibility'],
    [/toolbar|density/i, 'Toolbar'],
    [
      /theme|color|unstyled|bordered|striped|hover|^dir$|noWrap|rowNumber|surface|rounded/i,
      'Appearance',
    ],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? 'Other';
}

/** Decides the control for one member, or returns undefined when it cannot have one. */
function controlOf(path, child, group) {
  const atoms = atomsOf(child.type).filter((a) => a.kind !== 'other');
  const has = (kind) => atoms.some((a) => a.kind === kind);
  const literals = atoms.filter((a) => a.kind === 'lit').map((a) => a.value);
  const allowFalse = literals.includes(false);
  const base = {
    path,
    group,
    type: typeString(child.type),
    description: commentText(child.comment) || commentText(child.signatures?.[0]?.comment),
  };
  const defaultText = blockTag(child.comment, '@default');
  if (defaultText !== undefined) base.defaultText = cleanDefault(defaultText);
  const parsed = parseDefault(defaultText);
  if (parsed !== undefined) base.default = parsed;

  if (has('numList')) return { ...base, kind: 'numberList', allowFalse };
  if (has('str') || has('node')) return { ...base, kind: 'text', allowFalse, numeric: has('num') };
  const options = [
    ...(has('bool') ? [true, false] : []),
    ...literals.filter((v) => typeof v !== 'boolean' || !has('bool')),
  ].filter((v, i, all) => all.indexOf(v) === i);
  if (options.length > 0 && literals.some((v) => typeof v !== 'boolean')) {
    return { ...base, kind: 'select', options };
  }
  if (has('bool')) return { ...base, kind: 'boolean' };
  if (has('num')) return { ...base, kind: 'number' };
  return undefined;
}

const tableProps = collectChildren(declarations.get('DataTableProps'), declarations);
const controls = [];
const codeOnly = [];
for (const [name, child] of [...tableProps].sort(([a], [b]) => a.localeCompare(b))) {
  if (MANAGED.has(name)) continue;
  if (child.kind === KIND.method) {
    codeOnly.push({ name, type: 'function', description: commentText(child.comment) });
    continue;
  }
  const nested = NESTED[name];
  if (nested && declarations.has(nested.type)) {
    for (const [subName, sub] of collectChildren(declarations.get(nested.type), declarations)) {
      const path = `${name}.${subName}`;
      const control = controlOf(path, sub, nested.group);
      if (control) controls.push(control);
      else
        codeOnly.push({
          name: path,
          type: typeString(sub.type),
          description: commentText(sub.comment),
        });
    }
    continue;
  }
  const control = controlOf(name, child, groupOf(name));
  if (control) controls.push(control);
  else
    codeOnly.push({ name, type: typeString(child.type), description: commentText(child.comment) });
}

writeFileSync(
  resolve(OUT_DIR, 'playground.json'),
  `${JSON.stringify({ controls, codeOnly }, null, 2)}\n`,
);
console.log(
  `[build-api] playground.json (${controls.length} controls, ${codeOnly.length} code-only props)`,
);

// The playground's promise is "every prop you can express as a control". A collapse in that
// number means type resolution broke, which would otherwise ship as a near-empty panel.
if (controls.length < 100) {
  console.error(`[build-api] only ${controls.length} playground controls — type resolution broke`);
  process.exit(1);
}

// A page whose symbols resolve but document nothing renders a heading and no content. That used
// to pass every gate silently, so it fails the build instead.
if (emptyPages.length > 0) {
  console.error(
    `[build-api] no members or signatures for: ${emptyPages.join(', ')}. ` +
      'The symbols resolved but carry no documented content — check the TypeDoc reflection kinds.',
  );
  process.exit(1);
}
