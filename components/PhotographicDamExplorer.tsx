'use client';

import { useState } from 'react';
import { EngineeringFacts } from '@/components/EngineeringFacts';
import type { GrandCouleeStatus } from '@/lib/types';

type HotspotId = 'reservoir' | 'spillway' | 'left' | 'right' | 'third' | 'pumps' | 'visitor' | 'viewpoints';

type Hotspot = {
  id: HotspotId;
  label: string;
  short: string;
  x: number;
  y: number;
  body: string;
};

const PHOTO_URL = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/aerial/1.jpg';
const PHOTO_SOURCE = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/aerial/1.html';

const HOTSPOTS: Hotspot[] = [
  {
    id: 'reservoir', label: 'Lake Roosevelt', short: 'Lake Roosevelt', x: 17, y: 47,
    body: 'Everything behind the dam is Lake Roosevelt. Watch the live elevation beside the photo; the lake can move several feet as the project responds to river and seasonal demands.'
  },
  {
    id: 'spillway', label: 'Main spillway', short: 'Spillway', x: 48, y: 61,
    body: 'Start in the middle. That broad center section is the spillway, where water can pass the dam without going through a turbine. We only call it active when a real spill observation is publishing.'
  },
  {
    id: 'left', label: 'Left Powerhouse', short: 'Left powerhouse', x: 35, y: 66,
    body: 'Look just downstream and left of the spillway. This is one of Grand Coulee’s original powerhouse blocks, with nine main generators and three smaller station-service units.'
  },
  {
    id: 'right', label: 'Right Powerhouse', short: 'Right powerhouse', x: 58, y: 64,
    body: 'Now look to the other side of the spillway. The Right Powerhouse mirrors the original generating story with nine main generators of its own.'
  },
  {
    id: 'third', label: 'Nathaniel “Nat” Washington Power Plant', short: 'Third Power Plant', x: 63, y: 50,
    body: 'This is where Grand Coulee gets even bigger. The Third Power Plant added six enormous units and became the largest single powerhouse in the complex.'
  },
  {
    id: 'pumps', label: 'John W. Keys III Pump-Generating Plant', short: 'Pump plant', x: 57, y: 37,
    body: 'This is the part many visitors don’t expect: Grand Coulee also sends water uphill. The pump-generating plant lifts Columbia River water toward Banks Lake, and six units can reverse and generate power.'
  },
  {
    id: 'visitor', label: 'Grand Coulee Visitor Center', short: 'Visitor center', x: 65, y: 76,
    body: 'That low building below the dam is your best starting point. Go inside for the exhibits, get oriented, and check the day’s tour and evening-show information.'
  },
  {
    id: 'viewpoints', label: 'Public viewing area', short: 'Viewpoints', x: 73, y: 72,
    body: 'For a visitor, stay with the public viewing areas around the Visitor Center. You’ll get the scale of the dam without wandering toward working or restricted areas.'
  }
];

function n(value: number | null, digits = 1) {
  return value === null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function contextTime(value: string | null) {
  if (!value) return 'Source time unavailable';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(value));
}

function shortDate(value: string | null) {
  if (!value) return 'date unavailable';
  const parsed = new Date(`${value}T12:00:00-07:00`);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' }).format(parsed);
}

