import { describe, expect, it } from 'vitest';
import { buildRecentRiverIntelligence } from '@/lib/riverIntelligence';
import type { DailyObservation } from '@/lib/types';

function row(date: string, outflow: number | null, lake: number | null): DailyObservation {
  return {
    date,
    generationMWh: null,
    averageGenerationMW: null,
    stationUseMWh: null,
    inflowKcfs: null,
    totalOutflowKcfs: outflow,
    generationFlowKcfs: null,
    spillKcfs: null,
    reservoirElevationFt: lake,
    forebayFt: lake,
    tailwaterFt: null,
    headFt: null,
    banksLakePumpKcfs: null,
    banksLakePumpMWh: null,
    banksLakeElevationFt: null
  };
}

const week = [
  row('2026-09-01', 90, 1277.50),
  row('2026-09-02', 100, 1277.56),
  row('2026-09-03', 100, 1277.62),
  row('2026-09-04', 100, 1277.70),
  row('2026-09-05', 100, 1277.78),
  row('2026-09-06', 100, 1277.84),
  row('2026-09-07', 100, 1277.90),
  row('2026-09-08', 100, 1278.00)
];

describe('recent Grand Coulee river intelligence', () => {
  it('compares current outflow with the latest seven reported daily outflows', () => {
    const result = buildRecentRiverIntelligence(week, 120, 63.3, 55.2);
    expect(result.outflow7dAverageKcfs).toBe(100);
    expect(result.currentOutflowVs7dPct).toBe(20);
    expect(result.lake7dChangeFt).toBeCloseTo(0.5, 6);
    expect(result.dailyInflowMinusOutflowKcfs).toBeCloseTo(8.1, 6);
    expect(result.signal).toBe('Current outflow is 20% above the last 7-day average.');
  });

  it('uses meaningful lake movement when outflow is close to its recent average', () => {
    const result = buildRecentRiverIntelligence(week, 104, 56, 55);
    expect(result.currentOutflowVs7dPct).toBe(4);
    expect(result.signal).toBe('Lake Roosevelt is 0.50 ft higher than 7 days ago.');
  });

  it('does not invent a seven-day lake comparison without an observation at least seven days earlier', () => {
    const short = week.slice(-4);
    const result = buildRecentRiverIntelligence(short, 100, 60, 55);
    expect(result.lake7dChangeFt).toBeNull();
    expect(result.signal).toBe('Latest daily inflow is 5.0 kcfs above daily outflow.');
  });
});
