import { createColumnHelper, DataTable } from 'react-tablekit';
import { localeMeta } from 'react-tablekit/meta';
import { UsedBy } from './UsedBy';

type Entry = (typeof localeMeta)[number];
const col = createColumnHelper<Entry>();

const columns = [
  col.accessor('key', { header: 'Key' }),
  col.accessor('english', { header: 'English default' }),
];

/** `/api/localization`: every string key with its English default. */
export function ApiLocalizationPage() {
  return (
    <>
      <UsedBy symbol="TableLocalization" />
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
    </>
  );
}
