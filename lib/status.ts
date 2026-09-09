import { DateTime } from 'luxon';
import { getAstronomy } from '@/lib/data/astronomy';
import { getDailyObservations, getHourlyObservations, USACE_DAILY_URL, USACE_HOURLY_URL, ZONE } from '@/lib/data/usace';
import { getVisitorStatus, LASER_URL, TOUR_URL, verifyReclamationSources, VISITOR_URL } from '@/lib/data/reclamation';
import { getWeather } from '@/lib/data/weather';
import { buildCalibration, estimateGenerationMW, INSTALLED_CAPACITY_MW } from '@/lib/generation';
import type { Freshness, GrandCouleeStatus, HourlyObservation, SourceProvenance } from '@/lib/types';

const FULL_POOL_FT = 1290;
const NWS_SOURCE = 'https://api.weather.gov/points/47.955,-118.9833';

function freshness(observedAt: string | null): Freshness {
  if (!observedAt) return 'unavailable';
  const ageHours = (Date.now() - Date.parse(observedAt)) / 3_600_000;
  if (ageHours < 2) return 'current';
  if (ageHours < 6) return 'delayed';
  return 'stale';
}

function valueAtOrBefore(rows: HourlyObservation[], targetMs: number): HourlyObservation | null {
  const eligible = rows.filter(row => Date.parse(row.observedAt) <= targetMs);
  return eligible.length ? eligible[eligible.length - 1] : null;
}

function delta(rows: HourlyObservation[], latest: HourlyObservation | null, hours: number): number | null {
  if (!latest?.forebayFt) return null;
  const prior = valueAtOrBefore(rows, Date.parse(latest.observedAt) - hours * 3_600_000);
  if (prior?.forebayFt === null || prior?.forebayFt === undefined) return null;
  return latest.forebayFt - prior.forebayFt;
}

function decision(status: Pick<GrandCouleeStatus, 'visitor' | 'weather' | 'flow' | 'astronomy'>) {
  const precip = status.weather?.precipitationProbability ?? 0;
  const spill = status.flow.spillKcfs ?? 0;
  if (status.visitor.laserStatus === 'tonight') {
    return {
      headline: status.visitor.visitorCenterStatus === 'open' ? 'GOOD VISITOR WINDOW' : 'COME LATER FOR THE LASER SHOW',
      detail: `${precip <= 30 ? 'Low precipitation risk' : 'Some rain risk'}, ${spill > 0 ? 'active spill' : 'no meaningful spill reported'}, sunset ${status.astronomy.sunset}, and tonight's laser show ${status.visitor.laserDetail.toLowerCase()}.`
    };
  }
  if (status.visitor.visitorCenterStatus === 'open') {
    return {
      headline: 'GOOD TIME TO VISIT',
      detail: `${status.weather?.shortForecast ?? 'Visitor conditions are available'}, with the Visitor Center open now${status.visitor.nextTour ? ` and ${status.visitor.nextTourDetail.toLowerCase()}` : ''}.`
    };
  }
  return {
    headline: 'OUTDOOR VIEWING AVAILABLE',
    detail: `The Visitor Center is closed right now. Current operations and daylight conditions are still shown for planning an exterior visit.`
  };
}

