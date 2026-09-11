# Universe Lab v0.1.5.2 — Multi-World Landing & Exploration QA Report

- Version: **v0.1.5.2**
- Build marker: **SURFEXP-152**
- Baseline: **v0.1.5.1.2 / PORTHUD-1512**
- Save schema: **1 (unchanged)**
- Three.js: **0.185.0 (unchanged)**
- iPhone/iPad WebKit policy: **forced WebGL2 (unchanged)**

## Scope

Bounded expansion of the v0.1.5.1 surface-profile architecture into a full multi-world exploration loop. `ORIGIN-001` enables the accepted home world Caelum-4361 d, accepted airless reference moon f-A, new cold/thin-atmosphere rocky planet e, and new cryogenic ice/volatile moon h-A. Other solid worlds remain locked; gas giants remain no-solid-surface; rogues remain excluded until their rotation model is complete.

The accepted home generator/weather path is preserved. New generalized profiles are deterministic, environment-driven presentation models rather than solved geology/climate/chemistry. Surface-session restore is body/profile isolated. Generalized takeoff preserves the departing session through cleanup and uses the current rotated body-fixed landing direction with the existing Hill-screened circular-orbit insertion planner; the legacy home 5-radius return remains unchanged.

No FRAME target-clearance diagnostic or route rewrite is included; the suspected pass-through was not reproducibly established and was explicitly deferred. Core gravity/integration/FRAME equations, impacts, astronomy/observer/planner, environment science, save schema and WebKit backend are protected.

## Automated QA / independent validation

- Frozen v0.1.5.1.2 baseline `npm run qa`: **255/255 PASS**.
- Pre-release feature worktree after session-isolation hardening: **265/265 PASS**.
- Independent **3,000-system** exploration-selection sweep: **10,093 total enabled surfaces**, maximum **4/system**, average **3.3643/system**; home 3,000; airless reference 2,795; rocky 2,135; ice 2,163; **0 unsafe selected insertion plans**, **0 rogue surfaces enabled**, **0 invalid generated regions**, **0 systems above the 4-surface bound**.
- Independent **1,000-seed** v0.1.5.1.2-v0.1.5.2 orbital compatibility comparison: **17,280 bodies, 0 mismatches** across tested identity/kind, mass/radius, parent/orbit metadata, Float64 position/velocity state, rotation and environment-version metadata.
- Exact ORIGIN home-world continuity: generated region JSON, 60 s / 60 Hz deterministic weather state, and sampled surface height/color grid all match v0.1.5.1.2. Independent rerun combined continuity SHA-256: `4402430930acdad29c9fa9d732558aed705b1adaeaceedbf6d72f5207ef93ee5` (baseline and worktree hashes identical).

## Final versioned worktree gate

- Final v0.1.5.2 / `SURFEXP-152` `npm run qa`: **265/265 PASS**.
- Static structure: **53 required files PASS**.
- All JS/MJS syntax: **PASS**.
- Exact baseline-tree comparison vs v0.1.5.1.2: **20 changed files, 1 added test, 0 removed files**.
- Baseline contained **61 source JS modules**; **53 are byte-for-byte identical**. The only changed source modules are the explicit 1.5.2 allowlist: `src/app/app.js`, `src/main.js`, `src/render/surfaceWorld.js`, `src/render/threeRenderer.js`, `src/surface/surfaceGenerator.js`, `src/surface/surfaceProfiles.js`, `src/surface/surfaceSession.js`, and `src/surface/surfaceWeather.js`.
- `src/main.js` and `src/render/threeRenderer.js` are cache/version-tag changes only; simulation behavior changes are isolated to app surface handoff/session plumbing and the surface profile/generator/renderer/weather/session modules.
- Therefore **53 protected source modules have zero mismatches**, including direct gravity, velocity-Verlet, ship dynamics, FRAME/transit/guard/insertion math, massive-pair/collision/impact hardening, celestial appearance/observer, planetary environment/properties/rotation, Observation Planner, save engine, backend policy, cockpit renderer, HUD/System Map, compact-object/cosmic systems, and experiment systems.

Archive-level verification is recorded below after release packaging.

## Release-candidate archive verification

- RC ZIP integrity: **PASS** (`unzip -t`).
- RC archive size: **398,668 bytes**.
- Clean extraction contains **137 files**.
- Clean-unzip `npm run qa`: **265/265 PASS**; static structure and JS/MJS syntax checks pass.
- Local HTTP shell/module smoke: **15/15 returned 200**.
- `.github/workflows/*`: **0 files**.
- Clean-extracted RC vs frozen worktree: **137 files, byte-for-byte identical**.

The final handoff archive is rebuilt from this frozen tree and rechecked independently before delivery.
