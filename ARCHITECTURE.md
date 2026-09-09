# Architecture — Universe Lab v0.1.4.3

## Core invariant

**Rendering, local surface presentation and fictional TRANSIT never silently own or rewrite authoritative orbital physics.**

Normal spacecraft/major-body state remains SI/Float64. Major gravity remains direct Newtonian and the major integrator remains velocity-Verlet. Three.js owns presentation only. TRANSIT remains an explicitly fictional coordinate-translation layer and never adds its coordinate rate to local Newtonian spacecraft velocity.

## Surface-instance boundary

v0.1.4.3 introduces a deliberately separated local surface layer:

- `src/surface/surfaceGenerator.js` — deterministic seeded terrain/environment/POI definitions.
- `src/surface/surfaceSession.js` — local player position/look state, bounded translation, scan state and serialization.
- `src/render/surfaceWorld.js` — Three.js surface scene, terrain mesh, instanced dressing, sky, lighting and anomaly visuals.
- `UniverseLabApp` — owns landing eligibility, surface lifecycle, local input, save/load handoff and scripted return to orbit.

The surface instance does **not** integrate the orbital system in the background. `running` is held while landed and the simulation clock does not advance. That policy is explicit in the HUD because silently advancing a high-warp orbital simulation while a player explores a local scene would create hidden state changes and unnecessary mobile cost.

TAKEOFF is currently a scripted transition to a deterministic safe orbit. It is not claimed to model atmospheric ascent, heating, aerodynamics or powered landing.

## Deterministic Shatterfall region

The first landable generated home world has:

- `landable: true`
- `surfaceProfile: anomalous-showcase-v1`
- `surfaceRegionId: shatterfall-basin`

The region seed is derived from `system.seed + body.id`, giving repeatable terrain, environmental subzones and POIs.

Terrain uses deterministic value-noise/fBM plus authored seeded crater/ridge/basin features. The renderer builds one local colorized terrain mesh, then uses instanced rocks/crystals/frost formations and lightweight lines/points for environmental dressing.

Seven anomaly POIs span speculative, anomalous and impossible/fictional reality classes. Their visuals are renderer-only. They are not inserted into `EntityRegistry`, do not source Newtonian gravity and do not modify local movement or simulation time.

## Surface save compatibility

Save schema remains `1`.

`surfaceSession` is an optional payload field. It stores only local-instance state: body/region ID, X/Z, yaw/pitch and scan discoveries. Existing physical major-body and spacecraft state remain in the existing save fields.

When a pre-v0.1.4.3 schema-1 save loads, deterministic surface-capability metadata may be refreshed from the current generated definition for matching bodies. The saved physical mass/radius/position/velocity are not replaced.

## Existing local flight

`ShipDynamics` retains:

- FLIGHT 20 m/s²,
- CRUISE 120 m/s²,
- speculative BOOST 5,000 m/s².

`flightComputer.js` continues to own bounded APPROACH/HOLD, STOP RELATIVE, inertial BRAKE and TURN & BURN. The velocity-vector HUD remains a presentation of authoritative `ship.velocity`, separate from attitude.

## Fictional TRANSIT

`physics/transitDrive.js` remains separate from Three.js and from local propulsion. It supplies 1c/10c/100c/500c/1000c coordinate-rate travel, live-target arrival envelopes, step-down, no-overshoot movement and swept route guards. AUTO CAPTURE hands back to physical local propulsion.

## Discovery and weather

The v0.1.4.2 separation remains:

- `EntityRegistry` — physical finite-radius major bodies.
- `CosmicPhenomenonRegistry` — exploration sources and free-space anomaly proxies.
- `SpaceWeatherManager` — seeded kinematic CME event chronology with save/load continuity.
- `SystemMapController` — logarithmic interface projection of live state, not a second physics solver.
- persistent free-space discovery scan depth 0–3.

## Stellar presentation

The v0.1.4.1.2 stellar pipeline remains renderer-only: seeded photosphere/granulation, additive corona, prominence filaments, active regions, rare flare proxies and perceptual LOD. Macro stellar phenomena remain visible at useful distances while sub-pixel detail is simplified.

## Mobile/performance policy

The first surface is intentionally bounded to a 2.4 km local region rather than pretending to stream an entire planet.

Mobile-conscious choices include:

- one terrain mesh,
- instanced repeated rocks/crystals/frost formations,
- deterministic lightweight anomaly geometry,
- no background orbital stepping while landed,
- no rigid-body debris/fluids/ecosystems on the surface yet,
- existing VisualViewport/safe-area shell and hardened pointer-release handling reused for surface controls.

This gives the project a scalable scene boundary before world streaming, weather, caves, oceans, vehicles or biology are attempted.
