# Architecture — Universe Lab v0.1.2.1

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
Flight computer (bounded propulsion commands)
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

Direct mutual gravity remains capped at 128 sources. Impact fragments have a stricter sub-budget: at most 2 resolved fragments from a primary event and at most 16 active impact-fragment gravity sources globally. Secondary resolved-fragment impacts create no new gravity fragments, and same-family representative fragments are collision-filtered to prevent artificial recursive breakup cascades. High-count ejecta remains visual/unresolved until a faster gravity backend exists.

## Collision continuity

The major-body integrator can take large simulated-time substeps under time warp. Endpoint overlap alone could tunnel through planets. v0.1.2 snapshots source positions before each substep and checks the relative swept segment of every body pair after integration.

This is efficient at the current small direct-source count and preserves the future option to move to broad-phase spatial indexing/continuous solvers when source counts rise.


## Scientific flight computer

`flightComputer.js` is pure navigation math. It computes bounded acceleration commands; it does not directly mutate positions or velocities. `ShipDynamics` integrates those accelerations through the same velocity-Verlet spacecraft step used by manual thrust.

- BRAKE commands acceleration opposite inertial velocity.
- MATCH commands acceleration against target-relative velocity.
- APPROACH sets a target-relative desired-velocity envelope approximately proportional to `sqrt(2 a s)` so available stopping distance falls as the ship nears the target.
- Guidance acceleration is capped by the currently selected declared engine mode (20 m/s² FLIGHT or 120 m/s² CRUISE).
- Navigation auto-warp changes simulation time scale only and chooses 600× / 60× / 1× based on proximity/closing conditions. Guidance completion/manual takeover returns the clock to 1×.

The propulsion itself is an experimental/fictitious technology parameter; the acceleration, delta-v, travel, and braking are numerically integrated rather than teleported.

## Persistence

Save schema remains 1. Body snapshots preserve `damageRecords`, `visualVersion`, impact-fragment family/depth/grace metadata, and spacecraft engine mode. This is additive and JSON-compatible with the existing envelope. Navigation autopilot mode is deliberately restored as MANUAL on load so a stale save cannot unexpectedly fire guidance thrust.

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
