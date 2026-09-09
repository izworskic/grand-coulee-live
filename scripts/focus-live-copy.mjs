import fs from 'node:fs';

const file = 'components/GrandCouleeDashboard.tsx';
let source = fs.readFileSync(file, 'utf8');
let changed = false;

function replace(from, to) {
  if (!source.includes(from)) throw new Error(`Missing copy anchor: ${from.slice(0, 100)}`);
  source = source.replace(from, to);
  changed = true;
}

replace(
`  const telemetryLabel = status.telemetry.state === 'complete'\n    ? \`${'${status.freshness.toUpperCase()} · ${status.telemetry.availableCoreSeries}/${status.telemetry.totalCoreSeries} core fields'}\`\n    : status.telemetry.state === 'partial'\n      ? \`PARTIAL LIVE · ${'${status.telemetry.availableCoreSeries}/${status.telemetry.totalCoreSeries}'} core fields\`\n      : 'OPERATIONAL TELEMETRY UNAVAILABLE';`,
`  const telemetryLabel = status.observedAt ? \`UPDATED ${'${updated}'}\` : 'RIVER DATA DELAYED';`
);

replace(
`<p className="lead">Start here, then look up at the dam.</p><p className="support">See what the river and reservoir are doing, what’s open today and when to be here. Then use the live dam view to make sense of what’s in front of you.</p><div className={\`freshness ${'${telemetryFreshnessClass}'}\`} title={status.telemetry.missingCoreSeries.length ? \`Missing: ${'${status.telemetry.missingCoreSeries.join(\', \')}'}\` : 'All core operational fields are available'}><span className="pulse"/>{telemetryLabel} · {updated}</div>`,
`<p className="lead">Grand Coulee, right now.</p><p className="support">Lake Roosevelt, river flow, spill when reported, today’s tours and tonight’s show.</p><div className={\`freshness ${'${telemetryFreshnessClass}'}\`}><span className="pulse"/>{telemetryLabel}</div>`
);

replace(`<div className="decision-card"><span className="eyebrow">IF YOU’RE COMING TODAY</span>`, `<div className="decision-card"><span className="eyebrow">TODAY</span>`);
replace(`value={status.generation.currentEstimatedMW === null ? 'Unavailable' :`, `value={status.generation.currentEstimatedMW === null ? '—' :`);
replace(`sub={capacityPct === null ? 'Current turbine-flow telemetry unavailable' :`, `sub={capacityPct === null ? 'Not reported now' :`);
replace(`value={status.reservoir.forebayFt === null ? 'Unavailable' :`, `value={status.reservoir.forebayFt === null ? '—' :`);
replace(`status.reservoir.belowFullPoolFt === null ? 'Full-pool comparison unavailable' :`, `status.reservoir.belowFullPoolFt === null ? '—' :`);
replace(`value={status.flow.spillKcfs === null ? 'STATUS UNAVAILABLE' :`, `value={status.flow.spillKcfs === null ? '—' :`);
replace(`sub={status.flow.spillKcfs === null ? 'USACE spill series currently has no numeric observation' :`, `sub={status.flow.spillKcfs === null ? 'No current spill report' :`);
replace(`value={status.flow.totalOutflowKcfs === null ? 'Unavailable' :`, `value={status.flow.totalOutflowKcfs === null ? '—' :`);
replace(`sub={status.flow.generationFlowKcfs === null ? 'Generation-flow telemetry unavailable' :`, `sub={status.flow.generationFlowKcfs === null ? 'Generation flow not reported' :`);
replace(`value={displayHead === null ? 'Unavailable' :`, `value={displayHead === null ? '—' :`);
replace(`: 'Required hydraulic inputs unavailable'}`, `: '—'}`);
replace(`<span className="eyebrow">TODAY AT GRAND COULEE</span><h2>Here’s how the day unfolds</h2>`, `<span className="eyebrow">TODAY AT GRAND COULEE</span><h2>Today’s schedule</h2>`);
replace(`<span>NOW · latest page refresh</span>`, `<span>NOW</span>`);
replace(`<p>Latest reported pumping flow. Grand Coulee also moves Columbia River water into Banks Lake for the Columbia Basin Project.</p>`, `<p>Water from Lake Roosevelt can be pumped uphill toward Banks Lake.</p>`);

const explain = /\n    <section className="explain-section">[\s\S]*?<\/section>\n\n    <section className="faq-section">/;
if (!explain.test(source)) throw new Error('Methodology section anchor missing');
source = source.replace(explain, '\n\n    <section className="faq-section">');
changed = true;

replace(`<span className="eyebrow">BEFORE YOU HEAD OUT</span><h2>The questions I’d answer first</h2>`, `<span className="eyebrow">QUICK ANSWERS</span><h2>Before you go</h2>`);
replace(`'The current USACE forebay value is temporarily unavailable.'`, `'No current lake reading.'`);
replace(`'The USACE spill series is currently not publishing a numeric observation, so Grand Coulee Live does not infer a yes/no spill state.'`, `'No current spill reading.'`);
replace(`'No meaningful spill is reported in the latest numeric USACE observation.'`, `'No spill is reported in the latest reading.'`);
replace(`'The current estimate is unavailable because current turbine-flow telemetry is not publishing. The model remains ready and will resume automatically when the required USACE inputs return.'`, `'No current generation estimate.'`);
replace(`\`Grand Coulee Live estimates approximately ${'${n(status.generation.currentEstimatedMW,0)}'} MW from current turbine flow and hydraulic head. This is an estimate, not an official instantaneous MW reading.\``, `\`About ${'${n(status.generation.currentEstimatedMW,0)}'} MW estimated from current flow and head.\``);

if (!changed) throw new Error('No copy changes applied');

// Guard against implementation chatter returning to the main dashboard.
for (const phrase of ['latest page refresh', 'core fields', 'does not infer a yes/no', 'model remains ready']) {
  if (source.includes(phrase)) throw new Error(`Public copy still contains internal phrase: ${phrase}`);
}

fs.writeFileSync(file, source);
console.log('Live-first dashboard copy applied.');
