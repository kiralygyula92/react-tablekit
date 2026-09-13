import { interpolate } from '../core/utils';
import { en } from '../locales/en';
import type { LocalizedString, TableFormatters, TableLocalization } from '../locales/types';

/** Keys of `TableLocalization` whose values are strings or string functions. */
export type LocalizationKey = {
  [K in keyof TableLocalization]: TableLocalization[K] extends LocalizedString ? K : never;
}[keyof TableLocalization];

/** A translate function bound to a merged localization. */
export type Translate = (key: LocalizationKey, vars?: Record<string, string | number>) => string;

/** Deep-merges localization layers over English. */
export function mergeLocalization(
  ...layers: (Partial<TableLocalization> | undefined)[]
): TableLocalization {
  let out: TableLocalization = en;
  for (const layer of layers) {
    if (!layer) continue;
    out = {
      ...out,
      ...layer,
      operators: { ...out.operators, ...layer.operators },
      datePresets: { ...out.datePresets, ...layer.datePresets },
    };
  }
  return out;
}

/** Creates the translate function (`{name}` interpolation; functions get the variables). */
export function createTranslate(localization: TableLocalization): Translate {
  return (key, vars = {}) => {
    const value = localization[key];
    return typeof value === 'function' ? value(vars) : interpolate(value, vars);
  };
}

const numberFormats = new Map<string, Intl.NumberFormat>();
const numberFormat = (locale: string) => {
  let f = numberFormats.get(locale);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale);
    } catch {
      f = new Intl.NumberFormat('en-US');
    }
    numberFormats.set(locale, f);
  }
  return f;
};

/** Default formatters (`Intl`, using the table's `locale`). */
export const defaultFormatters: TableFormatters = {
  number: (value, locale) => numberFormat(locale).format(value),
  date: (value, locale) => new Date(value).toLocaleDateString(locale),
  rowRange: (from, to, total, locale) => ({
    from: numberFormat(locale).format(from),
    to: numberFormat(locale).format(to),
    total: numberFormat(locale).format(total),
  }),
  page: (n, locale) => numberFormat(locale).format(n),
};
