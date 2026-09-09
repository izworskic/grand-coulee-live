import type { GrandCouleeStatus } from '@/lib/types';

const OFFICIAL_IMAGE = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/night/1.jpg';
const OFFICIAL_GALLERY = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/night/1.html';
const USACE_CWMS = 'https://water.usace.army.mil/overview/nwdp/locations/gcl';
const RECLAMATION_VISITOR = 'https://www.usbr.gov/pn/grandcoulee/visit/index.html';
const RECLAMATION_TOURS = 'https://www.usbr.gov/pn/grandcoulee/visit/tour.html';
const RECLAMATION_LASER = 'https://www.usbr.gov/pn/grandcoulee/visit/laser.html';

function n(value: number | null, digits = 0) {
  return value === null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function observed(iso: string | null) {
  if (!iso) return 'no current numeric observation';
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
  const visibleOperational = [status.reservoir.forebayFt, status.flow.totalOutflowKcfs].filter(value => value !== null).length;
  const operationalObserved = observed(status.observedAt);
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

    <div className="provenance-index" aria-labelledby="provenance-heading">
      <div className="provenance-intro"><span className="eyebrow">HERO METRIC PROVENANCE</span><h3 id="provenance-heading">Where each first-screen answer comes from</h3><p>The classification and observation context below correspond directly to the hero metrics. Full direct-source links and freshness states remain available in Data Sources &amp; Methodology.</p></div>
      <div className="provenance-grid">
        <a href={USACE_CWMS} target="_blank" rel="noreferrer"><strong>Estimated generation</strong><span>ESTIMATED · current USACE generation flow + hydraulic head, calibrated against reported daily generation. Withheld while turbine flow is missing.</span></a>
        <a href={USACE_CWMS} target="_blank" rel="noreferrer"><strong>Lake Roosevelt</strong><span>MEASURED · USACE CWMS forebay · {operationalObserved}</span></a>
        <a href={USACE_CWMS} target="_blank" rel="noreferrer"><strong>Spillway</strong><span>MEASURED · USACE spill series · {status.flow.spillKcfs === null ? 'numeric observation currently unavailable' : operationalObserved}</span></a>
        <a href={USACE_CWMS} target="_blank" rel="noreferrer"><strong>Total outflow</strong><span>MEASURED · USACE CWMS outflow · {status.flow.totalOutflowKcfs === null ? 'numeric observation unavailable' : operationalObserved}</span></a>
        <a href={USACE_CWMS} target="_blank" rel="noreferrer"><strong>Hydraulic head</strong><span>{status.hydraulic.headSource === 'measured' ? `MEASURED · USACE forebay minus tailwater · ${operationalObserved}` : status.hydraulic.headSource === 'rating-curve' ? `ESTIMATED · current forebay/outflow + official USACE tailwater rating curve · ${operationalObserved}` : 'UNAVAILABLE · required hydraulic observations missing'}</span></a>
        <a href={RECLAMATION_VISITOR} target="_blank" rel="noreferrer"><strong>Visitor Center</strong><span>REPORTED · current-year Bureau of Reclamation visitor schedule</span></a>
        <a href={RECLAMATION_TOURS} target="_blank" rel="noreferrer"><strong>Next plant tour</strong><span>CALCULATED FROM REPORTED SCHEDULE · 2026 Reclamation tour dates/departures in Pacific Time</span></a>
        <a href={RECLAMATION_LASER} target="_blank" rel="noreferrer"><strong>Laser show</strong><span>CALCULATED FROM REPORTED SCHEDULE · date-aware Reclamation seasonal timing</span></a>
        <div><strong>Sunset</strong><span>CALCULATED · Grand Coulee coordinates using local astronomical calculation in America/Los_Angeles</span></div>
      </div>
    </div>
  </section>;
}
