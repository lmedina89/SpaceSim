# Changelog

## v0.1.4.5.3 — Takeoff Flight Recovery Reliability Hotfix

- Built directly from the exact v0.1.4.5.2 archive after the physical iPhone Safari release gate still failed. The interrupted v0.1.4.6 astronomy work was not used as a base.
- Changed the post-takeoff camera attitude from the steep planet-facing v0.1.4.5.2 pose to the spacecraft's actual body-relative prograde direction, so a successful return to orbit cannot visually masquerade as a frozen surface view.
- Successful takeoff now force-restores an actively running 1× flight loop instead of inheriting a pre-surface paused state.
- Added a central held-input release registry. Every touch/hold binding can now be force-released across WebKit pointer-capture loss; takeoff clears throttle, reverse, BRAKE, RCS, roll, LOOK pointer state and surface movement before orbital handoff.
- Expanded orbital handoff invariants to require `running === true` and neutral/released pilot controls in addition to detached surface renderer/session/UI, ship camera, 1× time and finite ship state.
- Replaced fatal post-render handoff invariant throws with recovery to a known live 1× orbital state, preventing a verification miss from tripping the global animation-loop fault latch and looking like a freeze.
- `ASCENT COMPLETE` now requires three successfully rendered orbital frames. N-body/ship integration remains held at zero dt during this short verification window.
- Added a temporary compact physical-test diagnostic chip showing surface ownership, render mode, run/input state and verification-frame count for iPhone Safari screenshots.
- No astronomy, universe-rendering, cockpit redesign, orbital-force, propulsion, surface-generation, weather, anomaly or save-schema changes. Save schema remains 1.
- Automated QA: **119/119 tests passing** plus static/syntax checks. Physical iPhone Safari remains the release gate.

## v0.1.4.5.2 — Ascent Orbit Handoff Reliability Hotfix

- Fixed the physically reported iPhone Safari takeoff failure where ascent visuals completed and cockpit/UI returned to ORBIT while the previous surface framebuffer remained visible and the transition appeared frozen.
- Changed ascent to a transactional handoff: surface renderer/session/UI state is detached before ORBIT is committed.
- The animation frame that completes ASCENDING now falls through immediately to the normal orbital renderer instead of returning after surface teardown.
- The first restored orbital frame uses zero simulation dt, so no N-body/ship step is mixed into the surface-teardown callback.
- `ASCENT COMPLETE` is queued until a real orbital frame renders successfully; it is no longer announced merely because cleanup code ran.
- Added explicit post-cleanup/post-render invariants covering landing phase, surface session/region/renderer ownership, surface UI class, camera mode, 1× handoff warp and finite ship position/velocity.
- Surface renderer ownership is cleared before local-world disposal so a disposal fault cannot leave the renderer logically stuck in surface mode.
- Added four regression tests targeted at the actual stale-frame/ascent-handoff failure mode.
- No physics, propulsion, surface-generation, weather, anomaly, cockpit geometry or save-schema changes. Save schema remains 1.
- Automated QA: **117/117 tests passing** plus static/syntax checks.

## v0.1.4.5.1 — Landing Startup Reliability Hotfix

- Fixed startup regression where `newSystem()` used `surfaceTransition` before the app constructor initialized it, producing `Startup failed: Landing transition state is required.`
- Explicitly initializes the landing transition controller and surface recovery guard before any startup/reset lifecycle call.
- Added startup-source regression coverage that would have failed v0.1.4.5 before release.
- Added a complete unit lifecycle regression covering DESCEND → LANDED → ASCEND → ORBIT → immediate second DESCEND.
- No new gameplay features or renderer/physics/weather/anomaly changes.
- Save schema remains 1.
- Automated QA: **113/113 tests passing** plus static/syntax checks.

## v0.1.4.5 — Landing Reliability & Spacecraft Presence

- Replaced the ambiguous surface/orbit lifecycle with explicit **ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT** state control.
- Fixed the reported TAKEOFF/re-land failure path by preventing duplicate surface entry during transitions and forcing successful ascent back to a clean orbital state.
- Added guarded recovery cleanup for failed surface entry/ascent so renderer/UI/session state cannot remain half-transitioned.
- Added near-ship boarding requirement: **BOARD / TAKEOFF** requires the player to return within 36 m of the spacecraft.
- Added compact ship-distance / boarding-readiness status and explicit surface phase readout.
- Added visible scripted descent/ascent presentation with VTOL plumes and landing-site ground glow; successful ascent returns at safe orbit and 1×.
- Rebuilt the parked spacecraft with smoother hull/nose geometry, canopy, swept wings, tail surfaces, twin engines, VTOL thrusters, landing gear and nav/strobe/landing lights.
- Preserved authoritative orbital ship physics; surface spacecraft remains a renderer-local visual representation.
- Added optional schema-1 persistence for pre-surface running/time-scale state so surface saves do not accidentally restore a temporary landed pause as orbital intent.
- Automated QA: **111/111 tests passing** plus static/syntax checks.

