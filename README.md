# Universe Lab v0.1.3.2.2 — Particle Warp Runtime Recovery Hotfix

Universe Lab is a mobile-first scientific/experimental solar-system sandbox built for static GitHub Pages. One deterministic seeded system is simulated at a time; the spacecraft is both observer and laboratory platform.

v0.1.3.2.2 is a narrow runtime recovery built from v0.1.3.2.1. It restores the particle-warp safety method that the frame loop calls every frame and strengthens automated class-method integrity checks so a missing method cannot be hidden by its call site. Observation cameras, particle experiments, navigation, save schema 1, Three.js 0.185.0, and branch-root GitHub Pages deployment remain unchanged.


## v0.1.3.2.1 observation/navigation additions

- Particle fields now spawn just outside their own configured extent instead of using a fixed 40,000 km minimum. Particle Life / Species mode changes also suggest smaller 2,000 km fields for easier mobile observation.
- Spawning a field automatically selects it and enters **OBSERVE / FRAME** view. This is a massless scientific camera only: the spacecraft, velocity, gravity, and experiment state are untouched.
- **FRAME** fits the current active-particle extent, **TRACK** follows the field centroid from behind its mean motion, and **ORBIT** circles the field. Dragging LOOK while observing manually orbits the camera.
- **SHIP VIEW** returns instantly. While observing, the main APPROACH button temporarily becomes a one-tap SHIP VIEW return control.
- Active experiment fields are selectable in the LAB. Status shows ship-to-field distance and approximate active-particle radius.
- **RENDEZVOUS** returns to SHIP VIEW and treats the selected experiment centroid/mean velocity as a massless navigation target. Existing bounded FLIGHT/CRUISE thrust, braking-safe APPROACH, CAPTURE/HOLD, and the 60× particle warp cap remain in force.
- Observation-state scans use existing typed arrays and are throttled; a 30,000-particle Node development benchmark averaged well under 1 ms per centroid/radius scan. This is not an iPhone performance claim.
- Visible build marker **OBSNAV-1322** is included in the system menu/camera HUD to make stale Safari deployments easier to spot.
## Retained v0.1.3.1 navigation hotfix

- APPROACH no longer switches off merely because stand-off distance was reached. It transitions through **CAPTURE** into persistent thrust-powered **HOLD**.
- HOLD continuously matches target-relative velocity and counteracts the selected target's local gravity with bounded physical thrust. Manual THRUST/REV/BRAKE/RCS input releases HOLD and returns to 1×.
- Stand-off distance now includes a propulsion-support constraint derived from `GM/r²`, reserving most engine authority for capture/correction. Black holes therefore cannot be approached to a tiny radius that the selected engine could never hover against.
- Strong local gravity reduces the maximum physics substep dynamically instead of allowing the normal 300 s ceiling to destabilize close approaches.
- APPROACH warp is based on distance/time to the **navigation stand-off**, not the target's physical surface alone. CAPTURE is limited to 60× and HOLD to 1×.
- The Newtonian spacecraft model now has an explicit validity guard: if ship speed reaches 10% of c, or the ship enters the black-hole near-field guard, simulation pauses with a MODEL LIMIT warning instead of continuing into superluminal numerical runaway. No velocity is silently clamped.


### Reusable particle engine

Particle experiments are not implemented as thousands of Three.js objects. Each field owns contiguous typed-array state:

- Float64 position and velocity,
- Uint8 active/dead state,
- Uint8 species state,
- Float32 render positions/colors,
- a single Points draw call per field.

The renderer never owns experiment physics. It only receives transformed floating-origin coordinates.

### Gravity Cloud

A Gravity Cloud contains physical **test particles** in SI coordinates. They:

- inherit the spacecraft's velocity when spawned,
- feel every active major Newtonian gravity source,
- are absorbed on finite-radius contact with a star/planet/moon/black hole,
- do **not** source gravity themselves.

That last constraint is explicit. Full particle self-gravity would require a Barnes-Hut/FMM/GPU gravity backend rather than pretending a local neighbor approximation is equivalent to long-range Newtonian gravity.

Current mobile-first Gravity Cloud limit: **30,000 particle slots**.

### Particle Life

Particle Life is a deliberately artificial continuous-3D cellular-automaton experiment. Particles move through space, but alive/dead transitions are based on occupancy of neighboring spatial-hash cells. The current rules are Conway-inspired rather than canonical Conway Life:

