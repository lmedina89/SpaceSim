# Architecture — Universe Lab v0.1.4.5.2

## Core invariant

**Rendering, local surface presentation and fictional TRANSIT never silently own or rewrite authoritative orbital physics.**

Normal spacecraft/major-body state remains SI/Float64. Major gravity remains direct Newtonian and the major integrator remains velocity-Verlet. Three.js owns presentation only. TRANSIT remains an explicitly fictional coordinate-translation layer and never adds its coordinate rate to local Newtonian spacecraft velocity.

## Ship-view cockpit presentation

v0.1.4.3.1 adds a lightweight DOM/CSS cockpit presentation layer that sits above the renderer only during normal `SHIP VIEW`. It is intentionally not a 3D interior mesh and does not participate in physics, occlusion, collision or target selection.

`UniverseLabApp` owns a `cockpitEnabled` preference, a `toggleCockpit()` action, and view-mode class synchronization. The shell uses those classes to:

- show the cockpit only during ship view,
- hide it automatically during OBSERVE camera modes,
- hide it automatically during local surface sessions, and
- preserve the user's cockpit preference through save/load without changing schema 1.

This keeps the effect inexpensive on mobile while restoring a stronger sense of physical spacecraft presence.

## Landing lifecycle / recovery boundary

v0.1.4.5 adds `src/surface/landingTransition.js` as the explicit lifecycle controller. The allowed progression is ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT. `UniverseLabApp` owns the controller, boarding distance checks, input locking, orbital handoff and recovery fallback.

v0.1.4.5.2 hardens the **ASCENDING → ORBIT commit boundary**. ORBIT is not written until surface renderer/session/UI ownership is detached, the safe 5-radius physical ship state and ship camera are restored, and the handoff invariants pass. The animation callback that finishes ascent then falls through into the ordinary orbital renderer at zero simulation dt; only after that render succeeds is `ASCENT COMPLETE` announced.

A failed renderer entry/ascent completion is cleaned up through one recovery path that clears surface renderer/session/UI state, resets the phase to ORBIT and restores a valid spacecraft/orbit state. Surface renderer ownership is detached before local resource disposal so a disposal fault cannot leave the renderer logically stuck in surface mode. This prevents repeated LAND calls from operating on stale surface state.

The surface ship remains renderer-local and non-physical. Its descent/ascent motion, VTOL plumes and landing-site glow are presentation cues only. The authoritative `ShipDynamics` object remains frozen while surface mode is active and is placed into the existing safe 5-radius orbital handoff only after ascent completes.

## Surface HUD presentation boundary

v0.1.4.4.1 keeps surface UI state separate from simulation state. `surfaceSession.hudExpanded` is a backward-compatible optional UI preference only; it cannot modify local movement, weather, anomalies, rendering physics, spacecraft state or orbital time.

The compact shell keeps scan/sprint controls live during normal exploration. Detailed telemetry, SAVE and TAKEOFF are intentionally hidden until the player expands the panel. CSS reduces the WALK control footprint without changing the pointer/hold-input logic.

## Planetary environment / weather boundary

v0.1.4.4 adds `src/surface/surfaceWeather.js` as a deterministic local-environment state machine. It is deliberately separate from `SimulationClock`: orbital N-body time is still held while landed, while a bounded real-time surface clock advances weather. The state serializes inside the optional schema-1 `surfaceSession` payload.

Surface weather owns event identity, intensity, wind presentation, event duration, next clear interval and an explicit serializable PRNG state. `SurfaceWorldVisual` consumes the resulting reading to alter local fog, clouds, weather particles, lightning, sky-fracture lines and exposure. It never writes spacecraft velocity, gravity sources, orbital time or player movement acceleration.

`surfaceGenerator.js` now exposes three deterministic region profiles. `UniverseLabApp` owns the selected landing-region ID and passes it into region generation. Existing old schema-1 surface saves still resolve Shatterfall because the legacy region ID is unchanged.

The parked ship is a renderer-local procedural model stored only inside `SurfaceWorldVisual`. It is not inserted into `EntityRegistry`; the authoritative spacecraft remains `ShipDynamics` and is restored to safe orbit only on TAKEOFF.

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
