# Architecture — Universe Lab v0.1.4.6.1.2

## Canonical astronomical observer

`core/astronomicalObserver.js` is a read-only derivation layer over authoritative `EntityRegistry` and `ShipDynamics` state. It provides inertial observer position, forward/right/up, surface parent and anchor, altitude, local up/east/north, canonical simulation time and stable per-body records containing direction, range, physical angular radius and horizon visibility. It never advances or mutates physics and is reconstructed after schema-1 load.

`core/inertialStarCatalog.js` owns one deterministic typed-array catalog per system seed. `render/starfield.js` creates projected views from that catalog. Space keeps inertial orientation and follows only camera translation; surface projection is cached at entry against the canonical local horizon basis and filters the lower hemisphere.

`render/surfaceWorld.js` consumes the same observer/body solution as the ship renderer. Live body sprites use local directions, the directional light follows the live star, and physical angular diameter is retained separately from bounded visual proxy diameter. Atmospheric daylight and local weather affect opacity/exposure, not catalog existence.

The time boundary is unchanged: orbital N-body time is fixed while landed and the bounded local weather clock remains separate. Surface sky therefore represents the same frozen simulation instant through descent, landing and ascent; body rotation/ephemeris evolution is future explicit time-model work.

## Renderer backend policy (v0.1.4.5.4)

`UniverseRenderer` remains based on `THREE.WebGPURenderer`. Backend selection is made once at construction time through `src/render/backendPolicy.js`; it is never hot-swapped. iPhone/iPad-class WebKit forces `forceWebGL: true` to isolate the native-WebGPU presentation path during physical landing/takeoff testing. iPadOS desktop-class UA mode is detected by `MacIntel` plus multi-touch capability. All other environments keep Three.js automatic WebGPU/WebGL2 selection. Simulation, scene graph, materials and landing lifecycle are shared across both backends.

## Core invariant

**Rendering, local surface presentation and fictional TRANSIT never silently own or rewrite authoritative orbital physics.**

Normal spacecraft/major-body state remains SI/Float64. Major gravity remains direct Newtonian and the major integrator remains velocity-Verlet. Three.js owns presentation only. TRANSIT remains an explicitly fictional coordinate-translation layer and never adds its coordinate rate to local Newtonian spacecraft velocity.

## Ship-view cockpit presentation

v0.1.4.6.1 introduced the cockpit structure in the Three.js scene while keeping it strictly presentation/input-side. `src/render/cockpitView.js` owns the camera-attached shell, three CanvasTexture MFDs, nine physical control meshes, touch ray-picking and transient button feedback. It does **not** own spacecraft state, navigation physics, target state, experiment state or save authority.

`UniverseLabApp` remains authoritative. It exposes a compact read-only `cockpitTelemetry()` snapshot and `handleCockpitAction()` routes cockpit interactions into the same existing app actions used by the normal UI. `UniverseRenderer` only forwards visibility, telemetry and picking to the cockpit module. This is intentional so a future GLB cockpit can replace the procedural shell without changing application or simulation boundaries.

Every visible cockpit screen/button has a real function. The three MFDs are live and touch-active; MAP/TGT/APPR/ENG/PRO/RET/SCAN/SCI/OVR keys map to existing System Map, target cycling, approach guidance, engine mode, attitude aids, scanner, science and overlay controls. There are no decorative dead cockpit buttons.

v0.1.4.6.1.1 keeps that input boundary intact but moves the MFD planes/bezels forward of the glare shield and adds emissive-only panel accents plus five telemetry-driven status indicators (POWER/TARGET/NAV/PROPULSION/CAUTION). The indicators own no simulation state and add no dynamic scene lights. The bottom MORE launcher is removed; the FLIGHT MFD remains the canonical Flight/System drawer entry. A cockpit-restore failsafe is DOM-side only and exists solely for recovery when `cockpitEnabled=false`.

v0.1.4.6.1.2 extends that same presentation boundary with a fourth `SYSTEM DIAGNOSTICS` CanvasTexture MFD mounted on the right cockpit side. `UniverseLabApp.cockpitTelemetry()` mirrors existing renderer/performance/debug readings into `CockpitView`; `CockpitView` only draws those values and routes a touch on the panel back to the existing Flight/System drawer. The top DOM performance/seed HUD is hidden only while the 3D cockpit is active and remains intact as the fallback when the cockpit is disabled. No diagnostics value becomes authoritative state and no new simulation ownership is introduced.


The cockpit remains excluded from OBSERVE and local surface views. `cockpitEnabled` remains an optional schema-1 preference. The cockpit is never inserted into `EntityRegistry`, never participates in gravity/collision/trajectory calculations, and never alters the canonical astronomical observer.

## Landing lifecycle / recovery boundary

v0.1.4.5 adds `src/surface/landingTransition.js` as the explicit lifecycle controller. The allowed progression is ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT. `UniverseLabApp` owns the controller, boarding distance checks, input locking, orbital handoff and recovery fallback.

v0.1.4.5.3 hardens the **ASCENDING → live-flight ORBIT commit boundary**. ORBIT is not treated as user-visible success until surface renderer/session/UI ownership is detached, every registered held control is force-released, the safe 5-radius physical ship state is restored, the ship is oriented body-relative prograde, the simulation is actively running at 1×, and the handoff invariants pass. The animation loop then renders three ordinary orbital frames at zero simulation dt before `ASCENT COMPLETE` is announced. A post-render invariant miss recovers to a known live orbital state rather than escaping into the global frame-fault latch.

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
