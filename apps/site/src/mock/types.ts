// Domain types mirroring the Skimmer Retail API (docs/08 §7, docs/01 §3).

export interface Address {
  address1: string;
  address2?: string;
  city: string;
  /** State / region. */
  adminArea1: string;
  postalCode: string;
  country: string;
}

export type PhoneType = 'Work' | 'Mobile' | 'Home' | 'Unknown';

export interface BodyOfWater {
  id: string;
  name?: string;
  type: 'Pool' | 'Spa' | 'Fountain' | 'Pond';
  gallons: number;
  surfaceType?: string;
  sanitizer?: string;
  classification?: string;
  location?: string;
  groundLevel?: string;
  filter?: string;
  buildDateUTC?: string;
  builder?: string;
  notes?: string;
  customerId: string;
}

export interface ServiceLocation {
  identifiers: { id: string };
  address: Address;
  bodiesOfWater: BodyOfWater[];
}

export interface Customer {
  identifiers: { id: string };
  displayName: { firstName: string; lastName: string; companyName?: string };
  billingAddress?: Address;
  contactInformation?: {
    emailAddresses: { email: string }[];
    phoneNumbers: { number: string; phoneType: PhoneType }[];
  };
  serviceLocations?: ServiceLocation[];
}

export interface WaterTestHistoryItem {
  id: string;
  date: string;
  pdfUrl?: string;
  pdfId?: string;
  treatmentPlanId?: string;
  pH: number;
  totalChlorine: number;
  freeChlorine: number;
  salt: number;
  cyanuricAcid: number;
  totalAlkalinity: number;
  calciumHardness: number;
  totalDissolvedSolids: number;
  phosphates: number;
  iron: number;
  totalBromine: number;
  borate: number;
  copper: number;
  biguanide: number;
  biguanideShock: number;
  waterTemperature: number;
}

/** Skimmer's server paging contract (`types/apiInterfaces.ts`). */
export interface ListingCriteria {
  ascending?: boolean;
  pageNumber: number;
  pageSize: number;
  sortColumn?: string;
}

export interface SearchCustomerRequest {
  listingCriteria?: Partial<ListingCriteria>;
  queryCriteria?: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalItemCount: number;
  /** The normalized request, echoed back by the server. */
  requestCriteria: ListingCriteria;
}
