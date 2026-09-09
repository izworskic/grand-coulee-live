import fs from 'node:fs';

const file = 'components/GrandCouleeDashboard.tsx';
let source = fs.readFileSync(file, 'utf8');
let changed = false;

if (!source.includes("import { VisitPlanner } from '@/components/VisitPlanner';")) {
  const anchor = "import { OperationsHistory } from '@/components/OperationsHistory';";
  if (!source.includes(anchor)) throw new Error('Visit planner integration: import anchor missing');
  source = source.replace(anchor, `${anchor}\nimport { VisitPlanner } from '@/components/VisitPlanner';`);
  changed = true;
}

if (!source.includes('<VisitPlanner status={status} />')) {
  const anchor = '    </header>\n\n    <PhotographicDamExplorer status={status} />';
  if (!source.includes(anchor)) throw new Error('Visit planner integration: render anchor missing');
  source = source.replace(anchor, '    </header>\n\n    <VisitPlanner status={status} />\n\n    <PhotographicDamExplorer status={status} />');
  changed = true;
}

fs.writeFileSync(file, source);
console.log(changed ? 'Visit planner integrated into dashboard.' : 'Visit planner already integrated.');