export function PhotographicDamExplorer({ status }: { status: GrandCouleeStatus }) {
  const [selected, setSelected] = useState<HotspotId>('spillway');
  const [flowMode, setFlowMode] = useState(true);
  const [engineering, setEngineering] = useState(false);
  const current = HOTSPOTS.find(point => point.id === selected) ?? HOTSPOTS[1];
  const spilling = status.flow.spillKcfs !== null && status.flow.spillKcfs > 0.05;
  const displayHead = status.hydraulic.headFt ?? status.hydraulic.estimatedHeadFt;
  const headEstimated = status.hydraulic.headSource === 'rating-curve';
  const hasRiverContext = [status.riverContext.inflowKcfs, status.riverContext.dailyOutflowKcfs, status.riverContext.precipitationIn, status.riverContext.dailySpillKcfs].some(value => value !== null);

  const choose = (id: HotspotId) => {
    setSelected(id);
    window.gtag?.('event', 'dam_hotspot_click', { hotspot: id, visual: 'photo' });
  };

  const detailValue = (() => {
    if (selected === 'reservoir') return status.reservoir.forebayFt === null ? 'Live level unavailable' : `${n(status.reservoir.forebayFt, 2)} ft measured`;
    if (selected === 'spillway') {
      if (status.flow.spillKcfs !== null) return spilling ? `${n(status.flow.spillKcfs, 2)} kcfs spilling now` : 'No meaningful hourly spill reported';
      if (status.riverContext.dailySpillKcfs !== null) {
        const pct = status.riverContext.dailySpillPercent === null ? '' : ` · ${n(status.riverContext.dailySpillPercent, 1)}% of outflow`;
        return `${n(status.riverContext.dailySpillKcfs, 2)} kcfs daily avg · ${shortDate(status.riverContext.dailySpillDate)}${pct}`;
      }
      return 'Hourly spill telemetry unavailable';
    }
    if (selected === 'pumps') return status.pumping.banksLakePumpKcfs === null ? 'Pumping flow unavailable' : `${n(status.pumping.banksLakePumpKcfs, 2)} kcfs pumping`;
    if (selected === 'visitor') return status.visitor.visitorCenterStatus.toUpperCase();
    return null;
  })();

  return (
    <section className="photo-dam-section" aria-labelledby="photo-dam-heading">
      <div className="section-heading-row photo-dam-heading-row">
        <div>
          <span className="eyebrow">TAKE A LOOK AT THE DAM</span>
          <h2 id="photo-dam-heading">Start in the middle, then work your way out.</h2>
          <p className="photo-dam-intro">Begin with the spillway, then trace the powerhouse blocks, Lake Roosevelt and the pump plant. Tap a marker and I’ll point out what matters.</p>
        </div>
        <div className="mode-controls" role="group" aria-label="Dam photo display modes">
          <button className={flowMode ? 'active' : ''} onClick={() => setFlowMode(v => !v)} aria-pressed={flowMode}>Flow overlay</button>
          <button className={engineering ? 'active' : ''} onClick={() => setEngineering(v => !v)} aria-pressed={engineering}>Engineering</button>
        </div>
      </div>

      <div className="photo-dam-grid">
        <div className="dam-photo-card">
          <div className="dam-photo-stage">
            <img src={PHOTO_URL} alt="Aerial view of Grand Coulee Dam and the Columbia River from the Bureau of Reclamation, June 30, 2011" loading="lazy" />
            <div className="dam-photo-vignette" aria-hidden="true" />

            {flowMode && (
              <svg className="dam-photo-flow" viewBox="0 0 1000 664" aria-hidden="true" preserveAspectRatio="none">
                {status.flow.generationFlowKcfs !== null && <path className="photo-flow generation" d="M380 405 C395 470 420 500 470 538" />}
                {status.flow.generationFlowKcfs !== null && <path className="photo-flow generation" d="M585 400 C575 455 570 500 540 540" />}
                {spilling && <path className="photo-flow spill" d="M495 385 C500 450 505 500 515 540" />}
                {status.pumping.banksLakePumpKcfs !== null && <path className="photo-flow pump" d="M575 355 C610 315 655 285 705 255" />}
              </svg>
            )}

            {HOTSPOTS.map((point, index) => (
              <button
                key={point.id}
                className={`dam-photo-pin ${selected === point.id ? 'selected' : ''}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => choose(point.id)}
                aria-label={`Explore ${point.label}`}
                aria-pressed={selected === point.id}
              >
                <span className="pin-number">{index + 1}</span>
                <span className="pin-label">{point.short}</span>
              </button>
            ))}

            <div className="dam-photo-live-badge lake"><span>LAKE</span><strong>{status.reservoir.forebayFt === null ? '—' : `${n(status.reservoir.forebayFt, 2)} ft`}</strong></div>
            <div className="dam-photo-live-badge river"><span>OUTFLOW</span><strong>{status.flow.totalOutflowKcfs === null ? '—' : `${n(status.flow.totalOutflowKcfs, 1)} kcfs`}</strong></div>
          </div>
          <div className="dam-photo-caption">
            <span><strong>Official reference photograph.</strong> June 30, 2011; not a live camera. Flow overlays are explanatory and not to scale.</span>
            <a href={PHOTO_SOURCE} target="_blank" rel="noreferrer">Bureau of Reclamation source ↗</a>
          </div>
        </div>

        <aside className="photo-dam-detail" aria-live="polite">
          <span className="eyebrow">WHAT YOU’RE LOOKING AT</span>
          <div className="detail-index">{String(HOTSPOTS.findIndex(point => point.id === selected) + 1).padStart(2, '0')}</div>
          <h3>{current.label}</h3>
          <p>{current.body}</p>
          {detailValue && <div className="photo-detail-live"><span>{selected === 'spillway' && status.flow.spillKcfs === null && status.riverContext.dailySpillKcfs !== null ? 'LATEST DAILY CONTEXT' : 'LIVE CONTEXT'}</span><strong>{detailValue}</strong></div>}
          {engineering && <EngineeringFacts currentHeadFt={displayHead} headEstimated={headEstimated} />}
        </aside>
      </div>

      {hasRiverContext && <div className="river-context-strip" aria-label="Latest Grand Coulee daily river context">
        <div className="river-context-heading"><span className="eyebrow">WHAT THE RIVER DID TODAY</span><small>{contextTime(status.riverContext.observedAt)} · USACE CWMS{status.riverContext.dailySpillDate ? ' + DART spill' : ''}</small></div>
        <div><span>Inflow</span><strong>{status.riverContext.inflowKcfs === null ? '—' : `${n(status.riverContext.inflowKcfs, 1)} kcfs`}</strong><small>daily average</small></div>
        <div><span>Outflow</span><strong>{status.riverContext.dailyOutflowKcfs === null ? '—' : `${n(status.riverContext.dailyOutflowKcfs, 1)} kcfs`}</strong><small>daily average</small></div>
        <div><span>Spill</span><strong>{status.riverContext.dailySpillKcfs === null ? '—' : `${n(status.riverContext.dailySpillKcfs, 2)} kcfs`}</strong><small>{status.riverContext.dailySpillDate ? `${shortDate(status.riverContext.dailySpillDate)} daily avg${status.riverContext.dailySpillPercent === null ? '' : ` · ${n(status.riverContext.dailySpillPercent, 1)}%`}` : 'DART temporarily unavailable'}</small></div>
        <div><span>Precipitation</span><strong>{status.riverContext.precipitationIn === null ? '—' : `${n(status.riverContext.precipitationIn, 2)} in`}</strong><small>daily total</small></div>
      </div>}

      <div className="photo-dam-key" aria-label="Dam structure key">
        {HOTSPOTS.map((point, index) => (
          <button key={point.id} className={selected === point.id ? 'selected' : ''} onClick={() => choose(point.id)}>
            <span>{index + 1}</span>{point.short}
          </button>
        ))}
      </div>
    </section>
  );
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }
