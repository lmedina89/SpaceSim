# Universe Lab v0.1.4 Architecture

## Design rule

The simulation owns reality; the renderer owns appearance.

Three.js is not the authoritative physics engine. Major bodies, spacecraft, projectiles, comets and experiment particles retain SI-unit state independently of rendering. v0.1.4 extends that separation to cosmic phenomena so large visual populations do not become thousands of accidental N-body sources.

## Authoritative state

- SI units: meters, kilograms, seconds.
- major-body position/velocity: Float64.
- direct Newtonian major-body gravity.
- velocity-Verlet major-body/ship integration.
- floating-origin conversion only at render time.
- direct gravity source ceiling remains bounded for mobile safety.

## Seeded system generation

`src/data/systemGenerator.js` produces:

- star,
- planets,
- moons,
- 1–2 physical high-eccentricity comets,
- metadata,
- seeded cosmic-phenomenon definitions.

All generated gravity bodies receive the same barycentric correction after generation.

`src/cosmic/phenomenonGenerator.js` separately produces structured visual phenomena such as:

- circumstellar debris belt,
- planetary ring systems.

This lets the seed generate a rich system without turning every visible particle into a gravity body.

## Cosmic phenomenon registry

`src/cosmic/phenomenonRegistry.js` stores immutable-ish phenomenon definitions by id. A phenomenon can carry an `anchorBodyId`; its live state resolves against the current body registry each time it is queried.

Consequences:

- a planetary ring follows its moving planet,
- a debris belt follows its star/reference frame,
- observation and rendezvous use current coordinates,
- the definition itself does not duplicate mutable N-body state.

## Cosmic rendering

`src/render/cosmicPhenomena.js` creates one seeded `THREE.Points` object per ring/belt phenomenon. The renderer transforms the anchor position through the floating-origin reference frame and updates proxy rotation from simulation time.

Typical visual counts:

- asteroid/debris belt: 12,000 points,
- planetary rings: 4,000–7,000 points each.

These are rendering populations, not collision/gravity objects.

## Celestial visual factory

`src/render/celestialFactory.js` now owns animated visual subgraphs for special bodies.

### Star

- physical/generated star body remains unchanged,
- surface sphere,
- ~1,600-point corona,
- prominence arcs,
- glow.

### Black hole

Live body:

- Newtonian mass,
- physical Schwarzschild radius metadata,
- existing strong-gravity/model-limit safeguards.

Visual subgraph:

- black core,
- photon-ring group,
- ~5,200-point accretion disk,
- disk torus layers,
- visual relativistic-jet group with ~1,500 particles,
- pseudo-lensing halo.

No visual element changes the live gravitational state.

### Neutron star / pulsar

Live body:

- mass,
- 12 km radius,
- Newtonian gravity/collision state,
- spin/magnetic-field metadata.

Visual subgraph:

- bright compact sphere,
- magnetosphere rings,
- optional rotating pulsar beam pivot,
- glow.

### Comet

Live body:

- physical nucleus mass/radius/orbit.

Visual subgraph:

- nucleus mesh,
- seeded ~950-point tail,
- current star-relative tail orientation,
- distance-dependent visible activity.

## Renderer integration

`src/render/threeRenderer.js` keeps:

- normal SHIP VIEW on its isolated stable path,
- experiment observation path,
- cosmic observation path,
- major-body visual synchronization,
- cosmic-phenomenon synchronization,
- floating-origin camera/reference-frame conversion.

The camera far plane is enlarged enough for multi-AU visual phenomena while local body scales still use floating-origin rendering.

## Observation architecture

Massless observation cameras are explicitly not spacecraft travel.

Experiment observation:

- FRAME,
- TRACK,
- ORBIT.

Cosmic observation:

- FRAME,
- ORBIT.

Both derive render-camera poses without mutating ship position/velocity.

**RENDEZVOUS** instead creates a navigation target from the current phenomenon anchor position/velocity and uses the normal bounded-thrust flight computer. An anchored ring therefore inherits the planet's live motion/mass context, while a belt inherits the star's.

## Compact-object navigation safeguards

`src/physics/flightComputer.js` calculates propulsion-safe stand-off from local `GM/r²` and the selected engine acceleration.

Additional validity guards:

- ship speed ≥ 0.1c,
- black-hole near-field guard,
- neutron-star near-field guard.

Strong local gravity also reduces maximum physics substep through the existing dynamical-time estimate.

These guards prevent the Newtonian solver from visually masquerading as GR.

## Particle experiments retained

`ParticleExperimentManager` still owns contiguous typed-array fields with a global 40,000-slot budget. Artificial neighbor modes use `SpatialHashGrid`; Gravity Cloud and Particle Gun feel major-body gravity but do not source it. Each field renders with one `THREE.Points` draw call.

## Save compatibility

Save schema remains 1. New cosmic phenomena are regenerated deterministically from the saved seed. Discovery state and local particle experiments are currently session-local rather than silently extending the existing persistent schema.

## Failure diagnostics

The animation-loop runtime boundary from v0.1.3.2.1 remains. Any browser-frame exception halts the simulation and shows `RUNTIME ERROR: ...` in the HUD instead of leaving a misleading half-alive screen.

The class-method integrity test added in v0.1.3.2.2 remains and verifies every direct `this.method()` call in `UniverseLabApp` has a class method definition.
