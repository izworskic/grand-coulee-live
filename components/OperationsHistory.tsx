'use client';

import { useEffect, useMemo, useState } from 'react';

type HistoryRange = '24h' | '7d' | '30d';
type SeriesMeta = { key: string; label: string; unit: string };
type Insight = { id: string; label: 'DERIVED'; text: string };
type HistoryPoint = Record<string, string | number | null>;
type HistoryPayload = {
  range: HistoryRange;
  basis: 'hourly' | 'daily';
  windowLabel: string;
  through: string | null;
  sourceAgeHours?: number | null;
  sourceAgeDays?: number | null;
  points: HistoryPoint[];
  series: SeriesMeta[];
  insights: Insight[];
  error?: string;
};

const RANGE_LABELS: Record<HistoryRange, string> = { '24h': '24 hours', '7d': '7 days', '30d': '30 days' };

function shortDate(value: string | null) {
  if (!value) return 'unavailable';
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00-07:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    ...(value.includes('T') ? { hour: 'numeric', minute: '2-digit' } : {})
  }).format(date);
}

function preferredSeries(payload: HistoryPayload): string | null {
  const preferences = payload.basis === 'hourly'
    ? ['forebayFt', 'totalOutflowKcfs', 'estimatedGenerationMW', 'spillKcfs']
    : ['averageGenerationMW', 'reservoirElevationFt', 'totalOutflowKcfs', 'spillKcfs'];
  return preferences.find(key => payload.series.some(series => series.key === key)) ?? payload.series[0]?.key ?? null;
}

function sourceAge(payload: HistoryPayload | null) {
  if (!payload) return { label: '', stale: false };
  if (payload.basis === 'hourly' && typeof payload.sourceAgeHours === 'number') {
    const hours = payload.sourceAgeHours;
    return { label: hours < 1 ? 'latest source observation <1h old' : `latest source observation ${hours.toFixed(1)}h old`, stale: hours > 6 };
  }
  if (payload.basis === 'daily' && typeof payload.sourceAgeDays === 'number') {
    const days = payload.sourceAgeDays;
    return { label: days < 1 ? 'latest reported day is current' : `latest reported day ${days.toFixed(0)}d old`, stale: days > 2 };
  }
  return { label: 'source age unavailable', stale: true };
}

export function OperationsHistory() {
  const [range, setRange] = useState<HistoryRange>('24h');
  const [payload, setPayload] = useState<HistoryPayload | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/history?range=${range}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? 'History unavailable');
        return data as HistoryPayload;
      })
      .then(data => {
        if (cancelled) return;
        setPayload(data);
        setSelectedKey(current => data.series.some(series => series.key === current) ? current : preferredSeries(data));
      })
      .catch(error => {
        if (cancelled) return;
        setPayload({ range, basis: range === '24h' ? 'hourly' : 'daily', windowLabel: '', through: null, points: [], series: [], insights: [], error: error instanceof Error ? error.message : 'History unavailable' });
        setSelectedKey(null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [range]);

  const selectedSeries = payload?.series.find(series => series.key === selectedKey) ?? null;
  const chart = useMemo(() => {
    if (!payload || !selectedKey) return null;
    const numeric = payload.points.flatMap((point, index) => {
      const value = point[selectedKey];
      return typeof value === 'number' && Number.isFinite(value) ? [{ index, value }] : [];
    });
    if (numeric.length < 2) return null;
    const min = Math.min(...numeric.map(point => point.value));
    const max = Math.max(...numeric.map(point => point.value));
    const span = Math.max(0.001, max - min);
    const total = Math.max(1, payload.points.length - 1);
    const path = numeric.map((point, position) => {
      const x = 34 + (point.index / total) * 732;
      const y = 184 - ((point.value - min) / span) * 132;
      return `${position ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return { path, min, max, latest: numeric.at(-1)!.value };
  }, [payload, selectedKey]);

  const age = sourceAge(payload);

  const chooseRange = (next: HistoryRange) => {
    setRange(next);
    window.gtag?.('event', 'history_range_change', { range: next });
  };

  const chooseSeries = (key: string) => {
    setSelectedKey(key);
    window.gtag?.('event', 'history_series_change', { range, series: key });
  };

  return <section className="history-section" aria-labelledby="history-heading">
    <div className="history-heading-row">
      <div><span className="eyebrow">OPERATIONS HISTORY</span><h2 id="history-heading">What changed?</h2></div>
      <div className="range-controls" role="group" aria-label="History range">
        {(Object.keys(RANGE_LABELS) as HistoryRange[]).map(value => <button key={value} className={range === value ? 'active' : ''} onClick={() => chooseRange(value)} aria-pressed={range === value}>{RANGE_LABELS[value]}</button>)}
      </div>
    </div>

    <div className="history-shell">
      <div className="history-meta">
        <div><strong>{payload?.windowLabel || 'Loading operating history…'}</strong>{payload?.through && <span>Through {shortDate(payload.through)} Pacific</span>}</div>
        {payload && <span className={age.stale ? 'history-age stale' : 'history-age'}>{age.label}</span>}
      </div>

      {payload?.series.length ? <div className="series-controls" role="group" aria-label="History metric">
        {payload.series.map(series => <button key={series.key} className={selectedKey === series.key ? 'active' : ''} onClick={() => chooseSeries(series.key)} aria-pressed={selectedKey === series.key}>{series.label}</button>)}
      </div> : null}

      <div className="chart-card">
        {loading ? <p className="muted">Loading operating history…</p> : payload?.error ? <p className="muted">{payload.error}</p> : chart && selectedSeries ? <>
          <div className="chart-summary"><div><span>{selectedSeries.label}</span><strong>{chart.latest.toLocaleString(undefined, { maximumFractionDigits: selectedSeries.unit === 'ft' ? 2 : 1 })} {selectedSeries.unit}</strong></div><div><span>Range</span><strong>{chart.min.toLocaleString(undefined, { maximumFractionDigits: 2 })}–{chart.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div></div>
          <svg viewBox="0 0 800 220" role="img" aria-labelledby="history-chart-title history-chart-desc">
            <title id="history-chart-title">{selectedSeries.label} over {RANGE_LABELS[range]}</title>
            <desc id="history-chart-desc">A line chart using the latest available {payload?.basis} observations through {shortDate(payload?.through ?? null)}. Minimum {chart.min.toFixed(2)} and maximum {chart.max.toFixed(2)} {selectedSeries.unit}.</desc>
            <line x1="34" y1="184" x2="766" y2="184" className="chart-axis" />
            <line x1="34" y1="52" x2="766" y2="52" className="chart-grid" />
            <path d={chart.path} className="chart-line" />
          </svg>
        </> : <p className="muted">Not enough numeric observations are available for this metric and range.</p>}
        <p className="chart-note">History is anchored to the latest available source observation. If a federal daily feed is delayed, the date above makes that delay explicit instead of implying the chart reaches today.</p>
      </div>

      <div className="insight-block" aria-live="polite">
        <div className="insight-heading"><span className="eyebrow">DERIVED OBSERVATIONS</span><p>These statements describe changes visible in the data. They do not infer why operators made them.</p></div>
        <div className="insight-grid">
          {payload?.insights.length ? payload.insights.map(insight => <article key={insight.id}><span>{insight.label}</span><p>{insight.text}</p></article>) : <article><span>DERIVED</span><p>No material change can be stated confidently from the available observations in this range.</p></article>}
        </div>
      </div>
    </div>
  </section>;
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }
