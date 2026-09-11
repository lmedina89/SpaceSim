# v0.1.5.4.2 architecture delta — stellar irradiance presentation bridge

`src/render/stellarIrradiance.js` is a read-only presentation adapter. It imports the existing canonical `stellarFluxWm2()` equation rather than defining a second irradiance law. Inputs are modeled stellar luminosity plus live star-observer/body distance; outputs are physical flux, `S⊕`, and a bounded display gain. It owns no simulation state and writes no body/environment fields.

Orbital reflected-body rendering calls `stellarIrradianceForBody()` from `updateCelestialVisual()`. The existing scene light still provides the star-facing geometric terminator; the irradiance gain modulates reflected-light amplitude before tone mapping and is multiplied by the existing finite-disk eclipse visibility. Surface rendering calls the same bridge with the canonical astronomical observer's live star range and scales both the direct `DirectionalLight` and diffuse `HemisphereLight` after atmospheric optics are solved.

The exact physical flux remains linear inverse-square radiometry. `displayGain = sqrt(S⊕)` is an explicit HDR presentation transform with only extreme safety bounds. This avoids forcing a phone display to span the full astrophysical dynamic range while preserving monotonic brightness ordering. Per-frame call sites reuse the previous output record to avoid avoidable GC pressure.

No ownership boundary changes: `UniverseLabApp`/physics remain authoritative; render code remains read-only; save schema stays 1; forced-WebGL2 iPhone/iPad policy stays intact.

---

# v0.1.5.4.1 architecture delta — close-orbit material polish

The v0.1.5.4 global albedo/bump map remains the authoritative *rendering identity* for medium distance. `applyPlanetaryPerceptualProfile()` now adds a second lazy close-only detail tier once apparent angular radius reaches 0.030 rad. `makePlanetaryCloseDetailMaps()` creates a small deterministic tileable normal/roughness pair from body/environment visual profile data; it does not mutate body/environment state and is disposed with the celestial material.

This deliberately avoids giant 2K/4K procedural global textures on iPhone Safari. Detail density is increased through texture repeat as the body grows in the camera while memory remains bounded. `threeRenderer.js` also applies a bounded large-disk exposure response after camera placement. Compact-object polish is isolated to the render factory: a continuous accretion-flow texture sits under the pre-existing black-hole particle field.

---

# v0.1.5.4 architecture delta — celestial rendering only

`src/render/celestialRealism.js` is a pure read-only presentation model. It consumes authoritative body/environment metadata and returns bounded visual profiles; it never mutates mass, radius, position, velocity, rotation metadata, environment state, landing state or saves. `celestialFactory.js` owns the generated material/compact-object geometry, while `threeRenderer.js` applies apparent-size LOD and exposure after camera placement. Near-orbit textures are lazy so iPhone Safari does not allocate detailed maps for every distant body at startup.

Black-hole ratios are GR-informed but the renderer is not a GR ray tracer. Neutron-star compactness/redshift/light-cylinder values are physically derived diagnostics, while field/beam geometry is a readability-scaled proxy. Planetary oblateness is first-order and bounded because interior structure is not solved.

# v0.1.5.3.1 architecture delta — input release hardening only

This hotfix changes only UI input-lifecycle handling and build identity. The existing `bindHold()` path retains pointer capture, pointerup/pointercancel/lostpointercapture, document pointer release, blur, visibility and forced release hooks. It now also installs per-control `touchend` / `touchcancel` fallbacks that release only after that control has no remaining `targetTouches`. A document-level all-touches-up fallback and `pagehide` neutralization provide final iPhone/WebKit safety nets.

The surface movement scalar model, locomotion physics, surface session, weather, atmosphere optics, celestial rendering, N-body integration, FRAME, save schema and WebGL2 backend policy are unchanged.

---

# v0.1.5.3 architecture delta — atmospheric optics presentation layer

v0.1.5.3 adds optics beside the existing simulation/environment architecture; it does not move atmospheric rendering into simulation authority.

## Read-only optics model

`src/physics/atmosphericOptics.js` is a pure derivation module. `solveSurfaceAtmosphericOptics()` consumes canonical pressure/temperature/gravity/representative molecular mass plus live star altitude, star color, finite-disk visible fraction and bounded weather aerosol/transmission. It returns Rayleigh/Mie proxy optical depths, direct spectral transmission, top/horizon sky color, twilight, star/galactic visibility, diffuse-light proxy, hydrostatic scale height and local 550-nm extinction. It owns no body or save state.

`solveOrbitalAtmosphereLimb()` consumes the same environment quantities plus physical radius and returns a bounded atmosphere-shell presentation profile. The visual shell is separate from physical body geometry.

## Surface integration

`src/render/surfaceWorld.js` remains a consumer of the canonical astronomical observer. Star direction, finite disk, phase/eclipses and body-fixed horizon geometry remain authoritative outside the optics model. The optics layer only changes presentation from those existing inputs: dynamic sky gradient, stellar spectral attenuation, diffuse hemispheric light, starfield/galactic washout and clear-air FogExp2 density. Weather can supply additional aerosol depth but cannot rewrite atmosphere/environment state.

Airless profiles explicitly pass zero pressure to the optics model and retain no FogExp2 atmosphere. Their canonical stars/celestial disks and direct stellar geometry remain visible against a black sky.

## Orbital limb integration

`src/render/celestialFactory.js` owns a presentation-only `planetary-atmosphere-limb` child for supported solid bodies. `src/render/threeRenderer.js` derives the already-canonical environment record read-only when creating a visual and synchronizes that shell. The body mesh radius, observer apparent disk geometry, collision radius and physics state are unchanged.

The limb is intentionally a mobile-safe approximation rather than a second volumetric atmosphere scene. Full spherical multiple-scattering/refraction remains deferred.

---

# v0.1.5.2 architecture delta — bounded multi-world exploration

v0.1.5.2 keeps the existing simulation architecture and expands only the surface-access/profile layer.

## Surface selection

`src/surface/surfaceProfiles.js` remains the read-only bridge from canonical planetary-environment records into surface-engine capability. Architecture version 2 may enable, per generated system, a bounded set consisting of the legacy home world, at most one airless rocky reference moon, one contrasting rocky planet and one ice/volatile world. Selection is deterministic and environment-driven; rogues are excluded while their rotation state is unresolved, and gas giants remain no-solid-surface.

For `ORIGIN-001` the bounded set is Caelum-4361 d, f-A, e and h-A.

## Profile generation

`src/surface/surfaceGenerator.js` keeps the accepted home generator intact and dispatches generalized profiles to separate deterministic generators. `ATMOSPHERIC_ROCKY` produces a cold/thin-atmosphere rocky highland proxy; `AIRLESS_ROCKY` retains the v0.1.5.1 regolith proof/reference; `ICE_VOLATILE` produces a cryogenic ice/rock shelf proxy. Terrain/material appearance is a rendering/geology proxy and is not a solved composition or thermodynamic model.

`src/render/surfaceWorld.js` consumes optional profile-specific material, fog and ambient-light parameters while preserving legacy defaults when those fields are absent. `src/surface/surfaceWeather.js` preserves the exact home RNG/weather path and allows generalized profiles to restrict ordinary event types or disable scheduling entirely.

## Session and handoff isolation

The schema-1 `surfaceSession` payload remains backward compatible. Restore now treats generated body/profile identity as authoritative and restores local x/z/yaw/pitch/scans/weather only when the snapshot body/profile matches. This blocks cross-world/profile leakage.

Takeoff captures the departing session/region before surface cleanup. Legacy home takeoff retains the accepted 5-radius behavior. Generalized surfaces reconstruct the current inertial radial direction from the rotated body-fixed landing anchor and reuse the existing `frameOrbitInsertionPlan()` / `applyFrameOrbitInsertion()` Hill-screened circular-orbit handoff.

No direct-gravity, velocity-Verlet, FRAME route/insertion equations, collision/impact, observer/eclipse, planetary-environment, save-schema or WebKit-backend architecture is changed by this milestone.

---

# Universe Lab Architecture — v0.1.5.1.2

## v0.1.5.1.2 portrait HUD transparency boundary

- Portrait FLIGHT MFD glass alpha is selected only by `CockpitView.viewportMode`; telemetry content and simulation telemetry remain unchanged.
- The portrait FLIGHT physical bezel is hidden while the canvas border remains as a light HUD frame.
- Landscape restores the accepted v0.1.5.1.1 bezel and MFD presentation.
- Portrait shortcut translucency is CSS-only and routes to the same existing actions.
- Orientation remains presentation state only and is not serialized.


## Multi-world surface boundary

`planetaryEnvironment.js` remains the canonical read-only world science layer. `surfaceProfiles.js` maps that environment into **surface-engine architecture families** without changing body physics. `surfaceGenerator.js` then produces a deterministic local region for an enabled profile.