- low/crowded populations can die,
- selected neighborhood populations can survive,
- dead particle slots can reactivate under birth conditions.

Major-body gravity can be enabled or disabled independently.

Current mobile-first Particle Life limit: **6,000 slots**.

### Species Forces

Species Forces assigns each active particle one of three species. A short-range attraction/repulsion matrix produces artificial emergent motion. This is **not** a model of real matter.

For performance, forces are evaluated against neighboring **cell populations** instead of every particle pair. A typed-array spatial hash makes the work scale with particles and populated neighboring cells rather than naïve O(N²) all-pairs comparisons.

Current mobile-first Species Forces limit: **4,000 slots**.

### Particle Gun

The LAB can fire 10–5,000 ballistic luminous test particles from the spacecraft. They inherit ship velocity, receive a configurable launch velocity/spread, feel major-body Newtonian gravity, and disappear on finite-radius body contact.

This gives the ship its first true high-count experiment tool without creating thousands of major gravity sources.

## Spatial-neighbor architecture

`src/experiments/particles/spatialHashGrid.js` uses open-addressed typed-array storage:

- integer cell coordinates,
- hash table stamps instead of allocating/clearing Maps each step,
- linked particle indices per populated cell,
- per-cell population counts,
- per-species cell counts.

Neighbor modes only inspect the 27 cells surrounding a particle. Species Forces aggregates cell populations, avoiding dense particle-pair loops. This is the CPU reference implementation that a later WebGPU compute backend can replace behind the same experiment interfaces.

## Time integration / warp

Particle experiments are local high-resolution simulations. While any experiment is active, global warp is capped at **60×**. At the app's maximum real-frame delta, that keeps a normal frame to roughly three simulated seconds or less and allows the particle solver to subdivide fine-rule modes into bounded steps.

This is intentionally conservative. The simulator does not silently skip minutes of Particle Life evolution just to preserve a high warp number.

APPROACH/MATCH remain usable with experiments active, but their usual 600× cruise recommendation is clamped to the particle-safe 60× ceiling until the fields are cleared.

## Session-local experiment state

Save schema remains **1**. High-count particle fields are **session-local in v0.1.3.1** and are cleared by new-system generation or save restore.

This is deliberate: blindly serializing tens of thousands of Float64 particle states into localStorage would be a bad mobile persistence design. The experiment manager already separates deterministic configuration/state so a future snapshot/replay format can be introduced intentionally rather than bloating schema 1.

## Existing scientific flight foundation retained

- FLIGHT engine: 20 m/s² declared experimental propulsion.
- CRUISE engine: 120 m/s².
- BRAKE uses bounded physical acceleration opposite inertial velocity.
- MATCH VELOCITY reduces target-relative velocity with bounded thrust.
- APPROACH follows a braking-safe target-relative velocity envelope.
- Flight auto-warp uses simulation-time compression rather than teleportation.
- Manual takeover returns navigation to 1×.

## Existing impact foundation retained

- swept finite-radius collision detection,
- reduced-mass impact energy and Q_R,
- material response classification,
- approximate Collins/Melosh/Marcus-style crater scaling,
- persistent damage records,
- at most two resolved fragments from a primary impact,
- 16 total active resolved impact-fragment sources,
- cascade suppression and collision grace,
- energy-driven visual flash/ejecta effects.

## Scientific core

- authoritative units: SI meters, kilograms, seconds,
- authoritative positions/velocities: Float64,
- major gravity: mutual Newtonian direct solver,
- major integrator: velocity-Verlet,
- high-count background minor field: test particles only,
- floating-origin Three.js rendering,
- deterministic system seeds,
- save schema: 1.

## GitHub Pages / phone workflow

The release archive is repository-root-ready. Unzip/upload its contents directly into the repository root.

GitHub Pages:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

The archive intentionally contains **no `.github/workflows/*`** files, so mobile OAuth clients do not require workflow scope.

## Not implemented yet

- long-range self-gravity between experiment particles,
- Barnes-Hut/FMM/GPU gravity,
- fluids,
- double-slit/wave probability solver,
- atmosphere/entry heating,
- structural spacecraft crash physics,
- landable terrain,
- GR black-hole trajectories/lensing.

Those remain separate modules rather than being faked inside the particle framework.

## QA

Run:

```bash
npm run qa
```

See `QA-REPORT.md` for automated tests, indicative CPU timings, and the remaining physical-iPhone release gates.
