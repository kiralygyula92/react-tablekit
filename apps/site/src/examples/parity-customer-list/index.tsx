import { useEffect, useRef, useState } from 'react';
import { DataTable, useDataTable } from 'react-tablekit';
import { formatCustomerName } from '../../mock/data/customers';
import type { Customer } from '../../mock/types';
import { customersDataSource } from '../api';
import { ParityPage, useParityTheme } from '../ParityFrame';
import { customerColumns, type CustomerListMeta } from './columns';

/**
 * Skimmer Customer List, 1:1 (01 §5.1): server mode against the mock `/api/customers/search`,
 * search in the page header (debounce 300ms, min length 3, page reset, Ctrl+K), numbered/compact
 * pagination, the initial "Loading..." row, the refetch overlay and "No customers found".
 */
export default function ParityCustomerList() {
  const { theme, toggle } = useParityTheme();
  const [editing, setEditing] = useState<Customer | null>(null);
  const meta: CustomerListMeta = { onEditCustomer: setEditing };

  const table = useDataTable<Customer>({
    columns: customerColumns,
    dataSource: customersDataSource,
    getRowId: (c) => c.identifiers.id,
    enableSorting: false,
    searchMinLength: 3,
    searchDebounceMs: 300,
    searchHotkey: 'mod+k',
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    theme,
    meta,
    toolbar: false,
    'aria-label': 'customer list table',
    // Skimmer shows the same text for "no data" and "no search results", with no clear action.
    emptyStateContent: 'No customers found',
    localization: {
      loading: 'Loading...',
      searchPlaceholder: 'Search by name, email, phone or address',
    },
  });

  return (
    <ParityPage>
      {toggle}
      <DataTable.Root table={table}>
        <header className="parity-header">
          <h3 className="parity-title">All Customers</h3>
          <DataTable.Search />
          <button type="button" className="parity-primary-button">
            Add customer
          </button>
        </header>
        <div className="parity-content">
          <DataTable.Container />
          <DataTable.Pagination />
        </div>
      </DataTable.Root>
      <EditDialog customer={editing} onClose={() => setEditing(null)} />
    </ParityPage>
  );
}

function EditDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (customer && !dialog.open) dialog.showModal();
    if (!customer && dialog.open) dialog.close();
  }, [customer]);
  return (
    <dialog
      ref={ref}
      className="parity-dialog"
      aria-labelledby="edit-customer-title"
      onClose={onClose}
    >
      <h2 id="edit-customer-title">Edit {customer ? formatCustomerName(customer) : ''}</h2>
      <p>This demo dialog stands in for the Skimmer edit form.</p>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
