## v0.1.5.3.1 — Surface Input Release & Version Identity Hotfix

- Fixed the stale top-left shell badge so the running build visibly reports `v0.1.5.3.1` instead of the old `v0.1.5.2` label.
- Hardened all hold controls, including surface WALK, with an independent iPhone/WebKit `touchend` / `touchcancel` fallback in addition to the existing Pointer Event release paths.
- Added a target-touch-aware guard so multi-touch remains valid: lifting LOOK does not cancel a still-held WALK/THRUST touch.
- Added a document all-touches-up failsafe and `pagehide` neutralization so no hold can remain latched after browser/chrome gesture arbitration or page lifecycle changes.
- No atmosphere/sky optics, N-body, FRAME, terrain, landing/takeoff, save-schema, environment, astronomy, or rendering-model changes.
- Cache tags updated to `?v=1531`; build marker `INPUTREL-1531`.

---

## v0.1.5.3 — Physical Atmosphere & Sky Optics

- Added pure `src/physics/atmosphericOptics.js` with pressure-scaled dry-air-like Rayleigh reference optical depth, generic aerosol/Mie proxy, optical air mass, hydrostatic scale height, surface sky/direct-star solution and orbital limb solution.
- Replaced fixed surface palette/daylight exposure with live optics driven by canonical pressure/temperature/gravity/molecular-mass proxies plus primary-star altitude/color and finite-disk eclipse visibility.
- Added dynamic top/horizon sky color, low-star reddening, direct stellar extinction, daylight star/galactic washout, diffuse sky-light proxy and physically scaled clear-air extinction; weather only supplies bounded aerosol/transmission presentation inputs.
- Added presentation-only solid-world atmosphere limbs in orbit, with scale-height thickness and Rayleigh tangent-column color/opacity. Trace/vacuum worlds receive no limb.
- Preserved airless black-sky/no-fog behavior for f-A/h-A and kept Caelum-4361 e optically thin/dark rather than Earth-like.
- No save-schema, N-body, FRAME, environment-generation, rotation, landing/takeoff, impact, planner or WebKit-backend changes.
- Added atmosphere optics unit/integration/property tests and updated stale surface static assertions for the new optical authority boundary.
- Safari/GitHub Pages cache tags updated to `?v=153`; build marker `ATMOSKY-153`.

---

## v0.1.5.2 — Multi-World Landing & Exploration

- Expanded the v0.1.5.1 bounded surface architecture into a deterministic multi-world exploration set without unlocking every solid body.
- `ORIGIN-001` now supports surfaces on Caelum-4361 d, f-A, e and h-A.
- Added deterministic `ATMOSPHERIC_ROCKY` exploration terrain for the cold/thin-atmosphere Caelum-4361 e reference case, with ordinary dust/frost presentation only and no anomaly-weather leakage.
- Added deterministic `ICE_VOLATILE` terrain for the cryogenic Caelum-4361 h-A reference case, with bright ice/fracture/dark-ejecta proxies and no weather scheduler on its effectively airless environment.
- Preserved the accepted home-world generation/weather path and the accepted airless f-A reference path.
- Hardened schema-1 surface-session restore so local state is accepted only when saved body/profile identity matches the current generated region.
- Fixed generalized takeoff handoff so the departing session/region survive cleanup long enough to reconstruct the current rotated body-fixed landing direction; generalized surfaces then reuse the existing Hill-screened circular-orbit insertion planner. Home-world return behavior remains unchanged.
- Added multi-world exploration regressions and large-seed selection/insertion/property audits.
- Deliberately did not add speculative FRAME target-clearance diagnostics or route changes; no reproducible body intersection was established.
- Save schema remains 1; Three.js remains 0.185.0; iPhone/iPad WebKit remains forced WebGL2.

---

# Changelog

## v0.1.5.1.2 — Portrait HUD Transparency & Visual Weight Hotfix

- Removed the opaque physical FLIGHT MFD bezel only in portrait compact-flight-deck mode.
- Added portrait-only low-alpha smoked-glass drawing for the FLIGHT MFD while keeping telemetry text fully opaque.
- Softened the portrait `NAV / FLIGHT / SCI / SYS` shortcut tray and buttons with lower alpha and Safari-compatible backdrop blur.
- Landscape cockpit transforms, bezel and four-MFD presentation remain unchanged.
- Added focused regressions for portrait glass alpha, bezel restoration and shortcut transparency.
- Save schema remains 1; Three.js remains 0.185.0; iPhone/iPad WebKit remains forced WebGL2.

## v0.1.5.1.1 — Portrait Flight UX & Responsive Cockpit Hotfix

- Added aspect-responsive 3D cockpit layout for portrait ship view.
- Portrait keeps one readable central FLIGHT MFD and the canopy while hiding landscape-only side MFDs, diagnostics mount and physical key row.
- Added compact `NAV / FLIGHT / SCI / SYS` portrait shortcuts that reuse existing cockpit/app actions and own no simulation state.
- Repositioned LOOK, THRUST/REV/BRAKE, messages, RCS and bottom controls for narrow iPhone safe-area geometry.
- Hidden portrait cockpit objects are rejected by cockpit ray-picking.
- Landscape cockpit transforms and all v0.1.5.1 multi-world surface behavior are retained.
- Save schema remains 1; Three.js remains 0.185.0; iPhone/iPad WebKit remains forced WebGL2.

## v0.1.5.1 — Multi-World Surface Architecture

- Added `src/surface/surfaceProfiles.js`, a read-only profile/access layer over the canonical planetary-environment model.
- Added architectural families for atmospheric rocky, airless rocky and ice/volatile surfaces without making every solid body landable.
- Preserved the accepted home-world generation/weather path; ORIGIN home-region legacy payload (excluding new profile metadata) remains byte-identical to v0.1.5.0.
- Enabled at most one deterministic qualifying airless-rocky moon proof surface per system; ORIGIN selects Caelum-4361 f-A (`moon-5-1`).
- Added deterministic airless regolith terrain with black vacuum sky, no fog/cloud/wind/weather scheduler, no anomaly sites and conventional geology POIs.
- Added optional schema-1 `surfaceProfileId` / `surfaceModelVersion` session persistence.
- Generalized landing eligibility/region selection from planet-only flags to the surface-profile capability layer.
- Moon takeoff now uses the existing Hill-screened circular orbit insertion planner; its insertion plane is seeded from the current rotated body-fixed landing anchor instead of a stale pre-landing inertial ship coordinate. Home-world takeoff remains unchanged.
- Added multi-world architecture regressions for proof selection, deterministic vacuum generation, disabled weather, home-world byte compatibility, session persistence, NAV capability and Hill-safe moon return orbit.
- Updated Safari/GitHub Pages cache tags to `?v=151`.

## v0.1.4.9.1.1 — Observation Planner Mobile Layout Hotfix

- Fixed iPhone Safari short-landscape Observation Planner result cards overlapping after WebKit text autosizing enlarged 7–9 px button text without matching control geometry.
- Scoped `-webkit-text-size-adjust:100%` / `text-size-adjust:100%` to the planner only; no global typography behavior changed.
- Event cards now use content-sized grid rows, explicit readable line heights, normal wrapping, and 68–72 px minimum card height.
- Results now have a dedicated momentum-scrolling area with stable short-landscape height, so large event sets scroll instead of compressing/overlapping.
- Added focused mobile-layout regression tests. Observation-planner ephemeris/search math, gravity, appearance/eclipse geometry, NAV/FRAME, surface and save behavior are unchanged.
- Save schema remains 1. Safari/GitHub Pages cache tags updated to `?v=14911`.

## v0.1.4.9.1 — Observation Planning & Astronomy Validation

- Added `src/navigation/observationPlanner.js`, a read-only forward ephemeris search using cloned gravity-source body state, the existing direct Newtonian gravity solver, velocity-Verlet integration, close-pair timestep ceiling and canonical finite-disk occultation math.
- Added NAV **PLAN OBSERVATIONS** and surface **PLAN SKY EVENTS** entry points.
- Selected planet/moon is the reference observer; active landed sessions on that same body use the exact saved body-fixed site and future planetary rotation, while non-landed planning is explicitly body-center.
- Added 7/30/90/180-day horizons, 300 s coarse sampling, 10 s local refinement, 5° close-alignment listing threshold, event progress/cancel UI, eclipse coverage and surface horizon diagnostics.
- Planner state is isolated from authoritative bodies/ship/clock/save state. Searches are animation-frame chunked and have a hard numerical work budget; stiff systems report BUDGET LIMITED instead of hiding reduced precision.
- Added live-epoch staleness warning when the authoritative simulation advances materially beyond the planner's snapshot epoch.
- Save schema remains 1; no planner state is serialized.


## v0.1.4.9 — Celestial Appearance, Phases & Eclipse Geometry

- Added pure `core/celestialAppearance.js` geometry for apparent angular radius, phase angle, illuminated fraction, finite-disk overlap, observer stellar occultation and body-centered stellar shadow.
- Enriched the canonical astronomical body observations with reusable phase/eclipse fields; no appearance calculation owns or mutates simulation state.
- Preserved existing live star-direction terminator lighting for space planets/moons while removing physical-reflector self-emission/readability shells.
- Replaced additive glowing surface planet/moon sprites with angularly correct phase-shaded 3-D spheres at monotonic compressed render depth; physical sky direction and apparent angular size remain authoritative.
- Added finite stellar disk rendering and observer stellar-cover fraction to surface direct-light/daylight presentation.
- Added surface, NAV and scanner diagnostics for angular diameter, illuminated fraction/phase and stellar shadow/occultation.
- Fixed cumulative surface background/fog darkening by recalculating exposure from immutable base colors each frame.
- Added canonical analytic/property/integration/static tests for phase endpoints, finite-disk overlap, observer/body eclipses, record reuse/non-mutation, surface phase rendering and daylight-exposure stability.
- Documented limitations: dominant single occulter only, exposure-normalized rather than radiometric light, Lambertian surface-sky phase proxy, no atmospheric radiative transfer/refraction.
- Updated Safari/GitHub Pages cache tags to `?v=149`.

## v0.1.4.8.2 — Impact & Numerical Hardening

