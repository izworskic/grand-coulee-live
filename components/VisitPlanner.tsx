'use client';

import { useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { buildVisitPlan, type MobilityPreference, type VisitBudget, type VisitInterest } from '@/lib/visitPlanner';
import type { GrandCouleeStatus } from '@/lib/types';

const PACIFIC = 'America/Los_Angeles';

const BUDGETS: Array<{ value: VisitBudget; label: string }> = [
  { value: 45, label: '45 min' },
  { value: 90, label: '90 min' },
  { value: 180, label: '3 hours' },
  { value: 240, label: 'Half day' },
  { value: 'laser', label: 'Through laser' }
];

const INTERESTS: Array<{ value: VisitInterest; label: string }> = [
  { value: 'balanced', label: 'Best overall visit' },
  { value: 'tour', label: 'Plant tour' },
  { value: 'family', label: 'Family' },
  { value: 'engineering', label: 'Engineering / operations' },
  { value: 'history', label: 'History / interpretation' },
  { value: 'photos', label: 'Photos / scenery' },
  { value: 'laser', label: 'Laser show' }
];

function toLocalInput(dt: DateTime) {
  return dt.setZone(PACIFIC).toFormat("yyyy-MM-dd'T'HH:mm");
}

function parsePacific(value: string) {
  return DateTime.fromFormat(value, "yyyy-MM-dd'T'HH:mm", { zone: PACIFIC });
}

function fmtTime(iso: string) {
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(PACIFIC);
  return dt.isValid ? dt.toFormat('h:mm a') : '—';
}

function fmtWindow(startIso: string, endIso: string) {
  return `${fmtTime(startIso)}–${fmtTime(endIso)} PT`;
}

function formatClock(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date);
}

