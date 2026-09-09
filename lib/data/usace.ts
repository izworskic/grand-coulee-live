import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';
import { unstable_cache } from 'next/cache';
import { CWMS_LOCATION_URL, getCwmsHourlyObservations } from '@/lib/data/cwms';
import type { DailyObservation, HourlyObservation } from '@/lib/types';

export const ZONE = 'America/Los_Angeles';
export const USACE_HOURLY_URL = CWMS_LOCATION_URL;
export const USACE_DAILY_URL = 'https://public.crohms.org/dd/nwdp/project_daily/webexec/rep?ago=0&r=gcl';

const LEGACY_HOURLY_BASE = 'https://public.crohms.org/dd/nwdp/project_hourly/webexec/rep';
const LEGACY_DAILY_BASE = 'https://public.crohms.org/dd/nwdp/project_daily/webexec/rep';
const HEADERS = { 'User-Agent': 'GrandCouleeLive/1.0 chrisizworski.com' };

function num(value: string): number | null {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function bounded(value: string, min: number, max: number): number | null {
  const parsed = num(value);
  return parsed !== null && parsed >= min && parsed <= max ? parsed : null;
}

function cells($: cheerio.CheerioAPI, row: unknown): string[] {
  return $(row as never)
    .find('td')
    .map((_, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
    .get();
}

export function parseHourlyHtml(html: string): HourlyObservation[] {
  const $ = cheerio.load(html);
  const heading = $('h2').first().text().replace(/\s+/g, ' ').trim();
  const base = DateTime.fromFormat(heading, 'cccc LLLL d, yyyy', { zone: ZONE });
  if (!base.isValid) throw new Error(`USACE hourly heading could not be parsed: ${heading}`);

  const rows: HourlyObservation[] = [];
  $('table tr').each((_, row) => {
    const c = cells($, row);
    if (c.length < 7) return;
    const hour = Number.parseInt(c[0], 10);
    if (!Number.isInteger(hour) || hour < 1 || hour > 24) return;
    const observation: HourlyObservation = {
      hour,
      observedAt: base.startOf('day').plus({ hours: hour }).toISO() ?? '',
      totalOutflowKcfs: bounded(c[1], 0, 2000),
      generationFlowKcfs: bounded(c[2], 0, 500),
      spillKcfs: bounded(c[3], 0, 1100),
      forebayFt: bounded(c[4], 1000, 1350),
      tailwaterFt: bounded(c[5], 800, 1100),
      headFt: bounded(c[6], 0, 500)
    };
    if ([observation.totalOutflowKcfs, observation.forebayFt, observation.headFt].some(v => v !== null)) rows.push(observation);
  });
  return rows;
}

export function parseDailyHtml(html: string): DailyObservation[] {
  const $ = cheerio.load(html);
  const heading = $('h2').first().text().replace(/\s+/g, ' ').trim();
  const month = DateTime.fromFormat(heading, 'LLLL yyyy', { zone: ZONE });
  if (!month.isValid) throw new Error(`USACE daily heading could not be parsed: ${heading}`);

  const rows: DailyObservation[] = [];
  $('table tr').each((_, row) => {
    const c = cells($, row);
    if (c.length < 15) return;
    const day = Number.parseInt(c[0], 10);
    if (!Number.isInteger(day) || day < 1 || day > 31) return;
    const date = DateTime.fromObject({ year: month.year, month: month.month, day }, { zone: ZONE });
    if (!date.isValid) return;
    const observation: DailyObservation = {
      date: date.toISODate() ?? '',
      generationMWh: bounded(c[1], 0, 200000),
      averageGenerationMW: bounded(c[2], 0, 7000),
      stationUseMWh: bounded(c[3], 0, 20000),
      inflowKcfs: bounded(c[4], 0, 2000),
      totalOutflowKcfs: bounded(c[5], 0, 2000),
      generationFlowKcfs: bounded(c[6], 0, 500),
      spillKcfs: bounded(c[7], 0, 1100),
      reservoirElevationFt: bounded(c[8], 1000, 1350),
      forebayFt: bounded(c[9], 1000, 1350),
      tailwaterFt: bounded(c[10], 800, 1100),
      headFt: bounded(c[11], 0, 500),
      banksLakePumpKcfs: bounded(c[12], 0, 200),
      banksLakePumpMWh: bounded(c[13], 0, 100000),
      banksLakeElevationFt: bounded(c[14], 1400, 1700)
    };
    if (Object.values(observation).some((v, i) => i > 0 && typeof v === 'number')) rows.push(observation);
  });
  return rows;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) throw new Error(`USACE request failed: ${response.status}`);
  return response.text();
}

async function getLegacyHourlyObservations(): Promise<HourlyObservation[]> {
  const urls = [0, 1].map(ago => `${LEGACY_HOURLY_BASE}?ago=${ago}&r=gcl`);
  const settled = await Promise.allSettled(urls.map(fetchText));
  const rows = settled.flatMap(result => result.status === 'fulfilled' ? parseHourlyHtml(result.value) : []);
  if (!rows.length) throw new Error('No valid legacy USACE hourly observations were returned.');
  return rows.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}

function latestObservedAt(rows: HourlyObservation[]) {
  return rows.length ? Date.parse(rows[rows.length - 1].observedAt) : 0;
}

async function getHourlyObservationsFresh(): Promise<HourlyObservation[]> {
  const [cwmsResult, legacyResult] = await Promise.allSettled([
    getCwmsHourlyObservations(),
    getLegacyHourlyObservations()
  ]);

  const candidates = [cwmsResult, legacyResult]
    .filter((result): result is PromiseFulfilledResult<HourlyObservation[]> => result.status === 'fulfilled' && result.value.length > 0)
    .map(result => result.value)
    .sort((a, b) => latestObservedAt(b) - latestObservedAt(a));

  if (!candidates.length) {
    const errors = [cwmsResult, legacyResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason instanceof Error ? result.reason.message : String(result.reason));
    throw new Error(`No valid USACE hourly observations were returned. ${errors.join(' | ')}`);
  }

  return candidates[0];
}

async function getDailyObservationsFresh(): Promise<DailyObservation[]> {
  const urls = Array.from({ length: 13 }, (_, ago) => `${LEGACY_DAILY_BASE}?ago=${ago}&r=gcl`);
  const settled = await Promise.allSettled(urls.map(fetchText));
  const rows = settled.flatMap(result => result.status === 'fulfilled' ? parseDailyHtml(result.value) : []);
  if (!rows.length) throw new Error('No valid USACE daily observations were returned.');
  const deduped = new Map(rows.map(row => [row.date, row]));
  return [...deduped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const getCachedHourlyObservations = unstable_cache(
  getHourlyObservationsFresh,
  ['grand-coulee-normalized-hourly-v3'],
  { revalidate: 600, tags: ['grand-coulee-hourly'] }
);

const getCachedDailyObservations = unstable_cache(
  getDailyObservationsFresh,
  ['grand-coulee-normalized-daily-v3'],
  { revalidate: 1800, tags: ['grand-coulee-daily'] }
);

export async function getHourlyObservations(): Promise<HourlyObservation[]> {
  return getCachedHourlyObservations();
}

export async function getDailyObservations(): Promise<DailyObservation[]> {
  return getCachedDailyObservations();
}
