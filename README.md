# Universe Lab v0.1.4.2 — System Map + Discovery & Anomalies

Universe Lab is a mobile-first scientific/experimental space sandbox for static GitHub Pages. Authoritative local simulation remains SI-unit Float64 state with direct Newtonian major-body gravity, velocity-Verlet integration, floating-origin rendering, and pinned Three.js 0.185.0 presentation.

**Build marker:** `DISCOVERY-142`  
**Save schema:** 1 (unchanged; new fields are backward-compatible optional payload fields)  
**Three.js:** 0.185.0 (unchanged)  
**Deployment:** GitHub Pages → `main` → `/(root)`  
**Release gate:** physical iPhone Safari

v0.1.4.2 is built directly from the physically tested/development-approved v0.1.4.1.2 stellar-rendering baseline. It preserves the working Newtonian flight, BOOST, TRANSIT, impact, experiment, compact-object, stellar-rendering and scientific-overlay systems while adding a genuine exploration/discovery layer.

## Major additions

### Interactive System Map

`MORE → SYSTEM MAP` opens a mobile-first logarithmic X/Z projection of the live generated system.

The map shows:

- the primary star and generated physical bodies,
- moons/comets/rogue planets and spawned major objects,
- the live spacecraft position,
- normal COSMOS phenomena,
- unidentified seeded signals,
- discovered anomaly classifications.

The map is logarithmically compressed so an inner planet and a 20–30 AU signal can coexist in a usable iPhone view. It reads the live simulation state; it is not a second physics simulation.

Tap a marker to:

- select/target a physical body,
- select a COSMOS source,
- scan an unidentified signal,
- hand the selection to TRANSIT,
- open the relevant COSMOS/scanner panel.

### Deeper discovery instead of one-click identification

COSMOS discovery now has persistent **0–3 scan depth** per source:

- **0/3 — UNIDENTIFIED:** location/signal exists, classification hidden.
- **1/3 — CLASSIFIED:** label, broad type/reality class and first description are revealed.
- **2/3 — DEEP SCAN:** detection signature/stability details are added when available.
- **3/3 — ARCHIVED:** the complete generated scientific/model-status note is exposed.

Discovery records and scan depth now survive save/load.

### Much larger anomaly layer

Each seeded system now receives roughly **9–15 deterministic anomaly signals** in addition to the normal astronomical COSMOS population. The pool currently includes families such as:

- Gravitational Scar / Curvature Wake
- Phase Rift / Vacuum Seam
- Quantum Echo Lattice / Interference Cathedral
- Impossible Orbital Knot / Kepler Violation
- Dark Mirror / Negative Reflection
- Frozen Lightning / Arrested Discharge
- Chronal Shear / Temporal Wake
- Ghost Star Echo / Orphan Photosphere
- Vacuum Bloom / Probability Flower
- Reverse Shadow / Anti-Umbra
- Resonant Shell / Harmonic Bubble
- Fracture Gate / Nonlocal Window

Not all anomalies are meant to make literal scientific sense. That is intentional.

Universe Lab explicitly labels anomaly reality classes after discovery:

1. **KNOWN PHYSICS / modeled** — ordinary physical/cosmic sources.
2. **SPECULATIVE** — inspired by theoretical or exotic ideas but not actually solved.
3. **ANOMALOUS** — deliberately unexplained/uncanny.
4. **IMPOSSIBLE / FICTIONAL** — intentionally violates the current physical model.

Anomaly visuals never silently become gravity sources, teleporters, causal effects, or hidden physics modifiers.

### New anomaly visuals

The anomaly layer has deterministic render proxies including:

- nested curvature rings,
- luminous vacuum seams,
- wireframe interference lattices,
- crossed orbital-knot loops,
- dark-mirror spheres/rims,
- frozen filament/lightning structures,
- temporal echo shells,
- ghost-star shells,
- vacuum-bloom petals,
- reverse-shadow cones,
- resonant nested shells,
- fracture-gate frames.

