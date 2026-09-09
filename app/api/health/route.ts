import { NextResponse } from 'next/server';
import { getGrandCouleeStatus } from '@/lib/status';

export const dynamic = 'force-dynamic';

function ageMinutes(iso: string | null | undefined) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.max(0, (Date.now() - ms) / 60_000) : null;
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    const status = await getGrandCouleeStatus();
    const blockers: string[] = [];
    if (status.flow.generationFlowKcfs === null) blockers.push('generation-flow telemetry unavailable; current MW estimate withheld');
    if (status.flow.spillKcfs === null) blockers.push('spill telemetry unavailable; current spill yes/no withheld');
    if (status.telemetry.state !== 'complete') blockers.push(`${status.telemetry.availableCoreSeries}/${status.telemetry.totalCoreSeries} core USACE fields available`);
    if (!status.visitor.scheduleYearVerified) blockers.push('visitor schedule not verified for current calendar year');
    if (!status.visitor.sourcesHealthy) blockers.push('one or more Reclamation visitor source checks failed');

    const sources = status.sources.map(source => ({
      id: source.id,
      label: source.label,
      kind: source.kind,
      freshness: source.freshness,
      observedAt: source.observedAt ?? null,
      observationAgeMinutes: ageMinutes(source.observedAt),
      retrievedAt: source.retrievedAt
    }));

    return NextResponse.json({
      ok: blockers.length === 0,
      checkedAt,
      releaseState: blockers.length === 0 ? 'ready-for-release-review' : 'degraded',
      telemetry: status.telemetry,
      generationModel: {
        currentEstimateAvailable: status.generation.currentEstimatedMW !== null,
        estimateConfidence: status.generation.estimateConfidence,
        calibrationDays: status.generation.calibrationDays,
        calibrationLatestDate: status.generation.calibrationLatestDate,
        calibrationEfficiency: status.generation.calibrationEfficiency
      },
      visitor: {
        scheduleYearVerified: status.visitor.scheduleYearVerified,
        sourcesHealthy: status.visitor.sourcesHealthy
      },
      blockers,
      sources
    }, {
      status: blockers.length === 0 ? 200 : 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      checkedAt,
      releaseState: 'unhealthy',
      blockers: ['status aggregation failed'],
      error: error instanceof Error ? error.message : 'Unknown health failure'
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
