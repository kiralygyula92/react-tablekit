import {
  ActionButton,
  ChipList,
  createColumnHelper,
  MultiLineList,
  TwoLineText,
} from 'react-tablekit';
import { formatAccountName, getAccountAssets } from '@/mock/data/accounts';
import { formatPhoneLines, getShortFormatAddress } from '@/mock/format';
import type { Account, Asset } from '@/mock/types';
import { GaugeIcon } from '@/demo-support/icons';

/** Handlers passed through `meta`, so the columns are created once at module scope. */
export interface AssetListMeta {
  onInspect: (account: Account) => void;
  onSelectAsset: (asset: Asset) => void;
}

const col = createColumnHelper<Account>();
const meta = (table: { options: { meta?: unknown } }) => table.options.meta as AssetListMeta;

/** An asset's chip label: its name when it has one, otherwise its kind. */
export const assetLabel = (asset: Asset) => asset.name ?? asset.kind;

export const assetListColumns = [
  col.accessor((a) => formatAccountName(a), {
    id: 'accountName',
    header: 'Account name',
    width: '15%',
    minWidth: '200px',
  }),
  col.accessor('displayName.companyName', {
    id: 'companyName',
    header: 'Company name',
    width: '15%',
    minWidth: '200px',
  }),
  col.accessor('billingAddress', {
    header: 'Billing address',
    width: '20%',
    minWidth: '200px',
    cell: ({ getValue }) => {
      const address = getValue();
      return <TwoLineText primary={address?.address1} secondary={getShortFormatAddress(address)} />;
    },
    getSearchValue: (a) => a.billingAddress?.address1 ?? '',
  }),
  col.accessor((a) => a.contactInformation?.phoneNumbers ?? [], {
    id: 'phones',
    header: 'Phones',
    width: '15%',
    minWidth: '200px',
    cell: ({ getValue }) => <MultiLineList items={formatPhoneLines(getValue())} />,
  }),
  col.accessor((a) => getAccountAssets(a), {
    id: 'assets',
    header: 'Assets',
    width: '40%',
    minWidth: '200px',
    // At most three chips plus a `+N` overflow chip; each chip is clickable.
    cell: ({ getValue, table }) => (
      <ChipList
        items={getValue()}
        maxVisible={3}
        renderChip={(asset) => (
          <button
            type="button"
            className="showcase-chip-button"
            onClick={() => meta(table).onSelectAsset(asset)}
          >
            {assetLabel(asset)}
          </button>
        )}
      />
    ),
    getSearchValue: (a) => getAccountAssets(a).map(assetLabel).join(' '),
  }),
  col.display({
    id: 'actions',
    header: 'Actions',
    align: 'right',
    width: '10%',
    minWidth: '48px',
    pin: 'right',
    static: true,
    cell: ({ row, table }) => (
      <ActionButton
        icon={<GaugeIcon />}
        label="Inspect"
        onClick={() => meta(table).onInspect(row.original)}
      />
    ),
  }),
];
