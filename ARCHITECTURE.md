# Architecture — Universe Lab v0.1.3.2.1

## Core rule

**The renderer never owns the universe or experiment state.**

Authoritative celestial, spacecraft, and experiment coordinates remain in simulation modules. Three.js receives local floating-origin render buffers only.

## Runtime layers

```text
Seeded universe data
        ↓
Entity registry
        ↓
Simulation clock
        ├──────────── Flight computer
        │                  ↓
        ├──────────── ShipDynamics
        │
        ├──────────── Direct major-body Newtonian gravity
        │                  ↓
        │             Velocity-Verlet
        │                  ↓
        │             swept collisions
        │                  ↓
        │             impact resolver
        │
        └──────────── Particle Experiment Manager
                           ↓
               typed-array ParticleExperiment
                  ├─ Gravity Cloud
                  ├─ Particle Life
                  ├─ Species Forces
                  └─ Particle Gun
                           ↓
                typed spatial hash grid
                           ↓
Floating reference frame → Three.js/WebGPU renderer
```


## Observation camera layer

Observation is deliberately separated from simulation/navigation. `ParticleExperiment.observationState()` derives a centroid, mean velocity and framing radius from authoritative typed arrays without mutating them. The renderer recenters the floating reference frame on that observation centroid and computes a local camera pose through the pure `render/observationCamera.js` helper. No mass, thrust, teleportation or state change is associated with the camera.

The physical **RENDEZVOUS** path is separate: the selected experiment is exposed to the existing flight computer as a massless virtual target whose position/velocity are the current field centroid/mean velocity and whose radius is the current field extent. Ship motion therefore remains bounded by the declared engine acceleration and braking envelope.

## Particle data layout

Each `ParticleExperiment` owns SoA-style contiguous arrays rather than per-particle objects:

- `Float64Array position[count*3]`
- `Float64Array velocity[count*3]`
- `Float32Array renderPosition[count*3]`
- `Float32Array color[count*3]`
- `Uint8Array active[count]`
- `Uint8Array species[count]`
- `Float32Array age[count]`

This minimizes garbage collection and gives later WASM/WebGPU kernels a straightforward memory model.

## Spatial hash

`SpatialHashGrid` is a typed-array open-addressed uniform grid. It uses:

- integer cell coordinates,
- multiplicative integer hashing,
- a power-of-two table,
- generation stamps to avoid clearing the full hash table every build,
- linked particle indices within populated cells,
- aggregate cell counts and 3-species counts.

Particle Life sums occupancy across adjacent cells. Species Forces interacts with aggregate species populations at neighboring cell centers rather than every individual particle. This deliberately trades microscopic pair detail for bounded local work and mobile scalability.

## Particle scientific modes

### Gravity Cloud

Semi-implicit particle integration under all active major gravity sources. Experiment particles have no authoritative mass contribution and therefore do not appear in the direct gravity source array.

### Particle Life

An artificial continuous-particle cellular automaton. Alive/dead transition rules operate on spatial-cell neighborhoods. This is separate from the physics namespace because the rules are mathematical experiments, not claims of physical law.

### Species Forces

Artificial local non-reciprocal attraction/repulsion. Species forces are evaluated against spatial-cell aggregates and bounded to a declared maximum local acceleration.

### Particle Gun

Ballistic test-particle burst. Same major-gravity path as Gravity Cloud, finite-radius absorption, bounded active lifetime.

## Simulation-time contract

Particle fields cap global warp to 60× while active. Fine modes subdivide simulation intervals to <=1 s reference steps; simple ballistic/gravity fields permit larger internal steps but still inherit the same warp cap for predictable mobile cost.

If an experiment ever cannot consume the full requested interval within its substep budget, it records dropped experiment seconds rather than silently claiming exact integration. Under the enforced 60× normal frame cap this should not happen during healthy rendering.

## Render contract

Every experiment field is a single `THREE.Points` object with shared position/color buffers. Inactive slots are moved outside the visible region instead of creating/destroying Three objects. Clearing an experiment disposes its geometry/material.

Current body/impact rendering remains independent from particle fields.

## Budgets

- direct major gravity sources: 128
- resolved impact fragments: 16
- background minor test particles: 20,000
- active particle-experiment slots: 40,000 total
- active particle fields: 4
- Gravity Cloud: 30,000 per field
- Particle Life: 6,000 per field
- Species Forces: 4,000 per field
- Particle Gun: 5,000 per burst

These are **current mobile-first safety budgets**, not theoretical engine ceilings.

## Persistence

Save schema remains 1. Particle experiment state is deliberately session-local. System/body/ship saves are unchanged. A future experiment persistence module can store deterministic configuration plus optional binary snapshots without forcing large JSON arrays into localStorage.


## Navigation stability boundary

The flight computer remains outside renderer ownership. APPROACH computes a braking-safe velocity envelope, a propulsion-safe stand-off, CAPTURE, and persistent HOLD. HOLD adds bounded counter-thrust for the selected target's local gravity plus target-relative position/velocity correction. Manual controls cancel guidance rather than competing with it.

`navigationPhysicsStepLimitSeconds()` derives a smaller integration ceiling from local `sqrt(r/g)` gravitational dynamical time when necessary. `SimulationClock.advance()` accepts that ceiling and can stop its remaining substeps when the Newtonian validity guard requests a halt. The guard pauses rather than clamping state.

## Existing impact/flight boundaries

Impact resolution and flight-computer modules remain isolated from particle experiments. Impact visual ejecta is still presentation-only and is not automatically converted into ParticleExperiment bodies in v0.1.3.1. That can be added later through an explicit adapter without contaminating impact mass accounting.

## Future backend path

The particle interfaces are designed to allow:

1. CPU typed-array reference solver (v0.1.3.1),
2. worker/WASM kernels,
3. WebGPU storage buffers/compute,
4. Barnes-Hut/FMM long-range gravity,
5. local fluid/SPH/PBF solvers,

without making Three.js the authoritative simulator.