## v0.1.4.4.1 — Surface HUD & Mobile Exploration Polish

- Reworked the planetary surface HUD into a **compact-by-default exploration strip** so terrain and anomaly visuals remain visible on iPhone landscape.
- Compact view keeps planet/region, weather, nearest signal, discovery count, **SCAN** and **SPRINT** immediately available.
- Added **DETAILS / HIDE** expansion for gravity, temperature, atmosphere, coordinates, wind, ship distance, weather detail and scan archive text.
- Moved **SAVE** and **TAKEOFF / ORBIT** into the expanded details section because they are not constant exploration controls.
- Reduced the WALK pad footprint and tightened it to the safe bottom-right edge.
- Added backward-compatible persistence for the expanded/collapsed HUD preference inside the optional schema-1 surface session payload.
- No terrain generation, anomaly visuals, weather state, parked-ship rendering, orbital physics or landing logic was redesigned.
- Automated QA: **106/106 tests passing** plus static/syntax checks.

## v0.1.4.4 — Planetary Environments & Surface Weather

- Added **three deterministic landing regions** to the first landable home world: Shatterfall Basin, Glasswind Flats and Frostscar Rise.
- Added a mobile-safe landing-region selector to the Flight Scanner while preserving Shatterfall as the default System Map landing destination.
- Added persistent seeded **surface weather** on a local real-time clock that remains separate from held orbital N-body time.
- Ordinary environment events: Dust Front, Low Fog Bank, Frost Squall and Electrostatic Storm.
- Explicitly impossible anomaly-weather events: Upward Rain, Shadow Fog, Suspended Lightning and Sky Fracture.
- Weather changes clouds, particles, fog, visibility, scene exposure and temperature readout presentation; it does **not** apply aerodynamic force, damage, erosion, wetness or hidden anomaly physics.
- Added weather/wind/surface-clock readouts and save/load continuity for the exact local weather event/timer/RNG state.
- Added a visible lightweight **parked spacecraft exterior** at every landing site with hull, canopy, wings, engine pods, landing legs, navigation lights and a landing beacon.
- Added distance-to-ship readout; the parked surface model is visual only and does not replace authoritative orbital ship state.
- Preserved v0.1.4.3.1 low-obstruction cockpit view, v0.1.4.3 surface/anomaly foundation, v0.1.4.2 discovery/weather continuity and all protected physics/navigation systems.
- Automated QA: **104/104 tests passing** plus static/syntax checks.

## v0.1.4.3.1 — Ship Cockpit View

- Added a default-on **low-obstruction cockpit canopy overlay** for SHIP VIEW so the spacecraft now feels inhabited instead of being only a bare camera.
- Added subtle canopy glass reflections, top arch, side struts and lower dashboard framing designed to preserve central visibility rather than hide the universe.
- Added automatic cockpit hiding while in OBSERVE camera modes and while inside planetary surface sessions.
- Added a **COCKPIT ON/OFF** toggle in the MORE panel for players who want a fully unobstructed view.
- Added optional backward-compatible schema-1 persistence for the cockpit preference (`cockpitEnabled`).
- Preserved all existing orbital physics, surface systems, System Map, anomalies and rendering behavior.
- Automated QA: **100/100 tests passing** plus static/syntax checks.

## v0.1.4.3 — Planetary Landing Foundation

- Added the first detailed landable generated home world with deterministic **Shatterfall Basin** surface region.
- Added seeded 2.4 km local terrain with crater/ridge/basin relief plus rock, frost/crystal, ember/fissure, glass and mineral environmental dressing.
- Added seven nearby surface anomaly families: Fracture Gate, Gravity Knot, Frozen Lightning Field, Reverse Shadow Monolith, Vacuum Bloom, Ghost Ruin and Chronal Shear.
- Added two conventional geology scan POIs so the region contrasts normal terrain with anomalous sites.
- Added local first-person LOOK + touch movement/sprint controls and proximity-based surface scanning.
- Added LAND / DESCEND entry from target/System Map and clearly scripted TAKEOFF / ORBIT return to a safe 5-radius orbit.
- Added optional schema-1 surface-session persistence for local position/look and scanned/selected POIs; older schema-1 saves remain compatible.
- Orbital N-body time is intentionally held during the local surface instance; surface anomalies remain visual/discovery content only and do not add hidden gravity/teleport/time physics.
- Added surface renderer using one terrain mesh, instanced scatter and lightweight deterministic anomaly geometry for mobile-first performance.
- Automated QA: **98/98 tests passing** plus static/syntax checks.

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
