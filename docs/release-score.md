# GRAND COULEE LIVE release scorecard

Last reviewed: 2026-09-09

This scorecard follows the 100-point product value function in the master execution specification. It intentionally distinguishes **code/source evidence** from **deployed-browser evidence**. Categories that depend on a real deployment, Lighthouse or viewport QA are not awarded their final points yet.

## A. Immediate visitor usefulness — 20 points

**Evidence-backed score: 18/20**

Implemented: first-screen operational metrics, explicit partial-live state, Lake Roosevelt/full-pool context, null-safe spill withholding, estimated MW only when inputs exist, Visitor Center status, next tour, laser-show timing, sunset/weather, a `Should I go now?` synthesis, and mobile ordering that prioritizes generation, lake, spill and next tour.

Remaining evidence gap: deployed/mobile validation of the actual first-view experience.

## B. Operational truth — 20 points

**Evidence-backed score: 19/20**

Implemented and tested: field-level CWMS ingestion; measured/reported/calculated/estimated distinctions; no null-to-zero spill conversion; no inferred generation flow from total outflow; MW withheld while turbine flow is absent; source-relative freshness/timestamps; validated hydraulic-head fallback; 1.13% generation MAPE across 346 out-of-sample days; and `PARTIAL LIVE · 2/5 core fields` instead of a blanket current state.

One point remains held until deployed provenance/stale-state rendering is visually verified.

## C. Interactive dam experience — 15 points

**Evidence-backed score: 13/15**

Implemented: interactive SVG/isometric facility representation, required major components, live reservoir waterline coupling, Flow Mode, Engineering Mode, telemetry-controlled animations, verified powerhouse capacities/unit counts/spillway facts, and an accessible button alternative to the diagram.

Remaining evidence gap: deployed touch/viewport QA.

## D. Visitor-event intelligence — 10 points

**Evidence-backed score: 10/10**

Implemented: year-aware 2026 Reclamation schedule, operating-day/departure logic, next-tour calculation, Visitor Center status and holiday closures, laser time transitions, Pacific timezone handling, 2027 refusal guardrail, NOW timeline, dedicated `/api/visitor`, and 18 schedule edge-case tests.

## E. Reliability and graceful degradation — 10 points

**Evidence-backed score: 9/10**

Implemented: independent series retrieval, legacy hourly fallback, source freshness, partial-live state, value withholding, `/api/health`, six-hour source monitoring, CI source probes, and a useful visitor experience when operational fields are missing.

Remaining gap: no dedicated durable cross-deployment latest-known-good datastore.

## F. Mobile UX — 10 points

**Provisional score: 7/10**

Code evidence: responsive 390px-class layout, one-column fallback below 430px, required top-four metric priority, 44px interaction targets and no forced landscape orientation.

Final points require real-browser QA at 390×844, 430×932 and tablet portrait.

## G. SEO / discoverability — 5 points

**Evidence-backed score: 5/5**

Implemented: high-intent metadata, canonical, Open Graph, Twitter metadata, robots, sitemap, WebApplication structured data, TouristAttraction relation, BreadcrumbList, dynamic FAQ and interpretive content.

## H. Performance — 5 points

**Provisional score: 3/5**

Build evidence: custom SVG instead of heavy 3-D runtime, successful optimized production build, about 114 kB first-load JS on the main route in current CI, lazy reference image, and server-side/cached federal requests.

Final points require deployed Lighthouse evidence for Performance ≥90, LCP <2.5s and CLS <0.1.

## I. Accessibility — 5 points

**Provisional score: 4/5**

Code evidence: semantic metric labels, keyboard controls, visible focus, non-color-only state text, reduced-motion handling, textual diagram descriptions, accessible chart title/description and 44px controls.

Final point requires deployed accessibility audit/Lighthouse ≥95 plus keyboard/screen-reader spot checks.

---

## Evidence-backed subtotal

Current evidence-backed/provisional total: **88/100**.

This is **not a release-pass score**. The specification requires ≥92/100 and no category below 70%; mobile, performance and accessibility still contain unverified deployed-browser points.

## Hard-veto status

The current hard veto remains open because the official current USACE Grand Coulee feed is publishing only 2/5 core numeric fields. Current generation flow and spill are unavailable, so current estimated MW and a current spill yes/no claim are both withheld. The product remains partial-live and full production promotion remains blocked under the master specification.

The code/build/model suite is green; this veto is an upstream source-truth condition, not permission to invent a replacement value.
