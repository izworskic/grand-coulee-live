import fs from 'node:fs';

const dashboardFile = 'components/GrandCouleeDashboard.tsx';
let source = fs.readFileSync(dashboardFile, 'utf8');
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

fs.writeFileSync(dashboardFile, source);

const plannerFile = 'lib/visitPlanner.ts';
let planner = fs.readFileSync(plannerFile, 'utf8');
const untyped = "  let selectedTour = (tourPriority ? realisticallyReachable : realisticallyReachable.filter(dep => dep.diff(arrival, 'minutes').minutes >= 35))[0] ?? null;";
const typed = "  let selectedTour: DateTime | null = (tourPriority ? realisticallyReachable : realisticallyReachable.filter(dep => dep.diff(arrival, 'minutes').minutes >= 35))[0] ?? null;";
if (planner.includes(untyped)) {
  planner = planner.replace(untyped, typed);
  fs.writeFileSync(plannerFile, planner);
  changed = true;
}

console.log(changed ? 'Visit planner integration/type fix applied.' : 'Visit planner already integrated.');
