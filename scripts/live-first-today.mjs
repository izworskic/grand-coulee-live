import fs from 'node:fs';

function replaceRequired(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing ${label}`);
  return text.replace(from, to);
}

const statusPath = 'lib/status.ts';
let status = fs.readFileSync(statusPath, 'utf8');

const oldDecision = `function decision(status: Pick<GrandCouleeStatus, 'visitor' | 'weather' | 'flow' | 'astronomy'>) {
  const precip = status.weather?.precipitationProbability ?? 0;
  const spill = spillPhrase(status.flow.spillKcfs);
  if (status.visitor.laserStatus === 'tonight') {
    return {
      headline: status.visitor.visitorCenterStatus === 'open' ? 'THIS IS A GOOD TIME TO COME' : 'COME BACK THIS EVENING',
      detail: \`${'${precip <= 30 ? \'The weather looks cooperative\' : \'Keep an eye on the rain chance\'}'}. ${'${spill === \'active spill\' ? \'The spillway is active\' : spill === \'no meaningful spill reported\' ? \'No meaningful spill is reported\' : \'Current spill data is unavailable\'}'}. Sunset is ${'${status.astronomy.sunset}'}, and ${'${status.visitor.laserDetail.toLowerCase()}'} .\`.replace('} .','}.' )
    };
  }
  if (status.visitor.visitorCenterStatus === 'open') {
    return {
      headline: 'COME ON OVER',
      detail: \`The Visitor Center is open now. ${'${status.weather?.shortForecast ?? \'Current visitor conditions are available\'}'}${'${status.visitor.nextTour ? `, and ${status.visitor.nextTourDetail.toLowerCase()}` : \'.\'}'}\`
    };
  }
  return {
    headline: 'THE DAM IS STILL WORTH A LOOK',
    detail: 'The Visitor Center is closed right now, but the public viewpoints are still the place to take in the scale of Grand Coulee. Use the live conditions here to decide how long you want to stay.'
  };
}`;

// Build the exact current function separately to avoid nested-template escaping mistakes.
const currentDecisionStart = status.indexOf("function decision(status: Pick<GrandCouleeStatus, 'visitor' | 'weather' | 'flow' | 'astronomy'>)");
const decisionEnd = status.indexOf('\n}\n\nexport async function getGrandCouleeStatus', currentDecisionStart);
if (currentDecisionStart < 0 || decisionEnd < 0) throw new Error('Current decision function not found');

const newDecision = `function decision(status: Pick<GrandCouleeStatus, 'visitor' | 'weather' | 'flow' | 'reservoir' | 'riverContext'>) {
  const liveParts: string[] = [];

  if (status.reservoir.forebayFt !== null) {
    const change = status.reservoir.change24hFt;
    const movement = change === null
      ? ''
      : Math.abs(change) < 0.01
        ? ' and is essentially steady over 24 hours'
        : \`, ${'${change > 0 ? \'up\' : \'down\'}'} ${'${Math.abs(change).toFixed(2)}'} ft in 24 hours\`;
    liveParts.push(\`Lake Roosevelt is ${'${status.reservoir.forebayFt.toFixed(2)}'} ft${'${movement}'}\`);
  }

  if (status.flow.totalOutflowKcfs !== null) {
    liveParts.push(\`Current Columbia River outflow is ${'${status.flow.totalOutflowKcfs.toFixed(1)}'} kcfs\`);
  }

  if (status.riverContext.inflowKcfs !== null && status.riverContext.dailyOutflowKcfs !== null) {
    const difference = status.riverContext.inflowKcfs - status.riverContext.dailyOutflowKcfs;
    if (Math.abs(difference) >= 1) {
      liveParts.push(\`Daily inflow is running ${'${difference > 0 ? \'above\' : \'below\'}'} daily outflow (${ '${status.riverContext.inflowKcfs.toFixed(1)}' } vs ${ '${status.riverContext.dailyOutflowKcfs.toFixed(1)}' } kcfs)\`);
    }
  }

  const liveSentence = liveParts.length ? \`${'${liveParts.slice(0, 2).join(\'. \')}'} .\`.replace(' .','.') : '';
  const weather = status.weather ? \` ${'${status.weather.temperatureF.toFixed(0)}'}°F and ${'${status.weather.shortForecast.toLowerCase()}'} right now.\` : '';

  if (status.visitor.visitorCenterStatus === 'open') {
    return {
      headline: status.visitor.nextTour ? 'VISITOR CENTER OPEN · TOUR AHEAD' : 'VISITOR CENTER IS OPEN',
      detail: \`${'${liveSentence}'}${'${weather}'}${'${status.visitor.nextTour ? ` ${status.visitor.nextTourDetail}` : \'\'}'}\`.trim()
    };
  }

  const centerDetail = status.visitor.visitorCenterDetail || 'Visitor Center is closed right now.';
  return {
    headline: centerDetail.toLowerCase().includes('opens') ? 'START WITH THE VISITOR CENTER' : 'CHECK THE DAM BEFORE YOU GO',
    detail: \`${'${centerDetail}'} ${'${liveSentence}'}${'${weather}'}\`.trim()
  };
}`;

status = status.slice(0, currentDecisionStart) + newDecision + status.slice(decisionEnd + 2);
fs.writeFileSync(statusPath, status);

const dashboardPath = 'components/GrandCouleeDashboard.tsx';
let dashboard = fs.readFileSync(dashboardPath, 'utf8');
dashboard = replaceRequired(
  dashboard,
  'Lake Roosevelt, river flow, spill when reported, today’s tours and tonight’s show.',
  'Lake Roosevelt, river flow, what’s changing today, tours and visitor conditions.',
  'hero support copy'
);

dashboard = replaceRequired(
  dashboard,
  '<Metric label="Spillway" value={status.flow.spillKcfs === null ? \'—\' : spillActive ? \'SPILL ACTIVE\' : \'NOT SPILLING\'} sub={status.flow.spillKcfs === null ? \'No current spill report\' : `${n(status.flow.spillKcfs, 2)} kcfs reported`} tag="MEASURED" />',
  '<Metric label="Lake change · 24h" value={status.reservoir.change24hFt === null ? \'—\' : signed(status.reservoir.change24hFt, \' ft\')} sub={status.reservoir.change6hFt === null ? \'Measured forebay movement\' : `${signed(status.reservoir.change6hFt, \' ft\')} over 6h`} tag="MEASURED" />',
  'spill metric'
);
fs.writeFileSync(dashboardPath, dashboard);

const explorerPath = 'components/PhotographicDamExplorer.tsx';
let explorer = fs.readFileSync(explorerPath, 'utf8');
const spillCard = `<div><span>Spill</span><strong>{status.riverContext.dailySpillKcfs === null ? '—' : \`${'${n(status.riverContext.dailySpillKcfs, 2)}'} kcfs\`}</strong><small>{status.riverContext.dailySpillDate ? \`${'${shortDate(status.riverContext.dailySpillDate)}'} daily avg${'${status.riverContext.dailySpillPercent === null ? \'\' : ` · ${n(status.riverContext.dailySpillPercent, 1)}%`}'}\` : '—'}</small></div>`;
if (!explorer.includes(spillCard)) throw new Error('River Today spill card not found');
const lakeCard = `<div><span>Lake change</span><strong>{status.reservoir.change24hFt === null ? '—' : \`${'${status.reservoir.change24hFt > 0 ? \'↑\' : status.reservoir.change24hFt < 0 ? \'↓\' : \'→\'}'} ${'${Math.abs(status.reservoir.change24hFt).toFixed(2)}'} ft\`}</strong><small>past 24 hours</small></div>`;
explorer = explorer.replace(spillCard, lakeCard);
fs.writeFileSync(explorerPath, explorer);

console.log('Applied live-first Today card and replaced dead spill slots with lake movement.');
