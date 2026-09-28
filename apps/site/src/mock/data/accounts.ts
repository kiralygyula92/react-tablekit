import { toPlainLatin } from '../format';
import { createRandom, type Random } from '../prng';
import type { Account, Address, Asset, AssetKind, PhoneType, Site } from '../types';

export const ACCOUNT_COUNT = 235;
export const ACCOUNT_SEED = 20240611;

const FIRST_NAMES = [
  'James',
  'Mary',
  'Robert',
  'Patricia',
  'John',
  'Jennifer',
  'Michael',
  'Linda',
  'David',
  'Elizabeth',
  'William',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Carlos',
  'Karen',
  'Daniel',
  'Lisa',
  'Matthew',
  'Nancy',
  'Anthony',
  'Betty',
  'Mark',
  'Sandra',
  'Zoë',
  'José',
  'Renée',
  'Bjørn',
  'Chloé',
  'André',
  'Noémi',
  'Gyula',
] as const;

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Müller',
  'Núñez',
  'Østergaard',
  'Király',
] as const;

const COMPANY_PREFIXES = [
  'Blue',
  'Crystal',
  'Summit',
  'Northwind',
  'Vertex',
  'Coastal',
  'Desert',
  'Golden',
  'Clear',
  'Apex',
] as const;
const COMPANY_SUFFIXES = [
  'Logistics',
  'Properties',
  'Industries',
  'Cooperative',
  'Holdings',
  'Management',
  'Systems',
  'Networks',
] as const;

const STREETS = [
  'Main St',
  'Oak Ave',
  'Pine Rd',
  'Maple Dr',
  'Cedar Ln',
  'Elm St',
  'Lakeview Blvd',
  'Sunset Blvd',
  'Palm Way',
  'Harbor Dr',
  'Ocean Ave',
  'Canyon Rd',
  'Mesa Dr',
  'Willow Ct',
] as const;

const CITIES: readonly (readonly [city: string, region: string, zipPrefix: number])[] = [
  ['Phoenix', 'AZ', 850],
  ['Scottsdale', 'AZ', 852],
  ['Tucson', 'AZ', 857],
  ['Austin', 'TX', 787],
  ['Houston', 'TX', 770],
  ['Dallas', 'TX', 752],
  ['Miami', 'FL', 331],
  ['Orlando', 'FL', 328],
  ['Tampa', 'FL', 336],
  ['San Diego', 'CA', 921],
  ['Los Angeles', 'CA', 900],
  ['Sacramento', 'CA', 958],
  ['Las Vegas', 'NV', 891],
  ['Henderson', 'NV', 890],
];

const ASSET_KINDS: readonly AssetKind[] = ['Server', 'Switch', 'Sensor', 'Gateway'];
const ENCLOSURES = ['Steel', 'Aluminium', 'Polymer', 'Composite', 'Fibreglass'] as const;
const POWER_SOURCES = ['Mains', 'Solar', 'Battery', 'Generator', 'Hybrid'] as const;
const TIERS = ['Standard', 'Business', 'Critical'] as const;
const PLACEMENTS = ['Indoor', 'Outdoor'] as const;
const MOUNTINGS = ['Rack', 'Wall'] as const;
const COOLING = ['Passive', 'Fan', 'Liquid'] as const;
const VENDORS = ['Northwind', 'Vertex Labs', 'Helios', 'Paddock', 'Meridian'];
const NOTES = [
  'Gate code 4471. Access is through the service corridor, please lock up.',
  'Site contact prefers morning visits.',
  'Power supply was replaced in spring; check the intake pressure.',
  'Throughput dips in late summer; monitor the queue depth closely every visit.',
  'Key under the mat.',
];
const PHONE_TYPES: readonly PhoneType[] = ['Work', 'Mobile', 'Home', 'Unknown'];

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function makeAddress(r: Random): Address {
  const [city, region, zipPrefix] = r.pick(CITIES);
  const address: Address = {
    address1: `${r.int(100, 9999)} ${r.pick(STREETS)}`,
    city,
    region,
    postalCode: `${zipPrefix}${pad(r.int(0, 99), 2)}`,
    country: 'US',
  };
  if (r.chance(0.2)) address.address2 = `Unit ${r.int(1, 40)}`;
  return address;
}