The home-world `anomalous-showcase-v1` path is preserved as the atmospheric regression baseline. A second proof path, `airless-rocky-v1`, is enabled for at most one qualifying airless rocky moon. In `ORIGIN-001` that body is `moon-5-1` / Caelum-4361 f-A. The proof selector is deterministic and consumes no RNG.

Airless profiles disable fog, weather/cloud/wind presentation and anomaly sites while retaining the canonical rotating surface observer, star catalog, finite celestial disks/phases/eclipses, local save state and landing lifecycle. Surface session serialization adds optional profile/model identity while save schema remains 1.

Moon takeoff is a special integration boundary: the legacy 5-radius planet return can exceed a small moon's Hill region, so moon takeoff reuses `frameOrbitInsertionPlan()` for a Hill-screened circular local orbit. Its planning radius vector is reconstructed from the active surface session's current rotated body-fixed anchor, so landed N-body motion cannot leave takeoff geometry tied to a stale inertial ship coordinate. Home-world takeoff is unchanged.

---

## Planetary-environment authority boundary

`src/physics/planetaryEnvironment.js` is a pure/read-only derivation layer. It consumes authoritative generated-body mass, radius, live/star geometry, orbital metadata and versioned deterministic formation metadata, then produces the environment record used by NAV and cockpit science. It owns no position, velocity, gravity, clock, FRAME, landing or save authority.

Hard-derived quantities are kept separate from formation assumptions. Surface gravity uses `GM/R²`; escape velocity uses `sqrt(2GM/R)`; stellar irradiance uses `L/(4πr²)`; radiative-equilibrium temperature uses Bond albedo with full heat redistribution and unit long-wave emissivity. Bond albedo, volatile inventory, initial atmospheric inventory and representative molecular mass are seeded formation inputs because the current simulator cannot uniquely infer them from mass/radius/orbit alone.

The pressure model is deliberately bounded in scientific meaning: initial atmospheric inventory is filtered through a simplified Jeans-retention diagnostic and a generic temperature-dependent gas-phase-availability proxy, then converted to a hydrostatic surface-pressure proxy for solid worlds. It is not an atmosphere chemistry, condensation, greenhouse, climate, stellar-wind/EUV escape or radiative-transfer solver. Gas giants expose no solid-surface pressure.

Environment metadata is generated from an independent `${seed}:environment:${body.id}:v1` RNG stream after orbital generation, preventing any change to legacy system initial conditions. Schema-1 compatibility preserves saved environment formation fields when present and deterministically backfills only missing values. The accepted home-world atmosphere continuity is achieved by calibrating its initial inventory through the same canonical solver, not by overriding the derived pressure afterward.

`systemNavigation.js`, `systemMap.js` and cockpit telemetry consume this environment record read-only. Detailed surface availability remains a separate capability layer: v0.1.5.0 classifies physical surfaces but intentionally enables no new surface renderer/landing destinations.

---

# Universe Lab Architecture — v0.1.4.9.1.1

## Observation-planner authority boundary

`src/navigation/observationPlanner.js` is deliberately outside simulation authority. A search creates a compact clone of the current gravity-source bodies (including position, velocity, mass, radius and rotation metadata), propagates only that clone with `DirectGravitySolver` + `VelocityVerletIntegrator`, and evaluates alignments with the same `celestialAppearance` apparent-disk functions used by the live observer/rendering path. No planner function receives mutable authoritative body arrays as its integration state.

The reference observer is either (a) the center of the selected planet/moon or (b) the exact current landed site if that selected body owns the active surface session. Surface-site prediction keeps the local x/z/body-fixed anchor fixed while body rotation and N-body translation evolve. Future walking, future piloted spacecraft motion, space-weather presentation and impact/fragmentation state transitions are intentionally outside the planner model.

Long searches are incremental: `ObservationPlannerSearch.stepChunk()` consumes a bounded number of integrator substeps and yields back to the app between animation frames. The same `massivePairPhysicsStepLimitSeconds()` guard can force smaller steps for close compact-object pairs. A total work ceiling terminates with an explicit budget-limited result rather than silently changing physics resolution.

# Architecture — Universe Lab v0.1.4.9

## v0.1.4.9 celestial-appearance boundary

`core/celestialAppearance.js` is a pure, read-only derivation layer. It consumes authoritative observer/body/star positions and physical radii and returns apparent angular radius, phase angle, illuminated fraction, finite-disk overlap, observer stellar-occultation and body-centered stellar-visibility diagnostics. It owns no positions, velocities, masses, clock state, target state or save state.

