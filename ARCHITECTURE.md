# Architecture — Universe Lab v0.1.4.1

## Core rule

**Rendering never owns authoritative physics.**

The live simulation remains SI/Float64 and data-driven. Three.js owns visual objects and camera presentation only.

## Major-body layer

`EntityRegistry` contains physical generated/spawned bodies. Direct Newtonian gravity sources are bounded by `SIMULATION.directGravityBodyLimit` and integrated with velocity-Verlet.

New physical body kinds:

- `white-dwarf`
- `brown-dwarf`
- `rogue-planet`

Magnetars remain `neutron-star` bodies with `compactType: magnetar`, so existing compact-object navigation/model safeguards apply without duplicating physical code.

## Cosmic phenomenon layer

`CosmicPhenomenonRegistry` describes large exploration sources separately from the body registry.

v0.1.4.1 kinds include:

- asteroid belt,
- planetary rings,
- supernova remnant,
- rogue-planet discovery wrapper.

Phenomena may be:

- anchored to a live body and resolve its current Float64 state, or
- free-space with their own deterministic position/velocity.

`render/cosmicPhenomena.js` converts those definitions into GPU-friendly render proxies.

## Space weather

`cosmic/spaceWeather.js` owns session-local CME event state.

It does not create major gravity bodies. Each event stores compact scalar/vector metadata and derives current front radius from simulation time.

`render/spaceWeatherVisuals.js` owns one bounded point/cone visual per active event. Renderer state is keyed by event ID and disposed when the physical/kinematic event expires.

CME crossing uses a swept radial interval from the event's previous front radius to its current front radius, preventing high-warp substeps from tunneling through the spacecraft.

## Scientific overlays

`cosmic/scientificOverlays.js` is a pure math module with no Three.js dependency. It owns Hill/Roche/Lagrange/gravity/orbital-plane calculations and is unit-tested independently.

`render/scientificOverlayVisuals.js` owns only the visual representation.

The renderer receives a small settings object from the app. The master is off by default. Geometry refresh is throttled because these diagnostics do not require per-frame topology reconstruction.

The overlay renderer is target-centric to avoid turning the scene into an unreadable global wireframe.

## Renderer flow

Normal ship rendering remains isolated:

1. floating reference frame centers on physical ship,
2. body visuals sync,
3. experiment visuals sync,
4. cosmic phenomena sync,
5. space-weather proxies sync,
6. optional scientific overlays update,
7. trajectories/impact FX update,
8. ship camera renders.

Observation rendering uses the same scene-object synchronization but centers the floating reference frame on the selected massless observation source before calculating its camera pose.

## Celestial visual factory

Special body visual graphs remain attached to one authoritative body entity:

- black hole → core + photon rings + accretion + jets + pseudo-lensing glow,
- neutron star/pulsar → compact core + magnetosphere + optional sweep beams,
- magnetar → neutron-star base + stronger field lobes + spark population,
- white dwarf → compact blue-white core + halo,
- brown dwarf → warm low-temperature surface/band layers,
- rogue planet → cold dark surface + faint thermal rim,
- comet → nucleus + star-relative visual tail.

No child visual changes mass, radius, trajectory or collision behavior.

## Space-weather persistence

Space weather is session-local in schema 1. Saving/loading preserves the major-body/ship state but intentionally regenerates future weather scheduling rather than silently extending the save schema.

## Performance boundaries

- direct mutual gravity remains for low-count major bodies only,
- belt/ring/remnant/CME populations are GPU render proxies,
- particle experiments retain their independent 40,000-slot budget,
- scientific overlays are off by default and use only small line/point sets,
- overlay visual topology is throttled instead of rebuilt every frame,
- compact-object decorative particle counts are bounded.

## Failure boundaries

The runtime exception HUD boundary and unhandled-promise reporting remain. The static class-method integrity test still enumerates direct `this.method()` calls and requires corresponding `UniverseLabApp` class definitions.
