export const GRAND_COULEE_WCM_URL = 'https://water.usace.army.mil/cda/documents/wc/3395/GrandCouleeDam_WCM_Final_10142022_combined_R.pdf';

// USACE Seattle District Grand Coulee Water Control Manual, Plate 7-5.
// The manual explicitly cautions that Rufus Woods Lake backwater affects project tailwater,
// so this curve is used only as an estimated fallback when measured tailwater is unavailable.
const TAILWATER_RATING: Array<[outflowCfs: number, elevationFt: number]> = [
  [0, 951.8],
  [50_000, 956.2],
  [100_000, 960.7],
  [150_000, 965.2],
  [200_000, 969.6],
  [250_000, 974.1],
  [300_000, 978.6],
  [400_000, 987.5],
  [500_000, 996.4],
  [600_000, 1000.5],
  [700_000, 1004.7],
  [800_000, 1008.8],
  [900_000, 1012.9],
  [1_000_000, 1017.0]
];

export function estimateTailwaterFromOutflow(totalOutflowKcfs: number | null): number | null {
  if (totalOutflowKcfs === null || !Number.isFinite(totalOutflowKcfs)) return null;
  const cfs = totalOutflowKcfs * 1000;
  if (cfs < TAILWATER_RATING[0][0] || cfs > TAILWATER_RATING.at(-1)![0]) return null;

  for (let i = 1; i < TAILWATER_RATING.length; i++) {
    const [x1, y1] = TAILWATER_RATING[i - 1];
    const [x2, y2] = TAILWATER_RATING[i];
    if (cfs <= x2) {
      const fraction = (cfs - x1) / (x2 - x1);
      return y1 + fraction * (y2 - y1);
    }
  }

  return null;
}

export function estimateHeadFromRatingCurve(forebayFt: number | null, totalOutflowKcfs: number | null): number | null {
  if (forebayFt === null) return null;
  const tailwater = estimateTailwaterFromOutflow(totalOutflowKcfs);
  if (tailwater === null) return null;
  const head = forebayFt - tailwater;
  return Number.isFinite(head) && head > 0 ? head : null;
}
