'use client';

import { useEffect, useState } from 'react';
import { PhotographicDamExplorer } from '@/components/PhotographicDamExplorer';
import { OperationsHistory } from '@/components/OperationsHistory';
import { VisitPlanner } from '@/components/VisitPlanner';
import type { GrandCouleeStatus } from '@/lib/types';

type Props = { initialStatus: GrandCouleeStatus };

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

export function GrandCouleeDashboard({ initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const refresh = () => fetch('/api/status').then(r => r.ok ? r.json() : null).then(data => data?.reservoir && setStatus(data)).catch(() => undefined);
    const timer = window.setInterval(refresh, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updated = status.observedAt ? datePacific(status.observedAt) : 'Operational feed unavailable';
  const holidayClosure = status.visitor.visitorCenterDetail.toLowerCase().includes('federal holiday');
  const telemetryLabel = status.observedAt ? `UPDATED ${updated}` : 'RIVER DATA DELAYED';
  const telemetryFreshnessClass = status.telemetry.state === 'partial' && status.freshness === 'current' ? 'delayed' : status.freshness;
  const lakeMetricForecast = status.lakeForecast?.nextElevationFt !== null && status.lakeForecast?.nextElevationFt !== undefined
    ? ` · ${n(status.lakeForecast.nextElevationFt, 1)} ft forecast ${shortDate(status.lakeForecast.nextDate)}`
    : '';
  const riverBalance = status.riverContext.inflowKcfs !== null && status.riverContext.dailyOutflowKcfs !== null
    ? status.riverContext.inflowKcfs - status.riverContext.dailyOutflowKcfs
    : null;
  const riverBalanceValue = riverBalance === null ? '—' : `${riverBalance > 0 ? '+' : riverBalance < 0 ? '−' : ''}${n(Math.abs(riverBalance), 1)} kcfs`;
  const riverBalanceSub = riverBalance === null
    ? 'Daily inflow/outflow context unavailable'
    : riverBalance > 0
      ? 'Daily inflow minus outflow'
      : riverBalance < 0
        ? 'Daily outflow exceeds inflow'
        : 'Daily inflow and outflow are balanced';
  const tonightValue = status.visitor.laserStatus === 'tonight' && status.visitor.laserTime
    ? formatPacific(status.visitor.laserTime)
    : status.astronomy.sunset;
  const tonightSub = status.visitor.laserStatus === 'tonight' && status.visitor.laserTime
    ? `One River, Many Voices · sunset ${status.astronomy.sunset}`
    : `Sunset · civil dusk ${status.astronomy.civilDusk}`;

  return <main>
    <header className="hero">
      <nav className="topbar"><a href="https://chrisizworski.com" className="brand">CHRISIZWORSKI.COM</a><span>National Tools · Pacific Northwest</span></nav>
      <div className="hero-inner">
        <div className="hero-copy"><span className="eyebrow">LIVE INFRASTRUCTURE · GRAND COULEE, WASHINGTON</span><h1>GRAND COULEE <em>LIVE</em></h1><p className="lead">Grand Coulee, right now.</p><p className="support">Lake Roosevelt, river flow, what’s changing today, tours and visitor conditions.</p><div className={`freshness ${telemetryFreshnessClass}`}><span className="pulse"/>{telemetryLabel}</div></div>
        <div className="decision-card"><span className="eyebrow">TODAY</span><h2>{status.decision.headline}</h2><p>{status.decision.detail}</p></div>
      </div>

      <section className="metric-grid" aria-label="Current Grand Coulee conditions">
        <Metric label="Lake Roosevelt" value={status.reservoir.forebayFt === null ? '—' : `${n(status.reservoir.forebayFt, 2)} ft`} sub={`${status.reservoir.belowFullPoolFt === null ? '—' : `${n(status.reservoir.belowFullPoolFt,2)} ft below full pool`}${lakeMetricForecast}`} tag="MEASURED" />
        <Metric label="Lake change · 24h" value={status.reservoir.change24hFt === null ? '—' : signed(status.reservoir.change24hFt, ' ft')} sub={status.reservoir.change6hFt === null ? 'Measured forebay movement' : `${signed(status.reservoir.change6hFt, ' ft')} over 6h`} tag="MEASURED" />
        <Metric label="Current outflow" value={status.flow.totalOutflowKcfs === null ? '—' : `${n(status.flow.totalOutflowKcfs, 1)} kcfs`} sub="Columbia River flow below the dam" tag="MEASURED" />
        <Metric label="Daily inflow" value={status.riverContext.inflowKcfs === null ? '—' : `${n(status.riverContext.inflowKcfs, 1)} kcfs`} sub="Latest daily average into Grand Coulee" tag="REPORTED" />
        <Metric label="River balance" value={riverBalanceValue} sub={riverBalanceSub} tag="DERIVED" />
        <Metric label="Visitor Center" value={status.visitor.visitorCenterStatus.toUpperCase()} sub={status.visitor.visitorCenterDetail} tag="REPORTED" />
        <Metric label="Next plant tour" value={status.visitor.nextTour ? formatPacific(status.visitor.nextTour) : 'NO TOUR NOW'} sub={status.visitor.nextTourDetail} tag="REPORTED" />
        <Metric label="Tonight" value={tonightValue} sub={tonightSub} tag="PLAN" />
      </section>
    </header>

    <PhotographicDamExplorer status={status} />

    <VisitPlanner status={status} />

    <section className="visitor-section">
      <div className="today-card"><span className="eyebrow">TODAY AT GRAND COULEE</span><h2>Today’s schedule</h2><p className="timeline-now">Times shown in Pacific Time</p><ol className="timeline"><li className="highlight"><time>{formatPacific(status.retrievedAt)}</time><span>NOW</span></li>{!holidayClosure && <li><time>8:30 AM</time><span>Visitor Center opens</span></li>}{status.visitor.toursToday.map(time => <li key={time}><time>{time}</time><span>Guided pump-generating plant tour</span></li>)}{!holidayClosure && <li><time>5:00 PM</time><span>Visitor Center closes</span></li>}<li><time>{status.astronomy.sunset}</time><span>Sunset</span></li>{status.visitor.laserStatus === 'tonight' && status.visitor.laserTime && <li className="highlight"><time>{formatPacific(status.visitor.laserTime)}</time><span>One River, Many Voices laser show</span></li>}</ol></div>
      <div className="weather-card"><span className="eyebrow">VISITOR WEATHER</span><h2>{status.weather ? `${n(status.weather.temperatureF,0)}°F · ${status.weather.shortForecast}` : 'Weather unavailable'}</h2>{status.weather && <><dl><div><dt>Wind</dt><dd>{status.weather.windDirection} {status.weather.windSpeed}</dd></div><div><dt>Rain chance</dt><dd>{status.weather.precipitationProbability ?? '—'}%</dd></div><div><dt>This evening</dt><dd>{status.weather.eveningSummary ?? 'No evening period yet'}</dd></div></dl></>}</div>
      {status.pumping.banksLakePumpKcfs !== null && <div className="banks-card"><span className="eyebrow">COLUMBIA BASIN PROJECT</span><h2>Pumping toward Banks Lake</h2><div className="big-number">{n(status.pumping.banksLakePumpKcfs,2)} kcfs</div><p>Water from Lake Roosevelt is moving uphill toward Banks Lake.</p>{status.pumping.banksLakeElevationFt !== null && <span className="minor-stat">Banks Lake {n(status.pumping.banksLakeElevationFt,2)} ft</span>}</div>}
    </section>

    <OperationsHistory />

    <section className="faq-section"><span className="eyebrow">QUICK ANSWERS</span><h2>Before you go</h2>
      <details><summary>How high is Lake Roosevelt right now?</summary><p>{status.reservoir.forebayFt === null ? 'No current lake reading.' : `The latest Grand Coulee forebay observation is ${n(status.reservoir.forebayFt,2)} feet, ${n(status.reservoir.belowFullPoolFt,2)} feet below the 1,290-foot full-pool reference.${status.lakeForecast?.nextElevationFt !== null && status.lakeForecast?.nextElevationFt !== undefined ? ` Reclamation's next midnight forecast is ${n(status.lakeForecast.nextElevationFt,1)} feet for ${shortDate(status.lakeForecast.nextDate)}.` : ''}`}</p></details>
      <details><summary>Is Lake Roosevelt rising or falling today?</summary><p>{status.reservoir.change24hFt === null ? 'A 24-hour lake change is not available right now.' : `Lake Roosevelt is ${Math.abs(status.reservoir.change24hFt) < 0.01 ? 'essentially steady' : status.reservoir.change24hFt > 0 ? `up ${n(Math.abs(status.reservoir.change24hFt),2)} feet` : `down ${n(Math.abs(status.reservoir.change24hFt),2)} feet`} over the past 24 hours.`}</p></details>
      <details><summary>How much water is moving through Grand Coulee right now?</summary><p>{status.flow.totalOutflowKcfs === null ? 'No current outflow reading.' : `Current Columbia River outflow below Grand Coulee is ${n(status.flow.totalOutflowKcfs,1)} kcfs.${status.riverContext.inflowKcfs !== null && status.riverContext.dailyOutflowKcfs !== null ? ` The latest daily averages are ${n(status.riverContext.inflowKcfs,1)} kcfs inflow and ${n(status.riverContext.dailyOutflowKcfs,1)} kcfs outflow.` : ''}`}</p></details>
      <details><summary>Can you tour Grand Coulee Dam?</summary><p>In the verified 2026 schedule, Reclamation offers free John W. Keys III Pump-Generating Plant tours Friday through Sunday from May 22 through October 31. Tours are first come, first served and can change or be canceled without notice.</p></details>
      <details><summary>What time is the Grand Coulee laser show?</summary><p>{status.visitor.laserDetail}</p></details>
    </section>

    <section className="sources-section" id="sources"><span className="eyebrow">DATA SOURCES & METHODOLOGY</span><h2>Live data sources</h2><div className="source-list">{status.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><div><strong>{source.label}</strong><p>{source.note ?? `${source.kind} data`}</p></div><span className={`source-status ${source.freshness}`}>{source.freshness}</span></a>)}</div><p className="method-note">Operational data may be provisional and subject to revision. GRAND COULEE LIVE is an independent public-information tool and is not operated by or affiliated with the Bureau of Reclamation, U.S. Army Corps of Engineers, Bonneville Power Administration or National Park Service.</p></section>

    <footer><strong>GRAND COULEE LIVE</strong><span>Live infrastructure made understandable.</span><a href="https://chrisizworski.com">ChrisIzworski.com</a></footer>
  </main>;
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }
