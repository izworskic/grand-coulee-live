import { DateTime } from 'luxon';
import type { WeatherStatus } from '@/lib/types';
import { ZONE } from '@/lib/data/usace';

const POINT = '47.955,-118.9833';
const HEADERS = {
  'User-Agent': 'GrandCouleeLive/1.0 (https://chrisizworski.com)',
  Accept: 'application/geo+json'
};

type NWSPeriod = {
  startTime: string;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  windSpeed: string;
  windDirection: string;
  probabilityOfPrecipitation?: { value?: number | null };
};

export async function getWeather(): Promise<WeatherStatus> {
  const pointResponse = await fetch(`https://api.weather.gov/points/${POINT}`, {
    headers: HEADERS,
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(7000)
  });
  if (!pointResponse.ok) throw new Error(`NWS point lookup failed: ${pointResponse.status}`);
  const point = await pointResponse.json();
  const hourlyUrl = point?.properties?.forecastHourly as string | undefined;
  if (!hourlyUrl) throw new Error('NWS point response did not contain an hourly forecast URL.');

  const forecastResponse = await fetch(hourlyUrl, {
    headers: HEADERS,
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(7000)
  });
  if (!forecastResponse.ok) throw new Error(`NWS hourly forecast failed: ${forecastResponse.status}`);
  const forecast = await forecastResponse.json();
  const periods = (forecast?.properties?.periods ?? []) as NWSPeriod[];
  if (!periods.length) throw new Error('NWS returned no hourly forecast periods.');

  const current = periods[0];
  const now = DateTime.now().setZone(ZONE);
  const evening = periods.find(period => {
    const dt = DateTime.fromISO(period.startTime).setZone(ZONE);
    return dt.hasSame(now, 'day') && dt.hour >= 18;
  });

  return {
    temperatureF: current.temperatureUnit === 'F' ? current.temperature : null,
    shortForecast: current.shortForecast,
    precipitationProbability: current.probabilityOfPrecipitation?.value ?? null,
    windSpeed: current.windSpeed,
    windDirection: current.windDirection,
    forecastAt: current.startTime,
    eveningSummary: evening ? `${evening.temperature}°F · ${evening.shortForecast} · ${evening.windDirection} ${evening.windSpeed}` : null
  };
}