export function VisitPlanner({ status }: { status: GrandCouleeStatus }) {
  const seed = useMemo(() => DateTime.fromISO(status.retrievedAt).setZone(PACIFIC), [status.retrievedAt]);
  const [arrivalLocal, setArrivalLocal] = useState(() => toLocalInput(seed));
  const [budget, setBudget] = useState<VisitBudget>(180);
  const [interest, setInterest] = useState<VisitInterest>('balanced');
  const [mobility, setMobility] = useState<MobilityPreference>('standard');
  const [clock, setClock] = useState<Date | null>(null);

  useEffect(() => {
    setClock(new Date());
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const arrival = useMemo(() => parsePacific(arrivalLocal), [arrivalLocal]);
  const plan = useMemo(() => buildVisitPlan({ arrival, budget, interest, mobility }), [arrival, budget, interest, mobility]);
  const selectedDate = arrival.toISODate();
  const liveDate = seed.toISODate();
  const sameDay = selectedDate === liveDate;
  const laserIso = status.visitor.laserTime;
  const laserMinutes = sameDay && laserIso ? Math.round(DateTime.fromISO(laserIso).diff(seed, 'minutes').minutes) : null;

  const setNow = () => {
    const now = DateTime.now().setZone(PACIFIC);
    setArrivalLocal(toLocalInput(now));
    window.gtag?.('event', 'visit_planner_arrive_now');
  };

  const updateBudget = (value: VisitBudget) => {
    setBudget(value);
    window.gtag?.('event', 'visit_planner_budget', { budget: value });
  };

  const updateInterest = (value: VisitInterest) => {
    setInterest(value);
    window.gtag?.('event', 'visit_planner_interest', { interest: value });
  };

  return (
    <section className="visit-planner-section" aria-labelledby="visit-planner-heading">
      <div className="visit-planner-head">
        <div>
          <span className="eyebrow">PLAN YOUR VISIT</span>
          <h2 id="visit-planner-heading">When are you getting here?</h2>
          <p>Set your arrival time and how long you have. The plan lines up the Visitor Center, tours, sunset and tonight’s show.</p>
        </div>
        <div className="visit-clocks" aria-label="Current time at Grand Coulee and your current time">
          <div><span>DAM TIME</span><strong>{clock ? formatClock(clock, PACIFIC) : formatClock(new Date(status.retrievedAt), PACIFIC)}</strong></div>
          <div><span>YOUR TIME</span><strong>{clock ? formatClock(clock) : '—'}</strong></div>
        </div>
      </div>

      <div className="planner-shell">
        <div className="planner-controls">
          <label className="planner-field">
            <span>Arrival</span>
            <div className="arrival-row">
              <input type="datetime-local" value={arrivalLocal} onChange={event => { setArrivalLocal(event.target.value); window.gtag?.('event', 'visit_planner_arrival_change'); }} />
              <button type="button" onClick={setNow}>Now</button>
            </div>
            <small>Pacific Time</small>
          </label>

          <fieldset className="budget-field">
            <legend>Time available</legend>
            <div className="budget-buttons">
              {BUDGETS.map(option => <button key={String(option.value)} type="button" className={budget === option.value ? 'selected' : ''} onClick={() => updateBudget(option.value)} aria-pressed={budget === option.value}>{option.label}</button>)}
            </div>
          </fieldset>

          <div className="planner-selects">
            <label className="planner-field"><span>Priority</span><select value={interest} onChange={event => updateInterest(event.target.value as VisitInterest)}>{INTERESTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="planner-field"><span>Walking</span><select value={mobility} onChange={event => setMobility(event.target.value as MobilityPreference)}><option value="standard">Standard</option><option value="minimize-walking">Minimize walking</option></select></label>
          </div>
        </div>

        <article className="plan-verdict" aria-live="polite">
          <span className="eyebrow">BEST USE OF YOUR TIME</span>
          <h3>{plan.verdict}</h3>
          <p>{plan.summary}</p>
          <div className="plan-inventory">
            <div><span>TIME</span><strong>{plan.totalWindowMinutes} min</strong></div>
            <div><span>VISITOR CENTER</span><strong>{plan.centerMinutesAvailable ? `${plan.centerMinutesAvailable} min` : 'None'}</strong></div>
            <div><span>TOURS</span><strong>{plan.reachableTours.length}</strong></div>
            <div><span>CROWD</span><strong>{plan.visitorPressure}</strong></div>
          </div>
          <p className="pressure-note">{plan.pressureReason}</p>
          {sameDay && <div className="same-day-signal"><span>TODAY’S CONDITIONS</span><strong>{status.weather ? `${Math.round(status.weather.temperatureF ?? 0)}°F · ${status.weather.shortForecast}` : 'Weather unavailable'} · sunset {status.astronomy.sunset}</strong>{laserMinutes !== null && laserMinutes > 0 && <small>Laser show in {Math.floor(laserMinutes / 60)}h {laserMinutes % 60}m.</small>}</div>}
          {!sameDay && <div className="same-day-signal future"><span>FUTURE DATE</span><strong>Schedule only. Current weather and river conditions are for today.</strong></div>}
        </article>
      </div>

      <div className="visit-itinerary">
        <div className="itinerary-main">
          <div className="itinerary-heading"><span className="eyebrow">YOUR PLAN · PACIFIC TIME</span><h3>In order</h3></div>
          <ol>
            {plan.steps.map((step, index) => (
              <li key={`${step.start}-${step.title}`} className={`plan-step ${step.kind}`}>
                <div className="step-time"><span>{String(index + 1).padStart(2, '0')}</span><strong>{fmtWindow(step.start, step.end)}</strong></div>
                <div><h4>{step.title}</h4><p>{step.detail}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="plan-alerts">
          <span className="eyebrow">BEFORE YOU GO</span>
          {plan.alerts.length ? plan.alerts.map(alert => <p key={alert}>{alert}</p>) : <p>No schedule conflicts.</p>}
        </aside>
      </div>

      <div className="experience-expectations">
        <article>
          <span className="eyebrow">PLANT TOUR</span>
          <h3>About one hour · free</h3>
          <ul><li>John W. Keys III Pump-Generating Plant</li><li>First come, limited capacity</li><li>Security screening; leave bags in the vehicle</li></ul>
          <a href="https://www.usbr.gov/pn/grandcoulee/visit/tour.html" target="_blank" rel="noreferrer">Official tour details ↗</a>
        </article>
        <article>
          <span className="eyebrow">ONE RIVER, MANY VOICES</span>
          <h3>About 30 minutes · free</h3>
          <ul><li>Projected across the face of the dam</li><li>No ticket required</li><li>Schedule can change</li></ul>
          <a href="https://www.usbr.gov/pn/grandcoulee/visit/laser.html" target="_blank" rel="noreferrer">Official show details ↗</a>
        </article>
      </div>
    </section>
  );
}
