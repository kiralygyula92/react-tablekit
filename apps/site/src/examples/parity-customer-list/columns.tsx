import { ActionButton, createColumnHelper, MultiLineList, TwoLineText } from 'react-tablekit';
import { formatCustomerName, getCustomerBodiesOfWater } from '../../mock/data/customers';
import { formatPhoneLines, getShortFormatAddress } from '../../mock/format';
import type { Customer } from '../../mock/types';
import { PenIcon } from '../icons';

/** Handlers passed through `meta`, so the columns are created once at module scope (10 §3.1). */
export interface CustomerListMeta {
  onEditCustomer: (customer: Customer) => void;
}

const col = createColumnHelper<Customer>();

/** Skimmer Customer List columns with the exact widths of 01 §5.1. */
export const customerColumns = [
  col.accessor((c) => formatCustomerName(c), {
    id: 'customerName',
    header: 'Customer name',
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
    getSearchValue: (c) => c.billingAddress?.address1 ?? '',
  }),
  col.accessor((c) => c.contactInformation?.emailAddresses ?? [], {
    id: 'emails',
    header: 'Emails',
    width: '10%',
    minWidth: '128px',
    cell: ({ getValue }) => <MultiLineList items={getValue().map((e) => e.email)} />,
  }),
  col.accessor((c) => c.contactInformation?.phoneNumbers ?? [], {
    id: 'phones',
    header: 'Phones',
    width: '15%',
    minWidth: '128px',
    cell: ({ getValue }) => <MultiLineList items={formatPhoneLines(getValue())} />,
  }),
  col.accessor((c) => c.serviceLocations ?? [], {
    id: 'serviceLocations',
    header: 'Service locations',
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
  col.accessor((c) => getCustomerBodiesOfWater(c).length, {
    id: 'bodiesOfWater',
    header: 'Bodies of water',
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
    // Skimmer: `stickyActions || isMobile` — the page passes stickyActions, so it is always pinned.
    pin: 'right',
    static: true,
    cell: ({ row, table }) => (
      <ActionButton
        icon={<PenIcon />}
        label="Edit"
        onClick={() => (table.options.meta as CustomerListMeta).onEditCustomer(row.original)}
      />
    ),
  }),
];
