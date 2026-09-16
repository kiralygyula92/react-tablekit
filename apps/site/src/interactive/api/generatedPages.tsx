import columnDef from '../../generated/api/column-def.json';
import dataTable from '../../generated/api/data-table.json';
import hooks from '../../generated/api/hooks.json';
import instance from '../../generated/api/instance.json';
import state from '../../generated/api/state.json';
import utilities from '../../generated/api/utilities.json';
import { PropsPage, type ApiSymbol } from './PropsPage';

/**
 * The API reference tables generated from TypeDoc (`pnpm docs:json` → `scripts/build-api.mjs`).
 * Each renders the package's own TSDoc, so the documentation cannot drift from the code. The
 * prose around them lives in the MDX page that embeds `<ApiReference />`.
 */
const as = (data: unknown) => data as ApiSymbol[];

export function ApiDataTablePage() {
  return <PropsPage symbols={as(dataTable)} />;
}

export function ApiColumnDefPage() {
  return <PropsPage symbols={as(columnDef)} />;
}

export function ApiInstancePage() {
  return <PropsPage symbols={as(instance)} />;
}

export function ApiStatePage() {
  return <PropsPage symbols={as(state)} />;
}

export function ApiHooksPage() {
  return <PropsPage symbols={as(hooks)} />;
}

export function ApiUtilitiesPage() {
  return <PropsPage symbols={as(utilities)} />;
}
