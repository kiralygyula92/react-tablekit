// Domain types for the demo mock server. A generic asset-management domain: accounts own sites,
// sites hold assets, and assets accumulate readings over time.

export interface Address {
  address1: string;
  address2?: string;
  city: string;
  /** State / region. */
  region: string;
  postalCode: string;
  country: string;
}

export type PhoneType = 'Work' | 'Mobile' | 'Home' | 'Unknown';

export type AssetKind = 'Server' | 'Switch' | 'Sensor' | 'Gateway';

export interface Asset {
  id: string;
  name?: string;
  kind: AssetKind;
  /** Rated throughput in units/hour. */
  capacity: number;
  enclosure?: string;
  powerSource?: string;
  tier?: string;
  placement?: string;
  mounting?: string;
  coolingType?: string;
  installedAtUTC?: string;
  vendor?: string;
  notes?: string;
  accountId: string;
}

export interface Site {
  identifiers: { id: string };
  address: Address;
  assets: Asset[];
}

export interface Account {
  identifiers: { id: string };
  displayName: { firstName: string; lastName: string; companyName?: string };
  billingAddress?: Address;
  contactInformation?: {
    emailAddresses: { email: string }[];
    phoneNumbers: { number: string; phoneType: PhoneType }[];
  };
  sites?: Site[];
}

/** One telemetry sample for an asset: 16 numeric metrics plus an optional report. */
export interface Reading {
  id: string;
  date: string;
  reportUrl?: string;
  reportId?: string;
  workOrderId?: string;
  loadFactor: number;
  inputVoltage: number;
  outputVoltage: number;
  throughput: number;
  errorRate: number;
  queueDepth: number;
  memoryUsed: number;
  diskUsed: number;
  packetLoss: number;
  jitter: number;
  latency: number;
  uptimeDays: number;
  fanSpeed: number;
  powerDraw: number;
  peakDraw: number;
  temperature: number;
}

/** The server's paging contract. */
export interface ListingCriteria {
  ascending?: boolean;
  pageNumber: number;
  pageSize: number;
  sortColumn?: string;
}

export interface SearchAccountRequest {
  listingCriteria?: Partial<ListingCriteria>;
  queryCriteria?: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalItemCount: number;
  /** The normalized request, echoed back by the server. */
  requestCriteria: ListingCriteria;
}
