# Universe Lab v0.1.4.1 — Extreme Objects, Space Weather & Scientific Overlays

Universe Lab is a mobile-first scientific/experimental space sandbox built for static GitHub Pages. One deterministic seeded system is simulated at a time with SI-unit Float64 state, direct Newtonian gravity for major bodies, velocity-Verlet integration, floating-origin rendering, and Three.js 0.185.0 WebGPU rendering.

**Build marker:** `EXTREME-141`  
**Save schema:** 1  
**Deployment:** GitHub Pages → `main` → `/(root)`  
**Release gate:** physical iPhone Safari

v0.1.4.1 continues the pre-landing cosmic pass. It keeps all v0.1.4 belts/rings/comets/compact-object rendering and adds more extreme astrophysical objects, traveling space-weather fronts, an ancient supernova-remnant exploration source, occasional physical rogue planets, and target-centric scientific overlays.

## New in v0.1.4.1

### Extreme-object LAB presets

LAB now includes an **EXTREME OBJECT PRESETS** selector with:

- **Magnetar** — 1.55 M☉, 12 km physical radius, live Newtonian gravity and compact-object guard; high-field loops/sparks are visual proxies.
- **White dwarf** — 0.82 M☉, 7,400 km preset physical radius, live Newtonian gravity; glow/spectrum are illustrative.
- **Brown dwarf** — 42 Jupiter masses, ~71,000 km radius, live Newtonian gravity; atmospheric banding is visual-only.
- **Rogue planet** — 2.2 Earth masses preset in LAB with a cold low-light visual treatment and live Newtonian gravity.

The existing configurable neutron-star/pulsar and active-black-hole spawners remain.

### Seeded rogue planets

Generated systems now have a deterministic chance to include one distant **physical rogue/interstellar planet**. It has finite mass, radius, position and velocity and participates in the same direct major-body Newtonian gravity and collision system as the rest of the generated bodies.

Its thermal/atmospheric history is not simulated. It also appears in COSMOS as a discoverable source when generated.

### Ancient supernova remnants

Every system now receives a large seeded **supernova-remnant** exploration source. It is an ~8,500-point shell/filament rendering proxy placed in deep local space and exposed through the existing COSMOS discovery/observation/rendezvous workflow.

The shell is not a hydrodynamic gas simulation and does not add thousands of gravity sources.

### Traveling space weather

The COSMOS drawer now includes **SPACE WEATHER**.

A coronal mass ejection is represented as a directional expanding front with:

- explicit launch time,
- explicit propagation speed,
- angular cone width,
- live position tied to the current physical star,
- geometric spacecraft-front crossing detection,
- swept-front detection so a large physics step cannot silently jump over the crossing,
- automatic deterministic events in simulated time,
- manual **TRIGGER CME** for testing.

Typical generated speeds are approximately 450–1,900 km/s; manual/event values are bounded to the model's supported range.

The front propagation and arrival geometry are scientific/kinematic. The renderer uses a GPU-friendly point/cone proxy. Universe Lab does **not** yet calculate MHD, magnetic reconnection, solar energetic particle dose, ionization, spacecraft damage or electronics failures.

### Scientific overlays

**MORE → OVERLAYS** opens a target-centric diagnostic panel.

Available layers:

- **L1–L5** instantaneous/circular restricted-three-body estimates,
- **Hill sphere** estimate,
- **fluid Roche limit** using a documented 3,000 kg/m³ reference satellite density,
- **instantaneous orbital plane** from current target-relative position/velocity,
- **25-point local gravity-vector field** around the spacecraft calculated from the live Newtonian major-body source set.

The master switch leaves all overlays off by default so normal mobile rendering is unchanged unless requested.

Lagrange/Hill/Roche layers are intentionally labeled as diagnostic approximations rather than stability guarantees.

### Magnetar visual treatment

The neutron-star renderer now recognizes `compactType: magnetar` and adds:

