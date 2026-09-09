import type { GrandCouleeStatus } from '@/lib/types';

const OFFICIAL_IMAGE = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/night/1.jpg';
const OFFICIAL_GALLERY = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/night/1.html';

function n(value: number | null, digits = 0) {
  return value === null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function CurrentConditions({ status }: { status: GrandCouleeStatus }) {
  const weather = status.weather;
  const visibleOperational = [status.reservoir.forebayFt, status.flow.totalOutflowKcfs].filter(value => value !== null).length;
  return <section className="current-view-section" aria-labelledby="current-view-heading">
    <div className="current-view-copy">
      <span className="eyebrow">CURRENT CONDITIONS AT THE DAM</span>
      <h2 id="current-view-heading">What the visit should feel like right now</h2>
      <p>There is no verified dam-facing live government webcam in this product. The photograph is an official Bureau of Reclamation reference image, not a live camera frame. Current conditions beside it come from the live/forecast data sources shown below.</p>
      <div className="current-view-stats" aria-label="Current visitor conditions">
        <div><span>Weather</span><strong>{weather ? `${n(weather.temperatureF)}°F · ${weather.shortForecast}` : 'Unavailable'}</strong></div>
        <div><span>Wind</span><strong>{weather ? `${weather.windDirection} ${weather.windSpeed}` : 'Unavailable'}</strong></div>
        <div><span>Rain chance</span><strong>{weather?.precipitationProbability === null || weather?.precipitationProbability === undefined ? '—' : `${weather.precipitationProbability}%`}</strong></div>
        <div><span>Live operations</span><strong>{status.telemetry.state === 'complete' ? '5/5 core fields' : `${status.telemetry.availableCoreSeries}/${status.telemetry.totalCoreSeries} core fields`}</strong></div>
      </div>
      <p className="current-view-note">{visibleOperational >= 2 ? 'Lake level and total outflow are currently available from USACE.' : 'Operational telemetry is limited; visitor information remains available.'} Spill is never inferred from a missing series.</p>
    </div>
    <figure className="current-view-figure">
      <a href={OFFICIAL_GALLERY} target="_blank" rel="noreferrer" aria-label="Open the Bureau of Reclamation Grand Coulee photo source">
        <img src={OFFICIAL_IMAGE} alt="Official Bureau of Reclamation reference photograph of Grand Coulee Dam and forebay viewed from above the pump-generating plant intakes" loading="lazy" width="1000" height="666" />
      </a>
      <figcaption><strong>REFERENCE IMAGE · NOT LIVE</strong><span>Bureau of Reclamation · Aug. 1, 2012</span></figcaption>
    </figure>
  </section>;
}
