# Universe Lab v0.1.0 — QA Report

## Automated validation

`npm run qa` passed on the packaged source tree.

### Static / syntax

- Repository-root structure check: PASS
- Required runtime modules present: PASS
- Three.js dependency pin in import map: PASS (`0.185.0`)
- JavaScript / MJS `node --check`: PASS

### Numerical tests

- Deterministic seed/RNG repeatability: PASS
- Same seed reproduces identical generated physical initial conditions: PASS
- Generated-system total linear momentum balancing: PASS
- Solar gravitational acceleration at 1 AU against `GM/r²`: PASS
- Velocity-Verlet Sun/Earth one-year bounded-orbit regression: PASS
- Reduced-mass impact-energy calculation: PASS

Total Node tests: **6 passed / 0 failed**.

### Static HTTP resource smoke

A local HTTP server returned HTTP 200 for the shell, stylesheet, main module, application module, constants, system generator, gravity solver, and renderer module.

## Interactive rendering status

An automated headless Chromium 3D smoke was attempted, but the available container could not initialize an EGL/GPU display backend, including its software ANGLE path. Therefore this report does **not** claim an automated interactive WebGPU/WebGL playthrough.

Physical iPhone Safari / deployed GitHub Pages testing remains the rendering release gate, consistent with the project's mobile-first workflow.

## Scientific limitations intentionally retained in v0.1.0

- Black-hole trajectories are Newtonian; no GR geodesics/lensing yet.
- Minor test particles do not mutually gravitate and do not perturb major bodies.
- Collision detection and energy accounting exist, but no collision response, fragmentation, cratering, fluid displacement, shock propagation, or explosions yet.
- Generated systems prioritize stable sandbox starting states rather than attempting planet-formation simulation.
- `DAMP` is intentionally fictional navigation assistance and is labeled as such in the UI.

These are explicit module boundaries for future releases rather than hidden approximations.


## v0.1.0.1 mobile packaging validation

The GitHub Actions workflow was intentionally removed from the distributable archive to support mobile OAuth Git clients without `workflow` scope. The application remains a static site and can be deployed with GitHub Pages using `main` → `/(root)`. Simulation code is unchanged from v0.1.0.
