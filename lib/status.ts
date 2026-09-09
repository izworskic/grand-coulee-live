import { DateTime } from 'luxon';
import { getAstronomy } from '@/lib/data/astronomy';
import { getCwmsDailyRiverContext } from '@/lib/data/cwms';
import { getLakeLevelForecast, LAKE_LEVEL_URL } from '@/lib/data/lakeLevel';
import { getDailyObservations, getHourlyObservations, USACE_DAILY_URL, USACE_HOURLY_URL, ZONE } from '@/lib/data/usace';
import { getVisitorStatus, LASER_URL, TOUR_URL, verifyReclamationSources, VISITOR_URL } from '@/lib/data/reclamation';
import { getWeather } from '@/lib/data/weather';
import { buildCalibration, estimateGenerationMW, INSTALLED_CAPACITY_MW } from '@/lib/generation';
import { estimateHeadFromRatingCurve, estimateTailwaterFromOutflow, GRAND_COULEE_WCM_URL } from '@/lib/hydraulics';
import type { Confidence, Freshness, GrandCouleeStatus, HourlyObservation, SourceProvenance } from '@/lib/types';

const FULL_POOL_FT = 1290;
const NWS_SOURCE = 'https://api.weather.gov/points/47.955,-118.9833';

function freshness(observedAt: string | null): Freshness {
  if (!observedAt) return 'unavailable';
  const ageHours = (Date.now() - Date.parse(observedAt)) / 3_600_000;
  if (ageHours < 2) return 'current';
  if (ageHours < 6) return 'delayed';
  return 'stale';
}

function dailyTimestampFreshness(observedAt: string | null): Freshness {
  if (!observedAt) return 'unavailable';
  const ageHours = (Date.now() - Date.parse(observedAt)) / 3_600_000;
  if (ageHours <= 36) return 'current';
  if (ageHours <= 72) return 'delayed';
  return 'stale';
}

function dailyFreshness(date: string | null, now: DateTime): Freshness {
  if (!date) return 'unavailable';
  const observed = DateTime.fromISO(date, { zone: ZONE }).endOf('day');
  if (!observed.isValid) return 'unavailable';
  const ageDays = now.diff(observed, 'days').days;
  if (ageDays <= 2) return 'current';
  if (ageDays <= 7) return 'delayed';
  return 'stale';
}

function forecastFreshness(finalDate: string | null, now: DateTime): Freshness {
  if (!finalDate) return 'unavailable';
  const final = DateTime.fromISO(finalDate, { zone: ZONE }).endOf('day');
  if (!final.isValid) return 'unavailable';
  if (final >= now) return 'current';
  const ageDays = now.diff(final, 'days').days;
  if (ageDays <= 2) return 'delayed';
  return 'stale';
}

