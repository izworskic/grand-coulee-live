import { describe, expect, it } from 'vitest';
import { capacityBreakdownMW, GRAND_COULEE_ENGINEERING } from '@/lib/engineering';

describe('verified Grand Coulee engineering facts', () => {
  it('powerhouse capacity breakdown reconciles to Reclamation total', () => {
    expect(capacityBreakdownMW()).toBe(GRAND_COULEE_ENGINEERING.generation.totalMW);
    expect(GRAND_COULEE_ENGINEERING.generation.totalMW).toBe(6809);
  });

  it('keeps spillway and generator counts in one source-controlled configuration', () => {
    expect(GRAND_COULEE_ENGINEERING.spillway.drumGates).toBe(11);
    expect(GRAND_COULEE_ENGINEERING.generation.leftMainGenerators).toBe(9);
    expect(GRAND_COULEE_ENGINEERING.generation.rightMainGenerators).toBe(9);
    expect(GRAND_COULEE_ENGINEERING.generation.thirdPowerPlantGenerators).toBe(6);
    expect(GRAND_COULEE_ENGINEERING.generation.pumpGenerators).toBe(6);
  });
});