- Added reusable flat `CollisionStateBuffer` previous-state storage and first swept sphere-contact root detection, eliminating per-substep Map/per-body snapshot allocation and resolving collisions at interpolated first contact instead of penetrated step-end state.
- Normalized generated gas-world impact typing so `planetType: gas` uses gas-envelope behavior and never receives a rocky crater estimate.
- Reworked representative fragmentation in the center-of-mass frame with balancing target recoil; represented 3-D linear momentum is conserved and ejecta/recoil kinetic energy is capped to a fraction of available COM impact energy.
- Made black holes mandatory collision sinks and recompute Schwarzschild radius after accretion while conserving represented mass/momentum.
- Added `massivePairStepControl.js`; close/high-speed massive pairs dynamically reduce the 300 s major-body ceiling using Newtonian dynamical/crossing times, while ordinary generated systems remain at the existing ceiling.
- `SimulationClock` can now re-evaluate a dynamic timestep ceiling before every substep.
- Activated the bounded minor test-particle cadence for fine frame-sized calls and reused source-state scratch buffers.
- Reworked trajectory prediction as a one-way test particle with adaptive local/pair step limits, reusable scratch storage, bounded internal work, and explicit `accuracyLimited` telemetry when the CPU budget prevents the preferred numerical step.
- Replaced small-secondary L1/L2/L3 overlay approximations with numerical circular-CR3BP collinear equilibrium roots; L4/L5 remain equilateral CR3BP geometry.
- Added impact/numerical hardening regression tests for gas material handling, 3-D momentum and energy budgets, black-hole accretion, first-contact timing, snapshot reuse, dynamic close-pair timesteps, minor-field cadence, one-way trajectory prediction, bounded prediction work, and comparable-mass Lagrange roots.
- Updated Safari/GitHub Pages cache tags to `?v=1482`.

## v0.1.4.8.1 — Scientific Consistency Hotfix

- Added `src/physics/planetaryProperties.js` for coherent bulk-density derivation, bounded gas-giant generation, Newtonian breakup period, and two-body specific orbital energy.
- Fresh gas giants no longer independently sample contradictory mass/radius/density values; density is exact for the generated mass/radius pair.
- Added a 1.15× breakup-period safety floor for generated planetary spin.
- Replaced global-axis spin initialization for fresh planets with parent-relative orbital-normal spin poles and physically meaningful PRO/RETRO classification.
- Fresh synchronous moons now use `G(Mparent+Mmoon)` and face their parent at the rotation epoch.
- Added `src/core/generatedBodyCompatibility.js`; saved v1 rotation frames are preserved and only missing metadata is backfilled, preventing body-fixed landing-anchor jumps across the generator revision.
- Legacy gas saves preserve mass/radius/dynamics while dependent density is re-derived if no property-model marker exists.
- Fresh rogue planets now have guaranteed positive star-relative two-body specific orbital energy.
- Added broad generator property/regression tests and maintained all v0.1.4.8 NAV/FRAME/surface/cockpit behavior.
- Updated Safari/GitHub Pages cache tags to `?v=1481`.

## v0.1.4.8 — Planetary System Navigation & Exploration Foundation

- Added a live star → planet → moon BODY CATALOG to the System Map using the authoritative generated/N-body body registry.
- Added explicit **LOG SURVEY**, **TRUE SYSTEM**, and **TRUE LOCAL** map modes; only LOG SURVEY compresses range non-linearly and it is labeled accordingly.
- Added live physical target details for parent, range, radius, mass, Newtonian surface gravity, Kepler-period estimate, eccentricity, rotation, instantaneous Hill radius, surface capability, and explicit atmosphere-model status.
- Connected catalog selection directly to the existing persistent celestial `targetId`; no save-schema bump or duplicate target state was introduced.
- Added `systemNavigation.js` as a read-only navigation/scientific-derivation layer.
- Added `frameOrbitInsertion.js` for supported planet/moon/rogue-planet **normal completed FRAME arrivals**. The fictional FRAME handoff now establishes an instantaneous circular osculating state using `sqrt(GM/r)` relative speed added to the target's live inertial velocity.
- Constrained insertion radius to an exterior minimum and, where a parent orbit is known, to 47% of a conservative Hill estimate using the smaller of live separation and stored-orbit pericenter estimates. This is a screening rule, not a long-term N-body stability guarantee.
- Preserved manual FRAME disengage target-frame matching and unsupported-target behavior.
- Added `frameGuardRoute.js`: when a direct FRAME segment intersects another massive-body clearance guard, a deterministic live-body-anchored two-leg bypass is used only if both legs remain swept-clear against every existing guard. Guard radii and celestial states are never altered; unresolved routes are refused.
- Added cockpit FRAME arrival-orbit telemetry without moving the accepted MFD geometry.
- Explicitly retained only the existing detailed landable home world; other solid worlds are orbital-only and atmosphere physics remains unmodeled.
- Preserved save schema 1, Three.js 0.185.0, direct Newtonian gravity, velocity-Verlet, system generation, rotating-surface astronomy, landing/takeoff behavior, and iPhone/iPad forced-WebGL2 policy.
- Updated Safari/GitHub Pages cache tags to `?v=148`.

## v0.1.4.7.1 — Surface Astronomy Diagnostics & Pause Control Hotfix

- Built directly from the physically accepted v0.1.4.7 `ROTASTRO-147` baseline.
- Added surface DETAILS readouts for procedural body-fixed latitude/longitude, current rotation phase, primary-star altitude/azimuth, and geometric local solar time.
- Added `localSolarTimeHours()` to the rotation model using observer longitude versus the primary star's substellar longitude; it has no simulation authority.
- Added a landed-only **PAUSE SKY / RESUME SKY** control wired to the existing simulation-running flag; local walking/weather remain active while celestial time is paused.
- Disabled the new sky-pause control outside the LANDED phase so descent/ascent lifecycle behavior is untouched.
- Reused the same canonical astronomical solution for diagnostics and surface rendering in each frame; no duplicate sky or observer model was introduced.
- Preserved save schema 1, Three.js 0.185.0, direct Newtonian gravity, velocity-Verlet, ShipDynamics isolation on the surface, FRAME behavior, iPhone/iPad forced-WebGL2 policy, and accepted save/load/takeoff behavior.
- Updated Safari/GitHub Pages cache tags to `?v=1471`.

## v0.1.4.7 — Planetary Rotation & Continuous Surface Astronomy Foundation

- Added deterministic rigid planetary/moon rotation metadata using independent per-body RNG streams; existing seeded orbital positions/velocities are preserved.
- Added `core/planetaryRotation.js` with inertial/body-fixed transforms, rotation phase, tangent-basis construction and landing-anchor capture.
- Surface sessions now optionally persist a body-fixed touchdown anchor and capture metadata without changing save schema 1.
- Landed mode advances the authoritative celestial N-body world at forced 1× while deliberately skipping ordinary spacecraft `ShipDynamics` and navigation integration.
- Canonical surface observer local-up/east/north now follow the rotating body-fixed anchor when rotation metadata is present, with backward fallback for older sessions.
- Surface starfield now dynamically reprojects the same inertial catalog into preallocated buffers at a bounded cadence; no reseeding or duplicate sky is introduced.
- Added bounded daylight/twilight/night presentation derived from live star altitude; this is not an atmospheric scattering solver.
- Existing schema-1 saves deterministically backfill rotation metadata for generated bodies while preserving saved physical mass/radius/position/velocity.
- Surface time-warp above 1× is intentionally blocked in this foundation build; PAUSE can stop celestial time while local exploration/weather remains usable.
- Preserved FRAME isolation, Three.js 0.185.0, direct Newtonian gravity, velocity-Verlet, accepted landing/ascent recovery and the iPhone/iPad forced-WebGL2 renderer policy.
- Automated regression suite expanded to cover rotation round-trips, body-fixed observer evolution, in-place star reprojection, surface-only celestial stepping, save compatibility and a locked legacy `ORIGIN-001` orbital signature.

## v0.1.4.6.1.3.1 — Cockpit MFD Transparency & Engineering Diagnostics Polish

- Made all four in-cockpit CanvasTexture displays modestly translucent using smoked-glass alpha backgrounds while preserving fully legible text/telemetry.
- Kept the SYSTEM DIAGNOSTICS screen at its accepted 3D position.
- Reduced the diagnostics cyan outline thickness and slimmed/repositioned its physical bezel/projector rail so the right edge no longer masks screen content.
- Changed SYSTEM DIAGNOSTICS touch behavior to open a dedicated read-only **ENGINEERING / DIAGNOSTICS** drawer instead of the existing Flight/System drawer.
- Mirrored renderer, FPS, physics/render timing, ship speed, sim time, seed, body/test counts, draw calls, prediction timing and experiment telemetry into the engineering drawer without creating new simulation state.
- Added build-version query tags to `styles.css` and `src/main.js` to reduce Safari/GitHub Pages stale mixed-asset loads.
- Preserved FRAME behavior, real-physics APPROACH/BRAKE, celestial gravity, save schema 1, Three.js 0.185.0 and the forced iPhone/iPad WebGL2 backend policy.

## v0.1.4.6.1.3 — Frame Drive & Cockpit Flight-Control Polish

- Built directly from v0.1.4.6.1.2 after physical iPhone feedback approved the ship-mounted SYSTEM DIAGNOSTICS MFD but showed the large THRUST overlay covering its lower-right area.
- Kept the diagnostics MFD at its exact v0.1.4.6.1.2 3D position and compacted/lowered the THRUST / REV / BRAKE DOM cluster on short landscape viewports instead.
- Added a direct bottom-bar **FRAME** tap-toggle control; no hold gesture is required.
- Re-presented the existing isolated fictional transit layer as **FRAME DRIVE** and removed the old AUTO CAPTURE behavior from the current UI.
- FRAME translates only spacecraft position toward the locked target. Major-body Newtonian gravity/velocity-Verlet, particles, weather and collision simulation continue on their existing paths while the simulation is running.
- Suspended only local spacecraft `ShipDynamics` acceleration/integration while FRAME is active so the fictional coordinate rate never accumulates into Newtonian ship velocity.
- Normal FRAME exit and automatic arrival match only the spacecraft to the target inertial velocity, yielding near-zero target-relative velocity before ordinary gravity/ShipDynamics resume. Forced route/target safety dropouts preserve the pre-FRAME spacecraft velocity.
- FRAME locks simulation warp to 1×, but can translate the spacecraft while a model-limit pause is active without advancing paused world simulation time.
- FLIGHT MFD now becomes a FRAME status display while active; SYSTEM DIAGNOSTICS remains in place and live.
- APPROACH, BRAKE, FLIGHT/CRUISE/BOOST, celestial gravity, save schema 1, Three.js 0.185.0 and the forced iPhone/iPad WebGL2 backend policy are otherwise unchanged.


## v0.1.4.6.1.2 — Integrated Cockpit Diagnostics MFD

- Added a fourth live Three.js/CanvasTexture cockpit screen on the right side: **SYSTEM DIAGNOSTICS**.
- Added a slim procedural ship-side mount/rail and translucent holo-style MFD presentation without external assets or dynamic cockpit lights.
- Moved live renderer/backend, FPS, physics/render timing, ship speed, simulation time, seed, body/test counts, draw calls, prediction timing and experiment telemetry into the cockpit display.
- Hid the duplicated top stat cards and seed/debug strip only while the 3D cockpit is active; cockpit-hidden/ordinary HUD fallback remains intact.
- Kept the compact target ribbon visible and shifted it upward into the newly cleared top area.
- Diagnostics MFD touch routes to the existing Flight/System drawer; no duplicate system state or controls were created.
- Preserved save schema 1, Three.js 0.185.0, iPhone/iPad forced-WebGL2 backend policy, `ShipDynamics` authority, astronomical observer/sky continuity, landing lifecycle and all physics model boundaries.

## v0.1.4.6.1.1 — Cockpit Ergonomics, Lighting & Menu Cleanup Polish

- Built directly from v0.1.4.6.1 after physical iPhone feedback approved the cockpit concept but showed the MFD bank visually behind the horizontal glare-shield bar.
- Pulled NAVIGATION / FLIGHT / SCIENCE MFD faces and bezels forward toward the pilot and slightly retuned their height/angle so the glare shield no longer slices through the displays.
- Thinned/retuned the glare shield while preserving the wide forward astronomical view.
- Removed the redundant bottom **MORE** launcher. The center FLIGHT MFD remains the authoritative entry to the existing Flight/System drawer and no controls were duplicated.
- Added a small **COCKPIT** restore failsafe that appears only while the cockpit is deliberately hidden, preventing a persisted OFF preference from trapping a phone user.
- Added restrained emissive console accents and five live cockpit status lamps: POWER, TARGET, NAV, PROPULSION and CAUTION. The lighting uses emissive/basic materials only; no new dynamic PointLight/SpotLight cost was introduced.
- Preserved all nine real physical cockpit keys and all three live/touchable MFDs. No decorative dead button/screen was added.
- Preserved save schema 1, Three.js 0.185.0, canonical astronomical observer, landing/ascent recovery, Newtonian physics, and the physically accepted iPhone/iPad forced-WebGL2 policy.

## v0.1.4.6.1 — Interactive 3D Cockpit Visual Foundation

- Added a camera-attached procedural Three.js cockpit shell with a wide forward canopy, thin structural framing, low dashboard and restrained material/emissive treatment.
- Replaced the old fake dashboard/strut DOM artwork with a glass/reflection/status overlay only; cockpit structure now exists in the 3D scene.
- Added live **NAVIGATION**, **FLIGHT**, and **SCIENCE** MFDs using CanvasTexture telemetry updated at a bounded cadence.
- Made every visible cockpit screen interactive: NAV opens System Map, FLIGHT opens Flight/System, SCIENCE opens Science.
- Added nine functional physical cockpit keys: MAP, TGT, APPR, ENG, PRO, RET, SCAN, SCI and OVR.
- Cockpit touches use Three.js ray-picking and are consumed before celestial-body target picking.
- Existing app actions remain authoritative; cockpit controls are presentation/input aliases, not duplicate simulation logic.
- Cockpit still auto-hides in OBSERVE and surface modes and respects the existing schema-1 `cockpitEnabled` preference.
- Preserved Three.js 0.185.0, save schema 1, canonical astronomical observer, landing/ascent recovery, and the accepted iPhone/iPad forced-WebGL2 renderer policy.


## v0.1.4.6 — Astronomical Observer & Sky Continuity Foundation

- Added a canonical read-only observer solution for ship, descent and surface modes with inertial position, orientation, local horizon basis, parent/anchor/altitude and canonical simulation time.
- Major-body observations now derive direction and range from authoritative live positions and compute physical apparent angular radius separately from visual proxy size.
- Replaced mode-local star generation with one stable deterministic inertial typed-array catalog reused by space and surface renderers.
- Surface sky now projects that catalog into the landing horizon basis once, occludes the lower hemisphere, follows player look/heading and consumes live Sun/body directions.
- Added atmospheric daylight and weather visibility/exposure hooks without deleting stars or body records.
- Preserved the intentional fixed orbital instant while landed and the separate bounded surface-weather clock; no hidden ephemeris evolution was introduced.
- Confirmed two separated magnetars mutually accelerate under the existing Newtonian solver; fixed repeated LAB magnetar overlap with deterministic collision-safe golden-angle offsets.
- Preserved save schema 1, Three.js 0.185.0, velocity-Verlet, ShipDynamics ownership, fictional TRANSIT isolation, landing/ascent hardening and the forced iOS WebGL2 backend policy.
- Automated QA: 143/143 tests passing plus static/syntax/import checks. Physical iPhone Safari remains the release gate.

## v0.1.4.5.4 — WebKit Renderer Handoff Reliability Hotfix

- Built directly from the exact v0.1.4.5.3 release after physical iPhone testing proved the CPU/app handoff invariants all reached `ORBIT VERIFIED` while the visible canvas still presented the local surface image.
- Reclassified the remaining symptom as a renderer/presentation isolation problem rather than another landing-state-machine failure.
- Added a boot-time renderer backend policy: iPhone/iPad-class WebKit devices now construct the existing `THREE.WebGPURenderer` with `forceWebGL: true`, selecting its WebGL2 backend even when native WebGPU is available.
- Added iPadOS desktop-UA detection (`MacIntel` + touch points) so desktop-site mode does not accidentally re-enable native WebGPU during the physical test.
- Non-Apple-mobile platforms retain the previous automatic WebGPU → WebGL2 fallback behavior. There is no live backend hot-swap.
- Renderer HUD reports `WebGL2 iOS` when the forced isolation path is active, making the physical test condition immediately visible in screenshots.
- Preserved v0.1.4.5.3 ascent state machine, prograde return, running/input restoration, held-control reset, three-frame orbital verification and temporary physical-test telemetry unchanged.
- No astronomy, real-sky, cockpit redesign, physics, propulsion, surface-generation, weather, anomaly, save-schema or Three.js-version changes. Save schema remains 1; Three.js remains pinned to 0.185.0.
- Added deterministic backend-policy unit coverage for iPhone UA, iPad desktop UA, desktop Mac and non-Apple mobile environments.
- Physical iPhone test remains the release gate: confirm the top HUD says `WebGL2 iOS`, then test LAND → TAKEOFF → controllable visible space → LAND → TAKEOFF without refresh.

## v0.1.4.5.2 — Ascent Orbit Handoff Reliability Hotfix

- Fixed the physically reported iPhone Safari takeoff failure where ascent visuals completed and cockpit/UI returned to ORBIT while the previous surface framebuffer remained visible and the transition appeared frozen.
- Changed ascent to a transactional handoff: surface renderer/session/UI state is detached before ORBIT is committed.
- The animation frame that completes ASCENDING now falls through immediately to the normal orbital renderer instead of returning after surface teardown.
- The first restored orbital frame uses zero simulation dt, so no N-body/ship step is mixed into the surface-teardown callback.
- `ASCENT COMPLETE` is queued until a real orbital frame renders successfully; it is no longer announced merely because cleanup code ran.
- Added explicit post-cleanup/post-render invariants covering landing phase, surface session/region/renderer ownership, surface UI class, camera mode, 1× handoff warp and finite ship position/velocity.
- Surface renderer ownership is cleared before local-world disposal so a disposal fault cannot leave the renderer logically stuck in surface mode.
- Added four regression tests targeted at the actual stale-frame/ascent-handoff failure mode.
- No physics, propulsion, surface-generation, weather, anomaly, cockpit geometry or save-schema changes. Save schema remains 1.
- Automated QA: **117/117 tests passing** plus static/syntax checks.

## v0.1.4.5.1 — Landing Startup Reliability Hotfix

- Fixed startup regression where `newSystem()` used `surfaceTransition` before the app constructor initialized it, producing `Startup failed: Landing transition state is required.`
- Explicitly initializes the landing transition controller and surface recovery guard before any startup/reset lifecycle call.
- Added startup-source regression coverage that would have failed v0.1.4.5 before release.
- Added a complete unit lifecycle regression covering DESCEND → LANDED → ASCEND → ORBIT → immediate second DESCEND.
- No new gameplay features or renderer/physics/weather/anomaly changes.
- Save schema remains 1.
- Automated QA: **113/113 tests passing** plus static/syntax checks.

## v0.1.4.5 — Landing Reliability & Spacecraft Presence

- Replaced the ambiguous surface/orbit lifecycle with explicit **ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT** state control.
- Fixed the reported TAKEOFF/re-land failure path by preventing duplicate surface entry during transitions and forcing successful ascent back to a clean orbital state.
- Added guarded recovery cleanup for failed surface entry/ascent so renderer/UI/session state cannot remain half-transitioned.
- Added near-ship boarding requirement: **BOARD / TAKEOFF** requires the player to return within 36 m of the spacecraft.
- Added compact ship-distance / boarding-readiness status and explicit surface phase readout.
- Added visible scripted descent/ascent presentation with VTOL plumes and landing-site ground glow; successful ascent returns at safe orbit and 1×.
- Rebuilt the parked spacecraft with smoother hull/nose geometry, canopy, swept wings, tail surfaces, twin engines, VTOL thrusters, landing gear and nav/strobe/landing lights.
- Preserved authoritative orbital ship physics; surface spacecraft remains a renderer-local visual representation.
- Added optional schema-1 persistence for pre-surface running/time-scale state so surface saves do not accidentally restore a temporary landed pause as orbital intent.
- Automated QA: **111/111 tests passing** plus static/syntax checks.

## v0.1.4.4.1 — Surface HUD & Mobile Exploration Polish

- Reworked the planetary surface HUD into a **compact-by-default exploration strip** so terrain and anomaly visuals remain visible on iPhone landscape.
- Compact view keeps planet/region, weather, nearest signal, discovery count, **SCAN** and **SPRINT** immediately available.
- Added **DETAILS / HIDE** expansion for gravity, temperature, atmosphere, coordinates, wind, ship distance, weather detail and scan archive text.
- Moved **SAVE** and **TAKEOFF / ORBIT** into the expanded details section because they are not constant exploration controls.
- Reduced the WALK pad footprint and tightened it to the safe bottom-right edge.
- Added backward-compatible persistence for the expanded/collapsed HUD preference inside the optional schema-1 surface session payload.
- No terrain generation, anomaly visuals, weather state, parked-ship rendering, orbital physics or landing logic was redesigned.
- Automated QA: **106/106 tests passing** plus static/syntax checks.