`AstronomicalObserverModel` enriches its reusable body observations with those appearance values at a bounded refresh cadence. Renderers consume the same observation records: the space renderer retains star-direction material lighting for physical planets/moons; the surface renderer maps authoritative sky directions onto a compressed rendering shell while preserving angular size, and computes phase-sphere vertex brightness from the canonical target-to-star direction. The shell compression is a rendering-coordinate device only.

Surface direct stellar light consumes the observer-side visible stellar fraction. The terrain/background daylight model remains a bounded presentation proxy rather than atmospheric radiative transfer. Finite-disk overlap currently applies the dominant single foreground occulter; overlapping multi-occulter unions are deliberately deferred.

No v0.1.4.9 appearance path mutates Newtonian dynamics, FRAME state, planetary rotation, collision/impact state, landing lifecycle or save schema.

## v0.1.4.8.2 impact / numerical-hardening boundary

The authoritative force law remains direct pairwise Newtonian gravity and the authoritative major-body integrator remains velocity-Verlet. This release hardens **event handling and timestep selection around that solver** rather than replacing it.

`src/physics/collisionMonitor.js` owns finite-radius collision detection. `CollisionStateBuffer` stores previous positions/velocities in reusable flat typed arrays keyed to the current body topology. For each pair the scanner solves the first root of the relative linear-motion sphere intersection over the substep. A collision event can therefore carry interpolated first-contact position/velocity and `stepFraction` instead of only reporting that the bodies crossed somewhere during the step. The hot pair loop remains scalar and does not allocate arrays unless a real event is emitted.

`src/physics/impactModel.js` classifies material response and computes bounded representative fragmentation. Generated gas-planet aliases normalize to a gas-envelope material and do not enter the rocky crater estimator. Representative ejecta is constructed around the collision center-of-mass velocity; target recoil closes the represented linear-momentum balance. A configurable fraction of the available COM impact energy bounds fragment/recoil kinetic energy. These fragments are representative simulation bodies, not a claim to resolve the full physical ejecta mass spectrum, shock physics, vaporization, or hydrodynamics.

`src/physics/impactResolver.js` applies an interpolated contact state when available, resolves bounce/merge/absorb/fragment there, then drifts the resolved state over only the unconsumed remainder of that global substep. It does **not** perform a second force solve/re-integration across the remainder, so the remainder is explicitly a ballistic approximation. If either collider is a black hole, the black hole is the sink; accreted momentum is mass-weighted and its Schwarzschild radius is refreshed after mass growth.

`src/physics/massivePairStepControl.js` provides a conservative major-body timestep ceiling from pair dynamical and crossing times. `SimulationClock` can accept a callback and re-evaluate that ceiling before every substep. The app combines it with the existing spacecraft/navigation step ceiling. Surface astronomy uses the same massive-pair ceiling while still excluding ordinary `ShipDynamics` from landed mode. This means close LAB compact pairs can reduce the 300 s ceiling as they approach without changing normal generated-system performance.

`src/physics/testParticleField.js` uses an accumulated simulation-time cadence for fine calls and reusable start-state storage. `src/physics/trajectoryPredictor.js` is now explicitly one-way: cloned major sources evolve mutually under the existing direct solver/velocity-Verlet path while the probe is advanced from their field without being inserted into the massive-source solve. Prediction uses local probe and massive-pair timestep preferences but caps internal work; `accuracyLimited` is surfaced when the requested horizon/resolution cannot honor the preferred physical step under that CPU budget.

`src/cosmic/scientificOverlays.js` now solves the three collinear circular restricted-three-body equilibrium roots numerically in the normalized barycentric rotating frame. This removes the small-secondary assumption from L1/L2/L3 display for comparable-mass LAB binaries. The calculation is still an instantaneous circular-CR3BP overlay at the live separation, not a general N-body equilibrium solution.

## v0.1.4.8.1 scientific-consistency boundary

The validated direct-Newtonian/velocity-Verlet engine remains authoritative and unchanged. This release changes **initial generated physical metadata/state geometry**, not the N-body force law. `systemGenerator.js` delegates gas bulk-property math to `planetaryProperties.js`; gas mass remains authoritative and radius/density are a coherent pair. The relation is intentionally a bounded population proxy rather than a detailed hydrostatic/equation-of-state solver.

Fresh v2 rotation stores the **physical spin pole** in `rotationAxisInertial`. Planetary poles are generated around the parent-relative orbital angular-momentum direction (or its opposite for retrograde bodies). Therefore v2 `rotationDirection` is a PRO/RETRO classification and is not applied a second time as a phase sign. `planetaryRotation.js` retains the legacy v1 signed-phase convention when loading v1 models so existing body-fixed anchors remain continuous.

