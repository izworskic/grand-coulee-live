import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';
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
      totalOutflowKcfs: num(c[1]),
      generationFlowKcfs: num(c[2]),
      spillKcfs: num(c[3]),
      forebayFt: num(c[4]),
      tailwaterFt: num(c[5]),
      headFt: num(c[6])
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
      generationMWh: num(c[1]),
      averageGenerationMW: num(c[2]),
      stationUseMWh: num(c[3]),
      inflowKcfs: num(c[4]),
      totalOutflowKcfs: num(c[5]),
      generationFlowKcfs: num(c[6]),
      spillKcfs: num(c[7]),
      reservoirElevationFt: num(c[8]),
      forebayFt: num(c[9]),
      tailwaterFt: num(c[10]),
      headFt: num(c[11]),
      banksLakePumpKcfs: num(c[12]),
      banksLakePumpMWh: num(c[13]),
      banksLakeElevationFt: num(c[14])
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

export async function getHourlyObservations(): Promise<HourlyObservation[]> {
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

export async function getDailyObservations(): Promise<DailyObservation[]> {
  // Pull a wider rolling archive so generation calibration/backtesting is not limited to one month.
  const urls = Array.from({ length: 13 }, (_, ago) => `${LEGACY_DAILY_BASE}?ago=${ago}&r=gcl`);
  const settled = await Promise.allSettled(urls.map(fetchText));
  const rows = settled.flatMap(result => result.status === 'fulfilled' ? parseDailyHtml(result.value) : []);
  if (!rows.length) throw new Error('No valid USACE daily observations were returned.');
  const deduped = new Map(rows.map(row => [row.date, row]));
  return [...deduped.values()].sort((a, b) => a.date.localeCompare(b.date));
}
