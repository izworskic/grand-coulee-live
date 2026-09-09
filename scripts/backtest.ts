import { parseDailyHtml } from '../lib/data/usace';
import { inferredEfficiency, theoreticalHydraulicMW } from '../lib/generation';
import type { DailyObservation } from '../lib/types';

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(values: number[], p: number) {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const i = (s.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

function metrics(actual: number[], estimated: number[]) {
  if (!actual.length) return null;
  const errors = estimated.map((v, i) => v - actual[i]);
  const abs = errors.map(Math.abs);
  const mae = abs.reduce((s, v) => s + v, 0) / abs.length;
  const mape = actual.reduce((s, v, i) => s + Math.abs((v - estimated[i]) / v), 0) / actual.length * 100;
  const bias = errors.reduce((s, v) => s + v, 0) / errors.length;
  return {
    n: actual.length,
    MAE_MW: Number(mae.toFixed(1)),
    MAPE_pct: Number(mape.toFixed(2)),
    bias_MW: Number(bias.toFixed(1)),
    medianAbsError_MW: Number(median(abs).toFixed(1))
  };
}

async function fetchMonth(ago: number) {
  const url = `https://public.crohms.org/dd/nwdp/project_daily/webexec/rep?ago=${ago}&r=gcl`;
  const response = await fetch(url, { headers: { 'User-Agent': 'GrandCouleeLive-backtest/1.0' } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return parseDailyHtml(await response.text());
}

function estimate(day: DailyObservation, efficiency: number) {
  if (day.generationFlowKcfs === null || day.headFt === null) return null;
  return theoreticalHydraulicMW(day.generationFlowKcfs, day.headFt) * efficiency;
}

type Evaluation = {
  date: string;
  actual: number;
  estimated: number;
  flow: number;
  head: number;
  forebay: number | null;
};

async function main() {
  const monthOffsets = Array.from({ length: 13 }, (_, i) => 12 - i);
  const settled = await Promise.allSettled(monthOffsets.map(fetchMonth));
  const months = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const failedMonths = settled.filter(result => result.status === 'rejected').length;
  const rows = [...new Map(months.map(row => [row.date, row])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const valid = rows.filter(row =>
    row.averageGenerationMW !== null && row.averageGenerationMW > 0 &&
    row.generationFlowKcfs !== null && row.generationFlowKcfs > 0 &&
    row.headFt !== null && row.headFt > 0 &&
    inferredEfficiency(row) !== null
  );

  const evaluation: Evaluation[] = [];
  for (let i = 14; i < valid.length; i++) {
    const target = valid[i];
    const historicalEfficiencies = valid
      .slice(0, i)
      .map(inferredEfficiency)
      .filter((value): value is number => value !== null);
    const rolling = median(historicalEfficiencies.slice(-14));
    const predicted = estimate(target, rolling);
    if (predicted === null) continue;
    evaluation.push({
      date: target.date,
      actual: target.averageGenerationMW!,
      estimated: predicted,
      flow: target.generationFlowKcfs!,
      head: target.headFt!,
      forebay: target.forebayFt
    });
  }

  if (!evaluation.length) throw new Error('Not enough complete USACE daily generation rows to backtest.');

  const allActual = evaluation.map(row => row.actual);
  const allEstimated = evaluation.map(row => row.estimated);
  const flows = evaluation.map(row => row.flow);
  const q33 = percentile(flows, 1 / 3);
  const q67 = percentile(flows, 2 / 3);

  const regimes = {
    lowFlow: evaluation.filter(row => row.flow <= q33),
    mediumFlow: evaluation.filter(row => row.flow > q33 && row.flow <= q67),
    highFlow: evaluation.filter(row => row.flow > q67)
  };

  const result = {
    sourceMonthsRequested: monthOffsets.length,
    sourceMonthsFailed: failedMonths,
    sourceRows: rows.length,
    completeRows: valid.length,
    evaluationWindow: {
      first: evaluation[0].date,
      last: evaluation[evaluation.length - 1].date
    },
    ranges: {
      generationFlowKcfs: [Number(Math.min(...flows).toFixed(1)), Number(Math.max(...flows).toFixed(1))],
      headFt: [Number(Math.min(...evaluation.map(row => row.head)).toFixed(1)), Number(Math.max(...evaluation.map(row => row.head)).toFixed(1))],
      forebayFt: [
        Number(Math.min(...evaluation.map(row => row.forebay).filter((v): v is number => v !== null)).toFixed(1)),
        Number(Math.max(...evaluation.map(row => row.forebay).filter((v): v is number => v !== null)).toFixed(1))
      ]
    },
    overall: metrics(allActual, allEstimated),
    flowRegimes: Object.fromEntries(Object.entries(regimes).map(([name, subset]) => [name, {
      flowRangeKcfs: subset.length ? [Number(Math.min(...subset.map(row => row.flow)).toFixed(1)), Number(Math.max(...subset.map(row => row.flow)).toFixed(1))] : null,
      metrics: metrics(subset.map(row => row.actual), subset.map(row => row.estimated))
    }]))
  };

  console.log(JSON.stringify(result, null, 2));

  if ((result.overall?.MAPE_pct ?? Infinity) > 8) {
    throw new Error(`Overall generation MAPE ${result.overall?.MAPE_pct}% exceeds the 8% target.`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
