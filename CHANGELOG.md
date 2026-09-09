# Changelog

## v0.1.3.2 — Observation & Experiment Navigation Polish

Built from v0.1.3.1 to remove the need to physically commute to newly spawned particle experiments just to inspect them.

### Added / changed

- massless OBSERVE camera with FRAME / TRACK / ORBIT modes,
- experiment centroid / mean-velocity / active-radius observation state from authoritative typed arrays,
- LOOK pad orbits the observation camera without changing spacecraft attitude,
- one-tap SHIP VIEW return; APPROACH becomes SHIP VIEW while observing,
- selectable active experiment list and NEXT FIELD control,
- physical RENDEZVOUS to an experiment using the existing bounded-thrust approach computer,
- smarter nearby field placement based on field radius rather than a 40,000 km minimum,
- smaller mode-appropriate defaults for Life/Species experiments,
- OBSNAV-132 build marker to help detect stale mobile deployments,
- restored explicit particle-field parameter/status methods in the v0.1.3.1 app integration path and added static regression coverage for them.

Observation cameras never alter authoritative ship or particle state. Schema 1 remains unchanged; observation/session particle fields are not serialized.


## v0.1.3.1 — Navigation Arrival & Strong-Gravity Safety Hotfix

Built from v0.1.3 after physical iPhone testing showed APPROACH could reach a black-hole target, release guidance with huge target-relative velocity, and then numerically run away under strong Newtonian gravity/time stepping.

### Fixed

- APPROACH now enters CAPTURE and then persistent thrust-powered HOLD instead of disabling guidance at distance-only arrival.
- HOLD maintains target-relative position/velocity with bounded station-keeping acceleration and explicit target-gravity counter-thrust.
- propulsion-safe stand-off derives an additional radius from `GM/r²` and selected engine acceleration; extreme-gravity targets are held far enough out for the drive to retain control authority.
- navigation warp uses remaining distance to stand-off rather than physical target radius; CAPTURE max 60×, HOLD 1×.
- strong gravity now lowers the physics substep ceiling dynamically.
- Newtonian model validity guard pauses at 10% c or inside 100 Schwarzschild radii (minimum 100 km guard) instead of displaying runaway/superluminal motion as valid science.
- APP navigation HUD exposes CAPTURE/HOLD, relative velocity, offset, and target gravity.
- default auto-approach cruise-speed ceiling raised to 5,000 km/s, while actual acceleration remains bounded by the selected 20/120 m/s² experimental drive and braking envelope.

### Retained

- complete v0.1.3 Particle Experiment Framework and typed spatial hash,
- v0.1.2.1 impact stability/fragment controls,
- save schema 1 and Three.js 0.185.0,
- no `.github/workflows/*`; GitHub Pages remains `main` → `/(root)`.


## v0.1.3 — Particle Experiment Framework

Built directly from the physically tested v0.1.2.1 Impact Stability & Scientific Flight Navigation Polish baseline.

### Added

- reusable `ParticleExperimentManager` with a 40,000-slot global mobile-first budget and maximum four active fields,
- SoA typed-array particle state with Float64 authoritative positions/velocities,
- typed-array open-addressed `SpatialHashGrid`, generation stamps, linked cell membership, occupancy counts, and per-species cell counts,
- Gravity Cloud mode: major-body Newtonian test particles with finite-radius absorption and no particle self-gravity,
- Particle Life mode: explicitly artificial continuous-3D Conway-inspired birth/survival/death rules using neighboring grid-cell populations,
- Species Forces mode: explicitly artificial three-species local attraction/repulsion using cell-population aggregation rather than dense all-pairs particle force loops,
- ballistic Particle Gun with 10–5,000 particles, configurable speed/spread, ship-velocity inheritance, major gravity, finite-radius absorption, and bounded lifetime,
- single `THREE.Points` draw call per experiment field with shared Float32 render/color buffers,
- LAB controls for mode, count, field radius, neighbor radius, initial speed, artificial strength, major-gravity toggle, rule randomization, spawn/clear, and particle gun,
- particle experiment counts and CPU step time in the technical performance chip,
- session-local particle status telemetry (alive/total, absorbed, Particle Life births/deaths),
- experiment-safe global warp cap of 60× while any particle field exists.

### Scientific/architecture notes

- Gravity Cloud and Particle Gun are physical test-particle trajectories in the existing major-body Newtonian field.
- Particle Life and Species Forces are deliberately artificial rule systems and are labeled as such in UI/docs.
- Experiment particles do not source long-range gravity; Barnes-Hut/FMM/WebGPU self-gravity remains future work.
- High-count experiment fields remain session-local and are not serialized into schema-1 localStorage saves.
- Major-body gravity, velocity-Verlet, flight navigation, impacts, fragment budgets, body lighting, and save schema remain unchanged.

### Retained from v0.1.2.1

- FLIGHT/CRUISE propulsion, physical BRAKE, MATCH, APPROACH and navigation auto-warp,
- impact fragment cascade suppression and two-fragment primary cap,
- 16-fragment global resolved impact budget,
- body-color exposure-floor rendering for real iPhone WebGPU readability,
- iOS continuous-control input hardening,
- mobile branch-root GitHub Pages deployment with no workflow files.
