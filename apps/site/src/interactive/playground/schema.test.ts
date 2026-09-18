import { describe, expect, it } from 'vitest';
import { readSetupParams } from './schema';

describe('readSetupParams', () => {
  it('keeps shared URL values within the limits of the setup controls', () => {
    const values = readSetupParams(
      new URLSearchParams('rowCount=1000000000&pageSize=0&latencyMs=-50&failRate=5'),
    );
    expect(values.rowCount).toBe(10000);
    expect(values.pageSize).toBe(1);
    expect(values.latencyMs).toBe(0);
    expect(values.failRate).toBe(1);
  });

  it('preserves valid numeric configuration and ignores non-finite values', () => {
    const values = readSetupParams(
      new URLSearchParams('rowCount=25&failRate=0.5&latencyMs=Infinity'),
    );
    expect(values.rowCount).toBe(25);
    expect(values.failRate).toBe(0.5);
    expect(values.latencyMs).toBe(300);
  });
});
