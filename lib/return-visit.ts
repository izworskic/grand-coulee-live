export interface ReturnVisitSnapshot {
  savedAt: number;
  observedAt: string | null;
  lakeFt: number | null;
  outflowKcfs: number | null;
}

export interface ReturnVisitSummary {
  ageHours: number;
  headline: string;
  items: string[];
}

const MIN_RETURN_HOURS = 2;
const MAX_RETURN_HOURS = 14 * 24;
const LAKE_CHANGE_FT = 0.05;
const OUTFLOW_CHANGE_KCFS = 5;

export function buildReturnVisitSummary(
  previous: ReturnVisitSnapshot,
  current: ReturnVisitSnapshot,
  nowMs = Date.now()
): ReturnVisitSummary | null {
  const ageHours = (nowMs - previous.savedAt) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours < MIN_RETURN_HOURS || ageHours > MAX_RETURN_HOURS) return null;

  if (previous.observedAt && current.observedAt && previous.observedAt === current.observedAt) {
    return {
      ageHours,
      headline: 'No new river reading yet',
      items: ['The latest Lake Roosevelt and outflow observation is the same one you saw last time.']
    };
  }

  const items: string[] = [];
  if (previous.lakeFt !== null && current.lakeFt !== null) {
    const delta = current.lakeFt - previous.lakeFt;
    if (Math.abs(delta) >= LAKE_CHANGE_FT) {
      items.push(`Lake Roosevelt is ${Math.abs(delta).toFixed(2)} ft ${delta > 0 ? 'higher' : 'lower'} than when you last checked.`);
    }
  }

  if (previous.outflowKcfs !== null && current.outflowKcfs !== null) {
    const delta = current.outflowKcfs - previous.outflowKcfs;
    if (Math.abs(delta) >= OUTFLOW_CHANGE_KCFS) {
      const pct = previous.outflowKcfs > 0 ? Math.abs(delta / previous.outflowKcfs) * 100 : null;
      items.push(`Outflow is ${Math.abs(delta).toFixed(1)} kcfs ${delta > 0 ? 'higher' : 'lower'}${pct === null ? '' : ` (${pct.toFixed(0)}%)`} than your last check.`);
    }
  }

  if (!items.length) {
    return {
      ageHours,
      headline: 'Not much has changed',
      items: ['Lake Roosevelt and Columbia River outflow are both close to where they were when you last checked.']
    };
  }

  return {
    ageHours,
    headline: items.length > 1 ? 'A few things changed' : 'Since your last check',
    items
  };
}
