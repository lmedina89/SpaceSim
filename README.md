# Universe Lab v0.1.4.1.2 — Stellar Rendering & Approach Polish

Universe Lab is a mobile-first scientific/experimental space sandbox for static GitHub Pages. Authoritative local simulation remains SI-unit Float64 state with direct Newtonian major-body gravity, velocity-Verlet integration, floating-origin rendering, and Three.js 0.185.0 for presentation.

**Build marker:** `STELLAR-1412`  
**Save schema:** 1 (unchanged)  
**Three.js:** 0.185.0 (unchanged)  
**Deployment:** GitHub Pages → `main` → `/(root)`  
**Release gate:** physical iPhone Safari

v0.1.4.1.2 is a focused visual/approach polish release built directly from **v0.1.4.1.1 — Navigation & Experiment Lifecycle Polish**. It does not rewrite the working physics, save system, experiment lifecycle, transit mechanics, or cosmic-object architecture.

## Why this release exists

Physical iPhone testing near the seeded primary star exposed a presentation mismatch: the distant star looked dramatic, but the close view read as a flat cream sphere surrounded by a dense fuzzy particle shell. The old prominence geometry also appeared as thick translucent ribbons, and the narrow galactic-band backdrop could visually resemble an accretion disk when aligned behind a star.

The goal of this release is to make stellar approach visually coherent **without optimizing away the spectacle at distance**.

## Stellar rendering rebuild

### Layered photosphere

Stars now use a layered visual presentation:

- seeded procedural photosphere/granulation texture,
- higher sphere tessellation for close approaches,
- view-facing limb-darkening overlay,
- persistent star-color base layer,
- active-region glow patches,
- rare visual flare proxies.

The surface treatment is visual only. Universe Lab does not claim to solve stellar convection, radiative transfer, or magnetohydrodynamics.

### Corona cleanup

The former dense 1,600-point shell was replaced with:

- smooth additive inner/outer coronal halos,
- a much sparser filamentary micro-corona,
- reduced visual noise at long range,
- stronger close-range detail when the star occupies a meaningful apparent angle.

This specifically avoids the previous “cotton-ball” appearance.

### Prominence rebuild

The previous thick torus/ribbon prominences were removed. Prominences now use seeded curved tube filaments with:

- thin bright cores,
- softer additive halos,
- irregular heights/orientations,
- slow independent motion.

They remain visual proxies rather than an MHD solution.

## Perceptual stellar LOD — preserve the wow

This release does **not** use a conventional “far away = turn effects off” rule.

The new perceptual LOD policy is:

- **macro phenomena stay visible** — prominences, large coronal structure, flares and CME-scale events are not distance-culled simply for being far away;
- **medium detail simplifies smoothly** — noisy corona detail gives way to cleaner halo/prominence cues;
- **micro detail fades first** — sub-pixel granulation and tiny particle noise are the only layers intentionally reduced at range;
- **distant macro cues may be boosted slightly** so large stellar activity still reads against the background;
- **no hard visual pop-in/pop-out** is introduced by the stellar LOD profile.

In other words: optimization targets invisible complexity, not the pretty stellar sights.

## Exposure and background behavior

When a star occupies a large apparent angle:

- ACES tone mapping uses a gentle visual exposure reduction,
- deep-space stars dim gradually,
- the galactic band dims more aggressively than the rest of the sky,
- background nebulae remain visible but subordinate,
- HUD/UI brightness is unaffected because the HUD is HTML rather than scene-rendered.

The galactic band itself was broadened, made less perfectly planar, reduced in point size, and lowered in opacity so it is less likely to resemble a circumstellar/accretion disk when crossing behind a target star.

## Close-approach cues

Target telemetry now adds stellar proximity language when within 25 stellar radii:

- **STELLAR VICINITY**
- **INNER CORONA**
- **LOW CORONA**
- **PHOTOSPHERE**

The target chip reports distance in `R★`, while the scanner/type readout includes spectral class and temperature when available.

The renderer also adapts the camera near clip plane when very close to a finite-radius body to reduce visual clipping during extreme approaches.

## Transit arrival visual polish

TRANSIT physics are unchanged. The ship still preserves local Newtonian velocity and transit remains explicitly fictional reference-frame translation.

The visual-only transit FOV/streak state now decays exponentially for a short moment after arrival/disengage instead of snapping to zero on one frame. This makes the handoff into BOOST/APPROACH visually smoother while leaving spacecraft position and velocity logic untouched.

## Space-weather visibility

CME visual proxies are no longer hidden by the old renderer-scale cutoff near the end of their valid lifetime. Their fixed-particle macro representation remains available while the underlying space-weather event is active.

The physical/approximation boundary remains the same: CME fronts use kinematic propagation and geometric crossing tests; plasma, magnetic reconnection, radiation transport and MHD are not solved.

## Retained v0.1.4.1.1 systems

This build preserves the already-tested navigation/lifecycle foundation:

- FLIGHT 20 m/s², CRUISE 120 m/s², speculative BOOST 5,000 m/s²,
- inertial `V⃗` velocity marker,
- PROGRADE / RETROGRADE attitude aids,
- TURN & BURN,
- STOP RELATIVE,
- propulsion-safe APPROACH → BRAKING → CAPTURE → HOLD,
- speculative 1c / 10c / 100c / 500c / 1000c TRANSIT,
- swept transit clearance guards and optional BOOST auto-capture,
- active/complete particle experiment lifecycle,
- deterministic REPLAY FIELD,
- completed-field final-frame retention and automatic warp-cap release,
- magnetars, white dwarfs, brown dwarfs and physical rogue planets,
- black-hole accretion/photon-ring/jet visual proxies,
- comets, debris belts, planetary rings and supernova-remnant visual sources,
- CME/space-weather fronts,
- L1–L5, Hill, Roche, orbital-plane and gravity-vector overlays,
- impacts, crater/fragment logic and cascade suppression,
- Gravity Cloud, Particle Life, Species Forces and Particle Gun,
- isolated SHIP/OBSERVE render paths and runtime-error HUD boundary.

## Scientific model categories

Universe Lab continues to separate:

1. **Live physical state** — Newtonian bodies/particles and bounded local thrust integrated in SI units.
2. **Scientific approximation** — osculating elements, crater scaling, CME fronts, Hill/Roche/Lagrange diagnostics.
3. **Visual/artificial proxy** — stellar granulation/corona/prominences/flares, nebulae, remnants, magnetosphere art, accretion graphics, Particle Life and Species Forces.
4. **Explicitly fictional navigation** — BOOST as speculative high-acceleration propulsion and TRANSIT as reference-frame FTL exploration travel.

## Recommended physical iPhone validation

1. Confirm **v0.1.4.1.2 / STELLAR-1412** and no runtime `ERR`.
2. From a normal distant system view, confirm the primary star still looks bright/dramatic and large stellar cues were not visually neutered.
3. Approach the primary star through roughly 25 R★ → 8 R★ → 2 R★ → near photosphere and watch the surface/corona transition remain smooth.
4. At close range, confirm the surface has visible granulation/variation rather than a flat cream disk.
5. Confirm prominences read as thin plasma loops/filaments rather than thick brown ribbons.
6. Confirm the old fuzzy cotton-ball corona is gone and the corona reads as glow + sparse filaments.
7. Align the galactic band behind the star and confirm it no longer strongly resembles an accretion disk.
8. Confirm close-star exposure adaptation dims the rendered sky gradually while the HTML HUD remains crisp/readable.
9. Trigger a CME and confirm the macro event remains visually available across large scales instead of disappearing from a renderer-scale cutoff.
10. Run a 100 c TRANSIT arrival with AUTO CAPTURE and confirm the streak/FOV presentation releases smoothly rather than snapping off.
11. Regress BOOST, APPROACH/HOLD, STOP RELATIVE, TURN & BURN, particle experiment completion/replay, COSMOS, overlays, compact objects, impacts and save/load.

## Next roadmap

If this build passes physical iPhone testing, the planned feature milestone remains **v0.1.4.2 — System Map + Deeper Discovery/Anomalies**, followed later by the first landable-planet foundation.
