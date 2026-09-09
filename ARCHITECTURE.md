# Architecture — Universe Lab v0.1.4.2

## Core invariant

**Rendering and fictional transit never own or silently rewrite authoritative local physics.**

Normal ship/body state remains SI/Float64. Three.js owns presentation only. TRANSIT owns a clearly separated speculative coordinate-translation mode and never adds its coordinate rate to the Newtonian ship velocity.

## Local physical flight

`ShipDynamics` retains local Newtonian velocity integration and now exposes three bounded propulsion modes:

- FLIGHT 20 m/s²,
- CRUISE 120 m/s²,
- BOOST 5,000 m/s².

BOOST is intentionally marked speculative. `flightComputer.js` owns APPROACH/HOLD, STOP RELATIVE, inertial BRAKE and TURN & BURN acceleration commands. Commands remain bounded by the selected engine acceleration.

TURN & BURN captures an inertial desired direction at engagement, decomposes current velocity into along-direction and lateral components, and applies bounded acceleration to cancel the lateral component. It never applies hidden exponential damping.

## Velocity-vector HUD

The ship attitude basis and authoritative `ship.velocity` are projected into a lightweight HUD marker. This has no physics role. It exists specifically to make the difference between **where the nose points** and **where momentum is carrying the ship** visible on mobile.

## Speculative transit layer

`physics/transitDrive.js` is a pure module with no Three.js dependency.

It provides:

- normalized 1c/10c/100c/500c/1000c coordinate-rate tiers,
- target arrival-envelope calculation,
- distance-dependent automatic tier step-down,
- bounded real-frame position advancement with no arrival overshoot,
- per-body transit safety radii,
- swept segment/sphere route guards.

`UniverseLabApp.updateTransit(realDt)` performs reference-frame translation using real elapsed wall-clock time while the normal simulation clock remains at 1×. The target is resolved live each frame, so a moving target remains current.

The transit layer modifies only spacecraft **position**. It deliberately preserves `ship.velocity`. On AUTO CAPTURE arrival, the app exits transit and starts normal BOOST-powered APPROACH so target-relative Δv is handled by the physical flight computer.

For COSMOS phenomena anchored to a live body, the target anchor body is excluded from the swept route blocker list because it is the intended destination. Intervening massive bodies remain guarded.

TRANSIT visual streaks/FOV cues are driven by `ship.transitVisualFactor` and `ship.transitDirection`; these are render-only state.

## Experiment lifecycle

`ParticleExperiment` now stores:

- `lifecycle`,
- `completedAtSeconds`,
- `peakActiveCount`,
- `lastLiveObservation`,
- deterministic `initialConfig` for replay.

A field becomes complete when active particle count reaches zero. Its final valid observation state is retained so an observer never falls back to an empty `(0,0,0)` centroid.

`ParticleExperimentManager` separates:

- total retained fields,
- active field count,
- active particle count,
- active slot budget.

`recommendedWarpCap` is 60× **only while active particles exist**. Completed fields do not consume the active simulation budget and do not keep the fine-step warp cap alive. A bounded number of completed fields is retained for inspection/replay.

## Warp arbitration

There are three separate concepts:

1. **simulation time warp** — 1× / 60× / 600× / 3,600×,
2. **navigation auto-warp** — chosen by APPROACH/STOP RELATIVE/TURN & BURN,
3. **TRANSIT coordinate rate** — fictional 1c–1000c real-time reference-frame travel.

Particle safety applies only to live local particle experiments. If a requested high warp is reduced to 60×, the requested value is remembered and can be restored once the last active particle completes, provided navigation/transit does not impose a stricter state.

TRANSIT locks simulation time warp to 1× because transit has its own separate coordinate-rate control.

## Existing physical/cosmic architecture

The v0.1.4.1 separation remains:

- `EntityRegistry`: live finite-radius Newtonian major bodies,
- `CosmicPhenomenonRegistry`: large exploration sources and visual population proxies,
- `SpaceWeatherManager`: kinematic session-local CME event state,
- `scientificOverlays.js`: pure derived overlay math,
- Three.js render modules: visual-only proxies for belts/rings/remnants/CMEs/fields/compact-object spectacle.

No landing architecture is introduced in this release.

## Mobile safety

- TRANSIT movement is swept against massive-body guard spheres.
- Local strong-gravity adaptive substeps and the 0.1c Newtonian ship-velocity model limit remain active because TRANSIT does not modify local velocity.
- Mobile drawers remain scrollable and all new controls use the existing safe-area/VisualViewport shell.
- Direct app `this.method()` calls, unique HTML IDs and literal app `#id` selectors are now statically audited.

## Stellar presentation pipeline — v0.1.4.1.2

Stellar rendering remains isolated from authoritative physics.

- `render/celestialFactory.js` owns the layered star visual: photosphere, seeded procedural surface texture, limb-darkening overlay, additive corona, prominence filaments, active regions and rare visual flare sites.
- `render/stellarPerception.js` is a pure presentation-policy module. It converts apparent angular radius into surface-detail, micro-corona, macro-visibility, background and exposure factors. It contains no Three.js objects and changes no body/ship state.
- `render/threeRenderer.js` measures apparent star size from the live camera, applies the perceptual profile, adapts ACES exposure/background intensity and adjusts the camera near plane for close finite-radius surfaces.
- `render/starfield.js` exposes role/base-opacity metadata so deep-space stars, the galactic band and nebula proxies can be attenuated near a bright stellar disk without destroying their baseline authored values.
- `render/spaceWeatherVisuals.js` keeps active CME macro fronts renderable at long range rather than using the former hard distance cutoff.

The key policy is **perceptual LOD, not disappearance LOD**: expensive micro-detail may simplify as it becomes sub-pixel, while visually important macro phenomena are preserved. This keeps distant stellar events legible without running unnecessary tiny particles.

Generated per-star surface textures are explicitly marked for disposal when their owning visual is destroyed. Shared textures remain shared. This avoids accumulating generated canvas textures when systems are regenerated.

## Close-approach and transit presentation isolation

Dynamic camera near-plane adjustment and stellar exposure are renderer-only operations. They do not change collision radii, safety envelopes, gravitational sources, integration step sizes or navigation decisions.

Similarly, `transitVisualFactor` now decays for a short period after TRANSIT exits. That decay is render-only and intentionally preserves the authoritative Newtonian position/velocity handoff. The normal transit drive still owns coordinate translation and AUTO CAPTURE still returns control to bounded local propulsion.


## System map + discovery architecture — v0.1.4.2

- `src/ui/systemMap.js` is an interface projection over live state, not a physics subsystem. It logarithmically compresses star-relative X/Z positions and exposes body/COSMOS selection handoff.
- `src/cosmic/anomalyGenerator.js` deterministically creates 9–15 free-space anomaly definitions per seed. Definitions carry explicit `realityClass`, scan summary and scientific/model-boundary text.
- Anomalies remain entries in `CosmicPhenomenonRegistry`; they are not inserted into the massive-body registry and therefore do not silently source Newtonian gravity.
- `discoveredPhenomena` plus `discoveryScanDepth` (0–3) are persisted as optional save-payload fields.
- Space weather now serializes its future schedule, active fronts and RNG progress so loading a save continues the same weather chronology instead of rerolling it.
- Save schema remains 1 because all new payload fields are optional and old schema-1 saves remain loadable.
