# Source audit — Grand Coulee Live

Last reviewed: 2026-09-08

## Operational hydrology

Primary source: U.S. Army Corps of Engineers Northwestern Division / CROHMS Grand Coulee reports.

- Hourly: `https://public.crohms.org/dd/nwdp/project_hourly/webexec/rep?ago=0&r=gcl`
- Daily: `https://public.crohms.org/dd/nwdp/project_daily/webexec/rep?ago=0&r=gcl`
- Hourly report configuration: `https://public.crohms.org/dd/nwdp/project_hourly/config/gcl.in`
- Modern USACE Water Data location page: `https://water.usace.army.mil/overview/nwdp/locations/gcl`

The official hourly configuration identifies these source time series:

- `GCL.Flow-Out.Ave.1Hour.1Hour.CBT-REV`
- `GCL.Flow-Gen.Ave.1Hour.1Hour.CBT-REV`
- `GCL.Flow-Spill.Ave.1Hour.1Hour.CBT-REV`
- `GCL.Elev-Forebay.Inst.1Hour.0.CBT-REV`
- `GCL.Elev-Tailwater.Inst.1Hour.0.CBT-REV`

The application derives hydraulic head as forebay minus tailwater when reading the standard report.

### Current upstream condition

On September 8, 2026 the official Grand Coulee hourly report renders the date but its operational rows are blank. The current daily endpoint also exposes a July 2026 table rather than a current September daily report. This appears to be an upstream publication/data condition, not an application parser failure.

**Release consequence:** do not present current reservoir, spill, outflow or estimated MW as live while the source is blank/stale. Grand Coulee Live intentionally returns unavailable/stale states instead of substituting zero or sample values.

USACE itself states that realtime water-control data are provisional and subject to revision.

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

## Engineering references

USACE Northwestern Division and Bureau of Reclamation project information are used for public engineering facts. No restricted-access or speculative security detail is included.

## Source policy

Every first-screen operational metric must have an observation timestamp and provenance. A failed source must degrade to unavailable/stale, never to an invented value.
