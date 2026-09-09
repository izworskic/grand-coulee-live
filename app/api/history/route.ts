import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDailyObservations, getHourlyObservations, ZONE } from '@/lib/data/usace';
import { buildCalibration } from '@/lib/generation';
import { deriveDailyInsights, deriveHourlyInsights, enrichHourlyHistory } from '@/lib/history';

export const revalidate = 900;

function ageHours(iso: string | null) {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, (Date.now() - parsed) / 3_600_000);
}

function ageDays(date: string | null) {
  if (!date) return null;
  const observed = DateTime.fromISO(date, { zone: ZONE }).endOf('day');
  if (!observed.isValid) return null;
  return Math.max(0, DateTime.now().setZone(ZONE).diff(observed, 'days').days);
}

function hourlySeries(points: ReturnType<typeof enrichHourlyHistory>) {
  const definitions = [
    ['forebayFt', 'Lake Roosevelt', 'ft'],
    ['totalOutflowKcfs', 'Total outflow', 'kcfs'],
    ['generationFlowKcfs', 'Generation flow', 'kcfs'],
    ['spillKcfs', 'Spill', 'kcfs'],
    ['headFt', 'Hydraulic head', 'ft'],
    ['estimatedGenerationMW', 'Estimated generation', 'MW']
  ] as const;
  return definitions.filter(([key]) => points.some(point => point[key] !== null)).map(([key, label, unit]) => ({ key, label, unit }));
}

function dailySeries(points: Awaited<ReturnType<typeof getDailyObservations>>) {
  const definitions = [
    ['averageGenerationMW', 'Reported average generation', 'MW'],
    ['reservoirElevationFt', 'Reservoir elevation', 'ft'],
    ['totalOutflowKcfs', 'Total outflow', 'kcfs'],
    ['spillKcfs', 'Spill', 'kcfs'],
    ['banksLakePumpKcfs', 'Banks Lake pump flow', 'kcfs']
  ] as const;
  return definitions.filter(([key]) => points.some(point => point[key] !== null)).map(([key, label, unit]) => ({ key, label, unit }));
}

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get('range') ?? '24h';
  if (!['24h', '7d', '30d'].includes(range)) return NextResponse.json({ error: 'Unsupported range' }, { status: 400 });

  try {
    const daily = await getDailyObservations();
    const calibration = buildCalibration(daily);

    if (range === '24h') {
      const hourly = await getHourlyObservations();
      const latestMs = hourly.length ? Math.max(...hourly.map(row => Date.parse(row.observedAt))) : NaN;
      if (!Number.isFinite(latestMs)) throw new Error('No valid hourly history timestamps were returned.');
      const cutoff = latestMs - 24 * 3_600_000;
      const selected = hourly.filter(row => Date.parse(row.observedAt) >= cutoff);
      const points = enrichHourlyHistory(selected, calibration.efficiency);
      const through = points.at(-1)?.observedAt ?? null;
      return NextResponse.json({
        range,
        basis: 'hourly',
        windowLabel: '24 hours ending at the latest available hourly observation',
        through,
        sourceAgeHours: ageHours(through),
        points,
        series: hourlySeries(points),
        insights: deriveHourlyInsights(points)
      });
    }

    const days = range === '7d' ? 7 : 30;
    const points = daily.slice(-days);
    const through = points.at(-1)?.date ?? null;
    return NextResponse.json({
      range,
      basis: 'daily',
      windowLabel: `${points.length} reported days ending at the latest available daily observation`,
      through,
      sourceAgeDays: ageDays(through),
      points,
      series: dailySeries(points),
      insights: deriveDailyInsights(points)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'History unavailable' }, { status: 503 });
  }
}
