# Universe Lab v0.1.5.3 — Physical Atmosphere & Sky Optics QA Report

- Version: **v0.1.5.3**
- Build marker: **ATMOSKY-153**
- Baseline: **v0.1.5.2 / SURFEXP-152** (candidate baseline while physical iPhone testing continues)
- Save schema: **1 (unchanged)**
- Three.js: **0.185.0 (unchanged)**
- iPhone/iPad WebKit policy: **forced WebGL2 (unchanged)**

## Scope

Read-only atmosphere/sky presentation layer over the existing canonical planetary environment and astronomical observer. This release changes surface sky/extinction presentation and adds optional orbital atmosphere limbs; it does not change authoritative body generation, N-body state, FRAME math, landing/takeoff geometry, surface selection/generation/session/weather logic, save schema, or WebKit backend policy.

Scientific boundary: the optics model uses a pressure-scaled dry-air-like Rayleigh reference spectrum, a generic aerosol/Mie optical-depth proxy, hydrostatic scale height, Beer-Lambert direct extinction and bounded twilight/tangent-column approximations. It does **not** claim solved composition-specific refractivity, absorption bands, multiple scattering, refraction, polarization, cloud microphysics, greenhouse/climate, or full spherical radiative transfer.

## Automated QA / independent validation

- Frozen v0.1.5.2 baseline `npm run qa`: **265/265 PASS**.
- Final versioned v0.1.5.3 worktree `npm run qa`: **276/276 PASS**.
- Static structure: **54 required files PASS**; all JS/MJS syntax checks PASS.
- New atmosphere coverage: 7 optics unit tests + 4 ORIGIN/render integration tests; existing surface astronomical-sky and multi-world static regressions updated to assert the new authority boundary rather than obsolete `daylightFactor` source text.
- Independent **3,000-system / 44,048-world** optics sweep: 38,708 solids, 5,340 gas giants, 16,355 optically visible solid-world limbs, 3,000 exact-vacuum checks; **0 failures**, **0 non-finite output violations**, **0 vacuum-sky violations**, maximum limb scale **1.08**, maximum limb opacity **0.345**.
- Sweep hydrostatic scale-height range: ~**445.7 m to 957.99 km** across modeled solid environments; large low-gravity raw scale heights remain render-bounded by the separate atmosphere-shell cap.
- Independent **1,000-seed / 17,445-body** v0.1.5.2-v0.1.5.3 generator compatibility comparison: **0 mismatches** across tested identity/kind, mass/radius, parent/orbit fields, Float64 position/velocity, rotation metadata and environment-formation metadata.
- Source comparison: baseline has 61 source JS modules; worktree has 62. **56 baseline source modules are byte-for-byte unchanged**. Changed baseline modules are only `src/app/app.js`, `src/main.js`, `src/render/celestialFactory.js`, `src/render/surfaceWorld.js`, and `src/render/threeRenderer.js`; added module is `src/physics/atmosphericOptics.js`.
- `src/app/app.js` and `src/main.js` changes are version/cache/startup-message only. Functional runtime changes are isolated to atmosphere optics and its two renderer consumers plus the Three renderer synchronization bridge.
- Core generator/environment and multi-world surface data/session/weather modules are SHA-identical to v0.1.5.2: `systemGenerator.js`, `planetaryEnvironment.js`, `surfaceGenerator.js`, `surfaceProfiles.js`, `surfaceSession.js`, and `surfaceWeather.js` all match exactly.
- Therefore protected gravity, velocity-Verlet, ShipDynamics, FRAME/transit/guard/insertion, collisions/impacts, celestial appearance/observer geometry, planetary rotation, Observation Planner, save engine, landing transition, cockpit/HUD/System Map, WebKit backend, surface generation/session/weather, and environment formation remain unchanged.

## Release-candidate archive verification

- RC ZIP integrity: **PASS** (`unzip -t`).
- RC archive size: **412,155 bytes**; **140 files**.
- Clean-unzip `npm run qa`: **276/276 PASS**.
- Local HTTP shell/module smoke: **15/15 returned 200**, including the new `atmosphericOptics.js` module and both surface/space renderer consumers.
- `.github/workflows/*`: **0 files**.
- Clean-extracted RC vs frozen worktree: **140 files, byte-for-byte identical**.

The final handoff archive is rebuilt from this documentation-updated frozen tree and rechecked independently before delivery.

---

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
