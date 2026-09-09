import { describe, expect, it } from 'vitest';
import { parseDartGrandCouleeDailyHtml } from '@/lib/data/dart';

describe('DART Grand Coulee daily parser', () => {
  it('parses dated daily spill and spill percent without treating it as hourly data', () => {
    const html = `
      <html><body>
        <table>
          <tr><th>Date</th><th>Inflow (kcfs)</th><th>Outflow (kcfs)</th><th>Spill (kcfs)</th><th>Spill Percent</th><th>Elevation (ft)</th></tr>
          <tr><td>9/7</td><td>65.2</td><td>58.1</td><td>2.4</td><td>4.13%</td><td>1277.8</td></tr>
          <tr><td>9/8</td><td>63.3</td><td>55.2</td><td>0.0</td><td>0.00%</td><td>1278.4</td></tr>
        </table>
      </body></html>`;

    expect(parseDartGrandCouleeDailyHtml(html, 2026)).toEqual([
      { date: '2026-09-07', inflowKcfs: 65.2, outflowKcfs: 58.1, spillKcfs: 2.4, spillPercent: 4.13, elevationFt: 1277.8 },
      { date: '2026-09-08', inflowKcfs: 63.3, outflowKcfs: 55.2, spillKcfs: 0, spillPercent: 0, elevationFt: 1278.4 }
    ]);
  });

  it('throws on the DART nightly backup page so it cannot be cached as valid data', () => {
    expect(() => parseDartGrandCouleeDailyHtml('<h1>DART Queries are Temporarily Unavailable</h1>', 2026)).toThrow(/temporarily unavailable/i);
  });

  it('ignores unrelated tables', () => {
    expect(parseDartGrandCouleeDailyHtml('<table><tr><th>Name</th><th>Value</th></tr><tr><td>foo</td><td>2</td></tr></table>', 2026)).toEqual([]);
  });
});
