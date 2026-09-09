import type { Confidence, DailyObservation } from '@/lib/types';

const CFS_TO_CMS = 0.028316846592;
const FT_TO_M = 0.3048;
const RHO = 1000;
const G = 9.80665;
export const INSTALLED_CAPACITY_MW = 6809;

export function theoreticalHydraulicMW(flowKcfs: number, headFt: number): number {
  const q = flowKcfs * 1000 * CFS_TO_CMS;
  const h = headFt * FT_TO_M;
  return (RHO * G * q * h) / 1_000_000;
}

export function inferredEfficiency(day: DailyObservation): number | null {
  if (day.averageGenerationMW === null || day.generationFlowKcfs === null || day.headFt === null) return null;
  if (day.averageGenerationMW <= 0 || day.generationFlowKcfs <= 0 || day.headFt <= 0) return null;
  const theoretical = theoreticalHydraulicMW(day.generationFlowKcfs, day.headFt);
  if (theoretical <= 0) return null;
  const efficiency = day.averageGenerationMW / theoretical;
  return efficiency >= 0.5 && efficiency <= 1.05 ? efficiency : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function buildCalibration(days: DailyObservation[]) {
  const samples = days
    .filter(day => Date.parse(`${day.date}T12:00:00Z`) < Date.now())
    .map(day => ({ day, efficiency: inferredEfficiency(day) }))
    .filter((item): item is { day: DailyObservation; efficiency: number } => item.efficiency !== null)
    .slice(-14);

  if (!samples.length) return { efficiency: null, days: 0, dispersion: null, confidence: 'low' as Confidence };
  const efficiency = median(samples.map(sample => sample.efficiency));
  const deviations = samples.map(sample => Math.abs(sample.efficiency - efficiency));
  const mad = median(deviations);
  const dispersion = efficiency ? mad / efficiency : null;
  let confidence: Confidence = 'low';
  if (samples.length >= 7 && (dispersion ?? 1) <= 0.04) confidence = 'high';
  else if (samples.length >= 4 && (dispersion ?? 1) <= 0.08) confidence = 'medium';
  return { efficiency, days: samples.length, dispersion, confidence };
}

export function estimateGenerationMW(flowKcfs: number | null, headFt: number | null, efficiency: number | null): number | null {
  if (flowKcfs === null || headFt === null || efficiency === null) return null;
  const estimated = theoreticalHydraulicMW(flowKcfs, headFt) * efficiency;
  if (!Number.isFinite(estimated) || estimated < 0) return null;
  return Math.min(INSTALLED_CAPACITY_MW, estimated);
}
