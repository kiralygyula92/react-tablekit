import columnDef from '../../generated/api/column-def.json';
import dataTable from '../../generated/api/data-table.json';
import hooks from '../../generated/api/hooks.json';
import instance from '../../generated/api/instance.json';
import state from '../../generated/api/state.json';
import utilities from '../../generated/api/utilities.json';
import { PropsPage, type ApiSymbol } from './PropsPage';

/**
 * The API pages generated from TypeDoc (`pnpm docs:json` → `scripts/build-api.mjs`). Each one
 * renders the package's own TSDoc, so the documentation cannot drift from the code.
 */
const as = (data: unknown) => data as ApiSymbol[];

export function ApiDataTablePage() {
  return (
    <PropsPage
      title="<DataTable> props"
      lead="Every prop of the all-in-one component, plus the view props shared with DataTable.Root and the imperative handle."
      symbols={as(dataTable)}
    />
  );
}

export function ApiColumnDefPage() {
  return (
    <PropsPage
      title="ColumnDef"
      lead="The shape of a column: accessors, rendering, types, sizing, pinning, filtering and grouping."
      symbols={as(columnDef)}
    />
  );
}

export function ApiInstancePage() {
  return (
    <PropsPage
      title="TableInstance"
      lead="The headless table instance returned by useDataTable and createTable, with its row, column, cell and header objects."
      symbols={as(instance)}
    />
  );
}

export function ApiStatePage() {
  return (
    <PropsPage
      title="State and query"
      lead="Every state slice, the engine options that own them, and the normalized TableQuery sent to a server."
      symbols={as(state)}
    />
  );
}

export function ApiHooksPage() {
  return (
    <PropsPage
      title="Hooks"
      lead="Every exported hook: the table itself, server data, state selection, detail panels, breakpoints, virtualization and state persistence."
      symbols={as(hooks)}
    />
  );
}

export function ApiUtilitiesPage() {
  return (
    <PropsPage
      title="Utilities"
      lead="The column helper, data-source adapters, CSV export, pagination items, theming helpers and the headless engine factory."
      symbols={as(utilities)}
    />
  );
}
