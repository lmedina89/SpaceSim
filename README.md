# Universe Lab v0.1.4.6 — Astronomical Observer & Sky Continuity Foundation

Universe Lab is a mobile-first scientific/experimental space sandbox for static GitHub Pages. Authoritative orbital simulation remains SI-unit Float64 state with direct Newtonian major-body gravity, velocity-Verlet integration, floating-origin rendering, and pinned Three.js 0.185.0 presentation.

**Build marker:** `SKYOBS-146`  
**Save schema:** 1 (unchanged; landing/session/weather/cockpit fields remain optional backward-compatible payload fields)  
**Three.js:** 0.185.0 (unchanged)  
**Deployment:** GitHub Pages → `main` → `/(root)`  
**Release gate:** physical iPhone Safari


## v0.1.4.6 astronomical observer and sky continuity

The sky is now derived from one read-only canonical observer solution in ship, descent and surface modes. Major bodies use authoritative live inertial positions relative to that observer; the solution also exposes range, physical apparent angular radius, local up/horizon, orientation and above/below-horizon state.

Space and surface views reuse one deterministic inertial star catalog. Landing does not reseed it. Surface projection is built once for the landing basis, hides the lower hemisphere, follows local heading through the camera, and attenuates visibility through daylight/weather hooks without deleting stars from the model. Orbital N-body time remains intentionally held while landed, so this release guarantees fixed-time continuity rather than inventing a second ephemeris clock.

Repeated LAB magnetars now receive deterministic collision-safe placement offsets. Their masses already participated in mutual Newtonian gravity; magnetic lobes remain visual only and no MHD force was added.

The accepted iPhone/iPad policy is preserved: Three.js WebGPURenderer uses its forced WebGL2 backend on Apple mobile WebKit. Physical iPhone Safari remains the release gate.

## v0.1.4.5.4 renderer-handoff isolation

Physical iPhone testing of v0.1.4.5.3 reached `ORBIT VERIFIED · surface=OFF · render=SPACE · run=YES · input=YES` while the canvas still visibly showed the local surface. That means this release intentionally does **not** add another ascent state rewrite. It isolates the graphics backend instead.

On iPhone/iPad-class WebKit, Universe Lab now keeps the same Three.js `WebGPURenderer` architecture but constructs it with `forceWebGL: true`. The active backend should therefore read **WebGL2 iOS** in the top HUD. Other platforms retain automatic backend selection. This is a controlled physical test for an iOS/WebKit presentation-stall hypothesis, not a permanent claim that WebGPU is unusable.

The v0.1.4.5.3 landing/ascent lifecycle and diagnostic chip are otherwise preserved so backend selection is the meaningful variable under test. The astronomy/real-sky phase remains blocked until takeoff is visibly and interactively reliable on-device.

## v0.1.4.5.2 ascent/orbit handoff hotfix

v0.1.4.5.2 is a focused corrective release built directly from the physically tested v0.1.4.5.1 startup-hotfix baseline. It addresses the reported iPhone Safari failure where the scripted ascent visibly lifted the parked ship, the UI/cockpit switched back to ORBIT, but the last surface framebuffer remained on screen and the transition appeared frozen.

The handoff is now transactional: surface renderer/session/UI ownership is detached first, the physical ship is restored to the safe 5-radius orbit at 1×, camera and lifecycle invariants are validated, and the *same animation callback* immediately renders an orbital ship-view frame at zero simulation dt. **ASCENT COMPLETE is not announced until that orbital render has succeeded.** Surface renderer ownership is also cleared before local resource disposal, so cleanup cannot leave the renderer logically stuck in surface mode if disposal itself faults.

No orbital physics, propulsion values, BOOST/TRANSIT behavior, surface generation, weather, anomalies, spacecraft geometry or save schema was redesigned in this hotfix.

## v0.1.4.5.1 startup hotfix