- stronger multi-axis magnetic-loop geometry,
- a ~1,200-point high-field spark population,
- compact luminous surface/glow,
- slow rotating field-lobe motion.

These are field/energy visualization proxies. The live compact mass remains Newtonian outside the existing neutron-star model guard.

### White dwarf / brown dwarf / rogue visuals

The celestial visual factory adds separate treatments rather than rendering every new type as a generic planet:

- white-dwarf blue-white compact glow and halo,
- brown-dwarf low-temperature warm bands,
- rogue-planet cold dark body with faint thermal rim.

## Retained v0.1.4 cosmic exploration

- COSMOS discovery with `UNIDENTIFIED SOURCE` → SCAN SOURCE classification.
- massless OBSERVE / ORBIT VIEW and instant SHIP VIEW.
- physical RENDEZVOUS using bounded-thrust APPROACH/BRAKING/CAPTURE/HOLD.
- 1–2 physical high-eccentricity comets with star-relative visual tails.
- ~12,000-point circumstellar debris belt proxy.
- ~4,000–7,000-point planetary ring systems.
- star corona/prominence rendering and deeper galactic/nebular backdrop.
- active black-hole renderer with event-horizon core, photon-ring cues, ~5,200 accretion points, layered disk, ~1,500 jet points and pseudo-lensing halo.
- neutron-star/pulsar live gravity with compact-object safety guards.

## Retained flight, particles and impacts

- FLIGHT 20 m/s² and CRUISE 120 m/s² experimental propulsion.
- physical BRAKE, MATCH VELOCITY, APPROACH, CAPTURE and persistent HOLD.
- adaptive strong-gravity physics substeps and 0.1c / compact-object validity guards.
- Gravity Cloud, Particle Life, Species Forces and Particle Gun.
- typed-array spatial hash and 40,000 global experiment slot budget.
- swept finite-radius impact detection, crater scaling, impact telemetry, restrained resolved fragments and cascade suppression.
- runtime frame exception HUD boundary from v0.1.3.2.1.
- class-method integrity QA from v0.1.3.2.2.

## Scientific model categories

Universe Lab deliberately separates:

1. **Live physical state** — SI-unit bodies/particles actually advanced by a solver.
2. **Scientific approximation** — simplified but meaningful derived models such as Hill/Roche/Lagrange estimates, osculating elements, crater scaling and kinematic CME fronts.
3. **Visual/artificial proxy** — nebular haze, supernova-remnant gas filaments, magnetosphere art, accretion/jet rendering, Particle Life and Species Forces.

The UI/docs should never imply that category 3 is a solved first-principles physical simulation.

## First iPhone validation

After deployment verify **v0.1.4.1** and **EXTREME-141**, then:

1. Leave normal SHIP VIEW untouched for 15–30 seconds and confirm FPS/physics/render/sim time remain healthy.
2. MORE → COSMOS → scan/observe the **supernova remnant** and, if generated, the **rogue planet**.
3. In COSMOS → SPACE WEATHER, press **TRIGGER CME**. Observe the expanding front, then use time warp and verify its AU radius increases.
4. Toggle **AUTO WEATHER** and confirm the next-event countdown is visible.
5. Select a planet/moon → MORE → **OVERLAYS** → enable master + Lagrange/Hill/Roche/orbit plane. Then try gravity vectors separately and watch FPS.
6. LAB → EXTREME OBJECT PRESETS → spawn Magnetar, White Dwarf, Brown Dwarf and Rogue Planet one at a time.
7. Retest a v0.1.4 ring/belt/comet, active black hole, one particle experiment and one impact preset.

Physical iPhone testing is still the release gate for WebGPU visuals, thermal behavior and mobile ergonomics.

## Next roadmap

If this build is stable, the next pre-landing pass should focus on **System Map + richer discovery/anomaly events** rather than adding more buttons to TARGET. After that, the first landable-planet foundation can begin with a much richer universe surrounding it.
