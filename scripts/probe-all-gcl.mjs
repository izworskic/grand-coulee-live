const root = 'https://cwms-data.usace.army.mil/cwms-data';
const office = 'NWDP';
const headers = { Accept: 'application/json;version=2' };
const end = new Date();
const begin = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

async function getCatalog() {
  const url = `${root}/catalog/timeseries?office=${office}&like=${encodeURIComponent('GCL.*')}&page-size=500`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`catalog HTTP ${response.status}`);
  const payload = await response.json();
  return (Array.isArray(payload.entries) ? payload.entries : [])
    .map(entry => entry?.name)
    .filter(name => typeof name === 'string' && name.startsWith('GCL.'))
    .sort();
}

async function getLatest(name) {
  const params = new URLSearchParams({
    name,
    office,
    begin: begin.toISOString(),
    end: end.toISOString(),
    timezone: 'UTC',
    'page-size': '1000'
  });
  try {
    const response = await fetch(`${root}/timeseries?${params}`, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { name, status: `HTTP ${response.status}` };
    const payload = await response.json();
    const values = Array.isArray(payload.values)
      ? payload.values.filter(row => Array.isArray(row) && typeof row[0] === 'number' && typeof row[1] === 'number' && Number.isFinite(row[1]))
      : [];
    if (!values.length) return { name, units: payload.units ?? null, status: 'NO_NUMERIC_7D' };
    const latest = values.at(-1);
    const observedAt = new Date(latest[0]).toISOString();
    const ageHours = (Date.now() - latest[0]) / 3_600_000;
    return { name, value: latest[1], units: payload.units ?? null, observedAt, ageHours, count: values.length, status: ageHours <= 8 ? 'FRESH' : ageHours <= 48 ? 'DELAYED' : 'OLD' };
  } catch (error) {
    return { name, status: `ERROR ${error instanceof Error ? error.message : String(error)}` };
  }
}

const names = await getCatalog();
console.log(`CATALOG_COUNT ${names.length}`);
for (const name of names) console.log(`CATALOG ${name}`);

const results = [];
for (let i = 0; i < names.length; i += 8) {
  results.push(...await Promise.all(names.slice(i, i + 8).map(getLatest)));
}

console.log('\n=== RECENT NUMERIC SERIES ===');
for (const result of results.filter(r => typeof r.value === 'number').sort((a,b) => a.ageHours - b.ageHours)) {
  console.log(`${result.status}\t${result.ageHours.toFixed(1)}h\t${result.name}\t${result.value}\t${result.units ?? ''}\t${result.observedAt}\tcount=${result.count}`);
}

console.log('\n=== EMPTY/ERROR SERIES ===');
for (const result of results.filter(r => typeof r.value !== 'number')) {
  console.log(`${result.status}\t${result.name}\t${result.units ?? ''}`);
}

const interesting = results.filter(r => /spill|power|gen|gate|pump|tail|outlet|flow/i.test(r.name));
console.log('\n=== INTERESTING SERIES ===');
for (const result of interesting) console.log(JSON.stringify(result));
