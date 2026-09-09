'use client';

import { useEffect, useState } from 'react';
import { CurrentConditions } from '@/components/CurrentConditions';
import { OperationsHistory } from '@/components/OperationsHistory';
import type { GrandCouleeStatus } from '@/lib/types';

type Props = { initialStatus: GrandCouleeStatus };
type HotspotId = 'reservoir' | 'spillway' | 'left' | 'right' | 'third' | 'pumps' | 'visitor' | 'viewpoints';

const detailCopy: Record<HotspotId, { title: string; body: string }> = {
  reservoir: { title: 'Lake Roosevelt', body: 'Franklin D. Roosevelt Lake stores Columbia River water upstream of the dam. Its elevation changes with flood-risk management, power, irrigation and other operating requirements.' },
  spillway: { title: 'Spillway', body: 'The central spillway passes water that is not routed through generating units. The animation here responds only to a numeric USACE spill observation and never assumes missing spill telemetry means zero.' },
  left: { title: 'Left Powerhouse', body: 'One of the original powerhouse areas. Water drops through penstocks and spins turbine-generator units before returning to the Columbia River.' },
  right: { title: 'Right Powerhouse', body: 'The other original powerhouse area, part of the immense generating complex built into and beside the dam.' },
  third: { title: 'Nathaniel “Nat” Washington Power Plant', body: 'The Third Power Plant dramatically expanded Grand Coulee’s generating capability and contains the project’s largest generating units.' },
  pumps: { title: 'John W. Keys III Pump-Generating Plant', body: 'This reversible plant lifts Columbia River water toward Banks Lake for the Columbia Basin Project and can also generate under appropriate operating conditions.' },
  visitor: { title: 'Visitor Center', body: 'The official visitor center is below the dam on State Route 155. It provides exhibits, visitor information and access to the seasonal visitor program.' },
  viewpoints: { title: 'Public viewpoints', body: 'Use official public areas below the dam and around the visitor complex. The tool does not map restricted access points or represent closed areas as public attractions.' }
};

function n(value: number | null, digits = 1) {
  return value === null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function signed(value: number | null, suffix = '') {
  if (value === null) return '—';
  const sign = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  return `${sign} ${Math.abs(value).toFixed(2)}${suffix}`;
}

function formatPacific(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function datePacific(iso: string | null) {
  if (!iso) return 'Unavailable';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));
}

