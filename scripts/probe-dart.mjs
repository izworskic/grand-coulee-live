const url = 'https://www.cbr.washington.edu/dart/query/river_daily';
const response = await fetch(url, { headers: { 'User-Agent': 'GrandCouleeLive/1.0' }, signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const html = await response.text();
console.log(`PAGE_BYTES ${html.length}`);

for (const form of html.matchAll(/<form\b[\s\S]*?<\/form>/gi)) {
  const tag = form[0].match(/<form\b[^>]*>/i)?.[0] ?? '';
  console.log('FORM', tag.replace(/\s+/g,' '));
}

for (const select of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
  const attrs = select[1];
  const name = attrs.match(/name=["']([^"']+)/i)?.[1] ?? '';
  const id = attrs.match(/id=["']([^"']+)/i)?.[1] ?? '';
  const opts = [...select[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(m => ({
    value: m[1].match(/value=["']([^"']*)/i)?.[1] ?? '',
    text: m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
  }));
  const relevant = opts.filter(o => /Grand Coulee|GCL|spill|2026/i.test(`${o.value} ${o.text}`));
  if (relevant.length) console.log('SELECT', JSON.stringify({name,id,relevant}));
}

for (const input of html.matchAll(/<input\b([^>]*)>/gi)) {
  const attrs = input[1];
  const name = attrs.match(/name=["']([^"']+)/i)?.[1];
  const value = attrs.match(/value=["']([^"']*)/i)?.[1];
  const type = attrs.match(/type=["']([^"']*)/i)?.[1];
  if (name) console.log('INPUT', JSON.stringify({name,value,type}));
}
