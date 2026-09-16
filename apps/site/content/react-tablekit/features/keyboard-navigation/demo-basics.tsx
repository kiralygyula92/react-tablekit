import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(60);

/**
 * Keyboard grid navigation (05 §15), following the WAI-ARIA "Data Grid" pattern. The whole table
 * is a single tab stop: Tab enters it and Tab leaves it again, arrows move between cells.
 */
export default function KeyboardNavigationExample() {
  return (
    <div className="example-stack">
      <dl className="example-dl">
        <dt>Tab</dt>
        <dd>Enter the grid at the last focused cell, then leave it again</dd>
        <dt>← ↑ → ↓</dt>
        <dd>Move between cells, header included</dd>
        <dt>Home / End</dt>
        <dd>First or last cell of the row; with Ctrl, of the whole grid</dd>
        <dt>Page Up / Page Down</dt>
        <dd>Move by one page of rows</dd>
        <dt>Enter</dt>
        <dd>Sort from a header cell, or move into a cell’s buttons and links (Escape returns)</dd>
        <dt>Space</dt>
        <dd>Select the focused row; Shift+Space selects a range</dd>
        <dt>Ctrl/⌘+A</dt>
        <dd>Select every row on the page</dd>
      </dl>
      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        enableKeyboardNavigation
        enableRowSelection
        enableColumnActions
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
    </div>
  );
}
