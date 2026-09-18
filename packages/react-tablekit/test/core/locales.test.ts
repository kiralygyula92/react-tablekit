import { describe, expect, it } from 'vitest';
import { de } from '../../src/locales/de';
import { en } from '../../src/locales/en';
import { es } from '../../src/locales/es';
import { hu } from '../../src/locales/hu';
import type { TableLocalization } from '../../src/locales/types';

const locales: Record<string, TableLocalization> = { hu, de, es };

type Entry = [key: string, value: unknown];

/** Flattens the localization into `key` / `parent.key` entries. */
function entries(loc: TableLocalization): Entry[] {
  return Object.entries(loc).flatMap(([key, value]): Entry[] =>
    value && typeof value === 'object'
      ? Object.entries(value as Record<string, string>).map(([k, v]): Entry => [`${key}.${k}`, v])
      : [[key, value]],
  );
}

const placeholders = (value: unknown): string[] =>
  typeof value === 'string' ? [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort() : [];

const enEntries = new Map(entries(en));

/** Strings that are the same word in the target language (sorted). */
const ALLOWED_IDENTICAL: Record<string, string[]> = {
  hu: ['groupedBy', 'rowNumber', 'searchHotkeyHint'],
  de: ['densityStandard', 'groupedBy', 'max', 'min', 'operator', 'searchHotkeyHint'],
  es: ['groupedBy', 'no', 'searchHotkeyHint'],
};

describe.each(Object.keys(locales))('locale %s', (name) => {
  const locale = locales[name]!;
  const localeEntries = new Map(entries(locale));

  it('has exactly the keys of `en`', () => {
    expect([...localeEntries.keys()].sort()).toEqual([...enEntries.keys()].sort());
  });

  it('translates every string (non-empty, and different from English where it should be)', () => {
    for (const [key, value] of localeEntries) {
      expect(typeof value === 'string' || typeof value === 'function', key).toBe(true);
      if (typeof value === 'string') expect(value.trim(), key).not.toBe('');
    }
    // A locale that simply copied `en` would be a bug, so every match must be a deliberate one.
    const identical = [...localeEntries].filter(([key, v]) => enEntries.get(key) === v);
    expect(identical.map(([key]) => key).sort()).toEqual(ALLOWED_IDENTICAL[name]);
  });

  it('keeps the placeholders of every message', () => {
    for (const [key, value] of localeEntries) {
      expect(placeholders(value), key).toEqual(placeholders(enEntries.get(key)));
    }
  });
});
