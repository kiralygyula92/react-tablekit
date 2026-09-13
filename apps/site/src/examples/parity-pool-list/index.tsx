import { useEffect, useRef, useState } from 'react';
import { DataTable, useDataTable } from 'react-tablekit';
import { formatCustomerName } from '../../mock/data/customers';
import type { BodyOfWater, Customer } from '../../mock/types';
import { customersDataSource } from '../api';
import { ParityPage, useParityTheme } from '../ParityFrame';
import { bodyOfWaterLabel, poolColumns, type PoolListMeta } from './columns';

/**
 * Skimmer Pool List, 1:1 (01 §5.2): the same server-mode customer search as the Customer List,
 * with the PoolTags chip list (max 3 + `+N`), clickable chips and a microscope action that opens
 * the Body-of-Water selection dialog.
 */
export default function ParityPoolList() {
  const { theme, toggle } = useParityTheme();
  const [testing, setTesting] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<BodyOfWater | null>(null);
  const meta: PoolListMeta = { onTestWater: setTesting, onSelectBodyOfWater: setSelected };

  const table = useDataTable<Customer>({
    columns: poolColumns,
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
    'aria-label': 'pool list table',
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
          <h3 className="parity-title">Pools</h3>
          <DataTable.Search />
        </header>
        <div className="parity-content">
          <DataTable.Container />
          <DataTable.Pagination />
        </div>
      </DataTable.Root>
      <InfoDialog
        title={testing ? `Test water for ${formatCustomerName(testing)}` : ''}
        body="The Body-of-Water selection dialog (client mode, single selection) arrives with M3."
        open={testing !== null}
        onClose={() => setTesting(null)}
      />
      <InfoDialog
        title={selected ? bodyOfWaterLabel(selected) : ''}
        body={
          selected
            ? `${selected.type} · ${selected.gallons.toLocaleString('en-US')} gal${
                selected.sanitizer ? ` · ${selected.sanitizer}` : ''
              }`
            : ''
        }
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </ParityPage>
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
    <dialog ref={ref} className="parity-dialog" aria-label={title || 'Details'} onClose={onClose}>
      <h2>{title}</h2>
      <p>{body}</p>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