function estimateConfidence(base: Confidence, hourly: Freshness, calibration: Freshness, usesEstimatedHead: boolean): Confidence {
  if (hourly === 'stale' || hourly === 'unavailable' || calibration === 'stale' || calibration === 'unavailable') return 'low';
  if (usesEstimatedHead) return 'low';
  if (hourly === 'delayed' || calibration === 'delayed') return base === 'low' ? 'low' : 'medium';
  return base;
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

function telemetryStatus(latest: HourlyObservation | null): GrandCouleeStatus['telemetry'] {
  // These are the two current hourly signals the public product promises.
  // Generation flow, spill and tailwater remain optional engineering enhancements.
  const fields: Array<[string, number | null | undefined]> = [
    ['total outflow', latest?.totalOutflowKcfs],
    ['Lake Roosevelt elevation', latest?.forebayFt]
  ];
  const missingCoreSeries = fields.filter(([, value]) => value === null || value === undefined).map(([label]) => label);
  const availableCoreSeries = fields.length - missingCoreSeries.length;
  return {
    state: availableCoreSeries === fields.length ? 'complete' : availableCoreSeries > 0 ? 'partial' : 'unavailable',
    availableCoreSeries,
    totalCoreSeries: fields.length,
    missingCoreSeries
  };
}

function decision(status: Pick<GrandCouleeStatus, 'visitor' | 'weather' | 'flow' | 'reservoir' | 'riverContext'>) {
  const liveParts: string[] = [];

  if (status.reservoir.forebayFt !== null) {
    const change = status.reservoir.change24hFt;
    const movement = change === null
      ? ''
      : Math.abs(change) < 0.01
        ? ' and is essentially steady over 24 hours'
        : `, ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(2)} ft in 24 hours`;
    liveParts.push(`Lake Roosevelt is ${status.reservoir.forebayFt.toFixed(2)} ft${movement}`);
  }

  if (status.flow.totalOutflowKcfs !== null) {
    liveParts.push(`Current Columbia River outflow is ${status.flow.totalOutflowKcfs.toFixed(1)} kcfs`);
  }

  if (status.riverContext.inflowKcfs !== null && status.riverContext.dailyOutflowKcfs !== null) {
    const difference = status.riverContext.inflowKcfs - status.riverContext.dailyOutflowKcfs;
    if (Math.abs(difference) >= 1) {
      liveParts.push(`Daily inflow is ${status.riverContext.inflowKcfs.toFixed(1)} kcfs versus ${status.riverContext.dailyOutflowKcfs.toFixed(1)} kcfs outflow`);
    }
  }

  const liveSentence = liveParts.length ? `${liveParts.join('. ')} .`.replace(' .', '.') : '';
  const weather = status.weather
    ? status.weather.temperatureF === null
      ? ` ${status.weather.shortForecast} right now.`
      : ` ${status.weather.temperatureF.toFixed(0)}°F and ${status.weather.shortForecast.toLowerCase()} right now.`
    : '';

  if (status.visitor.visitorCenterStatus === 'open') {
    return {
      headline: status.visitor.nextTour ? 'VISITOR CENTER OPEN · TOUR AHEAD' : 'VISITOR CENTER IS OPEN',
      detail: `${liveSentence}${weather}${status.visitor.nextTour ? ` ${status.visitor.nextTourDetail}` : ''}`.trim()
    };
  }

  const centerDetail = status.visitor.visitorCenterDetail || 'Visitor Center is closed right now.';
  return {
    headline: centerDetail.toLowerCase().includes('opens') ? 'VISITOR CENTER OPENS LATER' : 'CHECK THE DAM BEFORE YOU GO',
    detail: `${centerDetail} ${liveSentence}${weather}`.trim()
  };
}

export async function getGrandCouleeStatus(): Promise<GrandCouleeStatus> {
  const retrievedAt = new Date().toISOString();
  const now = DateTime.now().setZone(ZONE);
  const [hourlyResult, dailyResult, riverContextResult, weatherResult, sourceHealthResult, lakeForecastResult] = await Promise.allSettled([
    getHourlyObservations(),
    getDailyObservations(),
    getCwmsDailyRiverContext(),
    getWeather(),
    verifyReclamationSources(),
    getLakeLevelForecast()
  ]);

  const hourly = hourlyResult.status === 'fulfilled' ? hourlyResult.value : [];
  const daily = dailyResult.status === 'fulfilled' ? dailyResult.value : [];
  const riverContext: GrandCouleeStatus['riverContext'] = riverContextResult.status === 'fulfilled'
    ? riverContextResult.value
    : { observedAt: null, inflowKcfs: null, dailyOutflowKcfs: null };
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const reclamationHealthy = sourceHealthResult.status === 'fulfilled' ? sourceHealthResult.value : false;
  const rawLakeForecast = lakeForecastResult.status === 'fulfilled' ? lakeForecastResult.value : null;
  const latest = [...hourly].reverse().find(row => row.totalOutflowKcfs !== null || row.forebayFt !== null) ?? (hourly.length ? hourly[hourly.length - 1] : null);
  const telemetry = telemetryStatus(latest);
  const latestDaily = daily.filter(row => Object.values(row).some(v => typeof v === 'number')).at(-1) ?? null;
  const latestReported = [...daily].reverse().find(row => row.averageGenerationMW !== null) ?? null;
  const calibration = buildCalibration(daily);

  const estimatedTailwaterFt = latest?.tailwaterFt === null || latest?.tailwaterFt === undefined
    ? estimateTailwaterFromOutflow(latest?.totalOutflowKcfs ?? null)
    : null;
  const estimatedHeadFt = latest?.headFt === null || latest?.headFt === undefined
    ? estimateHeadFromRatingCurve(latest?.forebayFt ?? null, latest?.totalOutflowKcfs ?? null)
    : null;
  const headForGeneration = latest?.headFt ?? estimatedHeadFt;
  const usesEstimatedHead = latest?.headFt === null || latest?.headFt === undefined;
  const generationMW = estimateGenerationMW(latest?.generationFlowKcfs ?? null, headForGeneration, calibration.efficiency);

  const observedAt = latest?.observedAt ?? null;
  const currentFreshness = freshness(observedAt);
  const riverContextFreshness = riverContextResult.status === 'fulfilled' ? dailyTimestampFreshness(riverContext.observedAt) : 'unavailable';
  const dailySourceFreshness = dailyResult.status === 'fulfilled' ? dailyFreshness(latestDaily?.date ?? null, now) : 'unavailable';
  const calibrationFreshness = dailyFreshness(calibration.latestDate, now);
  const lakeForecastFreshness = forecastFreshness(rawLakeForecast?.finalForecast?.date ?? null, now);
  const astronomy = getAstronomy(now);
  const visitor = getVisitorStatus(now, reclamationHealthy);
  const pumpingUsable = dailySourceFreshness === 'current' || dailySourceFreshness === 'delayed';
  const headSource: GrandCouleeStatus['hydraulic']['headSource'] = latest?.headFt !== null && latest?.headFt !== undefined
    ? 'measured'
    : estimatedHeadFt !== null ? 'rating-curve' : 'unavailable';
  const lakeForecast: GrandCouleeStatus['lakeForecast'] = rawLakeForecast ? {
    sourceObservedDate: rawLakeForecast.sourceObservedDate,
    sourceObservedElevationFt: rawLakeForecast.sourceObservedElevationFt,
    nextDate: rawLakeForecast.nextForecast?.date ?? null,
    nextElevationFt: rawLakeForecast.nextForecast?.elevationFt ?? null,
    finalDate: rawLakeForecast.finalForecast?.date ?? null,
    finalElevationFt: rawLakeForecast.finalForecast?.elevationFt ?? null
  } : null;

  const sources: SourceProvenance[] = [
    {
      id: 'usace-hourly',
      label: 'USACE CWMS Data API · Grand Coulee operations',
      url: USACE_HOURLY_URL,
      kind: 'measured',
      observedAt,
      retrievedAt,
      freshness: hourlyResult.status === 'fulfilled' ? currentFreshness : 'unavailable',
      note: telemetry.state === 'complete'
        ? 'Current Lake Roosevelt elevation and Columbia River outflow are both publishing.'
        : `Live visitor-facing telemetry is ${telemetry.availableCoreSeries}/${telemetry.totalCoreSeries}. Missing: ${telemetry.missingCoreSeries.join(', ') || 'none'}.`
    },
    {
      id: 'usace-daily-river',
      label: 'USACE CWMS Data API · Grand Coulee daily river context',
      url: USACE_HOURLY_URL,
      kind: 'reported',
      observedAt: riverContext.observedAt,
      retrievedAt,
      freshness: riverContextFreshness,
      note: 'Latest daily-average inflow and outflow. Daily observations use daily freshness rules rather than hourly telemetry thresholds.'
    },
    {
      id: 'usace-tailwater-curve',
      label: 'USACE Water Control Manual · Grand Coulee tailwater rating curve',
      url: GRAND_COULEE_WCM_URL,
      kind: 'estimated',
      observedAt,
      retrievedAt,
      freshness: estimatedHeadFt !== null ? currentFreshness : 'unavailable',
      note: 'Used in the engineering view when measured tailwater is unavailable. Tailwater is interpolated from the official rating curve using current total outflow.'
    },
    {
      id: 'reclamation-lake-forecast',
      label: 'Bureau of Reclamation · Lake Roosevelt forecast',
      url: LAKE_LEVEL_URL,
      kind: 'reported',
      observedAt: rawLakeForecast?.sourceObservedDate ?? null,
      retrievedAt,
      freshness: lakeForecastFreshness,
      note: 'Official provisional/predicted midnight reservoir elevations, kept separate from the measured CWMS lake elevation.'
    },
    {
      id: 'usace-daily',
      label: 'USACE CROHMS · Grand Coulee daily',
      url: USACE_DAILY_URL,
      kind: 'reported',
      observedAt: latestDaily?.date ?? null,
      retrievedAt,
      freshness: dailySourceFreshness,
      note: 'Reported daily generation and Banks Lake pumping data used for engineering calibration and context.'
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
    telemetry,
    reservoir: {
      forebayFt: latest?.forebayFt ?? null,
      fullPoolFt: FULL_POOL_FT,
      change1hFt: delta(hourly, latest, 1),
      change6hFt: delta(hourly, latest, 6),
      change24hFt: delta(hourly, latest, 24),
      belowFullPoolFt: latest?.forebayFt === null || latest?.forebayFt === undefined ? null : FULL_POOL_FT - latest.forebayFt
    },
    lakeForecast,
    flow: {
      totalOutflowKcfs: latest?.totalOutflowKcfs ?? null,
      generationFlowKcfs: latest?.generationFlowKcfs ?? null,
      spillKcfs: latest?.spillKcfs ?? null
    },
    riverContext,
    hydraulic: {
      tailwaterFt: latest?.tailwaterFt ?? null,
      headFt: latest?.headFt ?? null,
      estimatedTailwaterFt,
      estimatedHeadFt,
      headSource
    },
    generation: {
      currentEstimatedMW: generationMW,
      estimateConfidence: generationMW === null || calibration.efficiency === null ? null : estimateConfidence(calibration.confidence, currentFreshness, calibrationFreshness, usesEstimatedHead),
      calibrationEfficiency: calibration.efficiency,
      calibrationDays: calibration.days,
      calibrationLatestDate: calibration.latestDate,
      latestReportedAverageMW: latestReported?.averageGenerationMW ?? null,
      latestReportedDate: latestReported?.date ?? null,
      installedCapacityMW: INSTALLED_CAPACITY_MW
    },
    pumping: {
      banksLakePumpKcfs: pumpingUsable ? latestDaily?.banksLakePumpKcfs ?? null : null,
      pumpMWh: pumpingUsable ? latestDaily?.banksLakePumpMWh ?? null : null,
      banksLakeElevationFt: pumpingUsable ? latestDaily?.banksLakeElevationFt ?? null : null
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
