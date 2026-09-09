import SunCalc from 'suncalc';
import { DateTime } from 'luxon';
import type { AstronomyStatus } from '@/lib/types';
import { ZONE } from '@/lib/data/usace';

const LAT = 47.955;
const LON = -118.9833;

function format(date: Date) {
  return DateTime.fromJSDate(date).setZone(ZONE).toFormat('h:mm a');
}

export function getAstronomy(now = DateTime.now().setZone(ZONE)): AstronomyStatus {
  const anchor = now.startOf('day').plus({ hours: 12 }).toJSDate();
  const times = SunCalc.getTimes(anchor, LAT, LON);
  return {
    sunrise: format(times.sunrise),
    sunset: format(times.sunset),
    civilDusk: format(times.dusk)
  };
}
