import { DataTable } from 'react-tablekit';
import { generatePeople } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const people = generatePeople(60);
const others = generatePeople(40, 7);

/**
 * Client-side global search (05 §2): debounce, minimum length, match highlighting and
 * diacritic-insensitive matching. Two tables share the `mod+k` hotkey to show that it is scoped
 * to the most recently focused or hovered table, never both at once.
 */
export default function GlobalSearchExample() {
  return (
    <div className="example-stack">
      <section className="example-panel">
        <h2>Employees</h2>
        <p className="site-muted">
          Type <code>zoe</code> to match “Zoë”, or <code>garcia</code> to match “García”: matching
          folds case and diacritics. Matches are highlighted, the query is debounced by 200ms and
          ignored below 2 characters. Press <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd>+<kbd>K</kbd>)
          while the pointer or focus is inside this table.
        </p>
        <DataTable
          aria-label="Employees"
          data={people}
          columns={peopleColumns}
          getRowId={(p) => p.id}
          highlightSearchMatches
          searchMinLength={2}
          searchDebounceMs={200}
          searchHotkey="mod+k"
          initialState={{ pagination: { pageIndex: 0, pageSize: 5 } }}
        />
      </section>
      <section className="example-panel">
        <h2>Contractors</h2>
        <p className="site-muted">
          The same hotkey, a different table. Whichever table you last touched wins, so the two
          never both react (fixes B10).
        </p>
        <DataTable
          aria-label="Contractors"
          data={others}
          columns={peopleColumns}
          getRowId={(p) => p.id}
          highlightSearchMatches
          searchMinLength={2}
          searchDebounceMs={200}
          searchHotkey="mod+k"
          globalFilterMatch="any-word"
          initialState={{ pagination: { pageIndex: 0, pageSize: 5 } }}
        />
      </section>
    </div>
  );
}
