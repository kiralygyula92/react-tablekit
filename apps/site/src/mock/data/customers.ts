import { createRandom, type Random } from '../prng';
import type { Address, BodyOfWater, Customer, PhoneType, ServiceLocation } from '../types';

export const CUSTOMER_COUNT = 235;
export const CUSTOMER_SEED = 20240611;

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
  'Sunset',
  'Palm',
  'Aqua',
  'Coastal',
  'Desert',
  'Golden',
  'Clear',
  'Summit',
] as const;
const COMPANY_SUFFIXES = [
  'Pools',
  'Properties',
  'Resorts',
  'HOA',
  'Holdings',
  'Management',
  'Spa & Wellness',
  'Villas',
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

const CITIES: readonly (readonly [city: string, state: string, zipPrefix: number])[] = [
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

const BOW_TYPES = ['Pool', 'Spa', 'Fountain', 'Pond'] as const;
const SURFACES = ['Plaster', 'Pebble', 'Tile', 'Vinyl', 'Fiberglass'] as const;
const SANITIZERS = ['Chlorine', 'Salt', 'Bromine', 'Biguanide', 'Mineral'] as const;
const CLASSIFICATIONS = ['Residential', 'Commercial', 'HOA'] as const;
const LOCATIONS = ['Indoor', 'Outdoor'] as const;
const GROUND_LEVELS = ['In-ground', 'Above-ground'] as const;
const FILTERS = ['Sand', 'Cartridge', 'DE'] as const;
const BUILDERS = ['Blue Haven', 'Premier Pools', 'Anthony & Sylvan', 'Paddock', 'California Pools'];
const NOTES = [
  'Gate code 4471. Dog in the back yard, please close the gate.',
  'Customer prefers morning visits.',
  'Heater was replaced in spring; check pressure gauge.',
  'Algae issues in late summer; monitor phosphates closely every visit.',
  'Key under the mat.',
];
const PHONE_TYPES: readonly PhoneType[] = ['Work', 'Mobile', 'Home', 'Unknown'];

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function makeAddress(r: Random): Address {
  const [city, state, zipPrefix] = r.pick(CITIES);
  const address: Address = {
    address1: `${r.int(100, 9999)} ${r.pick(STREETS)}`,
    city,
    adminArea1: state,
    postalCode: `${zipPrefix}${pad(r.int(0, 99), 2)}`,
    country: 'US',
  };
  if (r.chance(0.2)) address.address2 = `Unit ${r.int(1, 40)}`;
  return address;
}

function makePhone(r: Random): string {
  return `(${r.int(201, 989)}) ${r.int(200, 999)}-${pad(r.int(0, 9999), 4)}`;
}

let bodyOfWaterSeq = 0;

function makeBodyOfWater(r: Random, customerId: string): BodyOfWater {
  bodyOfWaterSeq += 1;
  const type = r.pick(BOW_TYPES);
  const bow: BodyOfWater = {
    id: `bow_${pad(bodyOfWaterSeq, 4)}`,
    type,
    gallons: type === 'Spa' ? r.int(3, 12) * 100 : r.int(5, 40) * 1000,
    customerId,
  };
  // Optional fields are sometimes missing on purpose (exercises the "-" fallback).
  if (r.chance(0.5))
    bow.name = r.pick(['Main pool', 'Back spa', 'Lap pool', 'Koi pond', 'Front fountain']);
  if (r.chance(0.85)) bow.surfaceType = r.pick(SURFACES);
  if (r.chance(0.9)) bow.sanitizer = r.pick(SANITIZERS);
  if (r.chance(0.85)) bow.classification = r.pick(CLASSIFICATIONS);
  if (r.chance(0.8)) bow.location = r.pick(LOCATIONS);
  if (r.chance(0.8)) bow.groundLevel = r.pick(GROUND_LEVELS);
  if (r.chance(0.75)) bow.filter = r.pick(FILTERS);
  if (r.chance(0.7)) {
    bow.buildDateUTC = new Date(
      Date.UTC(r.int(1985, 2023), r.int(0, 11), r.int(1, 28)),
    ).toISOString();
  }
  if (r.chance(0.6)) bow.builder = r.pick(BUILDERS);
  if (r.chance(0.4)) bow.notes = r.pick(NOTES);
  return bow;
}

function makeServiceLocation(r: Random, customerId: string, index: number): ServiceLocation {
  const bodyCount = r.chance(0.1) ? 0 : r.int(1, r.chance(0.15) ? 6 : 2);
  return {
    identifiers: { id: `${customerId}_sl${index + 1}` },
    address: makeAddress(r),
    bodiesOfWater: Array.from({ length: bodyCount }, () => makeBodyOfWater(r, customerId)),
  };
}

function makeCustomer(r: Random, index: number): Customer {
  const id = `c_${pad(index + 1, 4)}`;
  const firstName = r.pick(FIRST_NAMES);
  const lastName = r.pick(LAST_NAMES);
  const customer: Customer = {
    identifiers: { id },
    displayName: { firstName, lastName },
  };
  if (r.chance(0.55)) {
    customer.displayName.companyName = `${r.pick(COMPANY_PREFIXES)} ${r.pick(COMPANY_SUFFIXES)}`;
  }
  if (r.chance(0.92)) customer.billingAddress = makeAddress(r);

  if (r.chance(0.95)) {
    const emailCount = r.chance(0.1) ? 0 : r.int(1, 3);
    const phoneCount = r.chance(0.1) ? 0 : r.int(1, 3);
    const handle = `${firstName}.${lastName}`
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^A-Za-z.]/g, '')
      .toLowerCase();
    customer.contactInformation = {
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
    const locationCount = r.int(1, r.chance(0.2) ? 3 : 1);
    customer.serviceLocations = Array.from({ length: locationCount }, (_, i) =>
      makeServiceLocation(r, id, i),
    );
  }
  return customer;
}

/** Generates the deterministic customer dataset (235 customers → 24 pages at size 10). */
export function generateCustomers(count = CUSTOMER_COUNT, seed = CUSTOMER_SEED): Customer[] {
  const r = createRandom(seed);
  bodyOfWaterSeq = 0;
  return Array.from({ length: count }, (_, i) => makeCustomer(r, i));
}

/** All bodies of water of a customer, across service locations. */
export function getCustomerBodiesOfWater(customer: Customer): BodyOfWater[] {
  return (customer.serviceLocations ?? []).flatMap((s) => s.bodiesOfWater);
}

/** "First Last" display name as used by the Skimmer lists. */
export function formatCustomerName(customer: Customer): string {
  const { firstName, lastName } = customer.displayName;
  return [firstName, lastName].filter(Boolean).join(' ');
}
