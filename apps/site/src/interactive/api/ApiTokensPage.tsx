import { createColumnHelper, DataTable } from 'react-tablekit';
import { tokenMeta } from 'react-tablekit/meta';
import { UsedBy } from './UsedBy';

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
  return (
    <>
      <UsedBy symbol="TableTheme" />
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
    </>
  );
}
