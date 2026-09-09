# Source audit — Grand Coulee Live

Last reviewed: 2026-09-09

## Operational hydrology

### Primary: USACE CWMS Data API

Grand Coulee Live now uses the modern U.S. Army Corps of Engineers CWMS Data API as the primary operational source and reads each Grand Coulee series independently.

Core series:

- `GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV` — total outflow
- `GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV` — generation/turbine flow
- `GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV` — spill
- `GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV` — forebay / Lake Roosevelt elevation
- `GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV` — tailwater elevation

Catalog:
`https://cwms-data.usace.army.mil/cwms-data/catalog/timeseries?office=NWDP&like=GCL.*&page-size=500`

Modern USACE Water Data location page:
`https://water.usace.army.mil/overview/nwdp/locations/gcl`

### Legacy fallback / daily calibration source

- Hourly: `https://public.crohms.org/dd/nwdp/project_hourly/webexec/rep?ago=0&r=gcl`
- Daily: `https://public.crohms.org/dd/nwdp/project_daily/webexec/rep?ago=0&r=gcl`
- Hourly report configuration: `https://public.crohms.org/dd/nwdp/project_hourly/config/gcl.in`

The application freshness-ranks valid hourly CWMS and legacy observations rather than assuming an HTTP-successful response contains usable telemetry.

## Current upstream condition

Latest automated probe on 2026-09-09 at approximately 02:24 UTC:

- total outflow REV: **92,200 cfs** at 02:00 UTC
- forebay REV: **1,278.50 ft** at 02:00 UTC
- generation-flow REV/RAW: no numeric values
- spill REV/RAW: no numeric values
- measured tailwater REV/RAW: no numeric values
- direct power instantaneous REV/RAW: no numeric values
- direct hourly power REV/RAW: no numeric values
- available-capacity REV: no numeric values
- gates-open REV: no numeric values

The CWMS catalog still exposes the expected Grand Coulee series. The current condition is therefore a field-publication gap, not evidence that those quantities are zero.

Grand Coulee Live reports **PARTIAL LIVE · 2/5 core fields** and withholds:

- current generation/turbine flow
- current estimated MW
- current spill yes/no state
- measured tailwater

The product does not derive generation flow by subtracting an unknown spill value from total outflow and does not substitute BPA system-wide generation for Grand Coulee plant output.

## Tailwater/head fallback

The official Grand Coulee Water Control Manual Plate 7-5 tailwater rating curve is used only when current total outflow and forebay are available but measured tailwater is not.

Historical validation against 367 USACE daily observations over 38.3–170.9 kcfs produced:

- tailwater/head MAE: **0.31 ft**
- median absolute error: **0.23 ft**
- 90th-percentile absolute error: **0.67 ft**
- 95th-percentile absolute error: **0.85 ft**
- maximum absolute error: **2.04 ft**

This remains explicitly **ESTIMATED** because USACE notes that Rufus Woods Lake backwater can affect actual tailwater.

## Generation-model validation

The rolling hydraulic generation estimator is independently validated against reported daily generation over 346 out-of-sample evaluation days from 2025-09-15 through 2026-08-27.

Current benchmark:

- overall MAPE: **1.13%**
- MAE: **25.4 MW**
- bias: **+7.2 MW**
- low-flow MAPE: **1.53%**
- medium-flow MAPE: **1.20%**
- high-flow MAPE: **0.65%**

The model passes its ≤8% release target. Current MW nevertheless remains unavailable while current turbine-flow telemetry is absent.

## Visitor schedules

Bureau of Reclamation sources:

- Visitor information: `https://www.usbr.gov/pn/grandcoulee/visit/index.html`
- Tours: `https://www.usbr.gov/pn/grandcoulee/visit/tour.html`
- Laser show: `https://www.usbr.gov/pn/grandcoulee/visit/laser.html`
- Lake Roosevelt forecast: `https://www.usbr.gov/pn/grandcoulee/lakelevel/`

Verified 2026 rules implemented in code:

- Visitor Center: daily 8:30 AM–5:00 PM Pacific, with published federal-holiday closures.
- Pump-generating plant tours: Friday–Sunday, May 22–October 31, 2026; departures at 9, 10, 11 AM and 1, 2, 3 PM Pacific; first come, first served; subject to cancellation/change.
- Laser show: nightly May 22–September 30, 2026; 10 PM through July, 9:30 PM in August, 8:30 PM in September; subject to cancellation/change.

The schedule implementation refuses to reuse these dates in a future calendar year without re-verification.

## Weather and astronomy

- Weather: National Weather Service API point `47.955,-118.9833`.
- Astronomy: local SunCalc calculation for Grand Coulee coordinates in `America/Los_Angeles`.

## Camera/current-view policy

No dam-facing live government camera has been accepted as reliable enough to label a live Grand Coulee webcam. The product uses a `CURRENT CONDITIONS AT THE DAM` module with current weather/telemetry and an official Bureau of Reclamation reference photograph explicitly labeled **REFERENCE IMAGE · NOT LIVE**.

A real camera can replace this fallback only after source ownership, stability and current-view semantics are verified.

## Continuous monitoring

`.github/workflows/source-watch.yml` runs every six hours and checks transport/format availability for:

- USACE CWMS catalog
- USACE Grand Coulee daily report
- Reclamation visitor information
- Reclamation tour schedule
- Reclamation laser schedule
- Reclamation Lake Roosevelt forecast
- NWS point metadata

The workflow also runs the individual CWMS telemetry probe so a healthy API with missing numeric Grand Coulee series is distinguishable from a complete upstream outage.

The same cross-source and CWMS probes run non-blocking in normal CI so external outages do not masquerade as application-code failures.

## Source policy

Every first-screen operational metric must retain timestamp/provenance and a measured/reported/calculated/estimated classification. Missing or stale upstream values degrade to unavailable/delayed/stale states rather than invented values.

USACE water-control data are provisional and subject to revision.
