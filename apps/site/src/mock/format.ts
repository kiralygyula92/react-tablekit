import type { Address, PhoneType } from './types';

const PHONE_ORDER: Record<PhoneType, number> = { Work: 1, Mobile: 2, Home: 3, Unknown: 4 };

/**
 * Phone list formatting: grouped and sorted by type (Work, Mobile, Home, Unknown), and numbered
 * within a type ("Mobile 2") when that type appears more than once.
 */
export function formatPhoneLines(phones: { number: string; phoneType: PhoneType }[]): string[] {
  const sorted = [...phones].sort((a, b) => PHONE_ORDER[a.phoneType] - PHONE_ORDER[b.phoneType]);
  const totals = new Map<PhoneType, number>();
  for (const p of sorted) totals.set(p.phoneType, (totals.get(p.phoneType) ?? 0) + 1);
  const seen = new Map<PhoneType, number>();
  return sorted.map((p) => {
    const n = (seen.get(p.phoneType) ?? 0) + 1;
    seen.set(p.phoneType, n);
    const label = (totals.get(p.phoneType) ?? 0) > 1 ? `${p.phoneType} ${n}` : p.phoneType;
    return `${label}: ${p.number}`;
  });
}

/** Short address format: "City, ST 12345". */
export function getShortFormatAddress(address: Address | undefined): string {
  if (!address) return '';
  return `${address.city}, ${address.region} ${address.postalCode}`;
}

/** Letters that are not a base letter plus a combining mark, so NFD alone leaves them in place. */
const TRANSLITERATE: Record<string, string> = {
  ø: 'o',
  Ø: 'O',
  æ: 'ae',
  Æ: 'Ae',
  œ: 'oe',
  Œ: 'Oe',
  ß: 'ss',
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D',
  þ: 'th',
  Þ: 'Th',
};

/** Plain Latin letters for a name: "Bjørn Østergaard" becomes "Bjorn Ostergaard". */
export function toPlainLatin(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[øØæÆœŒßłŁđĐþÞ]/g, (letter) => TRANSLITERATE[letter] ?? letter);
}
