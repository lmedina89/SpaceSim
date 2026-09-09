# Universe Lab v0.1.3.2.1 — QA Report

Release: **Startup Runtime Recovery & Observation Isolation Hotfix**

## Automated result

`npm run qa` passes completely.

- Static structure check: PASS
- JavaScript / MJS syntax checks: PASS
- Node test suite: **57 / 57 PASS**
- Save schema: **1 (unchanged)**
- Three.js pin: **0.185.0 (unchanged)**
- Distributable GitHub workflow files: **none**

## New v0.1.3.2.1 coverage

Seven observation/runtime regressions now verify:

- particle fields spawn just outside their configured extent rather than using the old fixed 40,000 km minimum,
- deriving an experiment observation centroid / mean velocity / framing radius does not mutate particle state,
- FRAME camera distance scales with experiment radius in local render coordinates,
- TRACK places the camera behind the field's mean direction of motion,
- an experiment can be represented as a massless target for the existing bounded-thrust APPROACH controller,
- normal SHIP VIEW uses an isolated render branch and observation rendering is strictly opt-in,
- runtime frame exceptions are surfaced visibly as `RUNTIME ERROR` instead of silently freezing the HUD at `—`.

Static checks additionally require the OBSERVE / TRACK / ORBIT / RENDEZVOUS / SHIP VIEW controls, camera indicator, observation app methods, pure observation-camera helper, and restored particle-field parameter/status integration methods.

## Retained coverage

All existing v0.1.3.1 regressions remain green, including:

- target-relative APPROACH → BRAKING → CAPTURE → persistent HOLD,
- propulsion-safe black-hole stand-off and 10%-of-c Newtonian validity guard,
- adaptive strong-gravity substeps,
- physical BRAKE / FLIGHT / CRUISE / MATCH behavior,
- typed-array spatial-hash particle experiments,
- Gravity Cloud / Particle Life / Species Forces / Particle Gun,
- particle budget and 60× active-experiment warp cap,
- swept major-body collision detection,
- impact energy / crater / representative-fragment stability,
- velocity-Verlet gravity/orbit regressions,
- deterministic/barycentric seeded generation,
- WebGPU body-color exposure-floor regression.

## Selector / shell audit

Current shell/app audit:

- HTML IDs: **111 unique**
- duplicate IDs: **0**
- JS selector references with missing shell IDs: **0**

## Static HTTP smoke

A local static HTTP server returned **200** for:

- `/`
- `/styles.css`
- `/src/main.js`
- `/src/app/app.js`
- `/src/render/observationCamera.js`
- `/src/experiments/particles/particleExperimentManager.js`
- `/src/render/threeRenderer.js`

## Generated-system long-run regression

Eight deterministic generated systems were each integrated for **30 simulated days** at **900 s** steps using the existing direct Newtonian / velocity-Verlet major-body solver and swept collision monitor.

- spontaneous major-body collisions: **0**
- maximum generated major-body count in this sample: **21**

## Observation-state development benchmark

On this Node/container environment only, after warm-up, deriving centroid/mean velocity/framing radius for a 30,000-particle Gravity Cloud averaged approximately **0.7 ms** per scan. The app throttles observation-state refreshes rather than performing them for every visual frame.

This is **not an iPhone performance claim**. Physical iPhone Safari remains the release gate.

## Physical-device release gate

On iPhone Safari / GitHub Pages verify:

1. HUD/version reports **v0.1.3.2.1**; MORE contains build marker **OBSNAV-1321**.
2. SPAWN + OBSERVE immediately frames the new experiment instead of requiring a long ship flight.
3. Entering OBSERVE does not change ship speed/position; SHIP VIEW returns to the same physical ship state.
4. LOOK rotates the observation view rather than spacecraft attitude while OBSERVE is active.
5. FRAME / TRACK / ORBIT remain centered on an evolving experiment.
6. APPROACH button becomes a one-tap SHIP VIEW return while observing.
7. RENDEZVOUS physically approaches the selected experiment and remains subject to bounded drive acceleration and the active-experiment 60× warp cap.
8. Existing v0.1.3.1 flight HOLD safety, planet readability, impact fragment restraint, iOS hold controls, and particle performance remain intact.

No automated interactive WebGPU iPhone playthrough is claimed.

## Physical-device blocker that triggered this hotfix

The first deployed v0.1.3.2 iPhone test loaded the shell and initialized WebGPU, but the animation loop failed before the first HUD update: FPS/physics/render/ship remained `—`, simulation time remained 0 d, and the 3D world did not populate normally. The container cannot run an interactive WebGPU/EGL browser, so the exact Safari exception could not be reproduced locally. This hotfix therefore isolates the physically tested SHIP render path from the new observation branch and adds a visible frame-error boundary. Physical iPhone Safari remains the only valid interactive confirmation.