function makePhone(r: Random): string {
  return `(${r.int(201, 989)}) ${r.int(200, 999)}-${pad(r.int(0, 9999), 4)}`;
}

let assetSeq = 0;

function makeAsset(r: Random, accountId: string): Asset {
  assetSeq += 1;
  const kind = r.pick(ASSET_KINDS);
  const asset: Asset = {
    id: `as_${pad(assetSeq, 4)}`,
    kind,
    capacity: kind === 'Sensor' ? r.int(3, 12) * 100 : r.int(5, 40) * 1000,
    accountId,
  };
  // Optional fields are sometimes missing on purpose (exercises the "-" fallback).
  if (r.chance(0.5))
    asset.name = r.pick(['Primary node', 'Backup node', 'Edge relay', 'Cold store', 'Front desk']);
  if (r.chance(0.85)) asset.enclosure = r.pick(ENCLOSURES);
  if (r.chance(0.9)) asset.powerSource = r.pick(POWER_SOURCES);
  if (r.chance(0.85)) asset.tier = r.pick(TIERS);
  if (r.chance(0.8)) asset.placement = r.pick(PLACEMENTS);
  if (r.chance(0.8)) asset.mounting = r.pick(MOUNTINGS);
  if (r.chance(0.75)) asset.coolingType = r.pick(COOLING);
  if (r.chance(0.7)) {
    asset.installedAtUTC = new Date(
      Date.UTC(r.int(1985, 2023), r.int(0, 11), r.int(1, 28)),
    ).toISOString();
  }
  if (r.chance(0.6)) asset.vendor = r.pick(VENDORS);
  if (r.chance(0.4)) asset.notes = r.pick(NOTES);
  return asset;
}

function makeSite(r: Random, accountId: string, index: number): Site {
  const assetCount = r.chance(0.1) ? 0 : r.int(1, r.chance(0.15) ? 6 : 2);
  return {
    identifiers: { id: `${accountId}_st${index + 1}` },
    address: makeAddress(r),
    assets: Array.from({ length: assetCount }, () => makeAsset(r, accountId)),
  };
}

function makeAccount(r: Random, index: number): Account {
  const id = `a_${pad(index + 1, 4)}`;
  const firstName = r.pick(FIRST_NAMES);
  const lastName = r.pick(LAST_NAMES);
  const account: Account = {
    identifiers: { id },
    displayName: { firstName, lastName },
  };
  if (r.chance(0.55)) {
    account.displayName.companyName = `${r.pick(COMPANY_PREFIXES)} ${r.pick(COMPANY_SUFFIXES)}`;
  }
  if (r.chance(0.92)) account.billingAddress = makeAddress(r);

  if (r.chance(0.95)) {
    const emailCount = r.chance(0.1) ? 0 : r.int(1, 3);
    const phoneCount = r.chance(0.1) ? 0 : r.int(1, 3);
    const handle = toPlainLatin(`${firstName}.${lastName}`)
      .replace(/[^A-Za-z.]/g, '')
      .toLowerCase();
    account.contactInformation = {
      emailAddresses: Array.from({ length: emailCount }, (_, i) => ({
        email: i === 0 ? `${handle}@example.com` : `${handle}${i + 1}@mail.example.org`,
      })),
      phoneNumbers: Array.from({ length: phoneCount }, () => ({
        number: makePhone(r),
        phoneType: r.pick(PHONE_TYPES),
      })),
    };
  }

  if (r.chance(0.93)) {
    const siteCount = r.int(1, r.chance(0.2) ? 3 : 1);
    account.sites = Array.from({ length: siteCount }, (_, i) => makeSite(r, id, i));
  }
  return account;
}

/** Generates the deterministic account dataset (235 accounts → 24 pages at size 10). */
export function generateAccounts(count = ACCOUNT_COUNT, seed = ACCOUNT_SEED): Account[] {
  const r = createRandom(seed);
  assetSeq = 0;
  return Array.from({ length: count }, (_, i) => makeAccount(r, i));
}

/** All assets of an account, across its sites. */
export function getAccountAssets(account: Account): Asset[] {
  return (account.sites ?? []).flatMap((s) => s.assets);
}

/** "First Last" display name. */
export function formatAccountName(account: Account): string {
  const { firstName, lastName } = account.displayName;
  return [firstName, lastName].filter(Boolean).join(' ');
}
