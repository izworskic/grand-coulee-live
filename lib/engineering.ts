export const RECLAMATION_FACT_SHEET_URL = 'https://www.usbr.gov/pn/grandcoulee/pubs/factsheet.pdf';
export const RECLAMATION_DAM_URL = 'https://www.usbr.gov/projects/index.php?id=155';
export const RECLAMATION_PROJECT_URL = 'https://www.usbr.gov/projects/index.php?id=438';

export const GRAND_COULEE_ENGINEERING = {
  dam: {
    heightFt: 550,
    totalLengthFt: 5223,
    fullPoolFt: 1290,
    concreteCubicYardsApprox: 12_000_000
  },
  spillway: {
    drumGates: 11,
    drumGateLengthFt: 135,
    fullPoolCapacityCfs: 1_000_000,
    outletTubes: 40,
    outletTubeDiameterFt: 8.5
  },
  generation: {
    leftPowerhouseMW: 1155,
    rightPowerhouseMW: 1125,
    thirdPowerPlantMW: 4215,
    pumpGeneratingPlantMW: 314,
    totalMW: 6809,
    leftMainGenerators: 9,
    leftStationServiceGenerators: 3,
    rightMainGenerators: 9,
    thirdPowerPlantGenerators: 6,
    pumpGenerators: 6,
    pumps: 6
  }
} as const;

export function capacityBreakdownMW() {
  const generation = GRAND_COULEE_ENGINEERING.generation;
  return generation.leftPowerhouseMW + generation.rightPowerhouseMW + generation.thirdPowerPlantMW + generation.pumpGeneratingPlantMW;
}