v0.1.4.5.1 is a minimal corrective release built from v0.1.4.5. It initializes the landing transition controller and recovery guard in the app constructor before `newSystem()` can use them. This fixes the startup error `Landing transition state is required.` without changing the planned landing/ship feature scope.

## v0.1.4.5 landing reliability + spacecraft presence

v0.1.4.5 is built directly from the physically tested v0.1.4.4.1 surface-HUD baseline. It fixes the surface/orbit lifecycle instead of patching TAKEOFF in isolation.

The landing path now has explicit states: **ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT**. LAND cannot be re-entered while a transition is in progress, surface movement/scan/save controls are locked during descent/ascent, and any failed entry/ascent cleanup falls back to a valid orbital state rather than leaving the app half-landed. Successful ascent hands control back at safe 5-radius orbit and 1× Newtonian flight.

TAKEOFF is now a boarding action. The compact HUD shows ship distance/readiness; the player must be within 36 m of the parked spacecraft before **BOARD / TAKEOFF** can start. Fresh descent and ascent automatically face the ship so the scripted VTOL sequence is actually visible.

The exterior spacecraft was rebuilt with a smoother 20-segment fuselage/nose, dark heat-shield chine, canopy/spine, swept wing geometry, tail surfaces, twin engine pods/nozzles, four VTOL thrusters, landing struts/pads, nav/strobe/landing lights and ground transition glow. It remains a lightweight renderer-local representation; authoritative orbital `ShipDynamics` is unchanged.

Save/load now also preserves the pre-surface simulation running state and orbital time-scale intent as optional schema-1 fields, preventing a loaded surface session from accidentally inheriting the temporary landed pause as its orbital state.

v0.1.4.3 is built directly from v0.1.4.2 System Map + Discovery & Anomalies. It preserves System Map/discovery, persistent space weather, stellar rendering, Newtonian flight, BOOST, TRANSIT, impacts, experiments, compact objects and scientific overlays while introducing the first deliberately bounded planetary surface architecture.

v0.1.4.3.1 is built directly from v0.1.4.3 Planetary Landing Foundation. It preserves the surface landing architecture and adds a **default-on, low-obstruction ship cockpit overlay** so SHIP VIEW feels like the player is inside an actual spacecraft without sacrificing the wide forward view.


## v0.1.4.4.1 surface exploration UI

v0.1.4.4.1 is a focused mobile UX pass built directly from v0.1.4.4. It does not redesign the surface renderer or environment model. The default landed view now uses a small top-right exploration strip rather than the full scientific panel.

Compact view keeps the information/actions needed while moving: current world/region, weather, nearest signal, discoveries, **SCAN** and **SPRINT**. Tap **DETAILS** to reveal the full gravity/temperature/atmosphere/coordinates/weather/archive panel plus **SAVE** and **TAKEOFF / ORBIT**. Tap **HIDE** to collapse it again. The expanded/collapsed preference is stored with an active surface-session save without changing schema 1.

The WALK pad is also smaller and sits tighter against the bottom-right safe edge to preserve more of the planetary view.

## v0.1.4.4 environment layer

v0.1.4.4 builds directly from v0.1.4.3.1 and turns the first planetary surface from a single static showcase into a small deterministic environment framework. The first landable planet now exposes three seeded landing regions:

- **Shatterfall Basin** — the original anomaly-rich basalt/ash showcase, retaining all seven surface anomaly families.
- **Glasswind Flats** — smoother wind-polished glass-darkened terrain with stronger dust/fog emphasis and four anomaly sites.
- **Frostscar Rise** — rougher cold mineral highland with broad frost coverage, frost/electrostatic weather emphasis and four anomaly sites.

The Flight Scanner contains a **Landing region** selector. System Map landing still defaults safely to Shatterfall unless another region was selected. Region generation remains deterministic from system seed + body ID + region ID.

### Persistent local weather

Surface weather uses its own deterministic real-time clock because orbital N-body time remains intentionally held while landed. The first seeded change is scheduled soon enough to be testable on iPhone, then later clear/event intervals continue deterministically. Save/load preserves the exact event, remaining duration, next clear-interval timer and weather RNG state.

