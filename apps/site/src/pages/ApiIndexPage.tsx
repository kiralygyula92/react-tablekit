import { useDocumentTitle } from '../layout/useDocumentTitle';
import { PKG_NAME } from '../pkg';

const PLANNED = [
  ['DataTable', '<DataTable> props'],
  ['ColumnDef', 'Column definition fields'],
  ['Instance', 'TableInstance methods, grouped by feature'],
  ['State', 'TableState slices and TableQuery'],
  ['Hooks', 'useDataTable, useDataSource, useTableState, …'],
  ['Slots', 'Every replaceable component'],
  ['Handlers', 'Every interaction middleware'],
  ['Theme tokens', 'Every CSS variable with its preset values'],
  ['Localization', 'Every string key with its English default'],
  ['Icons', 'Every built-in icon'],
  ['Utilities', 'Column helper, data sources, getPageItems, exportToCsv, fn registries'],
] as const;

export function ApiIndexPage() {
  useDocumentTitle('API reference');
  return (
    <article className="site-prose">
      <h1>API reference</h1>
      <p className="site-muted">
        Generated from the TSDoc comments of <code>{PKG_NAME}</code> (TypeDoc) and from the
        package&apos;s runtime metadata. Placeholder until the API pipeline lands.
      </p>
      <ul>
        {PLANNED.map(([name, text]) => (
          <li key={name}>
            <strong>{name}</strong>: {text}
          </li>
        ))}
      </ul>
    </article>
  );
}
