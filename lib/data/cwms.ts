import { DateTime } from 'luxon';
import type { HourlyObservation } from '@/lib/types';

export const CWMS_BASE_URL = 'https://cwms-data.usace.army.mil/cwms-data';
export const CWMS_TIMESERIES_URL = `${CWMS_BASE_URL}/timeseries`;
export const CWMS_OFFICE = 'NWDP';
export const CWMS_LOCATION_URL = 'https://water.usace.army.mil/overview/nwdp/locations/gcl';

export const GCL_CWMS_SERIES = {
  totalOutflow: 'GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV',
  generationFlow: 'GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV',
  spill: 'GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV',
  forebay: 'GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV',
  tailwater: 'GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV'
} as const;

export const GCL_CWMS_DAILY_SERIES = {
  inflow: 'GCL.Flow-In.Ave.~1Day.1Day.CBT-REV',
  outflow: 'GCL.Flow-Out.Ave.~1Day.1Day.CBT-REV',
  precipitation: 'GCL.Precip-Inc.Total.~1Day.1Day.CBT-RAW'
} as const;

export interface CwmsDailyRiverContext {
  observedAt: string | null;
  inflowKcfs: number | null;
  dailyOutflowKcfs: number | null;
  precipitationIn: number | null;
}

const ZONE = 'America/Los_Angeles';
const HEADERS = {
  Accept: 'application/json;version=2',
  'User-Agent': 'GrandCouleeLive/1.0 chrisizworski.com'
};

type CwmsTuple = [number, number | null, number?];
type CwmsSeriesResponse = {
  name?: string;
  units?: string;
  values?: CwmsTuple[];
};

type SeriesRows = Array<{ timestamp: number; value: number | null }>;
type CwmsUnit = 'cfs' | 'ft' | 'in';

export function parseCwmsSeries(payload: unknown): SeriesRows {
  if (!payload || typeof payload !== 'object') return [];
  const values = (payload as CwmsSeriesResponse).values;
  if (!Array.isArray(values)) return [];

  return values
    .filter((row): row is CwmsTuple => Array.isArray(row) && typeof row[0] === 'number')
    .map(row => ({
      timestamp: row[0],
      value: typeof row[1] === 'number' && Number.isFinite(row[1]) ? row[1] : null
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchSeries(name: string, unit: CwmsUnit, lookbackHours = 72): Promise<SeriesRows> {
  const end = new Date();
  const begin = new Date(end.getTime() - lookbackHours * 3_600_000);
  const params = new URLSearchParams({
    name,
    office: CWMS_OFFICE,
    unit,
    begin: begin.toISOString(),
    end: end.toISOString(),
    timezone: 'UTC',
    'page-size': '500'
  });

  const response = await fetch(`${CWMS_TIMESERIES_URL}?${params.toString()}`, {
    headers: HEADERS,
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) throw new Error(`CWMS ${name} request failed: ${response.status}`);
  return parseCwmsSeries(await response.json() as CwmsSeriesResponse);
}

function rowsOrEmpty(result: PromiseSettledResult<SeriesRows>): SeriesRows {
  return result.status === 'fulfilled' ? result.value : [];
}

function valuesByTime(rows: SeriesRows) {
  return new Map(rows.map(row => [row.timestamp, row.value]));
}

function latestNumericTimestamp(rows: SeriesRows) {
  const numeric = rows.filter(row => row.value !== null);
  return numeric.length ? numeric[numeric.length - 1].timestamp : 0;
}

function latestNumeric(rows: SeriesRows): { timestamp: number; value: number } | null {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (row.value !== null && Number.isFinite(row.value)) return { timestamp: row.timestamp, value: row.value };
  }
  return null;
}

export async function getCwmsDailyRiverContext(): Promise<CwmsDailyRiverContext> {
  const settled = await Promise.allSettled([
    fetchSeries(GCL_CWMS_DAILY_SERIES.inflow, 'cfs', 7 * 24),
    fetchSeries(GCL_CWMS_DAILY_SERIES.outflow, 'cfs', 7 * 24),
    fetchSeries(GCL_CWMS_DAILY_SERIES.precipitation, 'in', 7 * 24)
  ]);
  const [inflowRows, outflowRows, precipRows] = settled.map(rowsOrEmpty);
  const inflow = latestNumeric(inflowRows);
  const outflow = latestNumeric(outflowRows);
  const precip = latestNumeric(precipRows);
  const timestamps = [inflow?.timestamp, outflow?.timestamp, precip?.timestamp].filter((value): value is number => typeof value === 'number');

  if (!inflow && !outflow && !precip) throw new Error('CWMS returned no numeric Grand Coulee daily river context.');

  return {
    observedAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null,
    inflowKcfs: inflow ? inflow.value / 1000 : null,
    dailyOutflowKcfs: outflow ? outflow.value / 1000 : null,
    precipitationIn: precip?.value ?? null
  };
}

export async function getCwmsHourlyObservations(): Promise<HourlyObservation[]> {
  // Treat every operational series independently. CWMS frequently publishes some GCL
  // series while other catalogued series are temporarily null or unavailable.
  const settled = await Promise.allSettled([
    fetchSeries(GCL_CWMS_SERIES.totalOutflow, 'cfs'),
    fetchSeries(GCL_CWMS_SERIES.generationFlow, 'cfs'),
    fetchSeries(GCL_CWMS_SERIES.spill, 'cfs'),
    fetchSeries(GCL_CWMS_SERIES.forebay, 'ft'),
    fetchSeries(GCL_CWMS_SERIES.tailwater, 'ft')
  ]);

  const [outflowRows, generationRows, spillRows, forebayRows, tailwaterRows] = settled.map(rowsOrEmpty);
  const allSeries = [outflowRows, generationRows, spillRows, forebayRows, tailwaterRows];
  if (!allSeries.some(rows => rows.some(row => row.value !== null))) {
    throw new Error('CWMS returned no numeric Grand Coulee hourly observations.');
  }

  const maps = allSeries.map(valuesByTime);
  const timestamps = [...new Set(allSeries.flatMap(rows => rows.map(row => row.timestamp)))].sort((a, b) => a - b);
  const [outflow, generation, spill, forebay, tailwater] = maps;

  const observations = timestamps.map(timestamp => {
    const forebayFt = forebay.get(timestamp) ?? null;
    const tailwaterFt = tailwater.get(timestamp) ?? null;
    const local = DateTime.fromMillis(timestamp, { zone: 'utc' }).setZone(ZONE);
    const hour = local.hour === 0 ? 24 : local.hour;
    const cfsToKcfs = (value: number | null | undefined) => value === null || value === undefined ? null : value / 1000;

    return {
      observedAt: new Date(timestamp).toISOString(),
      hour,
      totalOutflowKcfs: cfsToKcfs(outflow.get(timestamp)),
      generationFlowKcfs: cfsToKcfs(generation.get(timestamp)),
      spillKcfs: cfsToKcfs(spill.get(timestamp)),
      forebayFt,
      tailwaterFt,
      headFt: forebayFt !== null && tailwaterFt !== null ? forebayFt - tailwaterFt : null
    } satisfies HourlyObservation;
  }).filter(row => [row.totalOutflowKcfs, row.generationFlowKcfs, row.spillKcfs, row.forebayFt, row.tailwaterFt].some(value => value !== null));

  if (!observations.length) throw new Error('CWMS returned only null Grand Coulee observations.');

  const freshestNumericTime = Math.max(...allSeries.map(latestNumericTimestamp));
  return observations.filter(row => Date.parse(row.observedAt) <= freshestNumericTime);
}
