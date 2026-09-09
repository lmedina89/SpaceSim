# Universe Lab v0.1.1 — QA Report

## Release scope

Scientific flight instrumentation, target scanning, N-body path prediction, configurable physical launcher, seeded moon/eccentric-orbit upgrade, and impact telemetry.

## Automated release checks

**PASS — repository/static structure**

- required shell/modules/docs present,
- Three.js import-map version pinned,
- shell and package versions agree,
- no JavaScript/MJS syntax errors.

**PASS — 13/13 numerical/unit tests**

1. solar gravity at 1 AU matches `GM/r²`,
2. reduced-mass impact energy,
3. impact momentum and Q_R telemetry,
4. one-year velocity-Verlet Sun/Earth orbit bounded,
5. launcher spherical radius from mass+density,
6. circular osculating orbit telemetry,
7. deterministic PRNG,
8. orthonormal spacecraft local basis with roll,
9. deterministic seeded physical initial state,
10. barycentric center-of-mass/rest-frame initialization,
11. generated planet/moon metadata consistency,
12. forward trajectory keeps a low-Earth circular trajectory bounded for one orbit,
13. swept predictor detects a finite-radius impact.

## Additional numerical stress checks

A private release stress pass integrated 8 different generated systems for 30 simulated days with 900-second major-body timesteps.

- maximum generated major-body count observed: 21,
- spontaneous finite-radius major-body collisions: 0,
- expected orbital radius naturally varied because v0.1.1 intentionally generates eccentric orbits; no non-finite state was observed.

A Node-side algorithm timing sample on seed `BENCH` measured approximately:

- 4,000 minor bodies, one 60 s step: ~8 ms,
- 10,000 minor bodies, one 60 s step: ~6 ms,
- 20,000 minor bodies, one 60 s step: ~13 ms,
- one-day 420-point N-body trajectory forecast with 9 major sources: ~5 ms.

These numbers are **not iPhone performance claims**. They only confirm the algorithms are in a reasonable cost regime in the release environment. Physical iPhone Safari remains the performance gate.

## Packaging/static-host checks

**PASS**

- repository-root layout verified,
- no wrapper directory,
- no `.github/workflows/*`,
- local static HTTP smoke returned HTTP 200 for the shell, CSS, main module, app module, trajectory predictor, and version manifest,
- HTML ID/query-selector audit found no duplicate IDs and no missing queried elements,
- final ZIP integrity is checked after packaging and the SHA-256 is reported with the release artifact.

## Interactive rendering limitation

The previous foundation build could not be reliably interactively smoke-tested in the container because its headless Chromium environment lacked a working EGL/GPU backend. This environment limitation remains relevant.

Therefore this report does **not** claim a real iPhone/WebGPU/WebGL interactive playthrough. Deploy to GitHub Pages and physically test Safari before treating the graphics/control experience as release-gated.

## Recommended iPhone test order

1. Load default 4,000 particles and confirm renderer initializes.
2. Drag LOOK and hold THRUST/REV.
3. Open RCS; verify lateral/up/down translation and roll.
4. Tap a planet/moon and open SCAN.
5. Toggle PATH and verify the cyan trajectory moves as ship state changes.
6. Aim at the selected target.
7. Configure a basalt asteroid, enable PREVIEW, and verify the orange path appears.
8. Launch it and confirm the spawned body becomes targetable/scannable.
9. Increase minor field to 10,000 then 20,000 while watching FPS/physics cost.
10. Test portrait once for layout recovery, but landscape remains the primary mobile mode.
