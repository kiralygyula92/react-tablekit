/** mulberry32: a tiny, fast, seedable PRNG. Same seed → same sequence on every machine. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Small helper API over a PRNG. */
export interface Random {
  next(): number;
  int(min: number, max: number): number;
  float(min: number, max: number, decimals?: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
}

export function createRandom(seed: number): Random {
  const next = mulberry32(seed);
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max, decimals = 2) => Number((next() * (max - min) + min).toFixed(decimals)),
    pick: <T>(items: readonly T[]): T => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('pick() on an empty list');
      return item;
    },
    chance: (probability) => next() < probability,
  };
}

/** Derives a stable numeric seed from a string (FNV-1a). */
export function seedFromString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
