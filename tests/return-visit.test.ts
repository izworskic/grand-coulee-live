import { describe, expect, it } from 'vitest';
import { buildReturnVisitSummary } from '@/lib/return-visit';

const now = Date.UTC(2026, 8, 9, 15, 0, 0);

function snap(overrides: Partial<{ savedAt:number; observedAt:string|null; lakeFt:number|null; outflowKcfs:number|null }> = {}) {
  return {
    savedAt: now - 24 * 3_600_000,
    observedAt: '2026-09-08T15:00:00Z',
    lakeFt: 1278.2,
    outflowKcfs: 60,
    ...overrides
  };
}

describe('repeat visit summary', () => {
  it('stays hidden for same-session refreshes', () => {
    const previous = snap({ savedAt: now - 60 * 60_000 });
    expect(buildReturnVisitSummary(previous, snap({ savedAt: now }), now)).toBeNull();
  });

  it('reports meaningful lake and outflow changes', () => {
    const summary = buildReturnVisitSummary(
      snap(),
      snap({ savedAt: now, observedAt: '2026-09-09T15:00:00Z', lakeFt: 1278.38, outflowKcfs: 48 }),
      now
    );
    expect(summary?.headline).toBe('A few things changed');
    expect(summary?.items.join(' ')).toMatch(/0\.18 ft higher/);
    expect(summary?.items.join(' ')).toMatch(/12\.0 kcfs lower/);
  });

  it('says when nothing meaningful changed', () => {
    const summary = buildReturnVisitSummary(
      snap(),
      snap({ savedAt: now, observedAt: '2026-09-09T15:00:00Z', lakeFt: 1278.22, outflowKcfs: 62 }),
      now
    );
    expect(summary?.headline).toBe('Not much has changed');
  });

  it('identifies when there is no newer observation', () => {
    const summary = buildReturnVisitSummary(snap(), snap({ savedAt: now }), now);
    expect(summary?.headline).toBe('No new river reading yet');
  });

  it('does not compare against very old visits', () => {
    const previous = snap({ savedAt: now - 20 * 24 * 3_600_000 });
    expect(buildReturnVisitSummary(previous, snap({ savedAt: now }), now)).toBeNull();
  });
});
