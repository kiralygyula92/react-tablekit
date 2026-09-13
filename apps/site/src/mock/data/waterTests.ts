import { createRandom, seedFromString } from '../prng';
import type { WaterTestHistoryItem } from '../types';

export const WATER_TESTS_PER_POOL = 57;

/**
 * Deterministic water-test history for one body of water (57 tests, newest first).
 * Some tests have no PDF, which exercises the disabled action states.
 */
export function generateWaterTests(bodyOfWaterId: string): WaterTestHistoryItem[] {
  const r = createRandom(seedFromString(bodyOfWaterId));
  const start = Date.UTC(2026, 7, 28, 9, 0, 0);
  const tests: WaterTestHistoryItem[] = [];
  for (let i = 0; i < WATER_TESTS_PER_POOL; i++) {
    const id = `${bodyOfWaterId}_wt${String(i + 1).padStart(3, '0')}`;
    const test: WaterTestHistoryItem = {
      id,
      date: new Date(start - i * 7 * 86_400_000 - r.int(0, 8) * 3_600_000).toISOString(),
      pH: r.float(6.8, 8.2, 1),
      totalChlorine: r.float(0, 6, 1),
      freeChlorine: r.float(0, 5, 1),
      salt: r.int(0, 4200),
      cyanuricAcid: r.int(0, 120),
      totalAlkalinity: r.int(40, 180),
      calciumHardness: r.int(100, 600),
      totalDissolvedSolids: r.int(300, 3500),
      phosphates: r.int(0, 1500),
      iron: r.float(0, 1, 2),
      totalBromine: r.float(0, 8, 1),
      borate: r.int(0, 80),
      copper: r.float(0, 1, 2),
      biguanide: r.int(0, 50),
      biguanideShock: r.int(0, 100),
      waterTemperature: r.int(55, 95),
    };
    if (r.chance(0.8)) {
      test.pdfId = `pdf_${id}`;
      if (r.chance(0.9)) test.pdfUrl = `https://example.com/reports/${id}.pdf`;
    }
    if (r.chance(0.5)) test.treatmentPlanId = `tp_${id}`;
    tests.push(test);
  }
  return tests;
}
