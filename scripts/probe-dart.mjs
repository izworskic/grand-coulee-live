const base = 'https://www.cbr.washington.edu';
const params = new URLSearchParams({
  year: '2026',
  proj: 'GCL',
  outputFormat: 'csv',
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
console.log(`REQUEST ${url}`);
console.log(`CONTENT_TYPE ${response.headers.get('content-type') ?? ''}`);
console.log(`BYTES ${body.length}`);
console.log(body.slice(0, 20000));
