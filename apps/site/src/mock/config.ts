/** Runtime knobs for the mock server (changed from the demo UI; read per request). */
export interface MockConfig {
  /** Fixed latency, or a `[min, max]` range in ms. Default 400 ± 200. */
  latencyMs: number | readonly [min: number, max: number];
  /** Probability (0–1) that a request fails with HTTP 500. */
  errorRate: number;
}

const STORAGE_KEY = 'tk-site:mock-config';
const DEFAULT_CONFIG: MockConfig = { latencyMs: [200, 600], errorRate: 0 };

function readInitial(): MockConfig {
  const config: MockConfig = { ...DEFAULT_CONFIG };
  if (typeof window === 'undefined') return config;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) Object.assign(config, JSON.parse(stored) as Partial<MockConfig>);
  } catch {
    // Storage can be unavailable (private mode); defaults are fine.
  }
  // `?mockLatency=0` / `?mockErrorRate=0.5` make e2e runs deterministic.
  const params = new URLSearchParams(window.location.search);
  const latency = params.get('mockLatency');
  if (latency !== null) config.latencyMs = Number(latency);
  const errorRate = params.get('mockErrorRate');
  if (errorRate !== null) config.errorRate = Number(errorRate);
  return config;
}

let current = readInitial();

export function getMockConfig(): MockConfig {
  return current;
}

export function setMockConfig(patch: Partial<MockConfig>): void {
  current = { ...current, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export function resolveLatency(config: MockConfig, random: () => number = Math.random): number {
  const { latencyMs } = config;
  if (typeof latencyMs === 'number') return Math.max(0, latencyMs);
  const [min, max] = latencyMs;
  return Math.round(min + random() * (max - min));
}
