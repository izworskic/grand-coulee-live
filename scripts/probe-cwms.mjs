const root = 'https://cwms-data.usace.army.mil/cwms-data';
const base = `${root}/timeseries`;
const office = 'NWDP';

const probes = [
  ['totalOutflow REV', 'GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['totalOutflow RAW', 'GCL.Flow-Out.Ave.1Hour.1Hour.CBT-RAW', 'cfs'],
  ['generationFlow REV', 'GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['generationFlow RAW', 'GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-RAW', 'cfs'],
  ['spill REV', 'GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['spill RAW', 'GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-RAW', 'cfs'],
  ['forebay REV', 'GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV', 'ft'],
  ['forebay RAW', 'GCL.Elev-Forebay.Inst.1Hour.0.CBT-RAW', 'ft'],
  ['tailwater REV', 'GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV', 'ft'],
  ['tailwater RAW', 'GCL.Elev-Tailwater.Inst.1Hour.0.CBT-RAW', 'ft'],
  ['power instant REV', 'GCL.Power-Total.Inst.0.0.CBT-REV', 'MW'],
  ['power instant RAW', 'GCL.Power-Total.Inst.0.0.CBT-RAW', 'MW'],
  ['power hourly REV', 'GCL.Power.Total.1Hour.1Hour.CBT-REV', 'MW'],
  ['power hourly RAW', 'GCL.Power.Total.1Hour.1Hour.CBT-RAW', 'MW'],
  ['available capacity REV', 'GCL.Power-Capacity-Avail.Total.1Hour.1Hour.CBT-REV', 'MW'],
  ['gates open REV', 'GCL.Count-Gates-Open.Inst.1Hour.0.CBT-REV', 'unit']
];

const headers = { Accept: 'application/json;version=2' };
const end = new Date();
const begin = new Date(end.getTime() - 24 * 60 * 60 * 1000);

async function inspectCatalog() {
  const url = `${root}/catalog/timeseries?office=${office}&like=${encodeURIComponent('GCL.*')}&page-size=500`;
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      console.log(`catalog: HTTP ${response.status}`);
      return [];
    }
    const payload = await response.json();
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const names = entries
      .map(entry => entry?.name)
      .filter(name => typeof name === 'string' && name.startsWith('GCL.'))
      .sort();
    console.log(`GCL catalog entries (${names.length}):`);
    for (const name of names) console.log(`  ${name}`);
    return names;
  } catch (error) {
    console.log(`catalog: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function probe(label, name, unit) {
  const params = new URLSearchParams({
    name,
    office,
    begin: begin.toISOString(),
    end: end.toISOString(),
    timezone: 'UTC',
    'page-size': '500'
  });
  if (unit !== 'unit') params.set('unit', unit);

  try {
    const response = await fetch(`${base}?${params}`, { headers, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 220)}`);
    const payload = await response.json();
    const valid = Array.isArray(payload.values)
      ? payload.values.filter(row => Array.isArray(row) && typeof row[0] === 'number' && typeof row[1] === 'number')
      : [];
    if (!valid.length) {
      console.log(`${label}: NO NUMERIC VALUES (response units: ${payload.units ?? 'unknown'})`);
      return { label, name, ok: false, empty: true };
    }
    const latest = valid[valid.length - 1];
    const observed = new Date(latest[0]);
    const ageHours = (Date.now() - observed.getTime()) / 3_600_000;
    console.log(`${label}: ${latest[1]} ${payload.units ?? unit} @ ${observed.toISOString()} (${ageHours.toFixed(1)}h old), ${valid.length} numeric values`);
    return { label, name, ok: ageHours <= 8, value: latest[1], units: payload.units ?? unit, observedAt: observed.toISOString(), ageHours };
  } catch (error) {
    console.log(`${label}: ERROR - ${error instanceof Error ? error.message : String(error)}`);
    return { label, name, ok: false, error: true };
  }
}

await inspectCatalog();
const results = [];
for (const candidate of probes) results.push(await probe(...candidate));

const fresh = results.filter(result => result.ok);
console.log(`Fresh series: ${fresh.length}/${results.length}`);
for (const result of fresh) console.log(`FRESH ${result.label}: ${result.value} ${result.units}`);

// Monitoring only. Source gaps are surfaced in logs but do not fail application CI.
