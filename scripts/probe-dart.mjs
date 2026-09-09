const base = 'https://www.cbr.washington.edu';
const common = {
  year: '2026',
  proj: 'GCL',
  outputFormat: 'html',
  span: 'no',
  startdate: '9/1',
  enddate: '9/9',
  syear: '',
  eyear: ''
};

const decode = s => s
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#039;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

async function inspect(paramsObj, label) {
  const params = new URLSearchParams(paramsObj);
  const url = `${base}/dart/cs/php/rpt/river_daily.php?${params}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'GrandCouleeLive/1.0' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
  const body = await response.text();
  console.log(`\n=== ${label} ===\nREQUEST ${url}\nBYTES ${body.length}`);

  for (const needle of ['Grand Coulee', 'GCL', 'Spill', 'Outflow', 'No data', 'error', 'Error', 'data link', 'Data Link', 'river_daily']) {
    const idx = body.toLowerCase().indexOf(needle.toLowerCase());
    if (idx >= 0) console.log(`CONTEXT ${needle}: ${decode(body.slice(Math.max(0, idx - 600), Math.min(body.length, idx + 1800)))}`);
  }

  for (const table of body.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    const rows = [...table[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(row =>
      [...row[0].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(cell => decode(cell[1]))
    ).filter(row => row.length);
    if (rows.some(row => row.some(cell => /GCL|Grand Coulee|spill|outflow|09\/0?[1-9]|9\/0?[1-9]/i.test(cell)))) {
      console.log('TABLE_START');
      for (const row of rows) console.log(JSON.stringify(row));
      console.log('TABLE_END');
    }
  }
}

await inspect(common, 'NORMAL');
await inspect({ ...common, datalink: '1' }, 'DATALINK');
