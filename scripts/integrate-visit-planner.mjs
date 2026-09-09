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
const replacements = [
  ["import { ZONE } from '@/lib/data/usace';\n", "import { ZONE } from '@/lib/data/usace';\n\ntype AnyDateTime = DateTime<boolean>;\n"],
  ['  arrival: DateTime;','  arrival: AnyDateTime;'],
  ['const mins = (a: DateTime, b: DateTime) =>','const mins = (a: AnyDateTime, b: AnyDateTime) =>'],
  ['const maxDt = (a: DateTime, b: DateTime) =>','const maxDt = (a: AnyDateTime, b: AnyDateTime) =>'],
  ['const minDt = (a: DateTime, b: DateTime) =>','const minDt = (a: AnyDateTime, b: AnyDateTime) =>'],
  ['function iso(dt: DateTime) {','function iso(dt: AnyDateTime) {'],
  ["function addStep(steps: VisitPlanStep[], start: DateTime, end: DateTime, title: string, detail: string, kind: VisitPlanStep['kind']) {","function addStep(steps: VisitPlanStep[], start: AnyDateTime, end: AnyDateTime, title: string, detail: string, kind: VisitPlanStep['kind']) {"],
  ['function pressure(arrival: DateTime, hasTours: boolean, hasLaser: boolean) {','function pressure(arrival: AnyDateTime, hasTours: boolean, hasLaser: boolean) {'],
  ["  let selectedTour = (tourPriority ? realisticallyReachable : realisticallyReachable.filter(dep => dep.diff(arrival, 'minutes').minutes >= 35))[0] ?? null;","  let selectedTour: AnyDateTime | null = (tourPriority ? realisticallyReachable : realisticallyReachable.filter(dep => dep.diff(arrival, 'minutes').minutes >= 35))[0] ?? null;"],
  ["  let selectedTour: DateTime | null = (tourPriority ? realisticallyReachable : realisticallyReachable.filter(dep => dep.diff(arrival, 'minutes').minutes >= 35))[0] ?? null;","  let selectedTour: AnyDateTime | null = (tourPriority ? realisticallyReachable : realisticallyReachable.filter(dep => dep.diff(arrival, 'minutes').minutes >= 35))[0] ?? null;"],
  ['  let cursor = arrival;','  let cursor: AnyDateTime = arrival;'],
  ['  const addOrientation = (limit: DateTime) => {','  const addOrientation = (limit: AnyDateTime) => {'],
  ['  const addCenter = (limit: DateTime) => {','  const addCenter = (limit: AnyDateTime) => {'],
  ['  const addView = (limit: DateTime) => {','  const addView = (limit: AnyDateTime) => {']
];
for (const [from, to] of replacements) {
  if (planner.includes(from) && !planner.includes(to)) {
    planner = planner.replace(from, to);
    changed = true;
  }
}
fs.writeFileSync(plannerFile, planner);

console.log(changed ? 'Visit planner integration/type normalization applied.' : 'Visit planner already integrated.');
