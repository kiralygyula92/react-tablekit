import { describe, expect, it } from 'vitest';
import { createTheme, lightTheme } from '../../src';

describe('createTheme with an override parsed from JSON', () => {
  // A saved or user-chosen theme arrives as JSON, and JSON can carry `__proto__` as a key.
  const override = JSON.parse(
    '{"__proto__": {"polluted": "yes"}, "row": {"stripedBg": "#123456"}}',
  ) as Parameters<typeof createTheme>[1];

  it('still applies the real overrides', () => {
    expect(createTheme(lightTheme, override).row.stripedBg).toBe('#123456');
  });

  it('does not let __proto__ replace the theme prototype or reach Object.prototype', () => {
    const theme = createTheme(lightTheme, override);
    expect(Object.getPrototypeOf(theme)).toBe(Object.prototype);
    expect((theme as unknown as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
