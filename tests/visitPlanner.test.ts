import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { buildVisitPlan } from '@/lib/visitPlanner';

const zone = 'America/Los_Angeles';
const at = (iso: string) => DateTime.fromISO(iso, { zone });

describe('Grand Coulee visit planner', () => {
  it('protects an imminent tour for a tour-seeking visitor', () => {
    const plan = buildVisitPlan({ arrival: at('2026-09-11T08:20:00'), budget: 180, interest: 'tour', mobility: 'standard' });
    expect(plan.verdict).toBe('GO TO TOUR PARKING FIRST');
    expect(plan.steps.some(step => step.kind === 'tour' && step.start.includes('09:00'))).toBe(true);
    expect(plan.alerts.join(' ')).toContain('first come');
  });

  it('does not invent a tour on a Wednesday road-trip stop', () => {
    const plan = buildVisitPlan({ arrival: at('2026-09-09T14:45:00'), budget: 90, interest: 'balanced', mobility: 'standard' });
    expect(plan.reachableTours).toHaveLength(0);
    expect(plan.summary).toContain('no tours today');
    expect(plan.steps.some(step => step.kind === 'center')).toBe(true);
  });

  it('builds around the September laser show and identifies the long gap', () => {
    const plan = buildVisitPlan({ arrival: at('2026-09-12T15:00:00'), budget: 'laser', interest: 'family', mobility: 'standard' });
    expect(plan.laserWithinWindow).toBe(true);
    expect(plan.steps.some(step => step.kind === 'laser' && step.start.includes('20:30'))).toBe(true);
    expect(plan.alerts.join(' ')).toContain('Long gap before the laser');
  });

  it('gives a laser-focused evening visitor an outdoor plan after the center closes', () => {
    const plan = buildVisitPlan({ arrival: at('2026-09-09T18:30:00'), budget: 'laser', interest: 'laser', mobility: 'standard' });
    expect(plan.verdict).toBe('GOOD LASER-SHOW PLAN');
    expect(plan.centerMinutesAvailable).toBe(0);
    expect(plan.steps.some(step => step.kind === 'laser')).toBe(true);
  });

  it('refuses to reuse the 2026 schedule in 2027', () => {
    const plan = buildVisitPlan({ arrival: at('2027-07-10T10:00:00'), budget: 180, interest: 'tour', mobility: 'standard' });
    expect(plan.verdict).toBe('SCHEDULE VERIFICATION REQUIRED');
    expect(plan.reachableTours).toHaveLength(0);
  });

  it('marks July 4 as very high estimated visitor pressure without claiming live parking data', () => {
    const plan = buildVisitPlan({ arrival: at('2026-07-04T13:00:00'), budget: 180, interest: 'family', mobility: 'standard' });
    expect(plan.visitorPressure).toBe('VERY HIGH');
    expect(plan.pressureReason).toContain('not a live parking count');
  });
});
