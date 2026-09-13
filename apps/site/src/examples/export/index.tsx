import { createLocalDataSource, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const clientData = generatePeople(120);
const serverPeople = generatePeople(3_000, 11);
const source = createLocalDataSource(serverPeople, {
  columns: peopleColumns,
  getRowId: (p) => p.id,
  latencyMs: [100, 250],
});

/**
 * CSV export (05 §20): the toolbar menu exports the current page, every matching row, or just the
 * selected ones, and can copy to the clipboard instead. Quoting follows RFC 4180 and the file
 * carries a UTF-8 BOM, so Excel opens accented text correctly.
 *
 * In server mode "all matching" is fetched in chunks through the data source, with progress shown
 * in the button — try it on the second table, which has 3 000 rows behind a simulated API.
 */
export default function ExportExample() {
  return (
    <div className="example-stack">
      <section className="example-panel">
        <h2>Client mode</h2>
        <DataTable<DemoPerson>
          aria-label="People (client)"
          data={clientData}
          columns={peopleColumns}
          getRowId={(p) => p.id}
          enableExport
          enableRowSelection
          exportFileName="people"
          initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
        />
      </section>
      <section className="example-panel">
        <h2>Server mode (chunked)</h2>
        <DataTable<DemoPerson>
          aria-label="People (server)"
          columns={peopleColumns}
          dataSource={source}
          getRowId={(p) => p.id}
          enableExport
          exportMode="all"
          exportFileName="people-all"
          initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
        />
      </section>
    </div>
  );
}
