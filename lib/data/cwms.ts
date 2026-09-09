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

export function parseCwmsSeries(payload: unknown): Array<{ timestamp: number; value: number | null }> {
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

async function fetchSeries(name: string, unit: 'cfs' | 'ft', lookbackHours = 72) {
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

  if (!response.ok) {
    throw new Error(`CWMS ${name} request failed: ${response.status}`);
  }

  const payload = await response.json() as CwmsSeriesResponse;
  return parseCwmsSeries(payload);
}

function valuesByTime(rows: Array<{ timestamp: number; value: number | null }>) {
  return new Map(rows.map(row => [row.timestamp, row.value]));
}

function latestTimestamp(rows: Array<{ timestamp: number; value: number | null }>) {
  return rows.length ? rows[rows.length - 1].timestamp : 0;
}

export async function getCwmsHourlyObservations(): Promise<HourlyObservation[]> {
  const [outflowRows, generationRows, spillRows, forebayRows, tailwaterRows] = await Promise.all([
    fetchSeries(GCL_CWMS_SERIES.totalOutflow, 'cfs'),
    fetchSeries(GCL_CWMS_SERIES.generationFlow, 'cfs'),
    fetchSeries(GCL_CWMS_SERIES.spill, 'cfs'),
    fetchSeries(GCL_CWMS_SERIES.forebay, 'ft'),
    fetchSeries(GCL_CWMS_SERIES.tailwater, 'ft')
  ]);

  const allSeries = [outflowRows, generationRows, spillRows, forebayRows, tailwaterRows];
  if (!allSeries.some(rows => rows.length)) {
    throw new Error('CWMS returned no Grand Coulee hourly observations.');
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

  if (!observations.length) {
    throw new Error('CWMS returned only null Grand Coulee observations.');
  }

  // Protect against a partially lagging series producing a misleading latest composite row.
  const freshestSeriesTime = Math.max(...allSeries.map(latestTimestamp));
  return observations.filter(row => Date.parse(row.observedAt) <= freshestSeriesTime);
}
