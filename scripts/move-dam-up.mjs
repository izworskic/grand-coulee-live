import fs from 'node:fs';

const file = 'components/GrandCouleeDashboard.tsx';
let source = fs.readFileSync(file, 'utf8');

const current = `    <VisitPlanner status={status} />\n\n    <PhotographicDamExplorer status={status} />`;
const desired = `    <PhotographicDamExplorer status={status} />\n\n    <VisitPlanner status={status} />`;

if (source.includes(desired)) {
  console.log('Dam explorer is already ahead of the visit planner.');
  process.exit(0);
}

if (!source.includes(current)) {
  throw new Error('Could not find the current planner/dam ordering anchor.');
}

source = source.replace(current, desired);
fs.writeFileSync(file, source);
console.log('Moved See the Dam directly below the live hero.');
