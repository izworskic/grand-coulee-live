# GRAND COULEE LIVE

Operational + visitor intelligence for Grand Coulee Dam. Standalone Next.js application designed for GitHub + Vercel/serverless deployment. **No Replit dependency.**

## Product question

> What is Grand Coulee Dam doing right now, what will I see if I go, and when should I visit today?

The application combines Grand Coulee operational telemetry, a physically based generation estimator, Lake Roosevelt context, official visitor schedules, NWS weather, astronomy, Banks Lake pumping context and an interactive educational dam representation.

## Operational data architecture

### Primary: USACE CWMS Data API

Grand Coulee Live reads the modern USACE CWMS API directly and treats each time series independently.

Primary GCL series:

- `GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV` — total outflow
- `GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV` — generation/turbine flow
- `GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV` — spill
- `GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV` — forebay / Lake Roosevelt elevation
- `GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV` — tailwater

CWMS catalog: `https://cwms-data.usace.army.mil/cwms-data/catalog/timeseries?office=NWDP&like=GCL.*`

Grand Coulee location: `https://water.usace.army.mil/overview/nwdp/locations/gcl`

### Fallback: legacy USACE CROHMS

- Hourly: `https://public.crohms.org/dd/nwdp/project_hourly/webexec/rep?ago=0&r=gcl`
- Daily: `https://public.crohms.org/dd/nwdp/project_daily/webexec/rep?ago=0&r=gcl`

The hourly adapter compares valid CWMS and CROHMS results and uses the fresher observation set. Daily CROHMS reports provide reported generation and Banks Lake context for calibration/backtesting.

### Partial-live behavior

A successful request is not treated as proof that every field is current. The app reports core operational completeness separately:

- total outflow
- generation flow
- spill
- forebay
- tailwater

If only some fields are publishing, the hero reports `PARTIAL LIVE · x/5 core fields`. Null values remain null. Missing spill is never interpreted as zero, and missing turbine flow does not trigger a generation estimate.

## Official visitor/environment sources

- Bureau of Reclamation visitor information: `https://www.usbr.gov/pn/grandcoulee/visit/index.html`
- Bureau of Reclamation tours: `https://www.usbr.gov/pn/grandcoulee/visit/tour.html`
- Bureau of Reclamation laser show: `https://www.usbr.gov/pn/grandcoulee/visit/laser.html`
- Bureau of Reclamation Lake Roosevelt forecast: `https://www.usbr.gov/pn/grandcoulee/lakelevel/`
- National Weather Service API: `https://api.weather.gov/points/47.955,-118.9833`

## Data truth

### Generation

`Estimated generation now` is never presented as an official instantaneous plant meter. It uses:

`P = rho * g * Q * H * eta`

where:

- `Q` = current reported generation/turbine flow
- `H` = hydraulic head
- `eta` = robust rolling efficiency calibrated against reported Grand Coulee daily generation

If current generation-flow telemetry is absent, current MW is withheld.

### Hydraulic-head fallback

When measured tailwater is unavailable, Grand Coulee Live can estimate tailwater from the official USACE Grand Coulee Water Control Manual Plate 7-5 tailwater rating curve, then calculate head as forebay minus estimated tailwater.

This fallback is always labeled **ESTIMATED**. USACE notes that Rufus Woods Lake backwater affects actual Grand Coulee tailwater, so it is not represented as measured telemetry.

Historical validation over 367 USACE daily observations (38.3–170.9 kcfs total outflow):

- tailwater/head MAE: **0.31 ft**
- median absolute error: **0.23 ft**
- 90th-percentile absolute error: **0.67 ft**
- 95th-percentile absolute error: **0.85 ft**
- maximum absolute error: **2.04 ft**

## Generation-model validation

The production estimator uses a rolling 14-observation median efficiency and is evaluated out-of-sample.

Current 13-month benchmark:

- 368 source daily rows
- 360 complete rows
- 346 evaluation days
- evaluation window: **2025-09-15 through 2026-08-27**
- generation-flow range: **42.9–170.9 kcfs**
- head range: **285.4–330.8 ft**
- forebay range: **1,251.2–1,289.2 ft**
- overall MAPE: **1.13%**
- MAE: **25.4 MW**
- bias: **+7.2 MW**
- low-flow MAPE: **1.53%**
- medium-flow MAPE: **1.20%**
- high-flow MAPE: **0.65%**

Release target is ≤8% overall MAPE. The current backtest clears that target, but model accuracy does not override missing real-time inputs.

## Visitor schedule guardrail

The current visitor configuration is explicitly verified for **2026** from Bureau of Reclamation information. The app does not automatically reuse the 2026 tour/laser schedule in future years. A future year falls back to `schedule not verified` until its source data is reviewed.

## Local development

```bash
npm install
npm run dev
```

## QA and release validation

```bash
npm test
npm run build
npm run backtest
node scripts/probe-cwms.mjs
```

CI runs:

1. deterministic parser/model/schedule/hydraulic tests
2. production Next.js build
3. 13-month generation + tailwater-rating validation
4. live CWMS source-health probe

The live external-data checks are non-blocking so a federal source outage is not misclassified as a code failure. Their output still documents exactly which source series are publishing.

## API

- `/api/status` — normalized current status, telemetry completeness, provenance and visitor intelligence
- `/api/history?range=24h|7d|30d` — normalized operating history

Government requests are server-side and cached. Browsers do not directly hammer federal sources.

## Current release state

The application code, tests and production build are passing. At the latest source check, CWMS was publishing current Grand Coulee forebay and total outflow but not numeric generation-flow, spill or measured tailwater values. The application safely operates in partial-live mode and exposes a validated estimated-head fallback, while withholding MW and a yes/no spill claim until the required numeric telemetry returns.

See GitHub issue #1 for the current operational-source release gate.
