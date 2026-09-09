# Source audit — Grand Coulee Live

Last reviewed: 2026-09-08/09

## Operational hydrology

### Primary source: USACE CWMS Data API

- Swagger/API documentation: `https://cwms-data.usace.army.mil/cwms-data/swagger-ui`
- Grand Coulee Water Data page: `https://water.usace.army.mil/overview/nwdp/locations/gcl`
- CWMS time-series endpoint: `https://cwms-data.usace.army.mil/cwms-data/timeseries`
- GCL catalog query: `https://cwms-data.usace.army.mil/cwms-data/catalog/timeseries?office=NWDP&like=GCL.*`

The NWDP CWMS catalog currently exposes 44 `GCL.*` series. Core series used by Grand Coulee Live:

- `GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV` — total outflow
- `GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV` — generation/turbine flow
- `GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV` — spill
- `GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV` — forebay / Lake Roosevelt
- `GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV` — tailwater

Related catalogued series include direct instantaneous/hourly total power, available capacity and spill-gate count. Catalog presence does **not** prove that numeric observations are currently publishing.

### Current source condition

A live CI probe on September 8/9, 2026 found current numeric observations for:

- total outflow: **87,500 cfs**
- forebay / Lake Roosevelt: **1,278.50 ft**

At the same source check, the API returned no numeric observations for current generation flow, spill, measured tailwater or direct plant MW despite those time-series IDs remaining catalogued.

The application therefore reports **PARTIAL LIVE · 2/5 core fields**. Each core series is fetched independently. One failed/null series cannot suppress working values from the others, and null is never coerced to zero.

### Legacy fallback: USACE CROHMS

- Hourly: `https://public.crohms.org/dd/nwdp/project_hourly/webexec/rep?ago=0&r=gcl`
- Daily: `https://public.crohms.org/dd/nwdp/project_daily/webexec/rep?ago=0&r=gcl`
- Hourly report configuration: `https://public.crohms.org/dd/nwdp/project_hourly/config/gcl.in`

The legacy report configuration corroborates the same core CWMS time-series identifiers. The app compares valid CWMS and CROHMS hourly results and uses the fresher observation set.

Daily CROHMS reports remain useful for reported generation, historical validation and Banks Lake pumping context even when the current hourly publication is incomplete.

## Hydraulic-head fallback

Official engineering reference:

- Grand Coulee Water Control Manual (2022): `https://water.usace.army.mil/cda/documents/wc/3395/GrandCouleeDam_WCM_Final_10142022_combined_R.pdf`

Plate 7-5 publishes the Grand Coulee project tailwater rating curve. When measured tailwater is absent, the app may linearly interpolate that official curve from current total outflow and calculate:

`estimated head = measured forebay - estimated tailwater`

This is always labeled **estimated**, not measured. The manual cautions that Rufus Woods Lake backwater affects actual project tailwater.

Validation against 367 historical USACE daily observations spanning 38.3–170.9 kcfs total outflow:

- MAE: **0.31 ft**
- median absolute error: **0.23 ft**
- P90 absolute error: **0.67 ft**
- P95 absolute error: **0.85 ft**
- maximum absolute error: **2.04 ft**
- bias: approximately **0.06 ft**

## Generation estimate

Grand Coulee Live does not claim a measured real-time MW value unless an official measured MW source actually publishes a numeric observation.

The fallback estimator uses:

`P = rho × g × Q × H × eta`

where current generation/turbine flow and hydraulic head are combined with a rolling efficiency calibration derived from reported daily generation.

Current 13-month out-of-sample validation:

- 346 evaluation days
- overall MAPE: **1.13%**
- MAE: **25.4 MW**
- low-flow MAPE: **1.53%**
- medium-flow MAPE: **1.20%**
- high-flow MAPE: **0.65%**

The estimator is withheld when current turbine-flow telemetry is absent, regardless of historical model accuracy.

## Bureau of Reclamation reservoir context

- Lake Roosevelt current/forecast page: `https://www.usbr.gov/pn/grandcoulee/lakelevel/`

Reclamation publishes provisional/predicted midnight lake elevations and explicitly notes that actual levels may change with power operations, river operations, weather and emergencies. This is suitable for planning context but must remain labeled forecast/predicted rather than measured.

## Visitor schedules

Bureau of Reclamation sources:

- Visitor information: `https://www.usbr.gov/pn/grandcoulee/visit/index.html`
- Tours: `https://www.usbr.gov/pn/grandcoulee/visit/tour.html`
- Laser show: `https://www.usbr.gov/pn/grandcoulee/visit/laser.html`

Verified 2026 rules implemented in code:

- Visitor Center: daily 8:30 AM–5:00 PM Pacific, with published federal-holiday closures.
- Pump-generating plant tours: Friday–Sunday, May 22–October 31, 2026; departures at 9, 10, 11 AM and 1, 2, 3 PM Pacific; first come, first served; subject to cancellation/change.
- Laser show: nightly May 22–September 30, 2026; 10 PM through July, 9:30 PM in August, 8:30 PM in September; subject to cancellation/change.

The schedule implementation refuses to reuse these dates in a future calendar year without re-verification.

## Weather and astronomy

- Weather: National Weather Service API point `47.955,-118.9833`.
- Astronomy: local SunCalc calculation for Grand Coulee coordinates in `America/Los_Angeles`.

## Secondary corroboration research

University of Washington DART provides daily Grand Coulee river-environment data, including outflow, spill, spill percentage and elevation, sourced from federal/PUD datasets. It is being evaluated as a delayed corroboration layer only, not as a replacement for current CWMS telemetry.

## Source policy

Every first-screen operational value must disclose whether it is measured, reported, calculated or estimated. A successful HTTP response is not enough to mark a field current. A failed or null source must degrade to unavailable/stale, never to zero or an invented value.
