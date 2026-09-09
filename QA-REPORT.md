# Universe Lab v0.1.4.3.1 — Planetary Landing Foundation QA Report

## Build identity

- Version: **0.1.4.3**
- Build marker: **COCKPIT-1431**
- Source baseline: **v0.1.4.2 — System Map + Discovery & Anomalies**
- Save schema: **1 (unchanged)**
- Three.js: **0.185.0 (pinned)**
- Target deployment: GitHub Pages `main` → `/(root)`

## Automated status

`npm run qa` passes **98/98 tests** plus static file/shell/syntax validation.

New v0.1.4.3 coverage verifies:

- first generated home world exposes the intended landable surface profile,
- exactly one current detailed landable planet is advertised per generated system,
- deterministic Shatterfall generation for the same system/body,
- anomaly layout changes with another seed,
- seven anomaly POIs + two conventional geology POIs,
- speculative/anomalous/impossible surface reality classes are present,
- terrain height is finite and meaningfully non-flat,
- local movement obeys heading/sprint and hard region bounds,
- surface scan requires proximity,
- scanned POI state survives surface-session serialization/restore,
- required LAND / surface HUD / movement controls and source modules exist.

All inherited 93 physics/navigation/discovery/weather/stellar/experiment/impact tests remain passing.

## Compatibility/model guards

v0.1.4.3 does **not** change:

- save schema number,
- direct Newtonian major-body gravity,
- velocity-Verlet major integrator,
- FLIGHT / CRUISE / BOOST acceleration constants,
- TRANSIT coordinate-rate tiers,
- propulsion-safe APPROACH/HOLD logic,
- particle experiment budgets/warp cap,
- free-space anomaly gravity isolation,
- stellar perceptual-LOD policy,
- space-weather seeded scheduling/continuity.

Surface-specific model boundary:

- orbital N-body time is intentionally held during local surface exploration,
- surface anomaly visuals are not gravity sources and do not alter time/causality,
- landing/takeoff are scripted scene transitions, not atmospheric/aerodynamic simulations,
- local terrain is a bounded deterministic region, not a whole-planet streamed terrain claim.

## Device/browser caveat

No claim is made that automated Node tests establish physical iPhone Safari WebGPU performance, safe-area fit, touch quality, thermal behavior or subjective surface/anomaly appearance. Physical iPhone Safari remains the release gate.
