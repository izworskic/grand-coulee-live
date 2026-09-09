import { DateTime } from 'luxon';
import type { VisitorStatus } from '@/lib/types';
import { ZONE } from '@/lib/data/usace';

export const VISITOR_URL = 'https://www.usbr.gov/pn/grandcoulee/visit/index.html';
export const TOUR_URL = 'https://www.usbr.gov/pn/grandcoulee/visit/tour.html';
export const LASER_URL = 'https://www.usbr.gov/pn/grandcoulee/visit/laser.html';

const TOUR_TIMES_2026 = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
const SOURCE_VERIFIED_YEAR = 2026;

function thanksgiving(year: number) {
  let d = DateTime.fromObject({ year, month: 11, day: 1 }, { zone: ZONE });
  while (d.weekday !== 4) d = d.plus({ days: 1 });
  return d.plus({ days: 21 }).toISODate();
}

function isClosureDay(date: DateTime) {
  const iso = date.toISODate();
  return iso === `${date.year}-01-01` || iso === `${date.year}-12-25` || iso === thanksgiving(date.year);
}

function atTime(day: DateTime, hhmm: string) {
  const [hour, minute] = hhmm.split(':').map(Number);
  return day.startOf('day').set({ hour, minute });
}

function fmt(dt: DateTime) {
  return dt.toFormat('h:mm a');
}

function tourDay(day: DateTime) {
  if (day.year !== SOURCE_VERIFIED_YEAR) return false;
  const start = DateTime.fromISO('2026-05-22', { zone: ZONE }).startOf('day');
  const end = DateTime.fromISO('2026-10-31', { zone: ZONE }).endOf('day');
  return day >= start && day <= end && [5, 6, 7].includes(day.weekday);
}

function laserTime(day: DateTime): string | null {
  if (day.year !== SOURCE_VERIFIED_YEAR) return null;
  const start = DateTime.fromISO('2026-05-22', { zone: ZONE }).startOf('day');
  const end = DateTime.fromISO('2026-09-30', { zone: ZONE }).endOf('day');
  if (day < start || day > end) return null;
  if (day.month <= 7) return '22:00';
  if (day.month === 8) return '21:30';
  return '20:30';
}

export async function verifyReclamationSources(): Promise<boolean> {
  const checks = await Promise.allSettled([TOUR_URL, LASER_URL, VISITOR_URL].map(async url => {
    const response = await fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error(String(response.status));
    const text = await response.text();
    return text.includes('Grand Coulee');
  }));
  return checks.every(result => result.status === 'fulfilled' && result.value);
}

export function getVisitorStatus(nowInput = DateTime.now().setZone(ZONE), sourcesHealthy = true): VisitorStatus {
  const now = nowInput.setZone(ZONE);
  const verified = now.year === SOURCE_VERIFIED_YEAR;
  if (!verified) {
    return {
      scheduleYearVerified: false,
      visitorCenterStatus: 'unknown',
      visitorCenterDetail: 'Current-year schedule requires Reclamation verification.',
      toursToday: [],
      nextTour: null,
      nextTourDetail: 'Tour schedule not yet verified for this calendar year.',
      laserStatus: 'unknown',
      laserTime: null,
      laserDetail: 'Laser schedule not yet verified for this calendar year.',
      sourcesHealthy
    };
  }

  const open = now.startOf('day').set({ hour: 8, minute: 30 });
  const close = now.startOf('day').set({ hour: 17 });
  const closedHoliday = isClosureDay(now);
  const centerOpen = !closedHoliday && now >= open && now < close;
  let visitorCenterDetail = centerOpen ? 'Closes at 5:00 PM' : closedHoliday ? 'Closed for a federal holiday' : now < open ? 'Opens at 8:30 AM' : 'Closed for today';

  const toursToday = tourDay(now) ? TOUR_TIMES_2026.map(time => fmt(atTime(now, time))) : [];
  const upcomingToday = tourDay(now) ? TOUR_TIMES_2026.map(time => atTime(now, time)).find(time => time > now) : undefined;
  let nextTour = upcomingToday ? upcomingToday.toISO() : null;
  let nextTourDetail = upcomingToday ? `${fmt(upcomingToday)} · first come, first served` : tourDay(now) ? 'Tours have ended for today.' : 'No tours today.';

  if (!upcomingToday) {
    for (let i = 1; i <= 14; i++) {
      const day = now.plus({ days: i });
      if (tourDay(day)) {
        const next = atTime(day, TOUR_TIMES_2026[0]);
        nextTour = next.toISO();
        nextTourDetail = `Next tours ${day.toFormat('cccc')} beginning at ${fmt(next)}`;
        break;
      }
    }
  }

  const laserClock = laserTime(now);
  let laserStatus: VisitorStatus['laserStatus'] = 'off-season';
  let laserIso: string | null = null;
  let laserDetail = 'Season complete; verify next season with Reclamation.';
  if (laserClock) {
    const laser = atTime(now, laserClock);
    laserIso = laser.toISO();
    if (now < laser) {
      laserStatus = 'tonight';
      laserDetail = `${fmt(laser)} · approximately 30 minutes`;
    } else {
      laserStatus = 'completed';
      laserDetail = `Tonight's ${fmt(laser)} show has ended.`;
    }
  }

  return {
    scheduleYearVerified: true,
    visitorCenterStatus: closedHoliday ? 'closed' : centerOpen ? 'open' : 'closed',
    visitorCenterDetail,
    toursToday,
    nextTour,
    nextTourDetail,
    laserStatus,
    laserTime: laserIso,
    laserDetail,
    sourcesHealthy
  };
}
