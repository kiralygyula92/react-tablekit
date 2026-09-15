import { createRandom, seedFromString } from '../prng';
import type { Reading } from '../types';

export const READINGS_PER_ASSET = 57;

/**
 * Deterministic reading history for one asset (57 samples, newest first).
 * Some readings have no report, which exercises the disabled action states.
 */
export function generateReadings(assetId: string): Reading[] {
  const r = createRandom(seedFromString(assetId));
  const start = Date.UTC(2026, 7, 28, 9, 0, 0);
  const readings: Reading[] = [];
  for (let i = 0; i < READINGS_PER_ASSET; i++) {
    const id = `${assetId}_rd${String(i + 1).padStart(3, '0')}`;
    const reading: Reading = {
      id,
      date: new Date(start - i * 7 * 86_400_000 - r.int(0, 8) * 3_600_000).toISOString(),
      loadFactor: r.float(6.8, 8.2, 1),
      inputVoltage: r.float(0, 6, 1),
      outputVoltage: r.float(0, 5, 1),
      throughput: r.int(0, 4200),
      errorRate: r.int(0, 120),
      queueDepth: r.int(40, 180),
      memoryUsed: r.int(100, 600),
      diskUsed: r.int(300, 3500),
      packetLoss: r.int(0, 1500),
      jitter: r.float(0, 1, 2),
      latency: r.float(0, 8, 1),
      uptimeDays: r.int(0, 80),
      fanSpeed: r.float(0, 1, 2),
      powerDraw: r.int(0, 50),
      peakDraw: r.int(0, 100),
      temperature: r.int(55, 95),
    };
    if (r.chance(0.8)) {
      reading.reportId = `rep_${id}`;
      if (r.chance(0.9)) reading.reportUrl = `https://example.com/reports/${id}.pdf`;
    }
    if (r.chance(0.5)) reading.workOrderId = `wo_${id}`;
    readings.push(reading);
  }
  return readings;
}
