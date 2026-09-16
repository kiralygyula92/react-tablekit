import { createColumnHelper, DataTable, TruncatedText } from 'react-tablekit';

/** One member of a documented symbol, as produced by `scripts/build-api.mjs`. */
export interface ApiMember {
  name: string;
  type: string;
  optional: boolean;
  description: string;
  default?: string;
  deprecated?: string;
}

/** One parameter of a documented signature. */
export interface ApiParam {
  name: string;
  type: string;
  optional: boolean;
}

/** One documented signature (functions and hooks). */
export interface ApiSignature {
  name: string;
  returns: string;
  description: string;
  params: ApiParam[];
}

/** One exported symbol. */
export interface ApiSymbol {
  name: string;
  kind: 'interface' | 'function' | 'type' | 'variable';
  description: string;
  example?: string;
  members: ApiMember[];
  signatures: ApiSignature[];
}

const col = createColumnHelper<ApiMember>();

const columns = [
  col.accessor('name', {
    header: 'Name',
    cell: ({ getValue, row }) => (
      <span id={row.original.name}>
        <code>{getValue()}</code>
        {!row.original.optional && <span className="api-required"> required</span>}
      </span>
    ),
  }),
  col.accessor('type', {
    header: 'Type',
    cell: ({ getValue }) => (
      <code className="api-type">
        <TruncatedText text={getValue()} maxChars={60} />
      </code>
    ),
  }),
  col.accessor('default', {
    header: 'Default',
    cell: ({ getValue }) => (getValue() ? <code>{getValue()}</code> : '—'),
  }),
  col.accessor('description', { header: 'Description' }),
];

/** Renders one symbol: its description, its members as a filterable table, and its signatures. */
export function ApiSymbolSection({ symbol }: { symbol: ApiSymbol }) {
  return (
    <section aria-labelledby={`sym-${symbol.name}`} className="api-symbol">
      <h2 id={`sym-${symbol.name}`}>
        {symbol.name} <span className="site-muted">{symbol.kind}</span>
      </h2>
      {symbol.description && <p>{symbol.description}</p>}
      {symbol.example && (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (axe)
        <pre className="site-code" tabIndex={0}>
          <code>{symbol.example}</code>
        </pre>
      )}
      {symbol.signatures.map((signature) => (
        <p key={signature.name} className="api-signature">
          <code>
            {signature.name}(
            {signature.params.map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ')}
            ): {signature.returns}
          </code>
        </p>
      ))}
      {symbol.members.length > 0 && (
        <DataTable<ApiMember>
          aria-label={`${symbol.name} members`}
          data={symbol.members}
          columns={columns}
          getRowId={(m) => `${symbol.name}.${m.name}`}
          searchPlaceholder={`Filter ${symbol.name}`}
          enablePagination={false}
          enableStickyHeader
          maxHeight={560}
        />
      )}
    </section>
  );
}

/** The generated part of an API page: one section per symbol. The prose around it is MDX. */
export function PropsPage({ symbols }: { symbols: ApiSymbol[] }) {
  return (
    <>
      {symbols.length === 0 ? (
        <p className="site-muted">
          Nothing generated yet — run <code>pnpm docs:json</code> and{' '}
          <code>node scripts/build-api.mjs</code>.
        </p>
      ) : (
        symbols.map((symbol) => <ApiSymbolSection key={symbol.name} symbol={symbol} />)
      )}
    </>
  );
}
