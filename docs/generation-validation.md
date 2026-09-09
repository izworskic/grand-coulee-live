# Generation-estimator validation

Validation status: **preliminary; production release gate remains open**

## Model

Grand Coulee Live estimates instantaneous plant generation from reported turbine flow and hydraulic head:

`P = rho × g × Q × H × eta`

The product never labels this as an official instantaneous plant MW reading.

## Initial official-data backtest

A first out-of-sample test was run against the complete reported-generation portion of the USACE Grand Coulee July 2026 daily table. Days 1–21 have reported average generation, generation flow and average head. Each tested day uses only prior days to estimate efficiency.

Because only 21 complete daily generation rows are currently exposed by the public table, this is an initial validation window rather than the broader historical sample required for final release.

### Candidate results

Backtest targets: July 8–21, 2026 (`n = 14`).

| Calibration | MAE MW | MAPE | Median absolute error MW | Bias MW |
| --- | ---: | ---: | ---: | ---: |
| 7-day mean efficiency | 21.3 | 0.89% | 17.1 | +10.1 |
| 7-day median efficiency | 26.5 | 1.10% | 21.5 | +16.3 |
| 14-day median efficiency | 27.2 | 1.13% | 24.3 | +24.0 |
| Fixed 90% efficiency | 27.8 | 1.19% | 20.6 | +26.8 |
| All-prior median efficiency | 29.4 | 1.23% | 27.2 | +26.7 |

A 7-day trimmed mean (remove the highest and lowest inferred efficiency before averaging) produced MAE 23.0 MW and MAPE 0.96% in the same short window.

## Interpretation

The physics approach is promising in this initial sample: all rolling candidates tested near roughly one-percent MAPE. The 7-day mean has the lowest error in this short window, while the median/trimmed estimators offer better resistance to anomalous operating days.

The shipped code currently favors a robust rolling median rather than optimizing to one short July window. That choice should be revisited after a larger multi-regime sample is available.

## Why this is not yet the final release backtest

The master release gate calls for a meaningful historical sample and error by operating regime. The current official daily publication is incomplete/stale as of September 8, 2026, limiting the immediately accessible verified sample.

Before production release of the estimated-MW hero, rerun `npm run backtest` when the official daily source exposes a broader set of complete records, then document:

- MAE
- MAPE
- median absolute error
- bias
- error by low/medium/high generation regime
- fixed vs 7-day vs 14-day vs robust calibration methods

Until then, the application code is build-valid but the estimated-generation release gate is intentionally not marked complete.
