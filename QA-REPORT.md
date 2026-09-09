# Universe Lab v0.1.4.1.2 — Stellar Rendering & Approach Polish QA Report

## Release identity

- Version: **0.1.4.1.2**
- Release: **Stellar Rendering & Approach Polish**
- Build marker: **STELLAR-1412**
- Immediate baseline: **v0.1.4.1.1 — Navigation & Experiment Lifecycle Polish**
- Save schema: **1** (unchanged)
- Three.js: **0.185.0** (unchanged)
- Deployment: GitHub Pages `main` → `/(root)`
- `.github/workflows/*`: intentionally absent from the mobile distributable

## Current automated QA result

Final working-tree `npm run qa` result: **91/91 tests PASS**, plus the static structure audit and `node --check` on all JavaScript/MJS source and test files.

New v0.1.4.1.2 coverage verifies:

- perceptual stellar LOD reduces only distant micro-detail while preserving macro stellar phenomena,
- close stellar views progressively reveal surface detail rather than collapsing to a flat disk,
- stellar apparent angular radius grows smoothly with approach,
- layered stellar presentation includes photosphere/granulation, corona, thin prominence filaments, active regions and flare proxies,
- the old thick TorusGeometry prominence treatment is absent,
- renderer exposure and deep-space-background adaptation are tied to apparent stellar size,
- active CME macro visuals are no longer hard distance-culled,
- dynamic near-plane handling is present for close finite-radius approaches,
- TRANSIT visual release decays smoothly after arrival,
- the TRANSIT visual release does not modify authoritative Newtonian velocity.

All pre-existing navigation, gravity, orbit, impact, compact-object, cosmic-phenomenon, space-weather, scientific-overlay, particle-experiment, observation, save/runtime and model-limit regression tests remain enabled in the same 91-test run.

## Static structure / integration checks

The static suite requires the v0.1.4.1.2 shell identity and `STELLAR-1412` marker, plus the new `src/render/stellarPerception.js` module and its renderer/celestial/space-weather integration points.

The current source tree passes the existing application method-resolution audit, unique DOM-ID / app-selector checks and required-file structure guard. This release does not add a save migration or alter the existing GitHub Pages root layout.

## Scientific separation checked

- Stellar granulation, limb darkening, corona, prominences, active regions and rare flare sites are **visual proxies**, not MHD, radiative-transfer or convection solvers.
- Perceptual LOD changes presentation only; it does not alter stellar radius, luminosity, mass, gravity or event state.
- Close-star exposure/background adaptation is a renderer/camera response only.
- CME fronts retain the existing directional kinematic space-weather model; this release changes their visual-distance treatment, not their propagation physics.
- Camera near-plane adjustment changes rendering only; finite-radius collision and scientific model guards remain intact.
- FLIGHT / CRUISE / BOOST remain bounded local accelerations; BOOST remains explicitly speculative.
- TRANSIT remains fictional coordinate translation and never adds its displayed 1–1,000 c rate to local Newtonian velocity.
- The new post-arrival transit visual decay is render-only.

## Baseline numerical regression retained

The v0.1.4.1.1 baseline previously exercised eight seeded systems (`NAVLIFE-A` … `NAVLIFE-H`) for 30 simulated days each using the live direct Newtonian gravity solver, velocity-Verlet integration and swept finite-radius collision monitor. That baseline reported no spontaneous finite-radius collisions or non-finite body states. v0.1.4.1.2 does not modify the major-body gravity/integration path.

This inherited stress result is useful regression provenance, not a claim that v0.1.4.1.2 adds astrophysical formation/stability modeling.

## Physical iPhone / Safari release gate

Automated/container QA cannot prove the actual WebGPU appearance, mobile GPU thermals, Safari compositing, perceived brightness or touch behavior. The user screenshots that motivated this release make physical visual acceptance especially important.

Recommended device sequence:

1. Confirm **v0.1.4.1.2 / STELLAR-1412**, no runtime ERR, normal HUD updates and stable 60-FPS behavior where the device permits it.
2. Observe the primary star from long range. It should read as a compact luminous star with a smooth halo; it should no longer resemble a dense cotton-ball particle shell.
3. Approach through medium range. Major prominences/flare/CME spectacle should remain visible when visually significant; there should be no obvious FX pop-out just because distance changes.
4. Move into close stellar range. Surface granulation/active-region detail should emerge smoothly and the photosphere should not become a flat uniform cream disk.
5. Inspect prominences. They should read as thin luminous plasma filaments/arcs rather than thick opaque brown ribbons.
6. Check the galactic band behind the star from several angles. It should remain a background structure and be less likely to masquerade as an accretion disk.
7. Move extremely close without intentionally crossing the finite stellar surface. Confirm no obvious near-plane clipping through corona/photosphere layers and verify the target HUD shows the appropriate R★ proximity cue.
8. Approach/leave the star and watch exposure recovery. The star should increasingly dominate the camera when close while the deep-space background recovers smoothly as apparent stellar size shrinks.
9. Use TRANSIT to the star and verify the arrival streak/FOV presentation eases out instead of snapping off, while local ship velocity remains physically continuous.
10. Regress one CME, compact object, particle experiment, impact and ordinary planet approach to ensure this visual release did not disturb unrelated systems.

## Acceptance caveat

**91/91 automated tests passing is not a claim that the new stellar art direction is visually approved on iPhone.** The final acceptance criterion is the physical Safari pass above, especially the photosphere, prominence thickness, exposure curve and long-range preservation of dramatic stellar phenomena.
