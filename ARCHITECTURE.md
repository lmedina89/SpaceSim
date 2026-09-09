# Architecture — Universe Lab v0.1.2

## Core rule

The renderer never owns the universe.

Authoritative simulation state remains in data/physics modules using SI Float64 coordinates. Three.js receives transformed local render coordinates through a floating reference frame.

## Runtime layers

```text
Universe seed / data
        ↓
Entity registry
        ↓
Simulation clock + scheduler
        ↓
Direct Newtonian gravity
        ↓
Velocity-Verlet integration
        ↓
Swept finite-radius collision monitor
        ↓
Impact analysis / resolver
        ├─ bounce
        ├─ merge / absorb
        ├─ fragmentation
        └─ crater record
        ↓
Authoritative bodies + damage records
        ↓
Floating reference frame
        ↓
Three.js WebGPU/WebGL2 renderer
        ├─ body meshes
        ├─ trajectory paths
        ├─ motion cues
        └─ visual-only impact FX
```

## Impact modularity

`collisionMonitor.js` answers only whether/where a finite-radius contact occurred during the step.

`impactModel.js` contains pure calculations/approximations:

- reduced mass,
- impact energy,
- material profiles,
- impact angle,
- response classification,
- crater scaling,
- fragment initial-state generation.

`impactResolver.js` mutates authoritative bodies based on the model result:

- momentum-conserving bounce,
- merge/absorb,
- target accretion,
- fragment creation,
- persistent target damage record.

`threeRenderer.js` receives only a presentation event and draws the flash/ring/ejecta. FX never feed forces back into the simulation.

This separation is deliberate so later hydrocode-derived/cratering/fragmentation models can replace only the scientific response layer.

## Gravity budget

Direct mutual gravity remains capped at 128 sources. Fragment generation is budget-aware and will not intentionally exceed the current direct-source ceiling. High-count ejecta therefore remains visual/unresolved until a faster gravity backend exists.

## Collision continuity

The major-body integrator can take large simulated-time substeps under time warp. Endpoint overlap alone could tunnel through planets. v0.1.2 snapshots source positions before each substep and checks the relative swept segment of every body pair after integration.

This is efficient at the current small direct-source count and preserves the future option to move to broad-phase spatial indexing/continuous solvers when source counts rise.

## Persistence

Save schema remains 1. Body snapshots now also preserve `damageRecords` and `visualVersion`. This is additive and JSON-compatible with the existing envelope.

Procedural untouched bodies are still seed-derived; the current save continues to snapshot major-body state because experiments can substantially alter the system.

## Rendering visibility contract

Non-stellar bodies use a shaded surface plus a faint renderer-independent color exposure floor. The floor is presentation-only and exists because real-device WebGPU testing showed that relying on a point light alone could produce featureless black bodies despite valid generated colors.

## Mobile control contract

Continuous controls remain pointer-capture driven and selection/callout suppressed. UI inputs/selects remain editable. Layout remains visualViewport-height synchronized for iOS browser chrome.

## Future scaling

The interfaces remain compatible with later:

- Barnes-Hut/FMM gravity,
- Rust/WASM scientific kernels,
- WebGPU compute particle solvers,
- local rigid-body physics,
- terrain quadtrees/cube-sphere worlds,
- SPH/PBF/FLIP-style local fluids,
- atmospheric solvers,
- relativistic modules.
