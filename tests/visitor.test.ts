import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { getVisitorStatus } from '@/lib/data/reclamation';

const zone = 'America/Los_Angeles';
const at = (iso: string) => DateTime.fromISO(iso, { zone });

describe('2026 visitor schedule', () => {
  it('finds a Friday tour and September laser show', () => {
    const status = getVisitorStatus(at('2026-09-11T12:15:00'), true);
    expect(status.toursToday).toContain('1:00 PM');
    expect(status.nextTourDetail).toContain('1:00 PM');
    expect(status.laserStatus).toBe('tonight');
    expect(status.laserDetail).toContain('8:30 PM');
  });

  it('does not invent tours on a Tuesday and finds the next Friday', () => {
    const status = getVisitorStatus(at('2026-09-08T12:15:00'), true);
    expect(status.toursToday).toHaveLength(0);
    expect(status.nextTourDetail).toContain('Friday');
    expect(status.nextTourDetail).toContain('9:00 AM');
  });

  it('shows the first tour before opening-day departures begin', () => {
    const status = getVisitorStatus(at('2026-05-22T08:45:00'), true);
    expect(status.toursToday[0]).toBe('9:00 AM');
    expect(status.nextTourDetail).toContain('9:00 AM');
  });

  it('moves to the next departure between tours', () => {
    const status = getVisitorStatus(at('2026-06-12T10:15:00'), true);
    expect(status.nextTourDetail).toContain('11:00 AM');
  });

  it('does not repeat a finished departure after the final tour', () => {
    const status = getVisitorStatus(at('2026-06-12T15:30:00'), true);
    expect(status.nextTourDetail).not.toContain('3:00 PM ·');
    expect(status.nextTourDetail).toContain('Saturday');
    expect(status.nextTourDetail).toContain('9:00 AM');
  });

  it('includes tours on the final day of the verified season', () => {
    const status = getVisitorStatus(at('2026-10-31T10:30:00'), true);
    expect(status.toursToday).toHaveLength(6);
    expect(status.nextTourDetail).toContain('11:00 AM');
  });

  it('does not invent a next tour after the verified tour season', () => {
    const status = getVisitorStatus(at('2026-11-01T12:00:00'), true);
    expect(status.toursToday).toHaveLength(0);
    expect(status.nextTour).toBeNull();
    expect(status.nextTourDetail).toBe('No tours today.');
  });

  it('uses the July 10 PM laser schedule', () => {
    const status = getVisitorStatus(at('2026-07-15T20:00:00'), true);
    expect(status.laserStatus).toBe('tonight');
    expect(status.laserDetail).toContain('10:00 PM');
  });

  it('switches to 9:30 PM in August', () => {
    const status = getVisitorStatus(at('2026-08-01T20:00:00'), true);
    expect(status.laserStatus).toBe('tonight');
    expect(status.laserDetail).toContain('9:30 PM');
  });

  it('switches to 8:30 PM in September', () => {
    const status = getVisitorStatus(at('2026-09-01T19:00:00'), true);
    expect(status.laserStatus).toBe('tonight');
    expect(status.laserDetail).toContain('8:30 PM');
  });

  it('runs on the final published laser night and ends afterward', () => {
    const before = getVisitorStatus(at('2026-09-30T19:00:00'), true);
    const after = getVisitorStatus(at('2026-09-30T21:15:00'), true);
    expect(before.laserStatus).toBe('tonight');
    expect(after.laserStatus).toBe('completed');
  });

  it('is off-season after the final published laser night', () => {
    const status = getVisitorStatus(at('2026-10-01T19:00:00'), true);
    expect(status.laserStatus).toBe('off-season');
    expect(status.laserTime).toBeNull();
  });

  it('opens and closes the Visitor Center in Pacific time', () => {
    const before = getVisitorStatus(at('2026-06-10T08:15:00'), true);
    const open = getVisitorStatus(at('2026-06-10T08:45:00'), true);
    const after = getVisitorStatus(at('2026-06-10T17:05:00'), true);
    expect(before.visitorCenterStatus).toBe('closed');
    expect(before.visitorCenterDetail).toContain('8:30 AM');
    expect(open.visitorCenterStatus).toBe('open');
    expect(open.visitorCenterDetail).toContain('5:00 PM');
    expect(after.visitorCenterStatus).toBe('closed');
  });

  it('closes the Visitor Center on Thanksgiving', () => {
    const status = getVisitorStatus(at('2026-11-26T12:00:00'), true);
    expect(status.visitorCenterStatus).toBe('closed');
    expect(status.visitorCenterDetail).toContain('federal holiday');
  });

  it('closes the Visitor Center on New Year’s Day and Christmas', () => {
    expect(getVisitorStatus(at('2026-01-01T12:00:00'), true).visitorCenterStatus).toBe('closed');
    expect(getVisitorStatus(at('2026-12-25T12:00:00'), true).visitorCenterStatus).toBe('closed');
  });

  it('retains Pacific local-hour behavior across daylight-saving periods', () => {
    const summer = getVisitorStatus(at('2026-06-15T09:00:00'), true);
    const winter = getVisitorStatus(at('2026-12-15T09:00:00'), true);
    expect(summer.visitorCenterStatus).toBe('open');
    expect(winter.visitorCenterStatus).toBe('open');
  });

  it('preserves source-health state without inventing a schedule failure', () => {
    const status = getVisitorStatus(at('2026-09-11T12:15:00'), false);
    expect(status.scheduleYearVerified).toBe(true);
    expect(status.sourcesHealthy).toBe(false);
  });

  it('refuses to reuse the 2026 schedule in 2027', () => {
    const status = getVisitorStatus(at('2027-06-01T12:00:00'), true);
    expect(status.scheduleYearVerified).toBe(false);
    expect(status.visitorCenterStatus).toBe('unknown');
    expect(status.nextTour).toBeNull();
    expect(status.laserStatus).toBe('unknown');
  });
});