function shortDate(date: string | null) {
  if (!date) return '—';
  const parsed = new Date(`${date}T12:00:00-07:00`);
  if (!Number.isFinite(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' }).format(parsed);
}

function Metric({ label, value, sub, tag }: { label: string; value: string; sub: string; tag?: string }) {
  return <article className="metric-card">
    <div className="metric-top"><span>{label}</span>{tag && <span className="metric-tag">{tag}</span>}</div>
    <strong>{value}</strong>
    <p>{sub}</p>
  </article>;
}

function DamModel({ status }: { status: GrandCouleeStatus }) {
  const [selected, setSelected] = useState<HotspotId>('spillway');
  const [flowMode, setFlowMode] = useState(true);
  const [engineering, setEngineering] = useState(false);
  const below = Math.max(0, Math.min(35, status.reservoir.belowFullPoolFt ?? 8));
  const waterY = 60 + below * 0.7;
  const spilling = status.flow.spillKcfs !== null && status.flow.spillKcfs > 0.05;
  const spillLabel = status.flow.spillKcfs === null ? 'SPILL STATUS UNAVAILABLE' : spilling ? 'SPILL ACTIVE' : 'NOT SPILLING';
  const displayHead = status.hydraulic.headFt ?? status.hydraulic.estimatedHeadFt;
  const headIsEstimated = status.hydraulic.headSource === 'rating-curve';
  const current = detailCopy[selected];

  const choose = (id: HotspotId) => {
    setSelected(id);
    window.gtag?.('event', 'dam_hotspot_click', { hotspot: id });
  };

  const toggleFlowMode = () => setFlowMode(currentValue => {
    const next = !currentValue;
    window.gtag?.('event', 'dam_flow_mode', { enabled: next });
    return next;
  });

  const toggleEngineering = () => setEngineering(currentValue => {
    const next = !currentValue;
    window.gtag?.('event', 'dam_engineering_mode', { enabled: next });
    return next;
  });

  return <section className="dam-section" aria-labelledby="dam-heading">
    <div className="section-heading-row">
      <div><span className="eyebrow">INTERACTIVE DAM</span><h2 id="dam-heading">See how Grand Coulee works</h2></div>
      <div className="mode-controls" role="group" aria-label="Dam display modes">
        <button className={flowMode ? 'active' : ''} onClick={toggleFlowMode} aria-pressed={flowMode}>Flow mode</button>
        <button className={engineering ? 'active' : ''} onClick={toggleEngineering} aria-pressed={engineering}>Engineering mode</button>
      </div>
    </div>

    <div className="dam-grid">
      <div className="dam-canvas-wrap">
        <svg className="dam-canvas" viewBox="0 0 1000 560" role="img" aria-labelledby="dam-title dam-desc">
          <title id="dam-title">Interactive representation of Grand Coulee Dam</title>
          <desc id="dam-desc">An educational isometric-style diagram showing Lake Roosevelt, the central spillway, powerhouse areas, pump-generating plant, visitor center and Columbia River. Clickable controls follow the diagram.</desc>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#17242a"/><stop offset="1" stopColor="#0d171b"/></linearGradient>
            <linearGradient id="water" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#356c7c"/><stop offset="1" stopColor="#4d8290"/></linearGradient>
            <linearGradient id="concrete" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b8b7ae"/><stop offset="1" stopColor="#767b78"/></linearGradient>
          </defs>
          <rect width="1000" height="560" fill="url(#sky)"/>
          <path d="M0 145 L180 95 300 140 430 72 570 130 720 82 1000 145 1000 0 0 0Z" fill="#27352f" opacity=".9"/>
          <rect x="0" y={waterY} width="1000" height={235-waterY} fill="url(#water)" opacity=".9"/>
          <path d="M0 235 C170 248 270 228 400 245 C550 265 690 236 1000 248 L1000 560 L0 560Z" fill="#173e4b"/>
          <path d="M145 160 L850 160 L810 365 L190 365 Z" fill="url(#concrete)" stroke="#d0d0c7" strokeWidth="2"/>
          <path d="M383 160 L620 160 L600 365 L402 365Z" fill="#8a8d88"/>
          {[0,1,2,3,4,5,6,7,8,9,10].map(i => <rect key={i} x={398 + i*19} y="165" width="8" height="188" fill="#656b68" opacity=".9"/>)}
          <path d="M200 365 L378 365 L360 425 L215 425Z" fill="#707774"/>
          <path d="M625 365 L805 365 L790 427 L641 427Z" fill="#707774"/>
          <path d="M765 274 L930 247 L942 396 L810 427Z" fill="#666f70" stroke="#aeb4b1"/>
          <path d="M80 264 L180 250 L188 352 L98 366Z" fill="#535e5f"/>
          <path d="M120 430 C280 405 390 418 510 430 C655 445 780 428 1000 408 L1000 560 L0 560 L0 463Z" fill="#2c6f83" opacity=".9"/>

          {flowMode && <g className="flow-layer" aria-hidden="true">
            {status.flow.generationFlowKcfs !== null && <><path className="flow-path turbine-flow" d="M260 105 C275 220 280 285 290 420"/><path className="flow-path turbine-flow delay" d="M715 105 C710 220 718 310 716 425"/></>}
            {spilling && <path className="flow-path spill-flow" d="M505 170 C505 250 510 330 512 430"/>}
            {status.pumping.banksLakePumpKcfs !== null && <path className="flow-path pump-flow" d="M850 305 C900 250 925 185 970 150"/>}
          </g>}

          {engineering && <g className="engineering-labels" aria-hidden="true">
            <text x="500" y="145">Crest length 5,223 ft</text>
            <text x="500" y="392">Hydraulic head {n(displayHead, 1)} ft{headIsEstimated ? ' est.' : ''}</text>
            <text x="170" y="185">Full pool 1,290 ft</text>
            <text x="800" y="448">Installed capacity 6,809 MW</text>
          </g>}

          <g className="hotspot-labels" aria-hidden="true">
            <text x="50" y="105">LAKE ROOSEVELT</text><text x="445" y="205">SPILLWAY</text><text x="210" y="400">LEFT POWERHOUSE</text><text x="645" y="400">RIGHT POWERHOUSE</text><text x="760" y="232">THIRD POWER PLANT</text><text x="75" y="245">PUMP PLANT</text>
          </g>
        </svg>
        <div className="hotspot-controls" aria-label="Explore dam components">
          {(Object.keys(detailCopy) as HotspotId[]).map(id => <button key={id} className={selected === id ? 'selected' : ''} onClick={() => choose(id)}>{detailCopy[id].title}</button>)}
        </div>
      </div>
      <aside className="dam-detail" aria-live="polite">
        <span className="eyebrow">SELECTED COMPONENT</span>
        <h3>{current.title}</h3><p>{current.body}</p>
        {selected === 'reservoir' && <div className="detail-live"><strong>{n(status.reservoir.forebayFt, 2)} ft measured</strong><span>{signed(status.reservoir.change24hFt, ' ft / 24h')}</span>{status.lakeForecast?.nextElevationFt !== null && status.lakeForecast?.nextElevationFt !== undefined && <span>Reclamation forecast: {n(status.lakeForecast.nextElevationFt, 1)} ft at midnight {shortDate(status.lakeForecast.nextDate)}</span>}{status.lakeForecast?.finalElevationFt !== null && status.lakeForecast?.finalElevationFt !== undefined && status.lakeForecast.finalDate !== status.lakeForecast.nextDate && <span>Forecast endpoint: {n(status.lakeForecast.finalElevationFt, 1)} ft on {shortDate(status.lakeForecast.finalDate)}</span>}</div>}
        {selected === 'spillway' && <div className="detail-live"><strong>{spillLabel}</strong><span>{status.flow.spillKcfs === null ? 'No numeric USACE spill observation is currently publishing' : `${n(status.flow.spillKcfs, 2)} kcfs reported`}</span></div>}
        {selected === 'pumps' && <div className="detail-live"><strong>{status.pumping.banksLakePumpKcfs !== null ? `${n(status.pumping.banksLakePumpKcfs, 2)} kcfs` : 'Latest data unavailable'}</strong><span>Banks Lake pumping flow</span></div>}
        {selected === 'visitor' && <div className="detail-live"><strong>{status.visitor.visitorCenterStatus.toUpperCase()}</strong><span>{status.visitor.visitorCenterDetail}</span></div>}
        {engineering && <dl className="engineering-list"><div><dt>Dam height</dt><dd>550 ft</dd></div><div><dt>Crest length</dt><dd>5,223 ft</dd></div><div><dt>Full pool</dt><dd>1,290 ft</dd></div><div><dt>{headIsEstimated ? 'Estimated head' : 'Current head'}</dt><dd>{n(displayHead, 1)} ft</dd></div>{headIsEstimated && <div><dt>Head method</dt><dd>USACE rating curve · low confidence</dd></div>}</dl>}
      </aside>
    </div>
  </section>;
}

export function GrandCouleeDashboard({ initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  useEffect(() => {
    const refresh = () => fetch('/api/status').then(r => r.ok ? r.json() : null).then(data => data?.reservoir && setStatus(data)).catch(() => undefined);
    const timer = window.setInterval(refresh, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const spillActive = status.flow.spillKcfs !== null && status.flow.spillKcfs > 0.05;
  const displayHead = status.hydraulic.headFt ?? status.hydraulic.estimatedHeadFt;
  const updated = status.observedAt ? datePacific(status.observedAt) : 'Operational feed unavailable';
  const capacityPct = status.generation.currentEstimatedMW === null ? null : (status.generation.currentEstimatedMW / status.generation.installedCapacityMW) * 100;
  const holidayClosure = status.visitor.visitorCenterDetail.toLowerCase().includes('federal holiday');
  const telemetryLabel = status.telemetry.state === 'complete'
    ? `${status.freshness.toUpperCase()} · ${status.telemetry.availableCoreSeries}/${status.telemetry.totalCoreSeries} core fields`
    : status.telemetry.state === 'partial'
      ? `PARTIAL LIVE · ${status.telemetry.availableCoreSeries}/${status.telemetry.totalCoreSeries} core fields`
      : 'OPERATIONAL TELEMETRY UNAVAILABLE';
  const telemetryFreshnessClass = status.telemetry.state === 'partial' && status.freshness === 'current' ? 'delayed' : status.freshness;
  const lakeMetricForecast = status.lakeForecast?.nextElevationFt !== null && status.lakeForecast?.nextElevationFt !== undefined
    ? ` · ${n(status.lakeForecast.nextElevationFt, 1)} ft forecast ${shortDate(status.lakeForecast.nextDate)}`
    : '';

  return <main>
    <header className="hero">
      <nav className="topbar"><a href="https://chrisizworski.com" className="brand">CHRISIZWORSKI.COM</a><span>National Tools · Pacific Northwest</span></nav>
      <div className="hero-inner">
        <div className="hero-copy"><span className="eyebrow">LIVE INFRASTRUCTURE · GRAND COULEE, WASHINGTON</span><h1>GRAND COULEE <em>LIVE</em></h1><p className="lead">See what Grand Coulee is doing right now.</p><p className="support">Live water conditions, power-generation estimates when the required telemetry is available, spill status, tours, laser-show timing and an interactive look inside one of America’s largest hydropower projects.</p><div className={`freshness ${telemetryFreshnessClass}`} title={status.telemetry.missingCoreSeries.length ? `Missing: ${status.telemetry.missingCoreSeries.join(', ')}` : 'All core operational fields are available'}><span className="pulse"/>{telemetryLabel} · {updated}</div></div>
        <div className="decision-card"><span className="eyebrow">SHOULD I GO NOW?</span><h2>{status.decision.headline}</h2><p>{status.decision.detail}</p><div className="decision-weather">{status.weather ? `${n(status.weather.temperatureF,0)}°F · ${status.weather.shortForecast}` : 'Weather temporarily unavailable'}</div></div>
      </div>

      <section className="metric-grid" aria-label="Current Grand Coulee conditions">
        <Metric label="Estimated generation now" value={status.generation.currentEstimatedMW === null ? 'Unavailable' : `${n(status.generation.currentEstimatedMW, 0)} MW`} sub={capacityPct === null ? 'Current turbine-flow telemetry unavailable' : `${n(capacityPct,0)}% of 6,809 MW capacity · ${status.generation.estimateConfidence ?? 'unknown'} confidence`} tag="ESTIMATED" />
        <Metric label="Lake Roosevelt" value={status.reservoir.forebayFt === null ? 'Unavailable' : `${n(status.reservoir.forebayFt, 2)} ft`} sub={`${status.reservoir.belowFullPoolFt === null ? 'Full-pool comparison unavailable' : `${n(status.reservoir.belowFullPoolFt,2)} ft below full pool`}${lakeMetricForecast}`} tag="MEASURED" />
        <Metric label="Spillway" value={status.flow.spillKcfs === null ? 'STATUS UNAVAILABLE' : spillActive ? 'SPILL ACTIVE' : 'NOT SPILLING'} sub={status.flow.spillKcfs === null ? 'USACE spill series currently has no numeric observation' : `${n(status.flow.spillKcfs, 2)} kcfs reported`} tag="MEASURED" />
        <Metric label="Total outflow" value={status.flow.totalOutflowKcfs === null ? 'Unavailable' : `${n(status.flow.totalOutflowKcfs, 1)} kcfs`} sub={status.flow.generationFlowKcfs === null ? 'Generation-flow telemetry unavailable' : `${n(status.flow.generationFlowKcfs,1)} kcfs through generation`} tag="MEASURED" />
        <Metric label="Hydraulic head" value={displayHead === null ? 'Unavailable' : `${n(displayHead, 1)} ft`} sub={status.hydraulic.headSource === 'measured' ? 'Measured forebay minus measured tailwater' : status.hydraulic.headSource === 'rating-curve' ? `Estimated tailwater ${n(status.hydraulic.estimatedTailwaterFt,1)} ft · USACE rating curve` : 'Required hydraulic inputs unavailable'} tag={status.hydraulic.headSource === 'rating-curve' ? 'ESTIMATED' : 'MEASURED'} />
        <Metric label="Visitor Center" value={status.visitor.visitorCenterStatus.toUpperCase()} sub={status.visitor.visitorCenterDetail} tag="REPORTED" />
        <Metric label="Next plant tour" value={status.visitor.nextTour ? formatPacific(status.visitor.nextTour) : 'NO TOUR NOW'} sub={status.visitor.nextTourDetail} tag="REPORTED" />
        <Metric label="Laser show" value={status.visitor.laserStatus === 'tonight' && status.visitor.laserTime ? formatPacific(status.visitor.laserTime) : status.visitor.laserStatus === 'completed' ? 'ENDED TONIGHT' : status.visitor.laserStatus === 'off-season' ? 'OFF SEASON' : 'VERIFY SCHEDULE'} sub={status.visitor.laserDetail} tag="REPORTED" />
        <Metric label="Sunset" value={status.astronomy.sunset} sub={`Civil dusk ${status.astronomy.civilDusk}`} tag="CALCULATED" />
      </section>
    </header>

    <DamModel status={status} />

    <section className="visitor-section">
      <div className="today-card"><span className="eyebrow">TODAY AT GRAND COULEE</span><h2>Visitor timeline</h2><p className="timeline-now">Times shown in Pacific Time</p><ol className="timeline"><li className="highlight"><time>{formatPacific(status.retrievedAt)}</time><span>NOW · latest page refresh</span></li>{!holidayClosure && <li><time>8:30 AM</time><span>Visitor Center opens</span></li>}{status.visitor.toursToday.map(time => <li key={time}><time>{time}</time><span>Guided pump-generating plant tour</span></li>)}{!holidayClosure && <li><time>5:00 PM</time><span>Visitor Center closes</span></li>}<li><time>{status.astronomy.sunset}</time><span>Sunset</span></li>{status.visitor.laserStatus === 'tonight' && status.visitor.laserTime && <li className="highlight"><time>{formatPacific(status.visitor.laserTime)}</time><span>One River, Many Voices laser show</span></li>}</ol></div>
      <div className="weather-card"><span className="eyebrow">VISITOR WEATHER</span><h2>{status.weather ? `${n(status.weather.temperatureF,0)}°F · ${status.weather.shortForecast}` : 'Weather unavailable'}</h2>{status.weather && <><dl><div><dt>Wind</dt><dd>{status.weather.windDirection} {status.weather.windSpeed}</dd></div><div><dt>Precipitation</dt><dd>{status.weather.precipitationProbability ?? '—'}%</dd></div><div><dt>This evening</dt><dd>{status.weather.eveningSummary ?? 'No evening period yet'}</dd></div></dl><p>National Weather Service forecast for the Grand Coulee Dam area.</p></>}</div>
      <div className="banks-card"><span className="eyebrow">COLUMBIA BASIN PROJECT</span><h2>Pumping toward Banks Lake</h2><div className="big-number">{status.pumping.banksLakePumpKcfs === null ? '—' : `${n(status.pumping.banksLakePumpKcfs,2)} kcfs`}</div><p>Latest reported pumping flow. Grand Coulee also moves Columbia River water into Banks Lake for the Columbia Basin Project.</p>{status.pumping.banksLakeElevationFt !== null && <span className="minor-stat">Banks Lake {n(status.pumping.banksLakeElevationFt,2)} ft</span>}</div>
    </section>

    <CurrentConditions status={status} />
    <OperationsHistory />

    <section className="explain-section"><span className="eyebrow">HOW TO READ THIS TOOL</span><h2>Measured when published. Estimated only when explicitly labeled.</h2><div className="explain-grid"><article><h3>Operational telemetry is field-by-field</h3><p>Grand Coulee Live reads the USACE CWMS series independently. A current forebay or outflow value does not cause a missing spill, generation-flow or tailwater value to be treated as zero.</p></article><article><h3>Generation uses physics + calibration</h3><p>Estimated generation requires turbine flow and hydraulic head. The model is calibrated against reported Grand Coulee generation and is withheld whenever current turbine-flow telemetry is absent.</p></article><article><h3>Tailwater has a cautious fallback</h3><p>If measured tailwater is missing, Engineering Mode may show a low-confidence estimate from the official USACE Water Control Manual rating curve. Historical validation across 367 daily observations produced 0.31 ft MAE and 0.85 ft 95th-percentile absolute error, while USACE still notes that Rufus Woods Lake backwater can affect actual tailwater.</p></article><article><h3>Forecast stays separate from measured</h3><p>Bureau of Reclamation midnight Lake Roosevelt forecasts are shown only as planning context. The live lake-level card remains anchored to the measured CWMS forebay value.</p></article></div></section>

    <section className="faq-section"><span className="eyebrow">GRAND COULEE QUESTIONS</span><h2>What visitors usually want to know</h2><details><summary>How high is Lake Roosevelt right now?</summary><p>{status.reservoir.forebayFt === null ? 'The current USACE forebay value is temporarily unavailable.' : `The latest Grand Coulee forebay observation is ${n(status.reservoir.forebayFt,2)} feet, ${n(status.reservoir.belowFullPoolFt,2)} feet below the 1,290-foot full-pool reference.${status.lakeForecast?.nextElevationFt !== null && status.lakeForecast?.nextElevationFt !== undefined ? ` Reclamation's next midnight forecast is ${n(status.lakeForecast.nextElevationFt,1)} feet for ${shortDate(status.lakeForecast.nextDate)}.` : ''}`}</p></details><details><summary>Is Grand Coulee Dam spilling today?</summary><p>{status.flow.spillKcfs === null ? 'The USACE spill series is currently not publishing a numeric observation, so Grand Coulee Live does not infer a yes/no spill state.' : spillActive ? `Yes. The latest reported spill is ${n(status.flow.spillKcfs,2)} kcfs.` : 'No meaningful spill is reported in the latest numeric USACE observation.'}</p></details><details><summary>How much electricity is Grand Coulee generating?</summary><p>{status.generation.currentEstimatedMW === null ? 'The current estimate is unavailable because current turbine-flow telemetry is not publishing. The model remains ready and will resume automatically when the required USACE inputs return.' : `Grand Coulee Live estimates approximately ${n(status.generation.currentEstimatedMW,0)} MW from current turbine flow and hydraulic head. This is an estimate, not an official instantaneous MW reading.`}</p></details><details><summary>Can you tour Grand Coulee Dam?</summary><p>In the verified 2026 schedule, Reclamation offers free John W. Keys III Pump-Generating Plant tours Friday through Sunday from May 22 through October 31. Tours are first come, first served and can change or be canceled without notice.</p></details><details><summary>What time is the Grand Coulee laser show?</summary><p>{status.visitor.laserDetail}</p></details></section>

    <section className="sources-section" id="sources"><span className="eyebrow">DATA SOURCES & METHODOLOGY</span><h2>Where every first-screen number comes from</h2><div className="source-list">{status.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><div><strong>{source.label}</strong><p>{source.note ?? `${source.kind} data`}</p></div><span className={`source-status ${source.freshness}`}>{source.freshness}</span></a>)}</div><p className="method-note">Operational data may be provisional and subject to revision. GRAND COULEE LIVE is an independent public-information tool and is not operated by or affiliated with the Bureau of Reclamation, U.S. Army Corps of Engineers, Bonneville Power Administration or National Park Service.</p></section>

    <footer><strong>GRAND COULEE LIVE</strong><span>Live infrastructure made understandable.</span><a href="https://chrisizworski.com">ChrisIzworski.com</a></footer>
  </main>;
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }
