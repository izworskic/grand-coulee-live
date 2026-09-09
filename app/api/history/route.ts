import { NextRequest, NextResponse } from 'next/server';
import { getDailyObservations, getHourlyObservations } from '@/lib/data/usace';
import { buildCalibration, estimateGenerationMW } from '@/lib/generation';

export const revalidate = 900;

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get('range') ?? '24h';
  if (!['24h', '7d', '30d'].includes(range)) return NextResponse.json({ error: 'Unsupported range' }, { status: 400 });

  try {
    const daily = await getDailyObservations();
    const calibration = buildCalibration(daily);
    if (range === '24h') {
      const hourly = await getHourlyObservations();
      const cutoff = Date.now() - 24 * 3_600_000;
      return NextResponse.json({
        range,
        points: hourly.filter(row => Date.parse(row.observedAt) >= cutoff).map(row => ({
          ...row,
          estimatedGenerationMW: estimateGenerationMW(row.generationFlowKcfs, row.headFt, calibration.efficiency)
        }))
      });
    }
    const days = range === '7d' ? 7 : 30;
    return NextResponse.json({ range, points: daily.slice(-days) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'History unavailable' }, { status: 503 });
  }
}
