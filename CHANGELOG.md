# Changelog

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
