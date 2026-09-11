# v0.1.5.4.2 QA — Stellar Irradiance & Daylight Realism Polish

## Baseline recovery

- Authoritative input: `UniverseLab-v0.1.5.4.1-Planet-Moon-Realism-Polish-GitHub.zip`.
- Baseline SHA-256: `d3ce475dafe4bc8de016635f5ef1b0afca541422d13ea05bdf093423a3d588b1`.
- Input ZIP integrity: PASS.
- Baseline clean-extract QA before edits: **289/289 PASS**.
- Baseline identity: v0.1.5.4.1 / `PLANETREAL-1541` / save schema 1 / Three.js 0.185.0.

## v0.1.5.4.2 worktree gate

- Build identity: v0.1.5.4.2 / `IRRAD-1542`.
- `npm run qa`: **296/296 PASS** after integration and release-identity updates.
- New pure helper tests cover 1 L☉ / 1 AU reference flux, inverse-square physical ratios, luminosity scaling, HDR safety bounds, live body-star geometry, and reusable output records.
- Renderer integration tests confirm orbital reflected-body and surface daylight paths consume the same read-only irradiance bridge.
- 3,000 generated systems / **42,888 planet+moon** live-state samples: zero non-finite flux/ratio/display values; `S⊕` range about `1.068e-4` to `28.166`; display-gain range about `0.0103` to `5.0`; zero dim-floor clips and one bright-ceiling clip.
- Protected simulation diff: **empty** for `src/core`, `src/data`, `src/physics`, `src/navigation`, `src/experiments`, `src/cosmic`, and `src/surface`.
- Save schema remains **1**; Three.js remains **0.185.0**; forced-WebGL2 iPhone/iPad policy remains intact.
- `.github/workflows/*`: **0 files**.

## Release-candidate package verification

- Repository-root archive layout: **PASS** (147 files, no enclosing project folder).
- ZIP integrity test: **PASS**.
- Clean-extract `npm run qa`: **296/296 PASS**.
- Clean extracted tree matches the frozen release worktree byte-for-byte (excluding local `.git` metadata).
- Local static HTTP smoke: **PASS** for `index.html`, `src/main.js?v=1542`, and `src/render/stellarIrradiance.js` (HTTP 200).
- No `.github/workflows/*` files are present in the clean package.

## Scientific / rendering boundary

Physical stellar flux continues to use the existing canonical `stellarFluxWm2()` equation (`L / 4πr²`). `stellarIrradiance.js` exposes that exact physical flux plus `S⊕`; only the display gain uses `sqrt(S⊕)` with extreme safety bounds. Eclipse visibility, terminator geometry, atmosphere optics and authoritative body state are not replaced or mutated.

Per-frame render paths reuse their irradiance output record so the new calculation does not create one result object per body per frame.

## Physical release gate

Automated tests cannot certify iPhone Safari/WebKit appearance. Physical acceptance should verify inner/Earth-flux/outer-world brightness ordering, retained close-orbit texture/terminator detail, eclipse darkening, landed daylight differences, cockpit readability, LAND/SAVE/LOAD/TAKEOFF, multi-touch release behavior and the `WebGL2 iOS` backend label.

---

# v0.1.5.4.1 QA — Planet & Moon Realism Polish

## Final worktree gate

- Baseline: physically tested v0.1.5.4 `CELESTREAL-154`.
- `npm run qa`: **289/289 PASS**.
- Static structure: **55 required files**; all JS/MJS syntax checks PASS.
- Save schema remains **1**; Three.js remains **0.185.0**; iPhone/iPad WebKit forced-WebGL2 policy unchanged.
- No `.github/workflows/*`.

## Independent profile/state audit

- 3,000 generated systems / **42,633 planet+moon profiles** checked across far/resolved/close/huge apparent-angle samples.
- Zero invalid/non-finite close-detail profiles.
- Maximum close-detail repeat: **24×** longitudinal; maximum normal-strength ramp **0.62**; maximum exposure-relief term **0.178955**. All are explicitly bounded presentation values.
- Independent 1,000-seed baseline-vs-v0.1.5.4.1 universe comparison: **17,247 bodies, zero authoritative-state mismatches** across tested identity/kind, mass/radius, parent/orbit fields, Float64 position/velocity and rotation metadata.

## Source protection audit

- Baseline source modules: **63**.
- **58/63 are byte-for-byte unchanged**.
- Changed source allowlist only: `src/app/app.js`, `src/main.js`, `src/render/celestialFactory.js`, `src/render/celestialRealism.js`, `src/render/threeRenderer.js`.
- `app.js` / `main.js` changes are build/cache/startup identity only. Functional changes are isolated to celestial rendering and render-texture disposal/exposure handling.
- Core gravity/integrator, FRAME, collisions/impacts, atmosphere optics, planetary environment, surface generation/profiles/session/weather, landing/takeoff, saves, cockpit layout and backend policy remain unchanged.

## Scientific/rendering boundary

- The close planet/moon normal/roughness layer is a deterministic appearance proxy, not solved global topography/mineralogy.
- It preserves the existing v0.1.5.4 global map and activates only at close apparent size; gas giants do not receive rocky/ice micro-relief.
- Large-disk exposure adaptation changes camera presentation only, not canonical photometry/science.
- Black-hole disk smoothing adds a continuous radial-temperature/Doppler-asymmetric visual layer; shadow/critical-curve/ISCO ratios remain GR-informed cues, but background rays are not geodesically traced and accretion is not GRMHD.

