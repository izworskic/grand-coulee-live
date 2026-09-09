const checks = [
  ['USACE CWMS catalog', 'https://cwms-data.usace.army.mil/cwms-data/catalog/timeseries?office=NWDP&like=GCL.*&page-size=500', 'json'],
  ['USACE Grand Coulee daily report', 'https://public.crohms.org/dd/nwdp/project_daily/webexec/rep?ago=0&r=gcl', 'text'],
  ['Reclamation visitor information', 'https://www.usbr.gov/pn/grandcoulee/visit/index.html', 'text'],
  ['Reclamation tour schedule', 'https://www.usbr.gov/pn/grandcoulee/visit/tour.html', 'text'],
  ['Reclamation laser schedule', 'https://www.usbr.gov/pn/grandcoulee/visit/laser.html', 'text'],
  ['Reclamation Lake Roosevelt forecast', 'https://www.usbr.gov/pn/grandcoulee/lakelevel/', 'text'],
  ['National Weather Service point', 'https://api.weather.gov/points/47.955,-118.9833', 'json']
];

const headers = {
  'User-Agent': 'GrandCouleeLive-source-watch/1.0 (public data health check)',
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8'
};

async function check(label, url, kind) {
  const started = Date.now();
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    const elapsedMs = Date.now() - started;
    if (!response.ok) return { label, url, ok: false, status: response.status, elapsedMs, detail: `HTTP ${response.status}` };
    let detail = `${response.status} · ${elapsedMs}ms`;
    if (kind === 'json') {
      const payload = await response.json();
      detail += ` · JSON ${payload && typeof payload === 'object' ? 'valid' : 'unexpected'}`;
    } else {
      const text = await response.text();
      detail += ` · ${text.length.toLocaleString()} chars`;
      if (text.length < 300) return { label, url, ok: false, status: response.status, elapsedMs, detail: `${detail} · unexpectedly short` };
    }
    return { label, url, ok: true, status: response.status, elapsedMs, detail };
  } catch (error) {
    return { label, url, ok: false, status: null, elapsedMs: Date.now() - started, detail: error instanceof Error ? error.message : String(error) };
  }
}

const results = [];
for (const checkSpec of checks) results.push(await check(...checkSpec));

for (const result of results) console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.label}: ${result.detail}`);

const summary = [
  '## Grand Coulee source watch',
  '',
  `Checked: ${new Date().toISOString()}`,
  '',
  '| Source | State | Detail |',
  '| --- | --- | --- |',
  ...results.map(result => `| ${result.label} | ${result.ok ? 'OK' : 'FAIL'} | ${String(result.detail).replaceAll('|', '\\|')} |`),
  '',
  'This cross-source watch checks transport/format availability. The separate CWMS telemetry probe records which individual Grand Coulee series are currently numeric.'
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  const fs = await import('node:fs/promises');
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

const failures = results.filter(result => !result.ok);
if (failures.length) {
  console.error(`${failures.length} upstream source checks failed.`);
  process.exit(1);
}
