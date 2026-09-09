import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';
import { ZONE } from '@/lib/data/usace';

export const LAKE_LEVEL_URL = 'https://www.usbr.gov/pn/grandcoulee/lakelevel/';

type ForecastPoint = { date: string; elevationFt: number };

export type LakeLevelForecast = {
  sourceObservedDate: string | null;
  sourceObservedElevationFt: number | null;
  forecast: ForecastPoint[];
  nextForecast: ForecastPoint | null;
  finalForecast: ForecastPoint | null;
};

const HEADERS = { 'User-Agent': 'GrandCouleeLive/1.0 chrisizworski.com' };

function numberValue(value: string): number | null {
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function inferForecastYear(month: number, observed: DateTime): number {
  if (month < observed.month - 6) return observed.year + 1;
  if (month > observed.month + 6) return observed.year - 1;
  return observed.year;
}

export function parseLakeLevelForecast(html: string, now = DateTime.now().setZone(ZONE)): LakeLevelForecast {
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const observedMatch = text.match(/elevation of Lake Roosevelt was\s+([\d,.]+)\s+feet above sea level at midnight on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  const observedElevation = observedMatch ? numberValue(observedMatch[1]) : null;
  const observedDateTime = observedMatch ? DateTime.fromFormat(observedMatch[2], 'LLLL d, yyyy', { zone: ZONE }) : DateTime.invalid('missing observed date');
  const sourceObservedDate = observedDateTime.isValid ? observedDateTime.toISODate() : null;

  let dates: string[] = [];
  let values: string[] = [];
  $('table').each((_, table) => {
    const rows = $(table).find('tr').toArray();
    if (rows.length < 2 || dates.length) return;
    const first = $(rows[0]).find('th,td').map((__, cell) => $(cell).text().trim()).get();
    const second = $(rows[1]).find('th,td').map((__, cell) => $(cell).text().trim()).get();
    if (first.some(value => /^\d{1,2}\/\d{1,2}$/.test(value)) && second.some(value => /^\d{3,4}(?:\.\d+)?$/.test(value))) {
      dates = first;
      values = second;
    }
  });

  // The Reclamation page has historically rendered the forecast as a simple table,
  // but retain a text fallback so minor markup changes do not erase the forecast.
  if (!dates.length) {
    const dateMatches = [...text.matchAll(/\b(\d{1,2}\/\d{1,2})\b/g)].map(match => match[1]);
    const forecastSentence = text.match(/forecasted midnight elevations[^:]*are as follows:\s*(.+?)\s+The water level information/i)?.[1] ?? '';
    const valueMatches = [...forecastSentence.matchAll(/\b(1[12]\d{2}(?:\.\d+)?)\b/g)].map(match => match[1]);
    dates = dateMatches.slice(0, valueMatches.length);
    values = valueMatches;
  }

  const observedForYear = observedDateTime.isValid ? observedDateTime : now;
  const forecast = dates.flatMap((dateText, index) => {
    const match = dateText.match(/^(\d{1,2})\/(\d{1,2})$/);
    const elevationFt = numberValue(values[index] ?? '');
    if (!match || elevationFt === null) return [];
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = inferForecastYear(month, observedForYear);
    const date = DateTime.fromObject({ year, month, day }, { zone: ZONE });
    if (!date.isValid) return [];
    return [{ date: date.toISODate() ?? '', elevationFt }];
  });

  const today = now.startOf('day');
  const nextForecast = forecast.find(point => DateTime.fromISO(point.date, { zone: ZONE }).startOf('day') >= today) ?? null;

  return {
    sourceObservedDate,
    sourceObservedElevationFt: observedElevation,
    forecast,
    nextForecast,
    finalForecast: forecast.at(-1) ?? null
  };
}

export async function getLakeLevelForecast(): Promise<LakeLevelForecast> {
  const response = await fetch(LAKE_LEVEL_URL, {
    headers: HEADERS,
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) throw new Error(`Reclamation Lake Roosevelt forecast request failed: ${response.status}`);
  const parsed = parseLakeLevelForecast(await response.text());
  if (!parsed.forecast.length) throw new Error('Reclamation Lake Roosevelt forecast contained no parseable forecast points.');
  return parsed;
}
