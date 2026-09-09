# Universe Lab v0.1.3.2.2 — QA Report

Release: **Particle Warp Runtime Recovery Hotfix**

## Trigger

Physical iPhone Safari / GitHub Pages testing of v0.1.3.2.1 surfaced the runtime error:

`this.enforceParticleWarpSafety is not a function`

The frame loop still called `enforceParticleWarpSafety()` every frame, but the class method itself had been lost during the earlier navigation integration. The previous static check only searched for the token `enforceParticleWarpSafety`, so the call site falsely satisfied the check.

## Repair

- Restored `UniverseLabApp.enforceParticleWarpSafety()` as an actual class method.
- The method reads `ParticleExperimentManager.recommendedWarpCap`; while particle fields are active, time warp is capped at the configured 60× ceiling.
- When the cap engages, the simulation clock, LAB time-scale selector, and quick-warp button are synchronized.
- Existing navigation auto-warp still applies the stricter of its own recommended warp and the particle-experiment cap.
- v0.1.3.2.1 runtime-error reporting and ship/observation render isolation are retained.
- Build marker: **OBSNAV-1322**.

## Regression hardening

The test suite now checks class method integrity instead of merely checking for method-name text:

- Static QA enumerates every direct `this.method()` call in `UniverseLabApp` and requires a corresponding class method definition.
- `tests/appMethodIntegrity.test.mjs` independently enforces the same invariant.
- Current audit: **41 class method definitions**, **38 direct `this.method()` call names**, **0 missing definitions**.
- `enforceParticleWarpSafety`: **1 definition / 1 direct call**.

This exact failure can no longer pass QA because its call site exists.

## Automated result

`npm run qa` passes completely.

- Static structure check: **PASS**
- JavaScript / MJS syntax checks: **PASS**
- Node test suite: **58 / 58 PASS**
- Save schema: **1 (unchanged)**
- Three.js pin: **0.185.0 (unchanged)**
- Distributable GitHub workflow files: **none**

The 58 tests include all prior gravity/orbit, impact/fragment, flight computer, strong-gravity navigation, simulation clock, particle experiment, observation/rendezvous, renderer-isolation, and runtime-error-boundary regressions plus the new app-method integrity regression.

## Selector / shell audit

- HTML IDs: **111**
- unique HTML IDs: **111**
- duplicate IDs: **0**
- direct app `querySelector('#id')` references missing from shell: **0**

## Static HTTP smoke

A local static HTTP server returned **200** for:

- `/`
- `/styles.css`
- `/src/main.js`
- `/src/app/app.js`
- `/src/experiments/particles/particleExperimentManager.js`
- `/src/render/threeRenderer.js`

## Scope

This is intentionally a narrow blocker hotfix. It does **not** change the scientific models, save schema, particle rules, impact model, observation camera behavior, flight acceleration, or renderer architecture.

## Physical-device release gate

After deployment on iPhone Safari / GitHub Pages verify in this order:

1. HUD reports **v0.1.3.2.2** and MORE shows **OBSNAV-1322**.
2. FPS/PHYSICS/RENDER/SHIP populate instead of `ERR` or `—`, and SIM TIME advances.
3. No `RUNTIME ERROR` appears during at least 10–20 seconds of untouched normal SHIP VIEW.
4. Open LAB and spawn a small Gravity Cloud with SPAWN + OBSERVE.
5. Confirm observation view works and active experiments cap warp at 60× without throwing an error.
6. Return to SHIP VIEW and verify normal flight controls still work.
7. Only then test FRAME / TRACK / ORBIT / RENDEZVOUS and larger particle loads.

A physical iPhone WebGPU playthrough is still the release gate; no automated container test is represented as equivalent to that device test.
