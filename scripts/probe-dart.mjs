const base = 'https://www.cbr.washington.edu';
const params = new URLSearchParams({
  sc: '1',
  year: '2026',
  proj: 'GCL',
  outputFormat: 'html',
  span: 'no',
  startdate: '9/1',
  enddate: '9/9',
  syear: '',
  eyear: ''
});
const url = `${base}/dart/cs/php/rpt/river_daily.php?${params}`;
const response = await fetch(url, { headers: { 'User-Agent': 'GrandCouleeLive/1.0' }, signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const body = await response.text();
const decode = s => s
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#039;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

console.log(`REQUEST ${url}`);
console.log(`BYTES ${body.length}`);
for (const needle of ['Temporarily Unavailable', 'Grand Coulee', 'Spill', 'Outflow', 'Inflow', 'Elevation']) {
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  if (idx >= 0) console.log(`CONTEXT ${needle}: ${decode(body.slice(Math.max(0, idx - 500), Math.min(body.length, idx + 3500)))}`);
}
for (const table of body.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
  const rows = [...table[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(row =>
    [...row[0].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(cell => decode(cell[1]))
  ).filter(row => row.length);
  if (rows.some(row => row.some(cell => /Grand Coulee|spill|outflow|inflow|elevation|09\/0?[1-9]|9\/0?[1-9]|2026/i.test(cell)))) {
    console.log('TABLE_START');
    for (const row of rows) console.log(JSON.stringify(row));
    console.log('TABLE_END');
  }
}
