import { createColumnHelper, DataTable } from 'react-tablekit';
import { buildOrgTree, type OrgNode } from '@/demo-support/orgTree';

const col = createColumnHelper<OrgNode>();
const columns = [
  col.accessor('name', { header: 'Name' }),
  col.accessor('role', { header: 'Role' }),
  col.accessor('headcount', { header: 'Headcount', type: 'number' }),
  col.accessor('location', { header: 'Location' }),
];

const data = buildOrgTree();

/**
 * Tree data: `getSubRows` turns nested records into expandable rows with indentation,
 * an expand toggle in the first column, and “expand all” in the toolbar. Filtering keeps parents
 * whose descendants match.
 */
export default function TreeDataExample() {
  return (
    <DataTable<OrgNode>
      aria-label="Organisation"
      data={data}
      columns={columns}
      getRowId={(n) => n.id}
      getSubRows={(n) => n.children}
      enableExpanding
      initialState={{ pagination: { pageIndex: 0, pageSize: 12 } }}
    />
  );
}
