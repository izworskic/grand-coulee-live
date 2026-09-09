import { DateTime } from 'luxon';
import { getVisitDaySchedule } from '@/lib/data/reclamation';
import { ZONE } from '@/lib/data/usace';

export type VisitInterest = 'balanced' | 'tour' | 'family' | 'engineering' | 'history' | 'photos' | 'laser';
export type VisitBudget = 45 | 90 | 180 | 240 | 'laser';
export type MobilityPreference = 'standard' | 'minimize-walking';

export interface VisitPlanInput {
  arrival: DateTime;
  budget: VisitBudget;
  interest: VisitInterest;
  mobility: MobilityPreference;
}

export interface VisitPlanStep {
  start: string;
  end: string;
  title: string;
  detail: string;
  kind: 'tour' | 'center' | 'view' | 'context' | 'break' | 'laser';
}

export interface VisitPlan {
  verdict: string;
  summary: string;
  windowEnd: string;
  totalWindowMinutes: number;
  centerMinutesAvailable: number;
  reachableTours: string[];
  laserWithinWindow: boolean;
  visitorPressure: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH';
  pressureReason: string;
  steps: VisitPlanStep[];
  alerts: string[];
}

const mins = (a: DateTime, b: DateTime) => Math.max(0, Math.round(b.diff(a, 'minutes').minutes));
const maxDt = (a: DateTime, b: DateTime) => a > b ? a : b;
const minDt = (a: DateTime, b: DateTime) => a < b ? a : b;

function iso(dt: DateTime) {
  return dt.toISO() ?? '';
}

function addStep(steps: VisitPlanStep[], start: DateTime, end: DateTime, title: string, detail: string, kind: VisitPlanStep['kind']) {
  if (end <= start || mins(start, end) < 8) return;
  steps.push({ start: iso(start), end: iso(end), title, detail, kind });
}

function pressure(arrival: DateTime, hasTours: boolean, hasLaser: boolean) {
  let score = 0;
  const reasons: string[] = [];
  if ([6, 7].includes(arrival.weekday)) { score += 2; reasons.push('weekend'); }
  if (hasTours) { score += 1; reasons.push('tour day'); }
  if (hasLaser) { score += 1; reasons.push('laser-show night'); }
  if ([6, 7, 8].includes(arrival.month)) { score += 1; reasons.push('summer season'); }
  if (arrival.hour >= 10 && arrival.hour < 16) { score += 1; reasons.push('midday arrival'); }
  if (arrival.month === 7 && arrival.day === 4) { score += 4; reasons.push('July 4'); }
  const level: VisitPlan['visitorPressure'] = score >= 7 ? 'VERY HIGH' : score >= 4 ? 'HIGH' : score >= 2 ? 'MODERATE' : 'LOW';
  return { level, reason: reasons.length ? `Estimated from ${reasons.join(', ')}; this is not a live parking count.` : 'Few schedule-based crowd signals; this is not a live parking count.' };
}

function titleForInterest(interest: VisitInterest) {
  if (interest === 'engineering') return 'Live dam briefing';
  if (interest === 'history') return 'Interpret the dam before you look around';
  if (interest === 'photos') return 'Public-viewpoint photo stop';
  if (interest === 'family') return 'Family orientation';
  return 'Understand what you are looking at';
}

