# GRAND COULEE LIVE

Operational + visitor intelligence for Grand Coulee Dam. Standalone Next.js application designed for GitHub + Vercel/serverless deployment. **No Replit dependency.**

## Product question

> What is Grand Coulee Dam doing right now, what will I see if I go, and when should I visit today?

The application combines current Grand Coulee operational observations, a physically based generation estimate, Lake Roosevelt context, official visitor schedules, NWS weather, astronomy, Banks Lake pumping context and an interactive educational dam representation.

## Official sources

- USACE CROHMS Grand Coulee hourly: `https://public.crohms.org/dd/nwdp/project_hourly/webexec/rep?ago=0&r=gcl`
- USACE CROHMS Grand Coulee daily: `https://public.crohms.org/dd/nwdp/project_daily/webexec/rep?ago=0&r=gcl`
- Bureau of Reclamation visitor information: `https://www.usbr.gov/pn/grandcoulee/visit/index.html`
- Bureau of Reclamation tours: `https://www.usbr.gov/pn/grandcoulee/visit/tour.html`
- Bureau of Reclamation laser show: `https://www.usbr.gov/pn/grandcoulee/visit/laser.html`
- National Weather Service API: `https://api.weather.gov/points/47.955,-118.9833`

## Data truth

`Estimated generation now` is not presented as a measured instantaneous plant value. It uses:

`P = rho * g * Q * H * eta`

where Q is current reported generation flow, H is current hydraulic head, and eta is a robust rolling efficiency calibrated against recent USACE daily reported average generation. The UI exposes confidence and provenance.

If an upstream source is missing or stale, the app shows unavailable/delayed/stale states rather than substituting zeroes or invented values.

## Visitor schedule guardrail

The current visitor configuration is explicitly verified for **2026** from Reclamation pages last updated March 11, 2026. The app does not automatically reuse the 2026 tour/laser schedule in future years. A future year falls back to `schedule not verified` until its source data is reviewed.

## Local development

```bash
npm install
npm run dev
```

## QA

```bash
npm test
npm run build
npm run backtest
```

The backtest retrieves recent official USACE daily tables and compares a fixed-efficiency baseline with 7-day and 14-day rolling median calibrations using out-of-sample days.

## API

- `/api/status` — normalized current status
- `/api/history?range=24h|7d|30d` — normalized history

Government requests are server-side and cached. Browsers do not directly hammer federal HTML sources.

## Production gates

Do not call the product production-complete if the current operational source is stale, parser tests fail, the generation backtest has not been reviewed, or the current calendar year's visitor schedule is unverified.
