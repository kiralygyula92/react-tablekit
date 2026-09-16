import { useEffect, useRef, useState } from 'react';
import { DataTable, useDataTable } from 'react-tablekit';
import { formatAccountName } from '@/mock/data/accounts';
import type { Account, Asset } from '@/mock/types';
import { accountsDataSource } from '@/demo-support/api';
import { ShowcasePage, useShowcaseTheme } from '@/demo-support/ShowcaseFrame';
import { assetLabel, assetListColumns, type AssetListMeta } from './basics-columns';

/**
 * The same server-mode account search, with a chip list in the widest column: at most three
 * assets are shown and the rest collapse into a `+N` chip. Each chip is a button, which is the
 * point — a cell can hold interactive content without the row swallowing the click.
 */
export default function ShowcaseAssetList() {
  const { theme, toggle } = useShowcaseTheme();
  const [inspecting, setInspecting] = useState<Account | null>(null);
  const [selected, setSelected] = useState<Asset | null>(null);
  const meta: AssetListMeta = { onInspect: setInspecting, onSelectAsset: setSelected };

  const table = useDataTable<Account>({
    columns: assetListColumns,
    dataSource: accountsDataSource,
    getRowId: (a) => a.identifiers.id,
    enableSorting: false,
    searchMinLength: 3,
    searchDebounceMs: 300,
    searchHotkey: 'mod+k',
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    theme,
    meta,
    toolbar: false,
    'aria-label': 'asset list table',
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
          <h3 className="showcase-title">Assets by account</h3>
          <DataTable.Search />
        </header>
        <div className="showcase-content">
          <DataTable.Container />
          <DataTable.Pagination />
        </div>
      </DataTable.Root>
      <InfoDialog
        title={inspecting ? `Inspect ${formatAccountName(inspecting)}` : ''}
        body="The row action opens your own UI. The asset picker example shows a selection table in a dialog."
        open={inspecting !== null}
        onClose={() => setInspecting(null)}
      />
      <InfoDialog
        title={selected ? assetLabel(selected) : ''}
        body={
          selected
            ? `${selected.kind} · ${selected.capacity.toLocaleString('en-US')} units/h${
                selected.powerSource ? ` · ${selected.powerSource}` : ''
              }`
            : ''
        }
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </ShowcasePage>
  );
}

function InfoDialog({
  title,
  body,
  open,
  onClose,
}: {
  title: string;
  body: string;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="showcase-dialog" aria-label={title || 'Details'} onClose={onClose}>
      <h2>{title}</h2>
      <p>{body}</p>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
