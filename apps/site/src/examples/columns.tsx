import { createColumnHelper } from 'react-tablekit';
import type { DemoPerson } from '../mock/data/people';

const col = createColumnHelper<DemoPerson>();
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** Columns shared by the generic feature examples. */
export const peopleColumns = [
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name',
    getSearchValue: (p) => `${p.firstName} ${p.lastName} ${p.email}`,
  }),
  col.accessor('email', { header: 'Email' }),
  col.accessor('age', { header: 'Age', type: 'number' }),
  col.accessor('department', { header: 'Department', filterVariant: 'select' }),
  col.accessor('status', { header: 'Status', filterVariant: 'multiSelect' }),
  col.accessor('salary', { header: 'Salary', type: 'number', format: (v) => money.format(v) }),
  col.accessor('joined', {
    header: 'Joined',
    type: 'date',
    format: (v) => new Date(v).toLocaleDateString('en-US'),
  }),
  col.accessor('remote', { header: 'Remote', type: 'boolean', format: (v) => (v ? 'Yes' : 'No') }),
  col.accessor('city', { header: 'City' }),
];
