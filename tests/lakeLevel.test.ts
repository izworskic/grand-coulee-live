import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { parseLakeLevelForecast } from '@/lib/data/lakeLevel';

const fixture = `
<html><body>
<h2>Lake Roosevelt Water Level</h2>
<p>The elevation of Lake Roosevelt was 1276.7 feet above sea level at midnight on September 2, 2026. The forecasted midnight elevations from September 3 to September 12 are as follows:</p>
<table><tr><th>9/03</th><th>9/04</th><th>9/05</th></tr><tr><td>1276.7</td><td>1276.6</td><td>1276.8</td></tr></table>
<p>The water level information provided on this page is only a prediction.</p>
</body></html>`;

describe('Bureau of Reclamation Lake Roosevelt forecast', () => {
  it('parses observed context and forecast points', () => {
    const parsed = parseLakeLevelForecast(fixture, DateTime.fromISO('2026-09-03T12:00:00', { zone: 'America/Los_Angeles' }));
    expect(parsed.sourceObservedDate).toBe('2026-09-02');
    expect(parsed.sourceObservedElevationFt).toBe(1276.7);
    expect(parsed.forecast).toHaveLength(3);
    expect(parsed.forecast[2]).toEqual({ date: '2026-09-05', elevationFt: 1276.8 });
    expect(parsed.nextForecast).toEqual({ date: '2026-09-03', elevationFt: 1276.7 });
  });

  it('selects the next available forecast relative to local Pacific date', () => {
    const parsed = parseLakeLevelForecast(fixture, DateTime.fromISO('2026-09-04T18:00:00', { zone: 'America/Los_Angeles' }));
    expect(parsed.nextForecast?.date).toBe('2026-09-04');
    expect(parsed.finalForecast?.date).toBe('2026-09-05');
  });
});
