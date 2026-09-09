# Universe Lab v0.1.4.2 — System Map + Discovery & Anomalies QA Report

## Build identity

- Version: **0.1.4.2**
- Build marker: **DISCOVERY-142**
- Source baseline: **v0.1.4.1.2 — Stellar Rendering & Approach Polish**
- Save schema: **1 (unchanged)**
- Three.js: **0.185.0 (pinned)**
- Target deployment: GitHub Pages `main` → `/(root)`

## Automated status

`npm run qa` passes **93/93 tests** plus the static file/shell/syntax validation.

New v0.1.4.2 coverage verifies:

- deterministic seeded anomaly generation,
- 9–15 anomaly signals per tested seed,
- explicit impossible/fictional anomaly entries,
- deterministic repeat generation for the same seed,
- space-weather snapshot restoration preserving scheduled event time and active-front progression,
- required SYSTEM MAP/COSMOS discovery UI wiring,
- required anomaly/system-map source modules and build identity.

All inherited physics/navigation/stellar/experiment/impact/compact-object tests remain passing.

## Compatibility guards

v0.1.4.2 does **not** change:

- `SIMULATION.schemaVersion` (still 1),
- direct Newtonian major-body gravity,
- velocity-Verlet major integrator,
- FLIGHT / CRUISE / BOOST acceleration values,
- the fictional TRANSIT coordinate-rate tiers,
- propulsion-safe APPROACH/HOLD logic,
- particle experiment global budget/warp cap,
- stellar perceptual-LOD policy from v0.1.4.1.2.

New save fields are optional. Loading an older schema-1 save without discovery/weather snapshots remains valid; its weather manager receives a fresh timeline because no prior timeline exists to restore.

## Model-boundary checks

- Anomalies live in `CosmicPhenomenonRegistry`, not the massive-body registry.
- They do not silently contribute Newtonian gravity.
- Impossible/fictional anomalies are explicitly labeled after discovery.
- SYSTEM MAP is an interface projection of live data, not a second physics solver.
- CME continuity persistence does not upgrade the kinematic CME approximation into MHD/radiation simulation.

## Browser/device QA caveat

Automated tests are source/math/state tests. They do not establish physical iPhone Safari touch quality, WebGPU frame rate, drawer safe-area fit, or subjective anomaly visual quality. Physical iPhone Safari remains the release gate.

## Recommended physical iPhone path

1. Confirm **v0.1.4.2 / DISCOVERY-142** and no runtime ERR.
2. Open SYSTEM MAP and verify landscape fit/touch markers.
3. Select a normal planet from the map and verify TARGET/scanner handoff.
4. Select an unidentified anomaly diamond and scan to 1/3, then 2/3, then 3/3.
5. Confirm reality labels include SPECULATIVE / ANOMALOUS / IMPOSSIBLE-FICTIONAL where applicable.
6. Open TRANSIT from a map-selected signal and verify normal transit/capture behavior.
7. Save/reload discovery progress.
8. Save/reload with a known SPACE WEATHER countdown or active CME and verify continuity.
9. Regress stellar close approach, distant stellar spectacle, BOOST, APPROACH/HOLD, TRANSIT arrival, COSMOS observation, overlays, compact objects, impacts and particle experiments.
