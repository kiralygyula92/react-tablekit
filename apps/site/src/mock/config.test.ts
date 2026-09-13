import { describe, expect, it } from 'vitest';
import { resolveLatency } from './config';

describe('resolveLatency', () => {
  it('returns a fixed latency as-is (never negative)', () => {
    expect(resolveLatency({ latencyMs: 250, errorRate: 0 })).toBe(250);
    expect(resolveLatency({ latencyMs: -5, errorRate: 0 })).toBe(0);
  });

  it('interpolates a [min, max] range', () => {
    const config = { latencyMs: [200, 600] as const, errorRate: 0 };
    expect(resolveLatency(config, () => 0)).toBe(200);
    expect(resolveLatency(config, () => 0.5)).toBe(400);
    expect(resolveLatency(config, () => 0.999999)).toBe(600);
  });
});
