import { parseDailyHtml } from '../lib/data/usace';
import { inferredEfficiency, theoreticalHydraulicMW } from '../lib/generation';
import type { DailyObservation } from '../lib/types';

function median(values: number[]) { const s = [...values].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; }
function mae(errors: number[]) { return errors.reduce((s,v)=>s+Math.abs(v),0)/errors.length; }
function mape(actual: number[], estimated: number[]) { return actual.reduce((s,v,i)=>s+Math.abs((v-estimated[i])/v),0)/actual.length*100; }

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

async function main() {
  const months = (await Promise.allSettled([5,4,3,2,1,0].map(fetchMonth))).flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const rows = [...new Map(months.map(row => [row.date,row])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  const valid = rows.filter(row => row.averageGenerationMW && row.generationFlowKcfs && row.headFt && inferredEfficiency(row));
  const candidates = { fixed90: [] as number[], median7: [] as number[], median14: [] as number[] };
  const actual: number[] = [];
  for (let i=14;i<valid.length;i++) {
    const target = valid[i];
    const efficiencies = valid.slice(0,i).map(inferredEfficiency).filter((v):v is number => v !== null);
    const e7 = median(efficiencies.slice(-7));
    const e14 = median(efficiencies.slice(-14));
    const a = target.averageGenerationMW!;
    const p0 = estimate(target,.90), p7 = estimate(target,e7), p14 = estimate(target,e14);
    if ([p0,p7,p14].some(v=>v===null)) continue;
    actual.push(a); candidates.fixed90.push(p0!); candidates.median7.push(p7!); candidates.median14.push(p14!);
  }
  if (!actual.length) throw new Error('Not enough complete USACE daily generation rows to backtest.');
  for (const [name, estimates] of Object.entries(candidates)) {
    const errors = estimates.map((v,i)=>v-actual[i]);
    console.log(name, { n: actual.length, MAE_MW: mae(errors).toFixed(1), MAPE_pct: mape(actual,estimates).toFixed(2), bias_MW: (errors.reduce((s,v)=>s+v,0)/errors.length).toFixed(1), medianAbsError_MW: median(errors.map(Math.abs)).toFixed(1) });
  }
}

main().catch(error => { console.error(error); process.exit(1); });
