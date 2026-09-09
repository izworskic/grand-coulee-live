# Grand Coulee Smart Visit Planner

Grand Coulee Live includes a deterministic visit-planning layer designed around real visitor decisions rather than a generic attraction score.

## Inputs

- Arrival date/time at Grand Coulee, explicitly in Pacific Time
- Time budget: 45 minutes, 90 minutes, 3 hours, half day, or through the laser show
- Primary interest: balanced visit, plant tour, family, engineering/operations, history, photography/scenery, or laser show
- Walking preference: standard or minimize walking

## Schedule-aware decisions

The planner uses the same verified Bureau of Reclamation 2026 schedule logic as the visitor-status engine. It calculates:

- Visitor Center time that actually fits the visit window
- Tour departures that can realistically be reached and completed
- When an imminent first-come tour should be protected before other activities
- Whether the laser show fits the selected window
- Long gaps between Visitor Center closing and the evening laser show
- Estimated visitor pressure from calendar/schedule signals without claiming live parking occupancy

Future calendar years are not allowed to reuse the 2026 schedule without verification.

## Persona-aware outputs

The planner can return human recommendations such as:

- GO TO TOUR PARKING FIRST
- GOOD FULL VISIT WINDOW
- GOOD TIME TO VISIT
- SHORT VISIT — USE YOUR TIME CAREFULLY
- GOOD LASER-SHOW PLAN
- COME LATER FOR THE LASER
- OUTDOOR VISIT ONLY TODAY
- SCHEDULE VERIFICATION REQUIRED

The result includes a timed itinerary in Pacific Time, tour-readiness alerts, mobility-sensitive transitions, live same-day weather/sunset context, and expectation-setting information for the tour and laser show.

## Truth and safety rules

- First-come tour availability is never represented as a confirmed reservation.
- Estimated visitor pressure is explicitly not a live parking count.
- Today’s weather and live dam telemetry are not applied to future-date plans.
- Public viewing areas are recommended; restricted operational areas are never presented as visitor destinations.
- The tour and laser experience are described accurately so visitors do not mistake the tour for unrestricted powerhouse access or the laser program for a simple music-and-light show.

## Validation

`tests/visitPlanner.test.ts` covers tour-first behavior, no-tour days, long laser gaps, evening laser visits, future-year schedule refusal, and July 4 visitor-pressure labeling.
