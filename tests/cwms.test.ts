import { describe, expect, it } from 'vitest';
import { GCL_CWMS_SERIES, parseCwmsSeries } from '@/lib/data/cwms';

describe('CWMS Grand Coulee adapter', () => {
  it('parses CDA [timestamp, value, quality] tuples and preserves nulls', () => {
    const rows = parseCwmsSeries({
      name: GCL_CWMS_SERIES.totalOutflow,
      units: 'cfs',
      values: [
        [1788912000000, 66700, 0],
        [1788915600000, null, 0],
        [1788919200000, 67125.5, 0]
      ]
    });

    expect(rows).toEqual([
      { timestamp: 1788912000000, value: 66700 },
      { timestamp: 1788915600000, value: null },
      { timestamp: 1788919200000, value: 67125.5 }
    ]);
  });

  it('uses the authoritative Grand Coulee series identifiers published by USACE', () => {
    expect(GCL_CWMS_SERIES).toEqual({
      totalOutflow: 'GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV',
      generationFlow: 'GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV',
      spill: 'GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV',
      forebay: 'GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV',
      tailwater: 'GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV'
    });
  });
});
