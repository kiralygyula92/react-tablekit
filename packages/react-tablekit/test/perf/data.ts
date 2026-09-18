/** A wide-ish row for the performance budgets. */
export interface BenchPerson {
  id: string;
  name: string;
  email: string;
  age: number;
  department: string;
  status: string;
  salary: number;
  joined: string;
  remote: boolean;
  city: string;
  country: string;
}

const FIRST = ['Ava', 'Ben', 'Chloé', 'Dev', 'Emma', 'Finn', 'Gyula', 'Hana', 'Ivan', 'Júlia'];
const LAST = ['Chen', 'García', 'Horváth', 'Müller', 'Nakamura', 'Okafor', 'Patel', 'Rossi'];
const DEPARTMENTS = ['Engineering', 'Sales', 'Support', 'Marketing', 'Finance'];
const STATUSES = ['active', 'invited', 'suspended'];
const CITIES = ['Budapest', 'Berlin', 'Austin', 'Lisbon', 'Toronto', 'Osaka'];
const COUNTRIES = ['HU', 'DE', 'US', 'PT', 'CA', 'JP'];

/** Deterministic rows (a cheap LCG, so the benchmark input never varies). */
export function generatePeople(count: number): BenchPerson[] {
  let seed = 12345;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  const pick = <T>(list: T[]) => list[next() % list.length]!;
  return Array.from({ length: count }, (_, i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    return {
      id: `u${String(i)}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${String(i)}@example.com`.toLowerCase(),
      age: 19 + (next() % 48),
      department: pick(DEPARTMENTS),
      status: pick(STATUSES),
      salary: 38_000 + (next() % 150) * 1000,
      joined: `20${String(12 + (next() % 14)).padStart(2, '0')}-0${String(1 + (next() % 9))}-1${String(next() % 9)}`,
      remote: next() % 2 === 0,
      city: pick(CITIES),
      country: pick(COUNTRIES),
    };
  });
}
