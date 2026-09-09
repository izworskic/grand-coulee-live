# Generation-estimator validation

Validation status: **model benchmark passed; real-time input gate remains source-dependent**

Last validated: 2026-09-08/09

## Model

Grand Coulee Live estimates plant generation from generation/turbine flow and hydraulic head:

`P = rho × g × Q × H × eta`

The product never labels this as an official instantaneous plant MW reading. If current turbine-flow telemetry is absent, current estimated MW is withheld.

## Calibration method

The shipped estimator uses a rolling **14-observation median inferred efficiency**. For every evaluation day, the target day is excluded from calibration; only prior complete observations are used.

This was selected for robustness rather than fitting a single favorable month.

## 13-month official-data backtest

Source: USACE Grand Coulee daily reports.

- months requested: **13**
- failed source months: **0**
- source rows: **368**
- complete model rows: **360**
- out-of-sample evaluation days: **346**
- evaluation window: **September 15, 2025 through August 27, 2026**

Operating ranges represented:

- generation flow: **42.9–170.9 kcfs**
- hydraulic head: **285.4–330.8 ft**
- forebay: **1,251.2–1,289.2 ft**

## Overall results

| Metric | Result |
| --- | ---: |
| Evaluation days | 346 |
| MAE | **25.4 MW** |
| MAPE | **1.13%** |
| Bias | **+7.2 MW** |
| Median absolute error | **16.5 MW** |

The product release benchmark is overall MAPE ≤8%. The current model clears that target by a wide margin.

## Error by generation-flow regime

| Regime | Flow range | n | MAE MW | MAPE | Bias MW | Median abs. error MW |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 42.9–93.6 kcfs | 116 | 26.1 | **1.53%** | +7.2 | 17.6 |
| Medium | 94.1–121.4 kcfs | 116 | 29.3 | **1.20%** | +16.7 | 18.7 |
| High | 121.9–170.9 kcfs | 114 | 20.7 | **0.65%** | -2.4 | 15.2 |

The model does not show a large degradation at the low- or high-flow ends represented in the sample.

## Tailwater/head fallback validation

USACE's 2022 Grand Coulee Water Control Manual Plate 7-5 publishes a project tailwater rating curve. Grand Coulee Live uses this only as an explicit fallback when measured tailwater is unavailable.

Validation against **367 historical daily observations** across **38.3–170.9 kcfs total outflow**:

| Metric | Tailwater | Head |
| --- | ---: | ---: |
| MAE | **0.31 ft** | **0.31 ft** |
| Bias | -0.06 ft | +0.06 ft |
| Median absolute error | 0.23 ft | 0.23 ft |
| P90 absolute error | 0.67 ft | 0.67 ft |
| P95 absolute error | 0.85 ft | 0.85 ft |
| Maximum absolute error | 2.04 ft | 2.04 ft |

The fallback is still labeled estimated because the Water Control Manual cautions that Rufus Woods Lake backwater can affect actual project tailwater. Historical agreement is evidence of usefulness, not permission to relabel it as measured telemetry.

## Current real-time limitation

The generation model itself is no longer the release blocker. At the latest CWMS source probe, current total outflow and forebay were publishing, but current generation/turbine flow was not.

Therefore:

- model benchmark: **PASS**
- hydraulic fallback validation: **PASS**
- current MW display: **WITHHELD until current turbine-flow telemetry is numeric**

This distinction is deliberate: historical predictive accuracy does not compensate for a missing real-time input.

## Reproduce

```bash
npm run backtest
```

The backtest fails the release validation if overall generation MAPE exceeds 8%.
