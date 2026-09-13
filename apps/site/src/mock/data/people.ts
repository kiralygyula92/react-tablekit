import { createRandom } from '../prng';

/** A generic person record for the feature demos. */
export interface DemoPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  department: 'Engineering' | 'Sales' | 'Support' | 'Marketing' | 'Finance';
  status: 'active' | 'invited' | 'suspended';
  salary: number;
  joined: string;
  remote: boolean;
  city?: string;
}

const FIRST = [
  'Ava',
  'Ben',
  'Chloé',
  'Dev',
  'Emma',
  'Finn',
  'Gyula',
  'Hana',
  'Ivan',
  'Júlia',
  'Kai',
  'Lena',
  'Mateo',
  'Noah',
  'Olivia',
  'Priya',
  'Quinn',
  'Rosa',
  'Sven',
  'Tariq',
  'Uma',
  'Viktor',
  'Wen',
  'Yusuf',
  'Zoë',
] as const;
const LAST = [
  'Anders',
  'Baker',
  'Chen',
  'Dubois',
  'Evans',
  'Fischer',
  'García',
  'Horváth',
  'Ito',
  'Jensen',
  'Kowalski',
  'López',
  'Müller',
  'Nakamura',
  'Okafor',
  'Patel',
  'Rossi',
  'Schmidt',
  'Tanaka',
  'Weber',
] as const;
const DEPARTMENTS = ['Engineering', 'Sales', 'Support', 'Marketing', 'Finance'] as const;
const STATUSES = ['active', 'active', 'active', 'invited', 'suspended'] as const;
const CITIES = ['Budapest', 'Berlin', 'Austin', 'Lisbon', 'Toronto', 'Osaka', 'Nairobi'] as const;

const cache = new Map<number, DemoPerson[]>();

/** Deterministic people (cached per count). */
export function generatePeople(count: number, seed = 42): DemoPerson[] {
  const key = count * 1000 + seed;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = createRandom(seed);
  const people = Array.from({ length: count }, (_, i): DemoPerson => {
    const firstName = r.pick(FIRST);
    const lastName = r.pick(LAST);
    const handle = `${firstName}.${lastName}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const person: DemoPerson = {
      id: `u${String(i + 1).padStart(5, '0')}`,
      firstName,
      lastName,
      email: `${handle}${i}@example.com`,
      age: r.int(19, 67),
      department: r.pick(DEPARTMENTS),
      status: r.pick(STATUSES),
      salary: r.int(38, 190) * 1000,
      joined: new Date(Date.UTC(r.int(2012, 2026), r.int(0, 11), r.int(1, 28)))
        .toISOString()
        .slice(0, 10),
      remote: r.chance(0.4),
    };
    if (r.chance(0.85)) person.city = r.pick(CITIES);
    return person;
  });
  cache.set(key, people);
  return people;
}