Modeled/ordinary presentation events are Dust Front, Low Fog Bank, Frost Squall and Electrostatic Storm. The anomaly layer can also produce intentionally impossible Upward Rain, Shadow Fog, Suspended Lightning and Sky Fracture. Impossible events are explicitly labeled in the surface HUD.

Weather currently changes visual cloud/fog/particle layers, visibility, scene exposure, wind/temperature readouts and lightning/fracture presentation. It **does not** apply aerodynamic forces, surface damage, erosion, precipitation accumulation, wetness, fluid dynamics or hidden time/gravity effects.

### Parked spacecraft

A lightweight procedural exterior spacecraft now sits at the landing site. It includes a metallic fuselage, canopy, wings, engine pods, landing gear, navigation lights and the existing landing beacon. The surface HUD shows distance back to the ship. This model is a local visual representation only; orbital ship position/velocity remain authoritative and frozen until the scripted TAKEOFF / ORBIT transition.

## Ship cockpit view

SHIP VIEW now includes a restrained canopy presentation: a thin top arch, narrow side struts, subtle lower dashboard panels and faint canopy reflections. The center of the screen remains intentionally open so stars, planets and anomalies still dominate the view.

The cockpit is:

- visual only,
- enabled by default,
- automatically hidden while using OBSERVE camera modes,
- automatically hidden during planetary surface sessions, and
- user-toggleable from **MORE → COCKPIT ON/OFF**.

The cockpit preference is optionally saved as `cockpitEnabled` without changing save schema `1`.


## First landable world

The generated solid home-candidate planet is now the first detailed landing target. For the default `ORIGIN-001` system this is **Caelum-4361 d**.

The first local region is **Shatterfall Basin**, a deterministic 2.4 km × 2.4 km showcase region. It is designed to read as believable terrain first and anomalous terrain second rather than as an abstract effects room.

The base surface includes:

- seeded rolling/broken terrain with crater, ridge and basin-scale relief,
- rock fields and exposed mineral formations,
- an ash/basalt/desert base appropriate to the default home world,
- frost/crystal, ember/fissure, glass-darkened and mineral-rich subzones,
- atmosphere/sky/fog/star-light presentation derived from the generated planet profile,
- two conventional geology scan sites.

The surface is generated from the system seed + body ID, so the same save/system returns to the same landscape and POI layout.

## Surface anomaly showcase

Shatterfall deliberately contains **seven anomaly families** near the landing site so the first landing demonstrates the range of Universe Lab's anomaly direction:

1. **Fracture Gate** — impossible/fictional nonlocal-looking frame.
2. **Gravity Knot** — anomalous levitating orbital-stone geometry.
3. **Frozen Lightning Field** — impossible arrested discharge structure.
4. **Reverse Shadow Monolith** — impossible shadow projected toward the star.
5. **Vacuum Bloom** — speculative luminous petal structure.
6. **Ghost Ruin** — anomalous phase-offset architectural echoes.
7. **Chronal Shear** — impossible local visual time-echo planes.

They are intentionally spectacular but remain honest about the model boundary. In v0.1.4.3 they are **visual/discovery content only**. They do not secretly add gravity, teleport the player, change simulation time or override the orbital solver.

## Landing / surface loop

- Select the landable home world.
- Enter the near-orbital descent envelope. `HOME / ORBIT` returns the spacecraft to the seeded demonstration orbit if needed.
- Use **LAND / DESCEND** from the normal target controls or System Map.
- Orbital N-body time is intentionally held while the local surface instance is active.
- Use the existing LOOK pad plus the surface directional controls to explore.
- Hold **SPRINT** for faster local traversal.
- Approach a geology/anomaly site and press **SCAN LOCAL**.
- Surface scan discoveries persist through SAVE/LOAD.
- **TAKEOFF / ORBIT** performs a clearly scripted ascent and returns the spacecraft to a safe 5-radius orbit, then restores normal Newtonian flight at 1×.