export async function getGrandCouleeStatus(): Promise<GrandCouleeStatus> {
  const retrievedAt = new Date().toISOString();
  const now = DateTime.now().setZone(ZONE);
  const [hourlyResult, dailyResult, weatherResult, sourceHealthResult] = await Promise.allSettled([
    getHourlyObservations(),
    getDailyObservations(),
    getWeather(),
    verifyReclamationSources()
  ]);

  const hourly = hourlyResult.status === 'fulfilled' ? hourlyResult.value : [];
  const daily = dailyResult.status === 'fulfilled' ? dailyResult.value : [];
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const reclamationHealthy = sourceHealthResult.status === 'fulfilled' ? sourceHealthResult.value : false;
  const latest = hourly.length ? hourly[hourly.length - 1] : null;
  const latestDaily = daily.filter(row => Object.values(row).some(v => typeof v === 'number')).at(-1) ?? null;
  const latestReported = [...daily].reverse().find(row => row.averageGenerationMW !== null) ?? null;
  const calibration = buildCalibration(daily);
  const generationMW = estimateGenerationMW(latest?.generationFlowKcfs ?? null, latest?.headFt ?? null, calibration.efficiency);
  const observedAt = latest?.observedAt ?? null;
  const currentFreshness = freshness(observedAt);
  const astronomy = getAstronomy(now);
  const visitor = getVisitorStatus(now, reclamationHealthy);

  const sources: SourceProvenance[] = [
    {
      id: 'usace-hourly',
      label: 'USACE CROHMS · Grand Coulee hourly',
      url: USACE_HOURLY_URL,
      kind: 'measured',
      observedAt,
      retrievedAt,
      freshness: hourlyResult.status === 'fulfilled' ? currentFreshness : 'unavailable',
      note: 'Total outflow, turbine flow, spill, forebay, tailwater and hydraulic head.'
    },
    {
      id: 'usace-daily',
      label: 'USACE CROHMS · Grand Coulee daily',
      url: USACE_DAILY_URL,
      kind: 'reported',
      observedAt: latestDaily?.date ?? null,
      retrievedAt,
      freshness: dailyResult.status === 'fulfilled' ? 'current' : 'unavailable',
      note: 'Reported daily generation and Banks Lake pumping data used for calibration and context.'
    },
    {
      id: 'reclamation-visitor',
      label: 'Bureau of Reclamation · Visitor Center and tours',
      url: TOUR_URL,
      kind: 'reported',
      retrievedAt,
      freshness: reclamationHealthy ? 'current' : 'delayed',
      note: '2026 tour schedule is date-aware and is not reused for future years without verification.'
    },
    {
      id: 'reclamation-laser',
      label: 'Bureau of Reclamation · Laser light show',
      url: LASER_URL,
      kind: 'reported',
      retrievedAt,
      freshness: reclamationHealthy ? 'current' : 'delayed'
    },
    {
      id: 'nws',
      label: 'National Weather Service',
      url: NWS_SOURCE,
      kind: 'reported',
      observedAt: weather?.forecastAt ?? null,
      retrievedAt,
      freshness: weather ? 'current' : 'unavailable'
    },
    {
      id: 'astronomy',
      label: 'Grand Coulee Live astronomy calculation',
      url: VISITOR_URL,
      kind: 'calculated',
      retrievedAt,
      freshness: 'current'
    }
  ];

  const base: GrandCouleeStatus = {
    observedAt,
    retrievedAt,
    freshness: currentFreshness,
    reservoir: {
      forebayFt: latest?.forebayFt ?? null,
      fullPoolFt: FULL_POOL_FT,
      change1hFt: delta(hourly, latest, 1),
      change6hFt: delta(hourly, latest, 6),
      change24hFt: delta(hourly, latest, 24),
      belowFullPoolFt: latest?.forebayFt === null || latest?.forebayFt === undefined ? null : FULL_POOL_FT - latest.forebayFt
    },
    flow: {
      totalOutflowKcfs: latest?.totalOutflowKcfs ?? null,
      generationFlowKcfs: latest?.generationFlowKcfs ?? null,
      spillKcfs: latest?.spillKcfs ?? null
    },
    hydraulic: {
      tailwaterFt: latest?.tailwaterFt ?? null,
      headFt: latest?.headFt ?? null
    },
    generation: {
      currentEstimatedMW: generationMW,
      estimateConfidence: calibration.efficiency === null ? null : currentFreshness === 'current' ? calibration.confidence : currentFreshness === 'delayed' ? 'medium' : 'low',
      calibrationEfficiency: calibration.efficiency,
      calibrationDays: calibration.days,
      latestReportedAverageMW: latestReported?.averageGenerationMW ?? null,
      latestReportedDate: latestReported?.date ?? null,
      installedCapacityMW: INSTALLED_CAPACITY_MW
    },
    pumping: {
      banksLakePumpKcfs: latestDaily?.banksLakePumpKcfs ?? null,
      pumpMWh: latestDaily?.banksLakePumpMWh ?? null,
      banksLakeElevationFt: latestDaily?.banksLakeElevationFt ?? null
    },
    visitor,
    weather,
    astronomy,
    decision: { headline: '', detail: '' },
    sources
  };
  base.decision = decision(base);
  return base;
}
