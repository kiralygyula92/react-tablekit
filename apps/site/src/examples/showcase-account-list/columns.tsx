import { ActionButton, createColumnHelper, MultiLineList, TwoLineText } from 'react-tablekit';
import { formatAccountName, getAccountAssets } from '../../mock/data/accounts';
import { formatPhoneLines, getShortFormatAddress } from '../../mock/format';
import type { Account } from '../../mock/types';
import { PenIcon } from '../icons';

/** Handlers passed through `meta`, so the columns are created once at module scope. */
export interface AccountListMeta {
  onEditAccount: (account: Account) => void;
}

const col = createColumnHelper<Account>();

/** An application-like account list: percentage widths with pixel minimums. */
export const accountColumns = [
  col.accessor((a) => formatAccountName(a), {
    id: 'accountName',
    header: 'Account name',
    width: '15%',
    minWidth: '160px',
  }),
  col.accessor('displayName.companyName', {
    id: 'companyName',
    header: 'Company name',
    width: '15%',
    minWidth: '160px',
  }),
  col.accessor('billingAddress', {
    header: 'Billing address',
    width: '15%',
    minWidth: '128px',
    cell: ({ getValue }) => {
      const address = getValue();
      return <TwoLineText primary={address?.address1} secondary={getShortFormatAddress(address)} />;
    },
    getSearchValue: (a) => a.billingAddress?.address1 ?? '',
  }),
  col.accessor((a) => a.contactInformation?.emailAddresses ?? [], {
    id: 'emails',
    header: 'Emails',
    width: '10%',
    minWidth: '128px',
    cell: ({ getValue }) => <MultiLineList items={getValue().map((e) => e.email)} />,
  }),
  col.accessor((a) => a.contactInformation?.phoneNumbers ?? [], {
    id: 'phones',
    header: 'Phones',
    width: '15%',
    minWidth: '128px',
    cell: ({ getValue }) => <MultiLineList items={formatPhoneLines(getValue())} />,
  }),
  col.accessor((a) => a.sites ?? [], {
    id: 'sites',
    header: 'Sites',
    width: '15%',
    minWidth: '128px',
    cell: ({ getValue }) => (
      <MultiLineList
        gap={12}
        items={getValue().map((s) => (
          <TwoLineText
            key={s.identifiers.id}
            primary={s.address.address1}
            secondary={getShortFormatAddress(s.address)}
          />
        ))}
      />
    ),
  }),
  col.accessor((a) => getAccountAssets(a).length, {
    id: 'assets',
    header: 'Assets',
    type: 'number',
    width: '5%',
    minWidth: '96px',
  }),
  col.display({
    id: 'actions',
    header: 'Actions',
    align: 'right',
    width: '5%',
    minWidth: '48px',
    // Pinned right and locked: the row's actions stay reachable however the table is scrolled.
    pin: 'right',
    static: true,
    cell: ({ row, table }) => (
      <ActionButton
        icon={<PenIcon />}
        label="Edit"
        onClick={() => (table.options.meta as AccountListMeta).onEditAccount(row.original)}
      />
    ),
  }),
];
