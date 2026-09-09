# Universe Lab v0.1.4.1 — QA Report

## Release identity

- Version: **0.1.4.1**
- Milestone: **Extreme Objects, Space Weather & Scientific Overlays**
- Build marker: **EXTREME-141**
- Save schema: **1**
- Three.js: **0.185.0**
- Deployment: GitHub Pages branch-root (`main` → `/(root)`)
- Workflow files: intentionally absent from the distributable archive

## Automated QA

Final command:

```text
npm run qa
```

Result: **72/72 automated tests PASS**, plus static structure checks and `node --check` over all JS/MJS source/test files.

New v0.1.4.1 coverage includes:

- Magnetar, white-dwarf, brown-dwarf, and rogue-planet LAB presets creating distinct live Newtonian body kinds.
- Deterministic optional physical rogue planets in generated systems.
- Supernova-remnant and rogue-planet cosmic phenomenon registration.
- CME front propagation at configured kinematic speed.
- Directional CME/spacecraft crossing checks.
- Deterministic automatic space-weather scheduling.
- Swept-front CME crossing so a large simulation step cannot silently skip a ship/front intersection.
- Hill-radius and Roche-limit diagnostic scales.
- Instantaneous L4/L5 equilateral geometry checks.
- Live Newtonian gravity-vector samples.
- Orbital-plane basis orthogonality.

Retained suites cover:

- direct Newtonian gravity,
- velocity-Verlet orbital stability,
- generator determinism and barycentric correction,
- physical comets,
- trajectory prediction and swept impact,
- impact/crater/fragment behavior and cascade suppression,
- physical BRAKE and experimental FLIGHT/CRUISE acceleration,
- APPROACH/BRAKING/CAPTURE/HOLD,
- black-hole and neutron-star propulsion-safe stand-off/model guards,
- adaptive strong-gravity physics substeps,
- observation-camera isolation,
- runtime-error HUD boundary,
- typed-array particle framework / spatial hash / budgets,
- app class-method integrity.

## App method integrity

Static audit of `UniverseLabApp`:

- class method definitions: **53**
- unique direct `this.method()` call names: **50**
- unresolved direct method calls: **0**

This continues the regression protection added after the earlier missing-method runtime failure.

## HTML / UI integrity

- HTML IDs: **148**
- unique IDs: **148**
- duplicate IDs: **0**
- direct JS selector IDs audited: **104**
- missing selector IDs: **0**

The static suite requires the v0.1.4.1 extreme-object, space-weather, overlay controls, and `EXTREME-141` build marker.

## Local static-host smoke

An in-process local HTTP server returned **200** for:

- `/`
- `/styles.css`
- `/src/main.js`
- `/src/app/app.js`
- `/src/cosmic/spaceWeather.js`
- `/src/cosmic/scientificOverlays.js`
- `/src/render/spaceWeatherVisuals.js`
- `/src/render/scientificOverlayVisuals.js`
- `/src/render/celestialFactory.js`
- `/src/render/threeRenderer.js`

This confirms the shell and new module paths are statically reachable. It does not substitute for real Safari/WebGPU execution.

## Long-run generated-system stress

Eight deterministic systems were integrated for **30 simulated days each** at **900-second** major-body steps using the direct Newtonian solver and velocity-Verlet integrator. Swept finite-radius collision checks and finite-state checks were performed during the run.

| Seed | Major bodies | Rogue planets | Phenomena | Spontaneous collisions | Non-finite state |
|---|---:|---:|---:|---:|---:|
| EXTREME-A | 20 | 1 | 6 | 0 | 0 |
| EXTREME-B | 22 | 1 | 6 | 0 | 0 |
| EXTREME-C | 20 | 1 | 5 | 0 | 0 |
| EXTREME-D | 16 | 1 | 6 | 0 | 0 |
| EXTREME-E | 24 | 1 | 6 | 0 | 0 |
| EXTREME-F | 19 | 0 | 4 | 0 | 0 |
| EXTREME-G | 26 | 1 | 6 | 0 | 0 |
| EXTREME-H | 16 | 1 | 5 | 0 | 0 |

Summary:

- total spontaneous finite-radius collisions: **0**
- maximum generated major-body count: **26**
- generated rogue planets across sample: **7**
- non-finite position/velocity states: **0**

This is a deterministic stability regression, not proof that every possible seed is collision-free over arbitrary timescales.

## Scientific-model boundaries

The following distinctions are intentional and are exposed in the UI/docs:

- **Live physical Newtonian bodies:** planets, moons, comet nuclei, rogue planets, LAB magnetars/neutron stars, white dwarfs, brown dwarfs, black holes, and launched resolved bodies.
- **Measured/kinematic approximations:** CME front propagation/arrival geometry; Lagrange-point estimates; Hill spheres; Roche limits.
- **Visual proxies:** CME plasma appearance, magnetar field loops/sparks, supernova-remnant shell/filaments, stellar-surface/corona appearance, brown/white-dwarf cosmetics, black-hole accretion/jet/lensing-style graphics.
- Gravity-vector overlays use the live Newtonian major-body source set, but the arrows are a visualization and not extra forces.

No full general-relativistic ray tracing, relativistic magnetohydrodynamics, plasma transport, radiation-damage model, or stellar-evolution solver is claimed.

## Physical iPhone release gate

Automated/container QA cannot establish real iPhone WebGPU performance or visual correctness. Physical Safari remains the release gate.

Recommended device validation order:

1. Confirm **v0.1.4.1 / EXTREME-141**, no runtime ERR, and simulation time advances for 15–30 seconds.
2. Open COSMOS and scan/observe the seeded **supernova remnant** and any generated **rogue planet**; test ORBIT VIEW and SHIP VIEW.
3. Trigger a **CME**, watch its front radius/status advance, then test AUTO WEATHER scheduling.
4. Enable scientific overlays in stages: master → orbital plane → Lagrange → Hill → Roche. Enable gravity vectors separately because they add more visual work.
5. LAB-spawn the new extreme presets, especially a **magnetar**, and verify safe APPROACH/model-limit behavior near compact objects.
6. Recheck v0.1.4 black-hole visuals, comet tails, debris/ring populations, then particle experiments and impact effects.
7. Capture any `RUNTIME ERROR:` text verbatim if Safari reports one.

Do not treat this report as a claim of interactive iPhone FPS for the new visual layers.
