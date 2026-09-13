import { createColumnHelper, DataTable, type DataSource } from 'react-tablekit';
import { childrenOf, hasChildren, type OrgNode } from '../orgTree';

const col = createColumnHelper<OrgNode>();
const columns = [
  col.accessor('name', { header: 'Name' }),
  col.accessor('role', { header: 'Role' }),
  col.accessor('headcount', { header: 'Headcount', type: 'number' }),
  col.accessor('location', { header: 'Location' }),
];

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/** Roots come from `fetch`; each expansion asks the server for that node's children. */
const orgDataSource: DataSource<OrgNode> = {
  async fetch(query, { signal }) {
    await delay(250, signal);
    const roots = childrenOf(null);
    const { pageIndex, pageSize } = query.pagination;
    return {
      rows: roots.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
      rowCount: roots.length,
    };
  },
  async fetchChildren(row, _query, { signal }) {
    await delay(400, signal);
    return childrenOf(row.id);
  },
};

/**
 * Lazily loaded tree rows (05 §6.2): only the roots are fetched up front, and expanding a row
 * calls `dataSource.fetchChildren` once per row per query, showing a spinner in that row while it
 * loads. `getRowCanExpand` tells the table which rows are worth a toggle.
 */
export default function TreeLazyServerExample() {
  return (
    <DataTable<OrgNode>
      aria-label="Organisation (lazy)"
      columns={columns}
      dataSource={orgDataSource}
      getRowId={(n) => n.id}
      getRowCanExpand={(row) => hasChildren(row.id)}
      enableExpanding
      toolbar={false}
      initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
    />
  );
}
