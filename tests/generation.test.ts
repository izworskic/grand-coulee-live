import { describe, expect, it } from 'vitest';
import { buildCalibration, estimateGenerationMW, inferredEfficiency, theoreticalHydraulicMW } from '@/lib/generation';
import type { DailyObservation } from '@/lib/types';

function day(date: string, mw: number, flow: number, head: number): DailyObservation {
  return { date, generationMWh: mw * 24, averageGenerationMW: mw, stationUseMWh: 180, inflowKcfs: 100, totalOutflowKcfs: flow, generationFlowKcfs: flow, spillKcfs: 0, reservoirElevationFt: 1285, forebayFt: 1285, tailwaterFt: 960, headFt: head, banksLakePumpKcfs: 5, banksLakePumpMWh: 3000, banksLakeElevationFt: 1568 };
}

describe('generation model', () => {
  it('converts hydraulic power to plausible MW', () => {
    const mw = theoreticalHydraulicMW(100, 325);
    expect(mw).toBeGreaterThan(2700);
    expect(mw).toBeLessThan(2800);
  });

  it('infers a physically plausible efficiency', () => {
    const sample = day('2026-07-01', 2450, 100, 325);
    const efficiency = inferredEfficiency(sample);
    expect(efficiency).not.toBeNull();
    expect(efficiency!).toBeGreaterThan(.8);
    expect(efficiency!).toBeLessThan(1);
  });

  it('uses robust median calibration and caps at installed capacity', () => {
    const rows = [2300, 2310, 2290, 2320, 2280, 9000, 2305].map((mw, i) => day(`2026-07-${String(i + 1).padStart(2, '0')}`, mw, 95, 325));
    const calibration = buildCalibration(rows);
    expect(calibration.days).toBeGreaterThanOrEqual(6);
    expect(calibration.efficiency).not.toBeNull();
    const estimate = estimateGenerationMW(300, 350, calibration.efficiency);
    expect(estimate).toBeLessThanOrEqual(6809);
  });
});