## v0.1.4.4 — Planetary Environments & Surface Weather

- Added **three deterministic landing regions** to the first landable home world: Shatterfall Basin, Glasswind Flats and Frostscar Rise.
- Added a mobile-safe landing-region selector to the Flight Scanner while preserving Shatterfall as the default System Map landing destination.
- Added persistent seeded **surface weather** on a local real-time clock that remains separate from held orbital N-body time.
- Ordinary environment events: Dust Front, Low Fog Bank, Frost Squall and Electrostatic Storm.
- Explicitly impossible anomaly-weather events: Upward Rain, Shadow Fog, Suspended Lightning and Sky Fracture.
- Weather changes clouds, particles, fog, visibility, scene exposure and temperature readout presentation; it does **not** apply aerodynamic force, damage, erosion, wetness or hidden anomaly physics.
- Added weather/wind/surface-clock readouts and save/load continuity for the exact local weather event/timer/RNG state.
- Added a visible lightweight **parked spacecraft exterior** at every landing site with hull, canopy, wings, engine pods, landing legs, navigation lights and a landing beacon.
- Added distance-to-ship readout; the parked surface model is visual only and does not replace authoritative orbital ship state.
- Preserved v0.1.4.3.1 low-obstruction cockpit view, v0.1.4.3 surface/anomaly foundation, v0.1.4.2 discovery/weather continuity and all protected physics/navigation systems.
- Automated QA: **104/104 tests passing** plus static/syntax checks.

## v0.1.4.3.1 — Ship Cockpit View

- Added a default-on **low-obstruction cockpit canopy overlay** for SHIP VIEW so the spacecraft now feels inhabited instead of being only a bare camera.
- Added subtle canopy glass reflections, top arch, side struts and lower dashboard framing designed to preserve central visibility rather than hide the universe.
- Added automatic cockpit hiding while in OBSERVE camera modes and while inside planetary surface sessions.
- Added a **COCKPIT ON/OFF** toggle in the MORE panel for players who want a fully unobstructed view.
- Added optional backward-compatible schema-1 persistence for the cockpit preference (`cockpitEnabled`).
- Preserved all existing orbital physics, surface systems, System Map, anomalies and rendering behavior.
- Automated QA: **100/100 tests passing** plus static/syntax checks.

## v0.1.4.3 — Planetary Landing Foundation

- Added the first detailed landable generated home world with deterministic **Shatterfall Basin** surface region.
- Added seeded 2.4 km local terrain with crater/ridge/basin relief plus rock, frost/crystal, ember/fissure, glass and mineral environmental dressing.
- Added seven nearby surface anomaly families: Fracture Gate, Gravity Knot, Frozen Lightning Field, Reverse Shadow Monolith, Vacuum Bloom, Ghost Ruin and Chronal Shear.
- Added two conventional geology scan POIs so the region contrasts normal terrain with anomalous sites.
- Added local first-person LOOK + touch movement/sprint controls and proximity-based surface scanning.
- Added LAND / DESCEND entry from target/System Map and clearly scripted TAKEOFF / ORBIT return to a safe 5-radius orbit.
- Added optional schema-1 surface-session persistence for local position/look and scanned/selected POIs; older schema-1 saves remain compatible.
- Orbital N-body time is intentionally held during the local surface instance; surface anomalies remain visual/discovery content only and do not add hidden gravity/teleport/time physics.
- Added surface renderer using one terrain mesh, instanced scatter and lightweight deterministic anomaly geometry for mobile-first performance.
- Automated QA: **98/98 tests passing** plus static/syntax checks.

## v0.1.4.2 — System Map + Discovery & Anomalies

- Added interactive mobile-first logarithmic SYSTEM MAP with live body/ship/COSMOS markers and target/scan/transit handoff.
- Added persistent 0–3 layered discovery depth for cosmic sources.
- Added 9–15 deterministic anomaly signals per seeded system across speculative, anomalous and intentionally impossible/fictional reality classes.
- Added anomaly visual families: curvature rings, phase rifts, interference lattices, orbital knots, dark mirrors, frozen filaments, temporal echoes, ghost stars, vacuum blooms, reverse shadows, resonant shells and fracture gates.
- Added explicit reality-class UI so impossible anomalies are not presented as solved science.
- Persisted discovery records and scan depth through save/load without changing save schema 1.
- Persisted space-weather AUTO state, next-event schedule, active CME fronts, front progression and deterministic RNG progress through save/load.
- Preserved v0.1.4.1.2 stellar rendering/perceptual LOD and all existing navigation/physics systems.
- Automated QA: 93/93 tests passing plus static/syntax checks.

## v0.1.4.1.2 — Stellar Rendering & Approach Polish

Built directly from v0.1.4.1.1 Navigation & Experiment Lifecycle Polish. Save schema remains 1 and Three.js remains pinned to 0.185.0.

### Stellar rendering

