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

    if (status.telemetry.state !== 'complete') {
      blockers.push(`${status.telemetry.availableCoreSeries}/${status.telemetry.totalCoreSeries} live visitor-facing USACE fields available`);
    }
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
      releaseState: blockers.length === 0 ? 'ready' : 'degraded',
      telemetry: status.telemetry,
      engineeringDiagnostics: {
        currentGenerationEstimateAvailable: status.generation.currentEstimatedMW !== null,
        generationFlowAvailable: status.flow.generationFlowKcfs !== null,
        spillTelemetryAvailable: status.flow.spillKcfs !== null,
        measuredTailwaterAvailable: status.hydraulic.tailwaterFt !== null,
        generationCalibrationDays: status.generation.calibrationDays,
        generationCalibrationLatestDate: status.generation.calibrationLatestDate
      },
      visitor: {
        scheduleYearVerified: status.visitor.scheduleYearVerified,
        sourcesHealthy: status.visitor.sourcesHealthy
      },
      blockers,
      sources
    }, {
      status: 200,
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
