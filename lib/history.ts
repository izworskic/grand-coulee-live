import type { DailyObservation, HourlyObservation } from '@/lib/types';
import { estimateGenerationMW } from '@/lib/generation';

export type HistoryInsight = {
  id: string;
  label: 'DERIVED';
  text: string;
};

export type HourlyHistoryPoint = HourlyObservation & {
  estimatedGenerationMW: number | null;
};

function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || Math.abs(from) < 1e-9) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

function fmtSigned(value: number, digits = 1, suffix = '') {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}${suffix}`;
}

function latestAtOrBefore<T extends { observedAt: string }>(rows: T[], targetMs: number): T | null {
  const eligible = rows.filter(row => Date.parse(row.observedAt) <= targetMs);
  return eligible.at(-1) ?? null;
}

export function enrichHourlyHistory(rows: HourlyObservation[], efficiency: number | null): HourlyHistoryPoint[] {
  return rows.map(row => ({
    ...row,
    estimatedGenerationMW: estimateGenerationMW(row.generationFlowKcfs, row.headFt, efficiency)
  }));
}

export function deriveHourlyInsights(rows: HourlyHistoryPoint[]): HistoryInsight[] {
  if (rows.length < 2) return [];
  const sorted = [...rows].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const latest = sorted.at(-1)!;
  const first = sorted[0];
  const insights: HistoryInsight[] = [];

  if (first.forebayFt !== null && latest.forebayFt !== null) {
    const delta = latest.forebayFt - first.forebayFt;
    if (Math.abs(delta) >= 0.01) {
      insights.push({ id: 'forebay-change', label: 'DERIVED', text: `Lake Roosevelt ${delta > 0 ? 'rose' : 'fell'} ${Math.abs(delta).toFixed(2)} ft across the available 24-hour observations.` });
    }
  }

  const sixHoursAgo = latestAtOrBefore(sorted, Date.parse(latest.observedAt) - 6 * 3_600_000);
  if (sixHoursAgo?.totalOutflowKcfs !== null && sixHoursAgo?.totalOutflowKcfs !== undefined && latest.totalOutflowKcfs !== null) {
    const pct = pctChange(sixHoursAgo.totalOutflowKcfs, latest.totalOutflowKcfs);
    if (pct !== null && Math.abs(pct) >= 1) {
      insights.push({ id: 'outflow-change', label: 'DERIVED', text: `Total outflow is ${Math.abs(pct).toFixed(0)}% ${pct > 0 ? 'higher' : 'lower'} than about six hours earlier.` });
    }
  }

  const spillRows = sorted.filter(row => row.spillKcfs !== null);
  for (let i = spillRows.length - 1; i >= 1; i--) {
    const prior = spillRows[i - 1].spillKcfs!;
    const current = spillRows[i].spillKcfs!;
    if (prior <= 0.05 && current > 0.05) {
      const time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }).format(new Date(spillRows[i].observedAt));
      insights.push({ id: 'spill-start', label: 'DERIVED', text: `The latest observed spill transition began at approximately ${time} Pacific.` });
      break;
    }
  }

  const generationRows = sorted.filter(row => row.estimatedGenerationMW !== null);
  if (generationRows.length >= 2) {
    const latestGeneration = generationRows.at(-1)!;
    const sixHoursPrior = latestAtOrBefore(generationRows, Date.parse(latestGeneration.observedAt) - 6 * 3_600_000);
    if (sixHoursPrior?.estimatedGenerationMW !== null && latestGeneration.estimatedGenerationMW !== null) {
      const change = latestGeneration.estimatedGenerationMW - sixHoursPrior.estimatedGenerationMW;
      if (Math.abs(change) >= 25) {
        insights.push({ id: 'generation-change', label: 'DERIVED', text: `Estimated generation changed by ${fmtSigned(change, 0, ' MW')} over roughly six hours.` });
      }
    }
  }

  return insights.slice(0, 4);
}

export function deriveDailyInsights(rows: DailyObservation[]): HistoryInsight[] {
  const validRows = rows.filter(row => row.date).sort((a, b) => a.date.localeCompare(b.date));
  if (validRows.length < 2) return [];
  const first = validRows[0];
  const latest = validRows.at(-1)!;
  const insights: HistoryInsight[] = [];

  const firstElevation = first.reservoirElevationFt ?? first.forebayFt;
  const latestElevation = latest.reservoirElevationFt ?? latest.forebayFt;
  if (firstElevation !== null && latestElevation !== null) {
    const delta = latestElevation - firstElevation;
    if (Math.abs(delta) >= 0.05) {
      insights.push({ id: 'daily-reservoir', label: 'DERIVED', text: `Reported reservoir elevation changed ${fmtSigned(delta, 2, ' ft')} from ${first.date} through ${latest.date}.` });
    }
  }

  if (first.totalOutflowKcfs !== null && latest.totalOutflowKcfs !== null) {
    const pct = pctChange(first.totalOutflowKcfs, latest.totalOutflowKcfs);
    if (pct !== null && Math.abs(pct) >= 1) {
      insights.push({ id: 'daily-outflow', label: 'DERIVED', text: `Reported daily outflow ended ${Math.abs(pct).toFixed(0)}% ${pct > 0 ? 'above' : 'below'} the first day in this view.` });
    }
  }

  if (first.averageGenerationMW !== null && latest.averageGenerationMW !== null) {
    const delta = latest.averageGenerationMW - first.averageGenerationMW;
    if (Math.abs(delta) >= 25) {
      insights.push({ id: 'daily-generation', label: 'DERIVED', text: `Reported average generation changed ${fmtSigned(delta, 0, ' MW')} across the selected reported-day window.` });
    }
  }

  const spillDays = validRows.filter(row => (row.spillKcfs ?? 0) > 0.05).length;
  const numericSpillDays = validRows.filter(row => row.spillKcfs !== null).length;
  if (numericSpillDays > 0) {
    insights.push({ id: 'daily-spill', label: 'DERIVED', text: spillDays > 0 ? `Spill was reported on ${spillDays} of ${numericSpillDays} days with numeric spill observations in this view.` : `No meaningful spill was reported on the ${numericSpillDays} days with numeric spill observations in this view.` });
  }

  return insights.slice(0, 4);
}
