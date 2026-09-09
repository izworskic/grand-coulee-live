import { unstable_cache } from 'next/cache';
import { DateTime } from 'luxon';
import { ZONE } from '@/lib/data/usace';

export const DART_DAILY_URL = 'https://www.cbr.washington.edu/dart/query/river_daily';
const DART_SCRIPT_URL = 'https://www.cbr.washington.edu/dart/cs/php/rpt/river_daily.php';

export interface DartGrandCouleeDaily {
  date: string;
  inflowKcfs: number | null;
  outflowKcfs: number | null;
  spillKcfs: number | null;
  spillPercent: number | null;
  elevationFt: number | null;
}

function decodeHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#039;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
  if (!cleaned || /^(?:na|n\/a|null|--|---|missing)$/i.test(cleaned)) return null;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: string, year: number): string | null {
  const trimmed = value.trim();
  const formats = ['M/d/yyyy', 'MM/dd/yyyy', 'M/d/yy', 'MM/dd/yy', 'M/d', 'MM/dd'];
  for (const format of formats) {
    const parsed = DateTime.fromFormat(trimmed, format, { zone: ZONE });
    if (!parsed.isValid) continue;
    const withYear = format.includes('y') ? parsed : parsed.set({ year });
    return withYear.toISODate();
  }
  return null;
}

export function parseDartGrandCouleeDailyHtml(html: string, year: number): DartGrandCouleeDaily[] {
  if (/DART Queries are Temporarily Unavailable/i.test(html)) {
    throw new Error('DART daily query is temporarily unavailable.');
  }

  const output: DartGrandCouleeDaily[] = [];
  for (const tableMatch of html.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    const rows = [...tableMatch[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(rowMatch =>
      [...rowMatch[0].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(cell => decodeHtml(cell[1]))
    ).filter(row => row.length > 1);

    const headerIndex = rows.findIndex(row => {
      const normalized = row.map(normalizeHeader);
      return normalized.some(cell => /^date$|calendar date|day/.test(cell)) && normalized.some(cell => cell.includes('spill'));
    });
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex].map(normalizeHeader);
    const indexOf = (predicate: (header: string) => boolean) => headers.findIndex(predicate);
    const dateIndex = indexOf(header => /^date$/.test(header) || header.includes('calendar date') || /^day$/.test(header));
    const spillPercentIndex = indexOf(header => header.includes('spill') && (header.includes('percent') || header.includes('%') || header.includes('spillp')));
    const spillIndex = indexOf(header => header.includes('spill') && !(header.includes('percent') || header.includes('%') || header.includes('spillp')));
    const outflowIndex = indexOf(header => header.includes('outflow'));
    const inflowIndex = indexOf(header => header.includes('inflow'));
    const elevationIndex = indexOf(header => header.includes('elevation') || /^elev\b/.test(header));
    if (dateIndex < 0 || spillIndex < 0) continue;

    for (const row of rows.slice(headerIndex + 1)) {
      const date = parseDate(row[dateIndex] ?? '', year);
      if (!date) continue;
      const record: DartGrandCouleeDaily = {
        date,
        inflowKcfs: inflowIndex >= 0 ? parseNumber(row[inflowIndex]) : null,
        outflowKcfs: outflowIndex >= 0 ? parseNumber(row[outflowIndex]) : null,
        spillKcfs: parseNumber(row[spillIndex]),
        spillPercent: spillPercentIndex >= 0 ? parseNumber(row[spillPercentIndex]) : null,
        elevationFt: elevationIndex >= 0 ? parseNumber(row[elevationIndex]) : null
      };
      if ([record.inflowKcfs, record.outflowKcfs, record.spillKcfs, record.spillPercent, record.elevationFt].some(value => value !== null)) output.push(record);
    }
  }

  return output.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchLatestDartGrandCouleeDaily(): Promise<DartGrandCouleeDaily> {
  const now = DateTime.now().setZone(ZONE);
  const params = new URLSearchParams({
    sc: '1',
    year: String(now.year),
    proj: 'GCL',
    outputFormat: 'html',
    span: 'no',
    startdate: '1/1',
    enddate: `${now.month}/${now.day}`,
    syear: '',
    eyear: ''
  });
  const response = await fetch(`${DART_SCRIPT_URL}?${params}`, {
    headers: { 'User-Agent': 'GrandCouleeLive/1.0 chrisizworski.com' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`DART daily request failed: ${response.status}`);
  const rows = parseDartGrandCouleeDailyHtml(await response.text(), now.year);
  const latest = [...rows].reverse().find(row => row.spillKcfs !== null || row.outflowKcfs !== null || row.inflowKcfs !== null);
  if (!latest) throw new Error('DART returned no numeric Grand Coulee daily river observations.');
  return latest;
}

export const getLatestDartGrandCouleeDaily = unstable_cache(
  fetchLatestDartGrandCouleeDaily,
  ['grand-coulee-dart-daily-v1'],
  { revalidate: 1800 }
);
