import { useState } from 'react';
import { DataTable, defaultLocalization, type TableLocalization } from 'react-tablekit';
import de from 'react-tablekit/locales/de';
import es from 'react-tablekit/locales/es';
import hu from 'react-tablekit/locales/hu';
import { generatePeople } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const data = generatePeople(80);

const LOCALES: Record<string, { label: string; localization: TableLocalization; locale: string }> =
  {
    en: { label: 'English', localization: defaultLocalization, locale: 'en-US' },
    hu: { label: 'Magyar', localization: hu, locale: 'hu-HU' },
    de: { label: 'Deutsch', localization: de, locale: 'de-DE' },
    es: { label: 'Español', localization: es, locale: 'es-ES' },
  };

/**
 * Localization (06 §8): every user-visible string comes from a `TableLocalization` object, and
 * `locale` drives the `Intl` formatters (number, date and the row range). Locale packs ship as
 * subpath exports, so you only bundle the ones you import.
 *
 * For i18next or similar, pass your own object built from `t()` calls instead of a pack.
 */
export default function LocalizationExample() {
  const [lang, setLang] = useState('hu');
  const current = LOCALES[lang]!;

  return (
    <div className="example-stack">
      <div className="example-controls">
        <label>
          <span>Language</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.entries(LOCALES).map(([code, l]) => (
              <option key={code} value={code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <p className="site-muted">
          Open the toolbar menus, sort a column and page through: labels, announcements, the row
          range and the date and number formats all follow the selection.
        </p>
      </div>
      <DataTable
        key={lang}
        aria-label={current.label}
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        localization={current.localization}
        locale={current.locale}
        enableHiding
        enableDensityToggle
        enableExport
        showActiveFilterChips
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
    </div>
  );
}
