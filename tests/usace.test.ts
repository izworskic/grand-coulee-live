import { describe, expect, it } from 'vitest';
import { parseDailyHtml, parseHourlyHtml } from '@/lib/data/usace';

const hourly = `<html><body><h2>Tuesday July 7, 2026</h2><table><tr><th>Hour</th></tr><tr><td>1</td><td>76.00</td><td>75.80</td><td>0.20</td><td>1287.90</td><td>958.10</td><td>329.80</td></tr><tr><td>2</td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>AVG</td><td>76</td></tr></table></body></html>`;
const daily = `<html><body><h2>July 2026</h2><table><tr><th>Day</th></tr><tr><td>1</td><td>80138</td><td>3339</td><td>203</td><td>144.60</td><td>135.80</td><td>135.70</td><td>0.10</td><td>1285.70</td><td>1285.60</td><td>964.28</td><td>321.32</td><td>7.63</td><td>5239</td><td>1568.86</td></tr></table></body></html>`;

describe('USACE parsers', () => {
  it('parses valid hourly rows and ignores blank/stat rows', () => {
    const rows = parseHourlyHtml(hourly);
    expect(rows).toHaveLength(1);
    expect(rows[0].spillKcfs).toBe(.2);
    expect(rows[0].forebayFt).toBe(1287.9);
  });

  it('parses all Grand Coulee daily columns', () => {
    const rows = parseDailyHtml(daily);
    expect(rows).toHaveLength(1);
    expect(rows[0].averageGenerationMW).toBe(3339);
    expect(rows[0].banksLakePumpKcfs).toBe(7.63);
    expect(rows[0].banksLakeElevationFt).toBe(1568.86);
  });
});
