import { describe, expect, it } from 'vitest';
import { deriveDailyInsights, deriveHourlyInsights, enrichHourlyHistory } from '@/lib/history';
import type { DailyObservation, HourlyObservation } from '@/lib/types';

const hourly: HourlyObservation[] = [
  { observedAt: '2026-09-08T08:00:00.000Z', hour: 1, totalOutflowKcfs: 80, generationFlowKcfs: 70, spillKcfs: 0, forebayFt: 1278.0, tailwaterFt: 959, headFt: 319 },
  { observedAt: '2026-09-08T14:00:00.000Z', hour: 7, totalOutflowKcfs: 90, generationFlowKcfs: 75, spillKcfs: 2, forebayFt: 1278.2, tailwaterFt: 960, headFt: 318.2 },
  { observedAt: '2026-09-08T20:00:00.000Z', hour: 13, totalOutflowKcfs: 100, generationFlowKcfs: 82, spillKcfs: 3, forebayFt: 1278.5, tailwaterFt: 961, headFt: 317.5 }
];

const daily: DailyObservation[] = [
  { date: '2026-08-01', generationMWh: 48000, averageGenerationMW: 2000, stationUseMWh: 0, inflowKcfs: 90, totalOutflowKcfs: 80, generationFlowKcfs: 80, spillKcfs: 0, reservoirElevationFt: 1275, forebayFt: 1275, tailwaterFt: 960, headFt: 315, banksLakePumpKcfs: 5, banksLakePumpMWh: 3000, banksLakeElevationFt: 1568 },
  { date: '2026-08-02', generationMWh: 60000, averageGenerationMW: 2500, stationUseMWh: 0, inflowKcfs: 100, totalOutflowKcfs: 100, generationFlowKcfs: 95, spillKcfs: 5, reservoirElevationFt: 1276, forebayFt: 1276, tailwaterFt: 961, headFt: 315, banksLakePumpKcfs: 6, banksLakePumpMWh: 3200, banksLakeElevationFt: 1568.2 }
];

describe('operations history intelligence', () => {
  it('enriches hourly observations and reports only data-supported changes', () => {
    const enriched = enrichHourlyHistory(hourly, 0.9);
    expect(enriched[0].estimatedGenerationMW).toBeGreaterThan(0);
    const insights = deriveHourlyInsights(enriched);
    expect(insights.some(item => item.text.includes('Lake Roosevelt rose'))).toBe(true);
    expect(insights.some(item => item.text.includes('Total outflow is'))).toBe(true);
    expect(insights.some(item => item.text.includes('spill transition'))).toBe(true);
    expect(insights.every(item => item.label === 'DERIVED')).toBe(true);
  });

  it('summarizes daily reported changes without inventing operator intent', () => {
    const insights = deriveDailyInsights(daily);
    expect(insights.some(item => item.text.includes('reservoir elevation'))).toBe(true);
    expect(insights.some(item => item.text.includes('average generation'))).toBe(true);
    expect(insights.some(item => item.text.includes('Spill was reported'))).toBe(true);
    expect(insights.some(item => /because|demand/i.test(item.text))).toBe(false);
  });
});