`generatedBodyCompatibility.js` is the save-forward-compatibility gate. Serialized position/velocity/mass/radius and existing serialized rotation frames remain authoritative. Generator metadata only fills missing fields. Legacy gas density may be re-derived from its saved mass/radius because density is dependent; mass/radius themselves are not migrated.

Fresh synchronous moons use the parent+moon two-body mean-motion period and initialize the body-fixed +X meridian toward the parent at epoch. Fresh rogues are generated with positive two-body specific orbital energy relative to the primary star.

The v0.1.4.8 NAV hierarchy, FRAME route safety, circular osculating-orbit handoff, surface astronomy, landing/takeoff, and renderer backend boundaries are unchanged.

## v0.1.4.8 navigation / FRAME arrival boundary

`src/navigation/systemNavigation.js` is a read-only derivation layer over the existing body registry. It does not own bodies, orbital state, target persistence, or simulation time. It builds the star → planet → moon hierarchy and derives display quantities from authoritative SI state. `src/ui/systemMap.js` consumes those records and provides three map projections: a clearly labeled logarithmic survey, a linear inertial X/Z whole-system view, and a linear selected-planet/moon-family view. Changing map mode or body selection never mutates celestial physics.

The existing `targetId` remains the single celestial NAV target and is already part of schema-1 save state. Selecting a body from the catalog calls the same target path used elsewhere; **FRAME TO TARGET** only chooses that live body as the input to the existing fictional FRAME layer. There is no duplicate navigation body database.

`src/physics/frameOrbitInsertion.js` owns only the **FRAME exit-state calculation** for supported planets, moons and rogue planets. It never integrates a target or changes target mass/position/velocity. Normal completed travel chooses an exterior insertion radius, constrains it to a conservative prograde Hill window when a parent orbit is available, constructs a tangent plane from current target/parent geometry, and applies:

`v_ship = v_target + t_hat * sqrt(G * M_target / r)`

The resulting state is an instantaneous circular **two-body osculating** orbit at handoff. Ordinary direct-Newtonian N-body gravity and `ShipDynamics` own every subsequent step, so perturbations may move it away from circular. The Hill rule is a conservative screening estimate, not a stability proof: the code uses the smaller of the current-separation Hill estimate and the stored-orbit pericenter estimate, then limits prograde insertion radius to 47% of that value. Manual FRAME disengage retains the previous inertial target-velocity match.

`src/navigation/frameGuardRoute.js` sits strictly inside that fictional travel layer. Before engagement it runs the existing swept finite-radius guard test from the ship to the live target. A clear route stays direct. If another massive body blocks the segment, the planner searches deterministic exterior waypoints, validates both legs against **all** existing massive-body guards, and stores the winning waypoint as an offset from the blocking body's live position. Runtime resolution therefore follows ordinary N-body motion instead of chasing a stale inertial coordinate. No guard radius is weakened, no celestial state is mutated, and a route with no validated bypass is rejected. The actual per-frame FRAME step still runs the pre-existing swept guard, so the detour planner never becomes collision authority.

This boundary preserves the realism rule: FRAME itself remains speculative/fictional, while the state returned to the physical simulation is explicit and dynamically meaningful.

## v0.1.4.7.1 surface diagnostic/control boundary

The v0.1.4.7.1 surface diagnostics are a **read-only projection of existing authoritative state**. `frameSurface()` solves `AstronomicalObserverModel` once after the current surface movement/weather update, passes that same solution to `updateSurfaceHud(astronomy)`, then passes it to `renderer.renderSurface(...)`. Primary-star ALT/AZ therefore describes the exact observer frame rendered on screen; no parallel astronomy state is maintained.

Body-fixed latitude/longitude is derived from the canonical observer's current inertial surface position transformed back into the existing rotation basis, so local walking offsets are represented rather than mislabeled as the touchdown anchor. Rotation phase comes from `rotationAngleAt()`. Geometric local solar time is derived from the difference between observer body-fixed longitude and primary-star substellar longitude. The body-fixed zero-meridian is procedural; this is an internal coordinate frame, not a real-cartography claim.

`PAUSE SKY / RESUME SKY` toggles the existing `UniverseLabApp.running` gate only while `SURFACE_PHASE.LANDED`. Because `frameSurface()` already gates `SimulationClock.advance()` on that flag while `updateSurface(realDt)` continues independently, pausing holds celestial N-body time without stopping local walking/weather. Descent/ascent keep the control disabled, leaving the accepted lifecycle and forced-live takeoff handoff unchanged.

