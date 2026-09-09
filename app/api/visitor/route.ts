import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getAstronomy } from '@/lib/data/astronomy';
import { getVisitorStatus, LASER_URL, TOUR_URL, verifyReclamationSources, VISITOR_URL } from '@/lib/data/reclamation';
import { getWeather } from '@/lib/data/weather';
import { ZONE } from '@/lib/data/usace';

export const revalidate = 600;

export async function GET() {
  const now = DateTime.now().setZone(ZONE);
  const retrievedAt = new Date().toISOString();
  const [sourceHealthResult, weatherResult] = await Promise.allSettled([
    verifyReclamationSources(),
    getWeather()
  ]);
  const sourcesHealthy = sourceHealthResult.status === 'fulfilled' ? sourceHealthResult.value : false;
  const visitor = getVisitorStatus(now, sourcesHealthy);
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const astronomy = getAstronomy(now);

  return NextResponse.json({
    retrievedAt,
    timezone: ZONE,
    localDate: now.toISODate(),
    visitor,
    weather,
    astronomy,
    sources: [
      { id: 'visitor-center', label: 'Bureau of Reclamation · Grand Coulee visitor information', url: VISITOR_URL, healthy: sourcesHealthy },
      { id: 'tours', label: 'Bureau of Reclamation · plant tours', url: TOUR_URL, healthy: sourcesHealthy },
      { id: 'laser', label: 'Bureau of Reclamation · laser show', url: LASER_URL, healthy: sourcesHealthy },
      { id: 'weather', label: 'National Weather Service', url: 'https://api.weather.gov/points/47.955,-118.9833', healthy: weather !== null }
    ]
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800'
    }
  });
}
