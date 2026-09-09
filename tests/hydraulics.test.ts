import { describe, expect, it } from 'vitest';
import { estimateHeadFromRatingCurve, estimateTailwaterFromOutflow } from '@/lib/hydraulics';

describe('Grand Coulee tailwater rating curve', () => {
  it('interpolates between published USACE rating points', () => {
    expect(estimateTailwaterFromOutflow(87.5)).toBeCloseTo(959.575, 3);
    expect(estimateTailwaterFromOutflow(150)).toBeCloseTo(965.2, 3);
  });

  it('derives an estimated head without extrapolating outside the published curve', () => {
    expect(estimateHeadFromRatingCurve(1278.5, 87.5)).toBeCloseTo(318.925, 3);
    expect(estimateTailwaterFromOutflow(1001)).toBeNull();
    expect(estimateHeadFromRatingCurve(null, 87.5)).toBeNull();
  });
});
