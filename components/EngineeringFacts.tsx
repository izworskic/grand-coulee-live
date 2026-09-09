import { GRAND_COULEE_ENGINEERING, RECLAMATION_FACT_SHEET_URL } from '@/lib/engineering';

type Props = {
  currentHeadFt: number | null;
  headEstimated: boolean;
};

function n(value: number | null, digits = 1) {
  return value === null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function EngineeringFacts({ currentHeadFt, headEstimated }: Props) {
  const facts = GRAND_COULEE_ENGINEERING;
  return <div className="engineering-reference">
    <dl className="engineering-list">
      <div><dt>Dam height</dt><dd>{facts.dam.heightFt.toLocaleString()} ft</dd></div>
      <div><dt>Total length</dt><dd>{facts.dam.totalLengthFt.toLocaleString()} ft</dd></div>
      <div><dt>Full pool</dt><dd>{facts.dam.fullPoolFt.toLocaleString()} ft</dd></div>
      <div><dt>{headEstimated ? 'Estimated head' : 'Current head'}</dt><dd>{n(currentHeadFt, 1)} ft</dd></div>
      {headEstimated && <div><dt>Head method</dt><dd>USACE rating curve · estimated</dd></div>}
      <div><dt>Left Powerhouse</dt><dd>{facts.generation.leftPowerhouseMW.toLocaleString()} MW · 9 main units</dd></div>
      <div><dt>Right Powerhouse</dt><dd>{facts.generation.rightPowerhouseMW.toLocaleString()} MW · 9 main units</dd></div>
      <div><dt>Third Power Plant</dt><dd>{facts.generation.thirdPowerPlantMW.toLocaleString()} MW · 6 units</dd></div>
      <div><dt>Pump-generating plant</dt><dd>{facts.generation.pumpGeneratingPlantMW.toLocaleString()} MW · 6 pump-generators</dd></div>
      <div><dt>Total installed capacity</dt><dd>{facts.generation.totalMW.toLocaleString()} MW</dd></div>
      <div><dt>Spillway</dt><dd>{facts.spillway.drumGates} drum gates · {facts.spillway.fullPoolCapacityCfs.toLocaleString()} cfs max at full pool</dd></div>
    </dl>
    <a className="engineering-source" href={RECLAMATION_FACT_SHEET_URL} target="_blank" rel="noreferrer">Bureau of Reclamation engineering facts</a>
  </div>;
}
