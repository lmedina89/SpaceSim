# Universe Lab v0.1.4.1.1 — Navigation & Experiment Lifecycle Polish

Universe Lab is a mobile-first scientific/experimental space sandbox for static GitHub Pages. Authoritative local simulation remains SI-unit Float64 state with direct Newtonian major-body gravity, velocity-Verlet integration, floating-origin rendering, and Three.js 0.185.0 for presentation.

**Build marker:** `NAVLIFE-1411`  
**Save schema:** 1  
**Deployment:** GitHub Pages → `main` → `/(root)`  
**Release gate:** physical iPhone Safari

This is a focused navigation/lifecycle release built from v0.1.4.1. It does not add landing code or rewrite the working cosmic/particle systems.

## Why this release exists

Physical iPhone testing exposed two usability problems:

1. A Particle Life field could reach **0 active particles**, yet observation controls could continue chasing an empty experiment and the 60× particle-safety warp cap could remain in effect.
2. At very high inertial spacecraft speed, simply rotating the nose did not change the existing velocity vector quickly enough for comfortable exploration.

v0.1.4.1.1 fixes both while keeping scientific and fictional mechanics clearly separated.

## Three local propulsion modes

- **FLIGHT:** 20 m/s² bounded local acceleration.
- **CRUISE:** 120 m/s² bounded local acceleration.
- **BOOST:** 5,000 m/s² bounded local acceleration.

BOOST is explicitly **speculative/fictional propulsion**. It still changes the Newtonian velocity state by integrating a declared acceleration; it does not teleport or silently erase momentum. Manual BOOST selection returns simulation warp to 1× for control.

## Velocity-vector navigation aids

### Velocity marker

SHIP VIEW now shows a `V⃗` marker indicating the actual inertial travel direction separately from the center reticle/nose direction. `V⃗ BACK` indicates that the current velocity points behind the camera hemisphere.

### PROGRADE / RETROGRADE

These rotate attitude only:

- **PROGRADE** points the ship along its current inertial velocity.
- **RETROGRADE** points opposite its current inertial velocity.

They apply no thrust and do not modify velocity.

### TURN & BURN

TURN & BURN captures the ship's current nose direction, then uses the currently selected bounded propulsion mode to reduce lateral velocity until the true velocity vector follows the nose. This is physical local thrust logic, not hidden damping.

### STOP RELATIVE

The former MATCH VELOCITY control is presented as **STOP RELATIVE**. It uses bounded target-relative thrust to reduce velocity relative to the selected target.

## Speculative TRANSIT drive

**TRANSIT is deliberately fictional.** It is a separate reference-frame travel layer for practical astronomical exploration and is not presented as Newtonian propulsion, an Alcubierre solution, or established FTL physics.

Available coordinate-rate tiers:

- 1 c
- 10 c
- 100 c
- 500 c
- 1,000 c

TRANSIT translates the spacecraft position toward the selected celestial target or selected COSMOS source over **real elapsed time** while preserving the ship's local Newtonian velocity. The displayed multiple-of-c transit rate is never added to `ship.velocity`.

Near the destination, TRANSIT automatically steps down through lower tiers. Its arrival envelope includes:

- a body-safe/propulsion-safe stand-off,
- extra physical braking distance based on the ship's preserved target-relative Δv,
- swept massive-body route guards so a large real-time movement step cannot tunnel through an intervening body.

With **AUTO CAPTURE** enabled, arrival disengages TRANSIT, selects BOOST, and hands control to the existing physical APPROACH → BRAKING → CAPTURE → HOLD flight computer. The preserved local Δv is then removed with bounded real thrust.

TRANSIT is blocked while a live local particle experiment is running or while the ship is in finite-radius body contact. Simulation time warp is locked to 1× while TRANSIT is engaged because transit speed is controlled separately.

## Particle experiment lifecycle recovery

Particle experiments now have explicit **active → complete** lifecycle state.

When the last active particle dies/is absorbed:

- the field becomes **COMPLETE** (Particle Life is reported as **EXTINCT**),
- the final valid live centroid/bounds are retained,
- FRAME shows that final frame rather than snapping to an empty origin,
- TRACK/ORBIT no longer chase a nonexistent live centroid,
- physical RENDEZVOUS refuses the completed field,
- **REPLAY FIELD** rebuilds the deterministic original initial state,
- the 60× fine-step warp cap is released immediately.

If the player requested 600× or 3,600× before a live experiment forced 60×, that requested warp is remembered and safely restored when the last live particle finishes. Clearing all experiment fields also releases the cap.

Completed fields are retained in a small bounded history for final-frame inspection/replay rather than immediately deleted.

## Retained v0.1.4.1 universe systems

This build preserves:

- magnetars, white dwarfs, brown dwarfs and physical rogue planets,
- supernova-remnant exploration sources,
- kinematic CME/space-weather fronts,
- L1–L5, Hill, Roche, orbital-plane and gravity-vector overlays,
- physical high-eccentricity comets,
- asteroid/debris belts and planetary rings as GPU population proxies,
- stellar corona/prominence visuals,
- upgraded black-hole accretion/photon-ring/jet visuals,
- neutron-star/pulsar compact-object safeguards,
- COSMOS SCAN / OBSERVE / ORBIT / RENDEZVOUS,
- impacts, crater/fragment logic and cascade suppression,
- Gravity Cloud, Particle Life, Species Forces and Particle Gun,
- runtime-error HUD boundary and isolated SHIP/OBSERVE render paths.

## Scientific model categories

Universe Lab continues to separate:

1. **Live physical state** — Newtonian bodies/particles and bounded local thrust actually integrated in SI units.
2. **Scientific approximation** — derived/kinematic models such as osculating elements, crater scaling, CME fronts, Hill/Roche/Lagrange diagnostics.
3. **Visual/artificial proxy** — nebulae, remnants, magnetosphere art, accretion/jet graphics, Particle Life and Species Forces.
4. **Explicitly fictional navigation** — BOOST as speculative high-acceleration propulsion and TRANSIT as reference-frame FTL exploration travel.

Category 4 is deliberately labeled in the UI and does not masquerade as established physics.

## Recommended iPhone validation

1. Confirm **v0.1.4.1.1 / NAVLIFE-1411**, no runtime ERR, and normal sim time/FPS remain healthy.
2. At ordinary speed, test `V⃗`, PROGRADE and RETROGRADE.
3. Select BOOST and verify THRUST displays 5,000.
4. Build a sideways velocity, turn the nose, then test TURN & BURN and watch `V⃗` converge toward the reticle.
5. Select a distant celestial target → MORE → TRANSIT DRIVE → try 100 c with AUTO CAPTURE.
6. Confirm transit distance drops rapidly but local ship velocity does **not** jump to the transit rate; arrival should hand off to BOOST physical capture.
7. Spawn Particle Life, request 3,600×, and confirm it is capped to 60× while alive.
8. Let Particle Life reach 0 active. Confirm it reports COMPLETE/EXTINCT, retains a final FRAME, and 3,600× returns automatically.
9. REPLAY FIELD and confirm the field restarts and the 60× cap re-engages.
10. Regress COSMOS, CME/overlays, compact objects, black hole, impacts and SHIP VIEW.

## Next roadmap

If this build is stable on-device, the planned next milestone is **v0.1.4.2 — System Map + Deeper Discovery/Anomalies**, followed by the first landable-planet foundation.
