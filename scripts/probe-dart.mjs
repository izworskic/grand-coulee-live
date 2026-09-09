const base = 'https://www.cbr.washington.edu';
const params = new URLSearchParams({
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
for (const table of body.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
  const rows = [...table[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(row =>
    [...row[0].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(cell => decode(cell[1]))
  ).filter(row => row.length);
  const text = rows.flat().join(' ');
  if (/spill|outflow|grand coulee|9\/0?[1-9]|2026-09/i.test(text)) {
    console.log('TABLE_START');
    for (const row of rows) console.log(JSON.stringify(row));
    console.log('TABLE_END');
  }
}
