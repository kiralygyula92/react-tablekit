import { useEffect, useRef, useState } from 'react';
import { DataTable, useDataTable } from 'react-tablekit';
import { formatAccountName } from '@/mock/data/accounts';
import type { Account } from '@/mock/types';
import { accountsDataSource } from '@/demo-support/api';
import { ShowcasePage, useShowcaseTheme } from '@/demo-support/ShowcaseFrame';
import { accountColumns, type AccountListMeta } from './basics-columns';

/**
 * A realistic application screen: server mode against the mock `/api/accounts/search`, with the
 * search lifted into the page header (300ms debounce, minimum 3 characters, page reset, Ctrl+K),
 * numbered pagination, the initial loading row, the refetch overlay and an empty state.
 */
export default function ShowcaseAccountList() {
  const { theme, colorScheme, toggle } = useShowcaseTheme();
  const [editing, setEditing] = useState<Account | null>(null);
  const meta: AccountListMeta = { onEditAccount: setEditing };

  const table = useDataTable<Account>({
    columns: accountColumns,
    dataSource: accountsDataSource,
    getRowId: (a) => a.identifiers.id,
    enableSorting: false,
    searchMinLength: 3,
    searchDebounceMs: 300,
    searchHotkey: 'mod+k',
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    theme,
    colorScheme,
    meta,
    toolbar: false,
    'aria-label': 'account list table',
    emptyStateContent: 'No accounts found',
    localization: {
      loading: 'Loading...',
      searchPlaceholder: 'Search by name, email, phone or address',
    },
  });

  return (
    <ShowcasePage>
      {toggle}
      <DataTable.Root table={table}>
        <header className="showcase-header">
          <h2 className="showcase-title">All accounts</h2>
          <DataTable.Search />
          <button type="button" className="showcase-primary-button">
            Add account
          </button>
        </header>
        <div className="showcase-content">
          <DataTable.Container />
          <DataTable.Pagination />
        </div>
      </DataTable.Root>
      <EditDialog account={editing} onClose={() => setEditing(null)} />
    </ShowcasePage>
  );
}

function EditDialog({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (account && !dialog.open) dialog.showModal();
    if (!account && dialog.open) dialog.close();
  }, [account]);
  return (
    <dialog
      ref={ref}
      className="showcase-dialog"
      aria-labelledby="edit-account-title"
      onClose={onClose}
    >
      <h2 id="edit-account-title">Edit {account ? formatAccountName(account) : ''}</h2>
      <p>A row action opens your own UI; this dialog stands in for an edit form.</p>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