They animate slowly and remain large enough to make long-range exploration visually worthwhile.

## Space-weather continuity fix

Automatic space weather still uses the same seeded scheduling ranges:

- first automatic event: **0.7–2.4 simulated days** after a fresh system starts,
- later automatic events: **1.2–4.5 simulated days** apart.

The important fix is save/load continuity. The save payload now preserves:

- AUTO WEATHER on/off,
- next scheduled event time,
- active CME fronts,
- launch times/speeds/directions/cone angles,
- front progression state,
- ship-crossed state,
- deterministic weather RNG progress.

Loading a save therefore no longer silently rerolls the weather countdown. Old schema-1 saves without a weather snapshot remain valid; they receive a new timeline on load.

## Retained stellar presentation from v0.1.4.1.2

The previous stellar-polish work remains intact:

- seeded photosphere/granulation,
- limb treatment and active regions,
- additive corona,
- thin filament prominences,
- rare visual flare proxies,
- perceptual stellar LOD that preserves macro spectacle at distance,
- close-star exposure/background adaptation,
- stellar-proximity HUD cues,
- smooth visual release from TRANSIT arrival.

Large stellar phenomena are intentionally not optimized away just because they are distant.

## Retained navigation/physics foundation

- FLIGHT 20 m/s²
- CRUISE 120 m/s²
- explicit speculative BOOST 5,000 m/s²
- inertial velocity marker, PROGRADE / RETROGRADE, TURN & BURN
- STOP RELATIVE
- propulsion-safe APPROACH → BRAKING → CAPTURE → HOLD
- fictional 1c / 10c / 100c / 500c / 1000c TRANSIT with local Newtonian velocity preservation
- transit swept-body safety guards and optional physical BOOST capture
- direct Newtonian major-body gravity + velocity-Verlet integration
- adaptive strong-gravity substeps + 10% c Newtonian model guard
- compact-object spawners, impacts, crater/fragment response
- particle experiments and deterministic replay
- scientific Lagrange/Hill/Roche/orbital-plane/gravity-vector overlays

## Recommended physical iPhone acceptance

1. Confirm **v0.1.4.2 / DISCOVERY-142** and no runtime `ERR`.
2. Open `MORE → SYSTEM MAP`; verify the canvas fits landscape without clipping and marker taps are reliable.
3. Confirm the star, physical worlds, spacecraft and numerous `?` signals are visible in the logarithmic map.
4. Tap a body, use `SELECT / TARGET`, then confirm the normal target/scanner pipeline receives it.
5. Tap an unknown diamond, press `SCAN SIGNAL`, and verify the first discovery layer appears.
6. Scan the same anomaly two more times and verify 1/3 → 2/3 → 3/3 progression.
7. Verify some anomaly classifications explicitly say SPECULATIVE, ANOMALOUS or IMPOSSIBLE / FICTIONAL.
8. Use `OPEN TRANSIT` from a map-selected anomaly and verify the existing fictional transit system targets that source without adding transit speed to local Newtonian velocity.
9. Save with an active or upcoming weather event, note `Next seeded event`, reload, and confirm the timeline is not rerolled.
10. Save after scanning several anomalies, reload, and confirm names/scan depth remain discovered.
11. Regress stellar approach visuals, BOOST, APPROACH/HOLD, TRANSIT, COSMOS observation, compact objects, overlays, impacts and particle experiments.

## Automated QA

`npm run qa` currently passes **93/93 tests** plus the static structure/syntax check. New coverage includes deterministic anomaly generation and space-weather snapshot continuity. Physical iPhone Safari remains the release gate for touch/layout/render acceptance.

## Next likely milestone

After physical acceptance of v0.1.4.2, the next major direction is the **first landable-planet / surface foundation**, while continuing to deepen discovery content and anomaly behavior without turning unexplained visuals into undocumented physics.
