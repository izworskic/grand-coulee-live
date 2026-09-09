import { DateTime } from 'luxon';
import type { DailyObservation } from '@/lib/types';

export interface RecentRiverIntelligence {
  outflow7dAverageKcfs: number | null;
  currentOutflowVs7dPct: number | null;
  lake7dChangeFt: number | null;
  dailyInflowMinusOutflowKcfs: number | null;
  signal: string | null;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function lakeValue(row: DailyObservation) {
  return row.reservoirElevationFt ?? row.forebayFt;
}

function sevenDayLakeChange(rows: DailyObservation[]) {
  const valid = rows
    .filter(row => lakeValue(row) !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = valid.at(-1);
  if (!latest) return null;

  const latestDate = DateTime.fromISO(latest.date, { zone: 'America/Los_Angeles' });
  if (!latestDate.isValid) return null;
  const target = latestDate.minus({ days: 7 });

  const prior = [...valid]
    .reverse()
    .find(row => {
      const date = DateTime.fromISO(row.date, { zone: 'America/Los_Angeles' });
      return date.isValid && date <= target;
    });

  const latestValue = lakeValue(latest);
  const priorValue = prior ? lakeValue(prior) : null;
  return latestValue === null || priorValue === null ? null : latestValue - priorValue;
}

function signalFor(values: Omit<RecentRiverIntelligence, 'signal'>) {
  const { currentOutflowVs7dPct, lake7dChangeFt, dailyInflowMinusOutflowKcfs } = values;

  if (currentOutflowVs7dPct !== null && Math.abs(currentOutflowVs7dPct) >= 10) {
    return `Current outflow is ${Math.abs(currentOutflowVs7dPct).toFixed(0)}% ${currentOutflowVs7dPct > 0 ? 'above' : 'below'} the last 7-day average.`;
  }

  if (lake7dChangeFt !== null && Math.abs(lake7dChangeFt) >= 0.25) {
    return `Lake Roosevelt is ${Math.abs(lake7dChangeFt).toFixed(2)} ft ${lake7dChangeFt > 0 ? 'higher' : 'lower'} than 7 days ago.`;
  }

  if (dailyInflowMinusOutflowKcfs !== null && Math.abs(dailyInflowMinusOutflowKcfs) >= 5) {
    return `Latest daily inflow is ${Math.abs(dailyInflowMinusOutflowKcfs).toFixed(1)} kcfs ${dailyInflowMinusOutflowKcfs > 0 ? 'above' : 'below'} daily outflow.`;
  }

  return null;
}

export function buildRecentRiverIntelligence(
  daily: DailyObservation[],
  currentOutflowKcfs: number | null,
  latestDailyInflowKcfs: number | null,
  latestDailyOutflowKcfs: number | null
): RecentRiverIntelligence {
  const recentOutflows = [...daily]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(row => row.totalOutflowKcfs !== null)
    .slice(-7)
    .map(row => row.totalOutflowKcfs as number);

  const outflow7dAverageKcfs = mean(recentOutflows);
  const currentOutflowVs7dPct = currentOutflowKcfs !== null && outflow7dAverageKcfs !== null && outflow7dAverageKcfs > 0
    ? ((currentOutflowKcfs - outflow7dAverageKcfs) / outflow7dAverageKcfs) * 100
    : null;
  const lake7dChangeFt = sevenDayLakeChange(daily);
  const dailyInflowMinusOutflowKcfs = latestDailyInflowKcfs !== null && latestDailyOutflowKcfs !== null
    ? latestDailyInflowKcfs - latestDailyOutflowKcfs
    : null;

  const values = { outflow7dAverageKcfs, currentOutflowVs7dPct, lake7dChangeFt, dailyInflowMinusOutflowKcfs };
  return { ...values, signal: signalFor(values) };
}
