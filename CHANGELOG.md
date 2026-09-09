# Changelog

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
