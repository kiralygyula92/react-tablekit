import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { DataTable, type DataTableProps } from '../../src';
import { people, personColumns, numbered, type Person } from '../fixtures';

export { people, personColumns, numbered, type Person };

/** Renders a DataTable with sane test defaults (no debounce, labelled). */
export function renderTable(props: Partial<DataTableProps<Person>> = {}, options?: RenderOptions) {
  const ui: ReactElement = (
    <DataTable<Person>
      aria-label="People"
      data={people}
      columns={personColumns}
      getRowId={(r) => r.id}
      searchDebounceMs={0}
      filterDebounceMs={0}
      {...props}
    />
  );
  return render(ui, options);
}

/** Visible body rows (excluding state rows). */
export const bodyRows = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLTableRowElement>('tbody tr.tk-row'),
];

export const rowIds = (container: HTMLElement) => bodyRows(container).map((r) => r.dataset.rowId);

/** Resolves after pending microtasks and a macrotask. */
export const tick = () => new Promise((r) => setTimeout(r, 0));
