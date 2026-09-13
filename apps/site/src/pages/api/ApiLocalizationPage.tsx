import { createColumnHelper, DataTable } from 'react-tablekit';
import { localeMeta } from 'react-tablekit/meta';
import { useDocumentTitle } from '../../layout/useDocumentTitle';

type Entry = (typeof localeMeta)[number];
const col = createColumnHelper<Entry>();

const columns = [
  col.accessor('key', { header: 'Key' }),
  col.accessor('english', { header: 'English default' }),
];

/** `/api/localization`: every string key with its English default. */
export function ApiLocalizationPage() {
  useDocumentTitle('Localization');
  return (
    <article className="site-prose site-prose--wide">
      <h1>Localization</h1>
      <p className="site-lead">
        Every user-visible string comes from the localization object — there is no hard-coded
        English in the components. Pass <code>localization</code> to override any subset, or import
        a ready-made pack: <code>react-tablekit/locales/hu</code>, <code>/de</code>,{' '}
        <code>/es</code>. Placeholders in <code>{'{braces}'}</code> are interpolated.
      </p>
      <DataTable<Entry>
        aria-label="Localization keys"
        data={localeMeta}
        columns={columns}
        getRowId={(e) => e.key}
        searchPlaceholder="Filter keys"
        enablePagination={false}
        enableStickyHeader
        maxHeight={600}
      />
    </article>
  );
}
