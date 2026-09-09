import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { getVisitorStatus } from '@/lib/data/reclamation';

const zone = 'America/Los_Angeles';

describe('2026 visitor schedule', () => {
  it('finds a Friday tour and September laser show', () => {
    const status = getVisitorStatus(DateTime.fromISO('2026-09-11T12:15:00', { zone }), true);
    expect(status.toursToday).toContain('1:00 PM');
    expect(status.nextTourDetail).toContain('1:00 PM');
    expect(status.laserStatus).toBe('tonight');
    expect(status.laserDetail).toContain('8:30 PM');
  });

  it('does not invent tours on a Tuesday', () => {
    const status = getVisitorStatus(DateTime.fromISO('2026-09-08T12:15:00', { zone }), true);
    expect(status.toursToday).toHaveLength(0);
    expect(status.nextTourDetail).toContain('Friday');
  });

  it('refuses to reuse 2026 schedule in 2027', () => {
    const status = getVisitorStatus(DateTime.fromISO('2027-06-01T12:00:00', { zone }), true);
    expect(status.scheduleYearVerified).toBe(false);
    expect(status.laserStatus).toBe('unknown');
  });
});
