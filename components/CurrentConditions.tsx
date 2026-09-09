import type { GrandCouleeStatus } from '@/lib/types';

const OFFICIAL_IMAGE = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/night/1.jpg';
const OFFICIAL_GALLERY = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/night/1.html';

function n(value: number | null, digits = 0) {
  return value === null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function observed(iso: string | null) {
  if (!iso) return 'Delayed';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(iso));
}

export function CurrentConditions({ status }: { status: GrandCouleeStatus }) {
  const weather = status.weather;
  return <section className="current-view-section" aria-labelledby="current-view-heading">
    <div className="current-view-copy">
      <span className="eyebrow">RIGHT NOW</span>
      <h2 id="current-view-heading">Conditions at Grand Coulee</h2>
      <div className="current-view-stats" aria-label="Current visitor conditions">
        <div><span>Weather</span><strong>{weather ? `${n(weather.temperatureF)}°F · ${weather.shortForecast}` : '—'}</strong></div>
        <div><span>Wind</span><strong>{weather ? `${weather.windDirection} ${weather.windSpeed}` : '—'}</strong></div>
        <div><span>Rain chance</span><strong>{weather?.precipitationProbability === null || weather?.precipitationProbability === undefined ? '—' : `${weather.precipitationProbability}%`}</strong></div>
        <div><span>River data</span><strong>{observed(status.observedAt)}</strong></div>
      </div>
    </div>
    <figure className="current-view-figure">
      <a href={OFFICIAL_GALLERY} target="_blank" rel="noreferrer" aria-label="Bureau of Reclamation Grand Coulee photograph">
        <img src={OFFICIAL_IMAGE} alt="Grand Coulee Dam and Lake Roosevelt viewed from above the pump-generating plant intakes" loading="lazy" width="1000" height="666" />
      </a>
      <figcaption><span>Bureau of Reclamation · Aug. 1, 2012</span></figcaption>
    </figure>
  </section>;
}
