import { useState, type ReactNode } from 'react';
import { classicTheme, lightTheme, type TableTheme } from 'react-tablekit';

/** Parity-mode toggle shared by the Skimmer parity pages (08 §3.1). */
export function useParityTheme(): { theme: TableTheme; toggle: ReactNode } {
  const [mode, setMode] = useState<'classic' | 'light'>('classic');
  const toggle = (
    <fieldset className="parity-toggle">
      <legend>Parity mode</legend>
      {(['classic', 'light'] as const).map((m) => (
        <label key={m}>
          <input
            type="radio"
            name="parity-mode"
            value={m}
            checked={mode === m}
            onChange={() => setMode(m)}
          />
          {m === 'classic' ? 'Classic (Skimmer 1:1)' : 'Light (modern defaults)'}
        </label>
      ))}
    </fieldset>
  );
  return { theme: mode === 'classic' ? classicTheme : lightTheme, toggle };
}

/** The grey Skimmer page canvas with 20px content padding (01 §5.1). */
export function ParityPage({ children }: { children: ReactNode }) {
  return <div className="parity-page">{children}</div>;
}
