# Architecture — Universe Lab v0.1.1.3

## Non-negotiable rule

**The simulation owns the universe. Three.js only renders a local view of that state.**

```text
Seed / Saved State
       │
       ▼
Deterministic System Generator
       │
       ▼
Stable Entity Registry
       │
       ├──────────────► Experiment Registry
       │
       ▼
Float64 Authoritative State · SI Units
       │
       ├── Direct mutual Newtonian gravity
       ├── Velocity-Verlet integration
       ├── Typed-array minor test-particle field
       ├── Spacecraft translational dynamics
       ├── Finite-radius collision monitor
       ├── Orbital/target instrumentation
       └── Forward N-body trajectory predictor
       │
       ▼
Floating Reference Frame
       │
       ▼
Three.js Rendering Boundary
WebGPURenderer → WebGL2 fallback
```

## Entity tiers

### Major gravity sources

Stars, planets, moons, launched laboratory bodies, and spawned black holes are rich entities with Float64 positions/velocities and metadata. They mutually gravitate.

The direct solver hard limit remains 128 bodies. Interactive spawning reserves one solver slot for trajectory prediction, so the lab refuses to exceed the safe live-source budget rather than silently switching algorithms.

### Minor test particles

The asteroid/test-particle field uses structure-of-arrays-style typed data:

- Float64 positions,
- Float64 velocities,
- Float32 render projection.

One GPU `Points` object renders the field. Minor particles feel all major gravity sources but do not source gravity, collide, or fragment yet.

### Visual-only universe

The distant starfield and nebula-like visual layers are rendering data, not physical bodies. This lets the solar system look much larger than the expensive simulated neighborhood.

## Seeded system generation

v0.1.1 generates low-eccentricity, near-Keplerian initial states using physical masses and distances.

Star metadata includes a deterministic luminosity proxy and spectral class. Planet type probability is influenced by a simple luminosity-dependent snow-line proxy.

Moons are only generated when a conservative fraction of the parent's Hill sphere leaves room beyond a minimum planet-radius multiple. Parent/moon positions and velocities are corrected so their local barycenter remains at the original planetary orbital state.

After generation, the complete system is translated into a barycentric rest frame by subtracting center-of-mass position and velocity from every generated body.

This is a plausible sandbox initializer, not an astrophysical formation simulation.

## Integrators

### Live major bodies

Velocity Verlet with direct pair gravity.

### Trajectory predictor

The predictor clones all current major gravity sources, adds the probe/ship/projectile, and forward-integrates that complete clone with the same direct solver and velocity-Verlet integrator.

Benefits:

- massive launched objects correctly perturb predicted targets,
- the predictor is dynamically consistent with the live Newtonian model,
- no renderer dependency,
- deterministic and unit-testable.

The predictor deliberately excludes minor test-particle gravity and future thrust commands.

Prediction line samples are rendered from their Float64 physical coordinates through the same floating reference frame as the live universe.

## Collision prediction

Prediction contact does not rely only on endpoint overlap. Each timestep performs a relative swept segment-vs-sphere check using the previous/new projectile and target positions. This reduces missed finite-radius contacts when using larger prediction timesteps.

Live major-body contact still uses finite-radius overlap monitoring. v0.1.2 should add collision response/continuous handling rather than contaminating v0.1.1 with a placeholder response.

## Scanner architecture

Two different concepts are intentionally separated:

1. **Osculating two-body metrics** — cheap instantaneous target-relative orbit diagnostics.
2. **N-body forward prediction** — more expensive future integration using all major sources.

The scanner never labels the two-body elements as exact future orbits in a multi-body system.

## Spacecraft

Spacecraft translation is integrated under gravity + configured drive accelerations. Ship-local forward/right/up basis vectors include roll, so RCS input is local to the craft orientation.

Current attitude controls directly change yaw/pitch/roll. Rigid-body rotational inertia, moments of inertia, torque, reaction wheels, propellant mass flow, and structural stress are future propulsion/vehicle modules.

The DAMP control remains explicitly fictional.

## Performance strategy

Do not choose algorithms only by asymptotic complexity.

```text
Major gravity sources (small N)      Direct O(N²)
Future medium N                      Barnes–Hut octree
Future very large N                  GPU tree / FMM research
Minor non-self-gravity field         Typed arrays + direct source loop
Visual dust/stars                     GPU-only
Local surface rigid bodies            Separate local solver/WASM
Fluids                                Scale-specific specialized solvers
```

The current direct solver is exact under the Newtonian point-mass model and faster/simpler than tree construction at the small major-body counts the seeded system uses.

## Reference frames

Authoritative world positions remain Float64 SI meters. Rendering subtracts the spacecraft position and converts meters to local render units.

Future planetary landing architecture should add nested frames:

```text
system frame
  → planet frame
     → surface tile frame
        → spacecraft/local rigid-body frame
```

without changing the authoritative entity identity model.

## Save strategy

Save schema remains **1** and is backward-compatible with v0.1.0/v0.1.0.1 payloads.

New v0.1.1 fields such as target ID, path toggle, trajectory horizon, roll, and richer body metadata are optional. Old saves therefore remain recoverable.

The procedural seed supplies the untouched base system; major-body/ship evolved state is snapshot-saved. The high-count minor field is regenerated deterministically in this milestone.

### Mobile visible-viewport contract (v0.1.1.3)

The UI shell is sized from `visualViewport.height` when available rather than relying only on `100svh`. This keeps interactive flight controls inside the actually visible Safari region while browser chrome expands/collapses. This adjustment affects only presentation geometry.

### Navigation motion-reference layer

The renderer owns a camera-local line field that visualizes spacecraft inertial velocity with a deliberately logarithmic/exaggerated mapping. It is a one-way renderer consumer of ship velocity and is not part of the entity registry, save state, collision system, gravity solver, trajectory predictor, or scientific particle field. The separation is intentional so visual flight feel cannot contaminate authoritative physics.


## Mobile control-surface contract — v0.1.1.3

Continuous pilot inputs are treated as controller state, not click actions. The input layer owns pointer capture and must always have global release fallbacks. The game surface suppresses browser text-selection/callout behavior, while form controls remain normal editable web controls. This separation is required for sustained thrust/RCS operation on iOS Safari.