## v0.1.4.7 continuous landed astronomy

`core/planetaryRotation.js` owns the rigid body-fixed/inertial rotation transforms. Rotation metadata is generated from independent per-body RNG streams so adding spin does not consume the legacy orbital generator sequence. A surface session captures the touchdown direction in the parent body's body-fixed frame. `astronomicalObserver.js` converts that anchor back into current inertial local-up and derives east/north from the spin axis at the current simulation time.

Surface mode now separates **celestial-world integration** from **spacecraft integration**. `UniverseLabApp.surfaceAstronomyStep()` advances major bodies through the existing velocity-Verlet/direct-Newtonian path (plus existing minor/collision/world timelines) but never calls `ShipDynamics.step()` or navigation. `frameSurface()` advances that path only at forced 1× while the simulation is running. This prevents a parked ship from being treated as a free-flight spacecraft while still allowing the universe to evolve.

`render/starfield.js` can reproject the existing inertial catalog into preallocated surface buffers. `SurfaceWorldVisual` refreshes the expensive full catalog projection at a bounded cadence while live body sprites/observer directions continue each render. No star catalog is reseeded. Day/night tinting is a presentation proxy driven by the derived star altitude, not an atmospheric scattering model.

## Canonical astronomical observer

`core/astronomicalObserver.js` is a read-only derivation layer over authoritative `EntityRegistry` and `ShipDynamics` state. It provides inertial observer position, forward/right/up, surface parent and anchor, altitude, local up/east/north, canonical simulation time and stable per-body records containing direction, range, physical angular radius and horizon visibility. It never advances or mutates physics and is reconstructed after schema-1 load.

`core/inertialStarCatalog.js` owns one deterministic typed-array catalog per system seed. `render/starfield.js` creates projected views from that catalog. Space keeps inertial orientation and follows only camera translation; surface mode dynamically reprojects that same catalog against the current rotating local horizon and filters the lower hemisphere.

`render/surfaceWorld.js` consumes the same observer/body solution as the ship renderer. Live body sprites use local directions, the directional light follows the live star, and physical angular diameter is retained separately from bounded visual proxy diameter. Atmospheric daylight and local weather affect opacity/exposure, not catalog existence.

The v0.1.4.7 time boundary now advances celestial N-body time at forced 1× while landed whenever the simulation is running. The bounded local weather clock remains separate. The body-fixed observer therefore evolves against live ephemerides without allowing ordinary spacecraft flight integration or high-warp surface evolution.

## Renderer backend policy (v0.1.4.5.4)

`UniverseRenderer` remains based on `THREE.WebGPURenderer`. Backend selection is made once at construction time through `src/render/backendPolicy.js`; it is never hot-swapped. iPhone/iPad-class WebKit forces `forceWebGL: true` to isolate the native-WebGPU presentation path during physical landing/takeoff testing. iPadOS desktop-class UA mode is detected by `MacIntel` plus multi-touch capability. All other environments keep Three.js automatic WebGPU/WebGL2 selection. Simulation, scene graph, materials and landing lifecycle are shared across both backends.

## Core invariant

**Rendering, local surface presentation and fictional FRAME DRIVE never silently own or rewrite authoritative celestial orbital physics.**

Normal spacecraft/major-body state remains SI/Float64. Major gravity remains direct Newtonian and the major integrator remains velocity-Verlet. Three.js owns presentation only. FRAME DRIVE is an explicitly fictional spacecraft-only coordinate-translation layer; its coordinate rate never becomes local Newtonian spacecraft velocity and it never rewrites major-body position, velocity, mass or gravity state.

## Ship-view cockpit presentation

v0.1.4.6.1 introduced the cockpit structure in the Three.js scene while keeping it strictly presentation/input-side. `src/render/cockpitView.js` owns the camera-attached shell, three CanvasTexture MFDs, nine physical control meshes, touch ray-picking and transient button feedback. It does **not** own spacecraft state, navigation physics, target state, experiment state or save authority.

`UniverseLabApp` remains authoritative. It exposes a compact read-only `cockpitTelemetry()` snapshot and `handleCockpitAction()` routes cockpit interactions into the same existing app actions used by the normal UI. `UniverseRenderer` only forwards visibility, telemetry and picking to the cockpit module. This is intentional so a future GLB cockpit can replace the procedural shell without changing application or simulation boundaries.

