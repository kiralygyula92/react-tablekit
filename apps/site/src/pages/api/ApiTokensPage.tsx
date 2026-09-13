import { createColumnHelper, DataTable } from 'react-tablekit';
import { tokenMeta } from 'react-tablekit/meta';
import { useDocumentTitle } from '../../layout/useDocumentTitle';

type Token = (typeof tokenMeta)[number];
const col = createColumnHelper<Token>();

/** A swatch for values that look like a colour. */
function Value({ value }: { value: string }) {
  const isColour = /^#|^rgb|^hsl/.test(value);
  return (
    <span className="api-token-value">
      {isColour && <span className="api-swatch" style={{ background: value }} aria-hidden="true" />}
      <code>{value || '—'}</code>
    </span>
  );
}

const columns = [
  col.accessor('path', { header: 'Token' }),
  col.accessor('cssVar', {
    header: 'CSS variable',
    cell: ({ getValue }) => <code>{getValue()}</code>,
  }),
  ...(['light', 'classic', 'dark'] as const).map((preset) =>
    col.accessor((t) => t.values[preset] ?? '', {
      id: preset,
      header: preset,
      cell: ({ getValue }) => <Value value={getValue()} />,
    }),
  ),
];

/** `/api/theme-tokens`: every token with its value in each preset, from the package's themes. */
export function ApiTokensPage() {
  useDocumentTitle('Theme tokens');
  return (
    <article className="site-prose site-prose--wide">
      <h1>Theme tokens</h1>
      <p className="site-lead">
        Every visual value is a CSS variable. Override them in CSS, or build a theme object with{' '}
        <code>createTheme</code>. The values below are read from the built-in presets themselves.
      </p>
      <DataTable<Token>
        aria-label="Theme tokens"
        data={tokenMeta}
        columns={columns}
        getRowId={(t) => t.path}
        searchPlaceholder="Filter tokens"
        enablePagination={false}
        enableStickyHeader
        maxHeight={600}
      />
    </article>
  );
}