This is not yet a full atmospheric flight model. Atmospheric entry, heating, aerodynamics, terrain collision rigid-body dynamics and physically modeled ascent are future layers.

## Surface persistence

The existing schema remains `1`. The save payload now optionally stores an active `surfaceSession` containing:

- body + region identity,
- local X/Z position,
- local look yaw/pitch,
- scanned surface POI IDs,
- selected surface POI.

Older schema-1 saves remain valid. When loading an older save, deterministic landing-capability metadata for the generated home world is refreshed without replacing the saved body's physical position/velocity/mass/radius state.

## Retained v0.1.4.2 discovery systems

- interactive logarithmic SYSTEM MAP,
- persistent 0–3 COSMOS scan depth,
- ~9–15 deterministic free-space anomaly signals per system,
- KNOWN / SPECULATIVE / ANOMALOUS / IMPOSSIBLE-FICTIONAL reality classes,
- persistent automatic space-weather timeline and active CME fronts,
- anomaly visuals kept out of the massive-body gravity registry.

## Retained navigation/physics foundation

- FLIGHT 20 m/s²
- CRUISE 120 m/s²
- explicit speculative BOOST 5,000 m/s²
- inertial velocity marker, PROGRADE / RETROGRADE, TURN & BURN
- STOP RELATIVE
- propulsion-safe APPROACH → BRAKING → CAPTURE → HOLD
- explicitly fictional 1c / 10c / 100c / 500c / 1000c TRANSIT while preserving local Newtonian spacecraft velocity
- transit swept-body guards and optional physical BOOST capture
- direct Newtonian major-body gravity + velocity-Verlet
- adaptive strong-gravity substeps + 10% c Newtonian model guard
- compact-object spawners, impacts, crater/fragment response
- particle experiments and deterministic replay
- scientific Lagrange/Hill/Roche/orbital-plane/gravity-vector overlays
- stellar perceptual LOD that preserves major spectacle at range

## Recommended first iPhone test

1. Confirm **v0.1.4.4 / ENVWX-144** and no runtime `ERR`.
2. On a fresh `ORIGIN-001` run, the home world should already be selected and the ship should begin in the landing envelope.
3. Press **LAND / DESCEND**.
4. Confirm Shatterfall Basin renders as actual ground/sky/terrain rather than a flat orbital sphere.
5. Drag LOOK and hold the on-screen surface directional controls; verify no stuck-input behavior after releasing a finger.
6. Find the closest signal (the first anomaly is roughly a few hundred meters or less from the landing site), move into scan range and press **SCAN LOCAL**.
7. Confirm the HUD reveals the POI's reality class and model-boundary text after scanning.
8. Visit several differently colored/structured anomaly sites and conventional geology.
9. SAVE while on the surface, refresh/load, and verify local position + scanned POIs return.
10. Press **TAKEOFF / ORBIT** and verify the normal ship HUD/flight controls return in safe orbit at 1×.
11. Regress SYSTEM MAP, free-space anomalies, weather continuity, stellar approaches, BOOST, APPROACH/HOLD, TRANSIT, compact objects, overlays, impacts and particle experiments.

## Automated QA

`npm run qa` passes **98/98 tests** plus the static structure and syntax checks. New tests cover deterministic surface generation, landable-profile identity, terrain variation, local movement bounds, proximity scanning and surface-session persistence.

Automated QA does **not** prove real iPhone WebGPU performance, touch feel, thermal behavior or subjective terrain/anomaly visual quality. Physical iPhone Safari remains the release gate.

## Next likely milestone

After physical acceptance of v0.1.4.4, the sensible next step is **v0.1.4.5 Surface Exploration, Resources & POIs**: deeper scan interactions, sample/resource collection, caves/ruins, region-specific discoveries and first surface objectives while preserving the mobile streaming budget.
