const base = 'https://cwms-data.usace.army.mil/cwms-data/timeseries';
const office = 'NWDP';
const series = [
  ['totalOutflow', 'GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['generationFlow', 'GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['spill', 'GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['forebay', 'GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV', 'ft'],
  ['tailwater', 'GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV', 'ft']
];

const end = new Date();
const begin = new Date(end.getTime() - 12 * 60 * 60 * 1000);
let failed = false;

for (const [label, name, unit] of series) {
  const params = new URLSearchParams({
    name,
    office,
    unit,
    begin: begin.toISOString(),
    end: end.toISOString(),
    timezone: 'UTC',
    'page-size': '100'
  });

  try {
    const response = await fetch(`${base}?${params}`, {
      headers: { Accept: 'application/json;version=2' },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    const payload = await response.json();
    const valid = Array.isArray(payload.values)
      ? payload.values.filter(row => Array.isArray(row) && typeof row[0] === 'number' && typeof row[1] === 'number')
      : [];
    if (!valid.length) throw new Error('no numeric values in the last 12 hours');
    const latest = valid[valid.length - 1];
    const observed = new Date(latest[0]);
    const ageHours = (Date.now() - observed.getTime()) / 3_600_000;
    console.log(`${label}: ${latest[1]} ${payload.units ?? unit} @ ${observed.toISOString()} (${ageHours.toFixed(1)}h old)`);
    if (ageHours > 8) throw new Error(`latest observation is ${ageHours.toFixed(1)} hours old`);
  } catch (error) {
    failed = true;
    console.error(`${label}: FAIL - ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exitCode = 1;
