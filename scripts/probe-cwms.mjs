const root = 'https://cwms-data.usace.army.mil/cwms-data';
const base = `${root}/timeseries`;
const office = 'NWDP';
const series = [
  ['totalOutflow', 'GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['generationFlow', 'GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['spill', 'GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV', 'cfs'],
  ['forebay', 'GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV', 'ft'],
  ['tailwater', 'GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV', 'ft']
];

const headers = { Accept: 'application/json;version=2' };
const end = new Date();
const begin = new Date(end.getTime() - 12 * 60 * 60 * 1000);
let failed = false;

async function inspectCatalog() {
  const candidates = [
    `${root}/timeseries/catalog?office=${office}&timeseries-id-like=${encodeURIComponent('GCL.%')}&page-size=500`,
    `${root}/catalog/timeseries?office=${office}&like=${encodeURIComponent('GCL.*')}&page-size=500`
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
      const text = await response.text();
      if (!response.ok) {
        console.log(`catalog ${url}: HTTP ${response.status}`);
        continue;
      }
      let payload;
      try { payload = JSON.parse(text); } catch { continue; }
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      const names = entries
        .map(entry => entry?.name)
        .filter(name => typeof name === 'string' && name.startsWith('GCL.'))
        .sort();
      console.log(`catalog endpoint: ${url}`);
      console.log(`GCL catalog entries (${names.length}):`);
      for (const name of names) console.log(`  ${name}`);
      return names;
    } catch (error) {
      console.log(`catalog ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log('No JSON GCL catalog response available from tested catalog endpoints.');
  return [];
}

await inspectCatalog();

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
      headers,
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