export function buildVisitPlan(input: VisitPlanInput): VisitPlan {
  const arrival = input.arrival.setZone(ZONE);
  const schedule = getVisitDaySchedule(arrival);
  const laser = schedule.laserAt ? DateTime.fromISO(schedule.laserAt, { setZone: true }).setZone(ZONE) : null;
  const numericBudget = input.budget === 'laser' ? null : input.budget;
  const fallbackEnd = arrival.plus({ minutes: numericBudget ?? 180 });
  const windowEnd = input.budget === 'laser' && laser && laser > arrival ? laser.plus({ minutes: schedule.laserDurationMinutes }) : fallbackEnd;
  const totalWindowMinutes = mins(arrival, windowEnd);

  if (!schedule.verified) {
    return {
      verdict: 'SCHEDULE VERIFICATION REQUIRED',
      summary: 'The published visitor schedule is not verified for this calendar year. Use the live dam and exterior-viewing information, but verify tours, Visitor Center hours and laser timing with Reclamation before making the trip.',
      windowEnd: iso(windowEnd),
      totalWindowMinutes,
      centerMinutesAvailable: 0,
      reachableTours: [],
      laserWithinWindow: false,
      visitorPressure: 'LOW',
      pressureReason: 'Visitor-pressure estimate withheld because the schedule year is unverified.',
      steps: [],
      alerts: ['Verify the current-year schedule with the Bureau of Reclamation before relying on tour or laser timing.']
    };
  }

  const centerOpen = schedule.visitorCenterOpenAt ? DateTime.fromISO(schedule.visitorCenterOpenAt, { setZone: true }).setZone(ZONE) : null;
  const centerClose = schedule.visitorCenterCloseAt ? DateTime.fromISO(schedule.visitorCenterCloseAt, { setZone: true }).setZone(ZONE) : null;
  const centerStart = centerOpen ? maxDt(arrival, centerOpen) : null;
  const centerEnd = centerClose ? minDt(windowEnd, centerClose) : null;
  const centerMinutesAvailable = centerStart && centerEnd && centerEnd > centerStart ? mins(centerStart, centerEnd) : 0;

  const departures = schedule.tourDepartures.map(value => DateTime.fromISO(value, { setZone: true }).setZone(ZONE));
  const reachable = departures.filter(dep => dep >= arrival && dep.plus({ minutes: schedule.tourDurationMinutes }) <= windowEnd);
  const realisticallyReachable = reachable.filter(dep => dep.diff(arrival, 'minutes').minutes >= 15);
  const laserWithinWindow = Boolean(laser && laser >= arrival && laser.plus({ minutes: schedule.laserDurationMinutes }) <= windowEnd);
  const crowd = pressure(arrival, departures.length > 0, Boolean(laser));
  const alerts: string[] = [];
  const steps: VisitPlanStep[] = [];

  const tourPriority = ['tour', 'engineering', 'family'].includes(input.interest);
  let selectedTour = (tourPriority ? realisticallyReachable : realisticallyReachable.filter(dep => dep.diff(arrival, 'minutes').minutes >= 35))[0] ?? null;
  if (input.budget === 45) selectedTour = null;

  if (input.interest === 'tour' && !departures.length) alerts.push('No public tours are scheduled for this day under the verified 2026 schedule.');
  if (input.interest === 'tour' && departures.length && !selectedTour) alerts.push('A tour is scheduled today, but none fits comfortably inside the selected arrival window.');
  if (selectedTour) {
    alerts.push('Tour readiness: first come, first served; capacity is limited. Leave purses, backpacks, fanny packs and packages in the vehicle, and allow time for security screening.');
  }
  if (input.mobility === 'minimize-walking') alerts.push('Mobility preference applied: the plan favors the Visitor Center and public viewing areas and leaves extra transition time. Verify tour accommodations with Reclamation if needed.');
  if (laser && centerClose && laser > centerClose && mins(centerClose, laser) >= 120 && windowEnd >= laser) {
    alerts.push(`Long gap before the laser: about ${(mins(centerClose, laser) / 60).toFixed(1)} hours after the Visitor Center closes. Leaving the immediate dam area and returning later is usually the easier plan.`);
  }

  const orientationMinutes = input.mobility === 'minimize-walking' ? 20 : 15;
  const viewMinutes = input.mobility === 'minimize-walking' ? 25 : input.interest === 'photos' ? 40 : 30;
  const centerDesired = input.interest === 'history' ? 60 : input.interest === 'family' ? 45 : 40;
  let cursor = arrival;
  let centerDone = false;
  let viewDone = false;

  const addOrientation = (limit: DateTime) => {
    const end = minDt(limit, cursor.plus({ minutes: orientationMinutes }));
    addStep(steps, cursor, end, titleForInterest(input.interest), input.interest === 'engineering'
      ? 'Use Grand Coulee Live to identify the spillway, powerhouse blocks, Lake Roosevelt level, current outflow and the operating data that are actually available today.'
      : 'Use the live tool and interactive dam photograph to understand the layout before walking the public areas.', 'context');
    cursor = end;
  };

  const addCenter = (limit: DateTime) => {
    if (!centerOpen || !centerClose || centerDone) return;
    const start = maxDt(cursor, centerOpen);
    const availableEnd = minDt(limit, centerClose);
    if (availableEnd <= start || mins(start, availableEnd) < 20) return;
    const end = minDt(availableEnd, start.plus({ minutes: centerDesired }));
    addStep(steps, start, end, 'Grand Coulee Visitor Center', input.interest === 'history'
      ? 'Prioritize the exhibits that explain construction, irrigation, hydropower, Native perspectives and the project’s ecological and cultural consequences.'
      : input.interest === 'family'
        ? 'Start with exhibits and orientation while everyone is fresh; use this as the indoor anchor for the visit.'
        : 'Use the exhibits to put the scale, power system and Columbia Basin Project into context.', 'center');
    cursor = end;
    centerDone = true;
  };

  const addView = (limit: DateTime) => {
    if (viewDone) return;
    const end = minDt(limit, cursor.plus({ minutes: viewMinutes }));
    addStep(steps, cursor, end, input.interest === 'photos' ? 'Photograph from public viewing areas' : 'Exterior dam view', input.interest === 'photos'
      ? 'Use the public viewing areas and the live conditions to decide what is visually interesting today. Do not enter restricted operating areas.'
      : 'Step outside to connect the structures in the interactive photograph with the real dam and river.', 'view');
    cursor = end;
    viewDone = true;
  };

  if (selectedTour) {
    const minutesUntilTour = mins(arrival, selectedTour);
    if (tourPriority && minutesUntilTour <= 45) {
      if (minutesUntilTour >= 15) addStep(steps, arrival, selectedTour, 'Go directly to tour parking / check-in', 'Protect the scarce part of the visit first. The tour is first come, first served, so do not spend this buffer browsing the Visitor Center.', 'context');
      cursor = selectedTour;
    } else {
      const preTourLimit = selectedTour.minus({ minutes: 15 });
      if (centerMinutesAvailable >= 25 && centerOpen && cursor < preTourLimit) addCenter(preTourLimit);
      if (cursor < preTourLimit) addOrientation(preTourLimit);
      if (cursor < selectedTour) addStep(steps, cursor, selectedTour, 'Move to tour check-in', 'Use this buffer for parking, security screening and boarding.', 'context');
      cursor = selectedTour;
    }
    const tourEnd = selectedTour.plus({ minutes: schedule.tourDurationMinutes });
    addStep(steps, selectedTour, tourEnd, 'John W. Keys III Pump-Generating Plant tour', 'Free guided tour, approximately one hour, with security screening and bus transportation. This is the scarce scheduled experience, so the itinerary is built around it.', 'tour');
    cursor = tourEnd;
  }

  const preLaserLimit = laserWithinWindow && laser ? laser : windowEnd;
  if (!centerDone && cursor < preLaserLimit) addCenter(preLaserLimit);
  if (!viewDone && cursor < preLaserLimit) addView(preLaserLimit);
  if (cursor < preLaserLimit && mins(cursor, preLaserLimit) >= orientationMinutes) addOrientation(preLaserLimit);

  if (laserWithinWindow && laser) {
    if (cursor < laser && mins(cursor, laser) >= 90) {
      const returnAt = laser.minus({ minutes: 30 });
      addStep(steps, cursor, returnAt, 'Meal / rest / local break', 'There is enough dead time that waiting at the dam is not the efficient choice. Leave the immediate visitor area and return before the show.', 'break');
      cursor = returnAt;
    }
    if (cursor < laser) addStep(steps, cursor, laser, 'Settle into the public laser-show viewing area', 'Use the remaining time for restrooms, orientation and finding a comfortable viewing position.', 'view');
    addStep(steps, laser, minDt(windowEnd, laser.plus({ minutes: schedule.laserDurationMinutes })), 'One River, Many Voices', 'Approximately 30 minutes. It is an interpretive presentation projected across the dam, not simply a music-and-light spectacle.', 'laser');
  }

  if (!steps.length) {
    addStep(steps, arrival, windowEnd, 'Exterior self-guided visit', 'Use the live tool, interactive dam photograph and public viewpoints. Scheduled visitor facilities do not fit this arrival window.', 'view');
  }

  let verdict = 'GOOD SELF-GUIDED VISIT';
  if (selectedTour && tourPriority && mins(arrival, selectedTour) <= 45) verdict = 'GO TO TOUR PARKING FIRST';
  else if (selectedTour) verdict = 'GOOD FULL VISIT WINDOW';
  else if (laserWithinWindow && input.interest === 'laser') verdict = 'GOOD LASER-SHOW PLAN';
  else if (centerMinutesAvailable >= 35) verdict = totalWindowMinutes <= 60 ? 'SHORT VISIT — USE YOUR TIME CAREFULLY' : 'GOOD TIME TO VISIT';
  else if (laser && laser > arrival && input.interest === 'laser') verdict = 'COME LATER FOR THE LASER';
  else if (schedule.visitorCenterClosedHoliday) verdict = 'OUTDOOR VISIT ONLY TODAY';
  else if (arrival.hour >= 17) verdict = laser && laser > arrival ? 'OUTDOOR VISIT BEFORE THE LASER' : 'OUTDOOR VIEWING ONLY';

  const summaryParts = [`${totalWindowMinutes} minutes available`];
  if (centerMinutesAvailable) summaryParts.push(`${centerMinutesAvailable} min of Visitor Center time fits`);
  if (realisticallyReachable.length) summaryParts.push(`${realisticallyReachable.length} tour${realisticallyReachable.length === 1 ? '' : 's'} fit the window`);
  if (laserWithinWindow) summaryParts.push('laser show fits');
  if (!departures.length) summaryParts.push('no tours today');

  return {
    verdict,
    summary: summaryParts.join(' · '),
    windowEnd: iso(windowEnd),
    totalWindowMinutes,
    centerMinutesAvailable,
    reachableTours: realisticallyReachable.map(iso),
    laserWithinWindow,
    visitorPressure: crowd.level,
    pressureReason: crowd.reason,
    steps,
    alerts
  };
}
