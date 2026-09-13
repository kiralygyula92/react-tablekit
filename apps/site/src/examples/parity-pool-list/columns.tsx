import {
  ActionButton,
  ChipList,
  createColumnHelper,
  MultiLineList,
  TwoLineText,
} from 'react-tablekit';
import { formatCustomerName, getCustomerBodiesOfWater } from '../../mock/data/customers';
import { formatPhoneLines, getShortFormatAddress } from '../../mock/format';
import type { BodyOfWater, Customer } from '../../mock/types';
import { MicroscopeIcon } from '../icons';

/** Handlers passed through `meta`, so the columns are created once at module scope (10 §3.1). */
export interface PoolListMeta {
  onTestWater: (customer: Customer) => void;
  onSelectBodyOfWater: (body: BodyOfWater) => void;
}

const col = createColumnHelper<Customer>();
const meta = (table: { options: { meta?: unknown } }) => table.options.meta as PoolListMeta;

/** The label Skimmer shows on a PoolTag chip. */
export const bodyOfWaterLabel = (body: BodyOfWater) => body.name ?? body.type;

/** Skimmer Pool List columns with the exact widths of 01 §5.2. */
export const poolColumns = [
  col.accessor((c) => formatCustomerName(c), {
    id: 'customerName',
    header: 'Customer name',
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
    getSearchValue: (c) => c.billingAddress?.address1 ?? '',
  }),
  col.accessor((c) => c.contactInformation?.phoneNumbers ?? [], {
    id: 'phones',
    header: 'Phones',
    width: '15%',
    minWidth: '200px',
    cell: ({ getValue }) => <MultiLineList items={formatPhoneLines(getValue())} />,
  }),
  col.accessor((c) => getCustomerBodiesOfWater(c), {
    id: 'bodiesOfWater',
    header: 'Bodies of water',
    width: '40%',
    minWidth: '200px',
    // Skimmer PoolTags: at most three chips plus a `+N` overflow chip; each chip is clickable.
    cell: ({ getValue, table }) => (
      <ChipList
        items={getValue()}
        maxVisible={3}
        renderChip={(body) => (
          <button
            type="button"
            className="parity-chip-button"
            onClick={() => meta(table).onSelectBodyOfWater(body)}
          >
            {bodyOfWaterLabel(body)}
          </button>
        )}
      />
    ),
    getSearchValue: (c) => getCustomerBodiesOfWater(c).map(bodyOfWaterLabel).join(' '),
  }),
  col.display({
    id: 'actions',
    header: 'Actions',
    align: 'right',
    width: '10%',
    minWidth: '48px',
    // The page passes `stickyActions`, so the column is always pinned.
    pin: 'right',
    static: true,
    cell: ({ row, table }) => (
      <ActionButton
        icon={<MicroscopeIcon />}
        label="Test water"
        onClick={() => meta(table).onTestWater(row.original)}
      />
    ),
  }),
];
