/**
 * Transforms TypeDoc's `api.json` into the compact per-page JSON the API pages render (08 §6.2).
 *
 * Usage: `node scripts/build-api.mjs` (after `pnpm docs:json` in the library).
 * Output: `src/generated/api/<page>.json`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const API_JSON = resolve(here, '../../../packages/react-tablekit/dist/api.json');
const OUT_DIR = resolve(here, '../src/generated/api');

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
const PAGES = [
  { page: 'data-table', symbols: ['DataTableProps', 'DataTableViewProps', 'DataTableHandle'] },
  {
    page: 'column-def',
    symbols: [
      'ColumnDefBase',
      'AccessorKeyColumnDef',
      'AccessorFnColumnDef',
      'DisplayColumnDef',
      'GroupColumnDef',
    ],
  },
  { page: 'instance', symbols: ['TableInstance', 'Row', 'Column', 'Cell', 'Header'] },
  { page: 'state', symbols: ['TableState', 'TableQuery', 'TableOptions'] },
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
      'functionalUpdate',
      'createTheme',
      'toCssVars',
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
function collectMembers(node, declarations, seen = new Set()) {
  if (!node || seen.has(node)) return [];
  seen.add(node);

  const own = (node.children ?? [])
    .filter((child) => child.kind === KIND.property || child.kind === KIND.method)
    .map(memberOf);

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
    if (type.type === 'reflection') {
      return (type.declaration?.children ?? [])
        .filter((child) => child.kind === KIND.property || child.kind === KIND.method)
        .map(memberOf);
    }
    if (type.type !== 'reference') return [];
    if (declarations.has(type.name)) {
      return collectMembers(declarations.get(type.name), declarations, seen);
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

  const byName = new Map();
  for (const member of [...inherited, ...own]) byName.set(member.name, member);
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
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

// Without `pnpm docs:json` there is nothing to transform. Keep whatever was generated before (or
// write empty pages on a fresh clone) so a standalone site build still succeeds.
if (!existsSync(API_JSON)) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const { page } of PAGES) {
    const file = resolve(OUT_DIR, `${page}.json`);
    if (!existsSync(file)) writeFileSync(file, '[]\n');
  }
  console.warn(
    '[build-api] dist/api.json not found — run `pnpm docs:json` first. Pages left as is.',
  );
  process.exit(0);
}

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

// A page whose symbols resolve but document nothing renders a heading and no content. That used
// to pass every gate silently, so it fails the build instead.
if (emptyPages.length > 0) {
  console.error(
    `[build-api] no members or signatures for: ${emptyPages.join(', ')}. ` +
      'The symbols resolved but carry no documented content — check the TypeDoc reflection kinds.',
  );
  process.exit(1);
}