---

# v0.1.5.4 QA — Celestial Rendering & Relativistic Object Realism

## Final worktree gate

- `npm run qa`: **288/288 PASS**.
- Static structure: **55 required files**.
- All JS/MJS syntax checks: PASS.
- Save schema remains **1**; Three.js remains **0.185.0**; iPhone/iPad WebKit forced-WebGL2 policy unchanged.
- No `.github/workflows/*`.

## Independent realism/property audit

- 3,000 generated systems / **44,337 modeled planet/moon/rogue worlds**.
- Gas-envelope profiles: **5,488**. Ice/rock profiles: **6,240**.
- Zero invalid/non-finite profile failures.
- Rotational flattening remained bounded in `[0, 0.13]`; max reached the explicit gas-giant presentation cap **0.13**.
- 3 M☉ black-hole diagnostic: Schwarzschild radius **8,860.018 m**, shadow reference **2.598076 Rs**, non-spinning ISCO **3 Rs**.
- 1.55 M☉ / 12 km magnetar diagnostic: compactness **0.381473**, gravitational redshift **0.271513**, light-cylinder radius **229,024,568 m** at 4.8 s spin.

## Baseline compatibility

- Exact baseline: physically accepted `v0.1.5.3.1 / INPUTREL-1531`.
- Baseline source modules: **62**; v0.1.5.4 source modules: **63**.
- **58 protected baseline source modules are byte-for-byte unchanged**, zero mismatches.
- Changed baseline source modules: `src/app/app.js`, `src/main.js`, `src/render/celestialFactory.js`, `src/render/threeRenderer.js`.
- Added: `src/render/celestialRealism.js`.
- `app.js` / `main.js` changes are build/cache/startup identity only. Functional behavior is isolated to the celestial renderer/factory plus the new read-only realism model.
- Independent 1,000-seed baseline-vs-v0.1.5.4 comparison: **17,254 bodies, zero mismatches** across tested identity/kind, mass/radius, parent/orbit metadata, Float64 position/velocity, rotation metadata and environment version metadata.

## Release-candidate archive gate

- RC archive: `UniverseLab-v0.1.5.4-Celestial-Rendering-Relativistic-Object-Realism-GitHub-RC.zip`.
- ZIP integrity: PASS.
- Clean-unzip `npm run qa`: **288/288 PASS**.
- Local HTTP/module smoke: **15/15 returned 200**, including `celestialRealism.js`.
- `.github/workflows/*`: none.
- Extracted RC tree: **144 files, zero byte mismatches** versus frozen worktree.
- RC SHA-256 before QA-report evidence update: `ffa3431f72671300959fce2ee8ec218b627e8fee73663857bb70596c72694516`.

## Scientific boundary

- Near-orbit planet/moon textures are deterministic visual albedo/relief proxies derived from canonical environment metadata; no global mineralogy/topography solver is claimed.
- Rotational oblateness is a bounded first-order hydrostatic visual proxy.
- Black-hole visuals use GR-informed Schwarzschild shadow/critical-curve/ISCO ratios on an enlarged readability scale, but **do not** ray-trace background null geodesics and **do not** solve GRMHD accretion.
- Neutron-star compactness/redshift/light-cylinder diagnostics are derived; dipole lines, beams and magnetar reconnection arcs remain presentation proxies without plasma/radiation transport.
- Core Newtonian gravity, velocity-Verlet, FRAME, collisions/impacts, atmosphere science, surface exploration, saves and WebKit backend remain unchanged.

# v0.1.5.3.1 QA — Surface Input Release & Version Identity Hotfix

- Baseline: exact frozen v0.1.5.3 `ATMOSKY-153` archive. Baseline QA: **276/276 PASS**.
- Final-version worktree QA: static structure **54 required files**, all JS/MJS syntax PASS, **279/279 tests PASS**.
- New regressions: per-control target-touch-aware `touchend` / `touchcancel` release fallback; all-touches-up + `pagehide` force-neutralization; sign-safe shared-axis surface direction releases. Static check now verifies the exact visible top-left `v0.1.5.3.1` badge.
- Source protection audit: v0.1.5.3 baseline contained 62 source JS modules; **59/62 are byte-for-byte unchanged**. Only `src/app/app.js`, `src/main.js`, and `src/render/threeRenderer.js` differ. `main.js` and `threeRenderer.js` are cache-tag-only; functional runtime changes are isolated to hold-input lifecycle handling in `app.js`.
- No changes to atmospheric optics, celestial appearance, N-body gravity/integrator, FRAME, collision/impact physics, planetary environment, surface generation/profiles/session/weather, landing/takeoff, save schema, cockpit presentation, or WebKit backend policy.
- RC archive: 141 files, 415,260 bytes, SHA-256 `3f9b2dd9459481dcee903cacbcfd1037e3608c2281ef30c2383f0de0b0b56fcd`; ZIP integrity PASS; clean-unzip QA **279/279 PASS**; HTTP/module smoke **15/15 PASS**; no `.github/workflows/*`; extracted RC byte-for-byte matches frozen worktree.
- Physical iPhone Safari remains the release gate for the original symptom: hold/release FORWARD repeatedly, test two-finger LOOK+WALK, drag/release outside the button, and verify no movement/highlight stays latched.

---

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
