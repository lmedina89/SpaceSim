# Universe Lab v0.1.4.4 — Planetary Environments & Surface Weather

Universe Lab is a mobile-first scientific/experimental space sandbox for static GitHub Pages. Authoritative orbital simulation remains SI-unit Float64 state with direct Newtonian major-body gravity, velocity-Verlet integration, floating-origin rendering, and pinned Three.js 0.185.0 presentation.

**Build marker:** `ENVWX-144`  
**Save schema:** 1 (unchanged; surface/weather state, selected landing region and cockpit preference remain optional backward-compatible payload fields)  
**Three.js:** 0.185.0 (unchanged)  
**Deployment:** GitHub Pages → `main` → `/(root)`  
**Release gate:** physical iPhone Safari

v0.1.4.3 is built directly from v0.1.4.2 System Map + Discovery & Anomalies. It preserves System Map/discovery, persistent space weather, stellar rendering, Newtonian flight, BOOST, TRANSIT, impacts, experiments, compact objects and scientific overlays while introducing the first deliberately bounded planetary surface architecture.

v0.1.4.3.1 is built directly from v0.1.4.3 Planetary Landing Foundation. It preserves the surface landing architecture and adds a **default-on, low-obstruction ship cockpit overlay** so SHIP VIEW feels like the player is inside an actual spacecraft without sacrificing the wide forward view.

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
