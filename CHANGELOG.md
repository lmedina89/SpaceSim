# Changelog

## v0.1.4.2 — System Map + Discovery & Anomalies

- Added interactive mobile-first logarithmic SYSTEM MAP with live body/ship/COSMOS markers and target/scan/transit handoff.
- Added persistent 0–3 layered discovery depth for cosmic sources.
- Added 9–15 deterministic anomaly signals per seeded system across speculative, anomalous and intentionally impossible/fictional reality classes.
- Added anomaly visual families: curvature rings, phase rifts, interference lattices, orbital knots, dark mirrors, frozen filaments, temporal echoes, ghost stars, vacuum blooms, reverse shadows, resonant shells and fracture gates.
- Added explicit reality-class UI so impossible anomalies are not presented as solved science.
- Persisted discovery records and scan depth through save/load without changing save schema 1.
- Persisted space-weather AUTO state, next-event schedule, active CME fronts, front progression and deterministic RNG progress through save/load.
- Preserved v0.1.4.1.2 stellar rendering/perceptual LOD and all existing navigation/physics systems.
- Automated QA: 93/93 tests passing plus static/syntax checks.

## v0.1.4.1.2 — Stellar Rendering & Approach Polish

Built directly from v0.1.4.1.1 Navigation & Experiment Lifecycle Polish. Save schema remains 1 and Three.js remains pinned to 0.185.0.

### Stellar rendering

- Replaced the flat close-range star presentation with layered seeded photosphere/granulation detail.
- Increased stellar sphere tessellation for smoother close approaches.
- Added a view-facing limb-darkening proxy so the photosphere reads as a luminous sphere rather than a flat disk.
- Replaced the dense cotton-like corona shell with smooth additive halo layers plus a sparse filamentary micro-corona.
- Replaced thick torus/ribbon prominences with seeded curved tube filaments using bright cores and softer halos.
- Added seeded active-region glows and rare visual flare proxies.
- Added explicit visual-science metadata clarifying that convection/MHD/radiative transfer are not solved.

### Perceptual stellar LOD

- Added `stellarPerception.js` with apparent-angular-size visual profiling.
- Macro stellar phenomena are preserved/optionally emphasized at long range rather than distance-culled.
- Only micro/noisy detail is reduced at range.
- Added smooth surface-detail and micro-corona transitions with no hard stellar LOD pop.
- Removed the old CME renderer-scale visibility cutoff so active macro space-weather visuals remain available.

### Exposure / background polish

- Added gentle ACES tone mapping and apparent-angle exposure adaptation for close-star views.
- Deep-space stars, nebulae and especially the galactic band dim smoothly only when a star dominates the view.
- Broadened and de-regularized the seeded galactic band, reduced its opacity/point size, and lowered the chance that it reads as an accretion disk behind a star.

### Approach / navigation presentation

- Added dynamic near-clip adjustment near finite-radius bodies to reduce close-surface clipping.
- Stellar targets now report STELLAR VICINITY / INNER CORONA / LOW CORONA / PHOTOSPHERE proximity zones and distance in R★.
- Stellar scanner/type text includes spectral class and temperature when available.
- TRANSIT streak/FOV cues now decay smoothly after arrival/disengage rather than snapping off on one frame. Newtonian position and velocity logic are unchanged.

### QA hardening

- Added pure unit coverage for stellar perceptual LOD behavior and apparent angular radius.
- Added static guards for layered stellar rendering roles, removal of legacy thick-torus prominences, close-star exposure/background adaptation, camera near-clip logic, CME macro preservation and transit visual release.
- Added per-star procedural texture disposal tagging so system regeneration does not leave generated photosphere textures undisposed.

### Unchanged

- Save schema remains 1.
- Three.js remains pinned to 0.185.0.
- Newtonian physics, TRANSIT coordinate translation, BOOST acceleration, flight-computer behavior and particle experiment lifecycle semantics are unchanged.
- No `.github/workflows/*` files and no landing code were added.

## v0.1.4.1.1 — Navigation & Experiment Lifecycle Polish

Built from v0.1.4.1 Extreme Objects, Space Weather & Scientific Overlays.

### Navigation

- Added speculative bounded **BOOST** propulsion at 5,000 m/s² main/reverse acceleration.
- Engine selector now cycles FLIGHT → CRUISE → BOOST.
- Added actual inertial **velocity-vector (`V⃗`) HUD marker** separate from the nose reticle.
- Added **PROGRADE** and **RETROGRADE** attitude alignment; attitude only, no thrust.
- Added physical bounded-thrust **TURN & BURN** to cancel lateral velocity toward a captured nose direction.
- Renamed MATCH VELOCITY UI to **STOP RELATIVE** for clearer target-relative intent.
- Added **SPECULATIVE TRANSIT DRIVE** with 1c/10c/100c/500c/1000c coordinate-rate tiers.
- TRANSIT preserves local Newtonian velocity and moves only spacecraft reference-frame position.
- Added automatic transit tier step-down near destination.
- Added transit arrival envelope with physical BOOST braking reserve.
- Added swept massive-body transit route guard.
- Added celestial-target or selected-COSMOS transit destination.
- Added optional AUTO CAPTURE: TRANSIT → BOOST → physical APPROACH/BRAKING/CAPTURE/HOLD.
- TRANSIT is blocked during live local particle experiments/body contact and locks simulation warp to 1×.
- Enhanced visual-only star/reference streak and FOV cues during high-tier transit.

### Particle experiment lifecycle

- Added active/complete lifecycle state and completion time.
- Retains final valid live observation bounds when a field reaches zero particles.
- Completed fields no longer leave FRAME/TRACK/ORBIT pointed at an empty origin.
- Completed fields release the 60× particle-safety warp cap immediately.
- Requested 600×/3,600× warp can be remembered while capped and restored when the final live experiment completes.
- Added deterministic **REPLAY FIELD**.
- Added peak/birth/death lifecycle telemetry for Particle Life.
- Physical RENDEZVOUS refuses completed fields until replayed.
- Bounded completed-field retention prevents unbounded session history.

### QA hardening

- Added transit unit tests for tier normalization, arrival braking reserve, automatic tier step-down, no-overshoot advancement, swept route guards and starting-clearance guards.
- Added BOOST propulsion and TURN & BURN regressions.
- Added experiment completion/final-frame/warp-release/deterministic-replay regressions.
- Static check now requires unique HTML IDs and verifies literal app `#id` selectors resolve in the shell.
- Retains direct `this.method()` class-method integrity audit introduced after the earlier Safari runtime failure.

### Unchanged

- Save schema remains 1.
- Three.js remains pinned to 0.185.0.
- No `.github/workflows/*` files in the mobile distributable.
- No landing code added.