- Replaced the flat close-range star presentation with layered seeded photosphere/granulation detail.
- Increased stellar sphere tessellation for smoother close approaches.
- Added a view-facing limb-darkening proxy so the photosphere reads as a luminous sphere rather than a flat disk.
- Replaced the dense cotton-like corona shell with smooth additive halo layers plus a sparse filamentary micro-corona.
- Replaced thick torus/ribbon prominences with seeded curved tube filaments using bright cores and softer halos.
- Added seeded active-region glows and rare visual flare proxies.
- Added explicit visual-science metadata clarifying that convection/MHD/radiative transfer are not solved.

### Perceptual stellar LOD

- Added `stellarPerception.js` with apparent-angular-size visual profiling.
- Macro stellar phenomena are preserved/optionally emphasized at long range rather than distance-culled.
- Only micro/noisy detail is reduced at range.
- Added smooth surface-detail and micro-corona transitions with no hard stellar LOD pop.
- Removed the old CME renderer-scale visibility cutoff so active macro space-weather visuals remain available.

### Exposure / background polish

- Added gentle ACES tone mapping and apparent-angle exposure adaptation for close-star views.
- Deep-space stars, nebulae and especially the galactic band dim smoothly only when a star dominates the view.
- Broadened and de-regularized the seeded galactic band, reduced its opacity/point size, and lowered the chance that it reads as an accretion disk behind a star.

### Approach / navigation presentation

- Added dynamic near-clip adjustment near finite-radius bodies to reduce close-surface clipping.
- Stellar targets now report STELLAR VICINITY / INNER CORONA / LOW CORONA / PHOTOSPHERE proximity zones and distance in R★.
- Stellar scanner/type text includes spectral class and temperature when available.
- TRANSIT streak/FOV cues now decay smoothly after arrival/disengage rather than snapping off on one frame. Newtonian position and velocity logic are unchanged.

### QA hardening

- Added pure unit coverage for stellar perceptual LOD behavior and apparent angular radius.
- Added static guards for layered stellar rendering roles, removal of legacy thick-torus prominences, close-star exposure/background adaptation, camera near-clip logic, CME macro preservation and transit visual release.
- Added per-star procedural texture disposal tagging so system regeneration does not leave generated photosphere textures undisposed.

### Unchanged

- Save schema remains 1.
- Three.js remains pinned to 0.185.0.
- Newtonian physics, TRANSIT coordinate translation, BOOST acceleration, flight-computer behavior and particle experiment lifecycle semantics are unchanged.
- No `.github/workflows/*` files and no landing code were added.

## v0.1.4.1.1 — Navigation & Experiment Lifecycle Polish

Built from v0.1.4.1 Extreme Objects, Space Weather & Scientific Overlays.

### Navigation

- Added speculative bounded **BOOST** propulsion at 5,000 m/s² main/reverse acceleration.
- Engine selector now cycles FLIGHT → CRUISE → BOOST.
- Added actual inertial **velocity-vector (`V⃗`) HUD marker** separate from the nose reticle.
- Added **PROGRADE** and **RETROGRADE** attitude alignment; attitude only, no thrust.
- Added physical bounded-thrust **TURN & BURN** to cancel lateral velocity toward a captured nose direction.
- Renamed MATCH VELOCITY UI to **STOP RELATIVE** for clearer target-relative intent.
- Added **SPECULATIVE TRANSIT DRIVE** with 1c/10c/100c/500c/1000c coordinate-rate tiers.
- TRANSIT preserves local Newtonian velocity and moves only spacecraft reference-frame position.
- Added automatic transit tier step-down near destination.
- Added transit arrival envelope with physical BOOST braking reserve.
- Added swept massive-body transit route guard.
- Added celestial-target or selected-COSMOS transit destination.
- Added optional AUTO CAPTURE: TRANSIT → BOOST → physical APPROACH/BRAKING/CAPTURE/HOLD.
- TRANSIT is blocked during live local particle experiments/body contact and locks simulation warp to 1×.
- Enhanced visual-only star/reference streak and FOV cues during high-tier transit.

### Particle experiment lifecycle

- Added active/complete lifecycle state and completion time.
- Retains final valid live observation bounds when a field reaches zero particles.
- Completed fields no longer leave FRAME/TRACK/ORBIT pointed at an empty origin.
- Completed fields release the 60× particle-safety warp cap immediately.
- Requested 600×/3,600× warp can be remembered while capped and restored when the final live experiment completes.
- Added deterministic **REPLAY FIELD**.
- Added peak/birth/death lifecycle telemetry for Particle Life.
- Physical RENDEZVOUS refuses completed fields until replayed.
- Bounded completed-field retention prevents unbounded session history.

### QA hardening

- Added transit unit tests for tier normalization, arrival braking reserve, automatic tier step-down, no-overshoot advancement, swept route guards and starting-clearance guards.
- Added BOOST propulsion and TURN & BURN regressions.
- Added experiment completion/final-frame/warp-release/deterministic-replay regressions.
- Static check now requires unique HTML IDs and verifies literal app `#id` selectors resolve in the shell.
- Retains direct `this.method()` class-method integrity audit introduced after the earlier Safari runtime failure.

### Unchanged

- Save schema remains 1.
- Three.js remains pinned to 0.185.0.
- No `.github/workflows/*` files in the mobile distributable.
- No landing code added.