Every visible cockpit screen/button has a real function. The three MFDs are live and touch-active; MAP/TGT/APPR/ENG/PRO/RET/SCAN/SCI/OVR keys map to existing System Map, target cycling, approach guidance, engine mode, attitude aids, scanner, science and overlay controls. There are no decorative dead cockpit buttons.

v0.1.4.6.1.1 keeps that input boundary intact but moves the MFD planes/bezels forward of the glare shield and adds emissive-only panel accents plus five telemetry-driven status indicators (POWER/TARGET/NAV/PROPULSION/CAUTION). The indicators own no simulation state and add no dynamic scene lights. The bottom MORE launcher is removed; the FLIGHT MFD remains the canonical Flight/System drawer entry. A cockpit-restore failsafe is DOM-side only and exists solely for recovery when `cockpitEnabled=false`.

v0.1.4.6.1.2 extends that same presentation boundary with a fourth `SYSTEM DIAGNOSTICS` CanvasTexture MFD mounted on the right cockpit side. `UniverseLabApp.cockpitTelemetry()` mirrors existing renderer/performance/debug readings into `CockpitView`; `CockpitView` only draws those values and routes a touch on the panel back to the existing Flight/System drawer. The top DOM performance/seed HUD is hidden only while the 3D cockpit is active and remains intact as the fallback when the cockpit is disabled. No diagnostics value becomes authoritative state and no new simulation ownership is introduced.

v0.1.4.6.1.3 deliberately leaves that diagnostics MFD at the same 3D position. Only the DOM flight-control cluster is compacted/lowered on short landscape viewports. A new bottom-bar FRAME control routes into the existing app transit/FRAME state; it creates no second navigation state machine. While FRAME is active, the FLIGHT MFD changes presentation to FRAME telemetry but still owns no simulation state.

v0.1.4.6.1.3.1 keeps all four MFD transforms fixed but changes their CanvasTexture backgrounds to semi-transparent smoked glass. `CockpitView` still draws the telemetry; alpha affects presentation only. The diagnostics screen uses a thinner configurable bezel and moves its decorative projector rail outside the screen edge. Diagnostics touch now routes to `Hud.toggleEngineering()`, a dedicated read-only DOM drawer whose values are mirrored from the same HUD/runtime telemetry bus. FLIGHT remains the only cockpit entry to Flight/System controls. No new physics, renderer, save, navigation or observer authority is introduced.


The cockpit remains excluded from OBSERVE and local surface views. `cockpitEnabled` remains an optional schema-1 preference. The cockpit is never inserted into `EntityRegistry`, never participates in gravity/collision/trajectory calculations, and never alters the canonical astronomical observer.

## Landing lifecycle / recovery boundary

v0.1.4.5 adds `src/surface/landingTransition.js` as the explicit lifecycle controller. The allowed progression is ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT. `UniverseLabApp` owns the controller, boarding distance checks, input locking, orbital handoff and recovery fallback.

v0.1.4.5.3 hardens the **ASCENDING → live-flight ORBIT commit boundary**. ORBIT is not treated as user-visible success until surface renderer/session/UI ownership is detached, every registered held control is force-released, the safe 5-radius physical ship state is restored, the ship is oriented body-relative prograde, the simulation is actively running at 1×, and the handoff invariants pass. The animation loop then renders three ordinary orbital frames at zero simulation dt before `ASCENT COMPLETE` is announced. A post-render invariant miss recovers to a known live orbital state rather than escaping into the global frame-fault latch.

A failed renderer entry/ascent completion is cleaned up through one recovery path that clears surface renderer/session/UI state, resets the phase to ORBIT and restores a valid spacecraft/orbit state. Surface renderer ownership is detached before local resource disposal so a disposal fault cannot leave the renderer logically stuck in surface mode. This prevents repeated LAND calls from operating on stale surface state.

The surface ship remains renderer-local and non-physical. Its descent/ascent motion, VTOL plumes and landing-site glow are presentation cues only. The authoritative `ShipDynamics` object remains surface-constrained/not integrated while surface mode is active and is placed into the existing safe 5-radius orbital handoff around the parent body’s current advanced state only after ascent completes.

## Surface HUD presentation boundary

v0.1.4.4.1 keeps surface UI state separate from simulation state. `surfaceSession.hudExpanded` is a backward-compatible optional UI preference only; it cannot modify local movement, weather, anomalies, rendering physics, spacecraft state or orbital time.

The compact shell keeps scan/sprint controls live during normal exploration. Detailed telemetry, SAVE and TAKEOFF are intentionally hidden until the player expands the panel. CSS reduces the WALK control footprint without changing the pointer/hold-input logic.

## Planetary environment / weather boundary

v0.1.4.4 added `src/surface/surfaceWeather.js` as a deterministic local-environment state machine. It remains deliberately separate from `SimulationClock`: as of v0.1.4.7 celestial N-body time may continue at surface 1× while the bounded local weather clock advances independently. The state serializes inside the optional schema-1 `surfaceSession` payload.

Surface weather owns event identity, intensity, wind presentation, event duration, next clear interval and an explicit serializable PRNG state. `SurfaceWorldVisual` consumes the resulting reading to alter local fog, clouds, weather particles, lightning, sky-fracture lines and exposure. It never writes spacecraft velocity, gravity sources, orbital time or player movement acceleration.

`surfaceGenerator.js` now exposes three deterministic region profiles. `UniverseLabApp` owns the selected landing-region ID and passes it into region generation. Existing old schema-1 surface saves still resolve Shatterfall because the legacy region ID is unchanged.

The parked ship is a renderer-local procedural model stored only inside `SurfaceWorldVisual`. It is not inserted into `EntityRegistry`; the authoritative spacecraft remains `ShipDynamics` and is restored to safe orbit only on TAKEOFF.

## Surface-instance boundary

v0.1.4.3 introduces a deliberately separated local surface layer:

- `src/surface/surfaceGenerator.js` — deterministic seeded terrain/environment/POI definitions.
- `src/surface/surfaceSession.js` — local player position/look state, bounded translation, scan state and serialization.
- `src/render/surfaceWorld.js` — Three.js surface scene, terrain mesh, instanced dressing, sky, lighting and anomaly visuals.
- `UniverseLabApp` — owns landing eligibility, surface lifecycle, local input, save/load handoff and scripted return to orbit.

The surface instance now integrates the **celestial world only** at forced 1× when `running` is enabled. It does not call ordinary `ShipDynamics` or navigation for the parked spacecraft. Surface time-warp above 1× is blocked in this foundation release to avoid hidden high-warp evolution and unnecessary mobile cost while the player explores locally.

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

## Fictional FRAME DRIVE

`physics/transitDrive.js` retains its legacy module/function names for compatibility, but v0.1.4.6.1.3 presents the feature as **FRAME DRIVE**. It remains separate from Three.js, major-body integration and local propulsion. It supplies 1c/10c/100c/500c/1000c **coordinate-rate** travel, live-target stand-off envelopes, arrival step-down, no-overshoot movement and swept massive-body route guards.

The isolation boundary is explicit:

- `VelocityVerletIntegrator.step(massiveBodies, dt)` continues normally while the simulation is running.
- Minor particles, particle experiments, space weather and major-body collision checks continue through their existing paths.
- Only `ShipDynamics.step(dt, massiveBodies)` and local navigation acceleration are suspended while FRAME is active.
- `advanceTransitPosition(...)` changes only `ship.position`; the FRAME coordinate rate is never added to `ship.velocity`.
- A normal pilot exit or automatic arrival calls `matchFrameExitVelocity(ship, target)`, changing only the spacecraft velocity to the locked target inertial velocity. The target/world state is untouched.
- A forced route-guard/target-loss/reset dropout does **not** perform target matching and preserves local spacecraft velocity.
- FRAME forces simulation time scale to 1×. If the simulation is already paused, FRAME may translate the spacecraft in real time while `SimulationClock.advance(...)` remains stopped, allowing recovery from the 0.1c Newtonian model guard without evolving the paused world.

`APPROACH`, STOP RELATIVE, BRAKE and TURN & BURN remain the physical bounded-thrust navigation path and are unchanged by FRAME.

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


## v0.1.4.9.1.1 planner UI boundary
The mobile planner hotfix changes CSS/layout only. Planner propagation, finite-disk astronomy, and all authoritative simulation state remain unchanged. iOS text autosizing suppression is scoped to `.event-planner-panel` rather than applied globally.
## Portrait cockpit hotfix boundary

`CockpitView.setViewport(width, height)` is presentation-only. The renderer forwards viewport dimensions after updating camera projection. Portrait mode hides wide-layout shell/MFD/key geometry and repositions the central FLIGHT MFD; landscape restores stored base transforms. HTML portrait shortcuts call `UniverseLabApp.handleCockpitAction()` and therefore reuse the same NAV/FLIGHT/SCIENCE/Engineering drawers. Orientation state is not serialized and has no physics authority.
