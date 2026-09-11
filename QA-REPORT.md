# Universe Lab v0.1.4.8 — Planetary System Navigation & Exploration QA Report

## Release identity

- Version: **0.1.4.8**
- Build marker: **NAVSYS-148**
- Direct baseline: **physically accepted v0.1.4.7.1 — Surface Astronomy Diagnostics & Pause Control Hotfix**
- Save schema: **1 unchanged**
- Three.js: **0.185.0 unchanged**
- Major-body physics: **direct Newtonian gravity + velocity-Verlet unchanged**
- Surface astronomy / landing / takeoff: **accepted v0.1.4.7.1 behavior preserved**
- iPhone/iPad WebKit policy: **forced WebGL2 backend retained**

## Navigation / system-map scope verified

- System Map now exposes the live generated **primary star → planets → moons** hierarchy from the authoritative body registry.
- `ORIGIN-001` regression fixture contains **1 primary star, 7 planets and 9 moons**; all are discoverable from the body catalog even when true scale makes graphical selection impractical.
- Added explicitly labeled **LOG SURVEY**, **TRUE SYSTEM**, and **TRUE LOCAL** projections. LOG SURVEY is a non-linear discovery aid; TRUE SYSTEM/LOCAL are linear X/Z projections of current N-body positions.
- Added read-only body diagnostics for parent, ship/star range, body class, physical radius/mass, Newtonian surface gravity, Kepler-period estimate, eccentricity, rigid rotation, Hill-radius diagnostic, surface capability, atmosphere-model status and FRAME arrival profile.
- Existing persistent `targetId` remains the single celestial NAV target. No duplicate target database or save-schema migration was introduced.
- COSMOS/phenomenon range display uses the phenomenon's current resolved center relative to the spacecraft rather than a stale/static position field.

## FRAME arrival / route scope verified

- FRAME remains an explicitly fictional spacecraft-only translation layer. Celestial integration authority is unchanged.
- Normal completed travel to supported planets, moons and rogue planets can hand back to ordinary Newtonian flight in an **instantaneous circular two-body osculating orbit** using `sqrt(GM/r)` relative speed plus the target's live inertial velocity.
- Insertion radius is outside the physical body and screened to at most **47% of a conservative Hill estimate** when a parent orbit is available. The conservative estimate uses the smaller of live separation and stored-orbit pericenter estimates. This is a screening heuristic, not a long-term N-body stability guarantee.
- All **16 ORIGIN-001 planet/moon targets** resolve a finite circular-insertion window in the automated fixture.
- Manual FRAME disengage preserves the pre-existing target inertial-velocity match; unsupported normal arrivals retain the prior inertial-match fallback.
- Direct FRAME travel remains protected by the existing per-step swept finite-radius guard.
- Added deterministic live-body-anchored guard detours for direct routes blocked by another massive body. Candidate two-leg paths are checked against every existing massive-body guard; no guard radius is reduced and no celestial state is moved.
- The known `ORIGIN-001` inner-moon case **Caelum-4361 b-A** reproduces the former direct collision at **99.918%** of the path against parent `Caelum-4361 b`; the new route selects a **1.18× guard-shell** parent-anchored bypass and both route legs test swept-clear.

## Protected-source comparison

The following scientifically or physically accepted baseline modules are byte-for-byte unchanged from v0.1.4.7.1:

- `src/core/constants.js`
- `src/data/systemGenerator.js`
- `src/physics/gravity/directGravitySolver.js`
- `src/physics/integrators/velocityVerlet.js`
- `src/physics/shipDynamics.js`
- `src/physics/transitDrive.js`
- `src/core/astronomicalObserver.js`
- `src/core/planetaryRotation.js`
- `src/render/surfaceWorld.js`
- `src/surface/surfaceGenerator.js`
- `src/surface/surfaceSession.js`
- `src/surface/surfaceWeather.js`
- `src/surface/landingTransition.js`
- `src/core/saveSystem.js`

The new navigation/FRAME logic derives from those authoritative states rather than replacing them.

## Automated QA

Final worktree `npm run qa`:

- Static structure: **PASS — 46 required files**.
- JS/MJS syntax: **PASS**.
- Node tests: **187/187 PASS**.
- Added coverage includes ORIGIN hierarchy/counts, navigation scientific derivations, conservative Hill screening, circular FRAME insertion invariants, target non-mutation, unsupported-target handling, FRAME manual-vs-normal exit policy, swept route safety, explicit `b-A` parent-bypass regression, and live-body waypoint anchoring.

## Physical release gate

Automated tests cannot validate iPhone Safari/WebKit touch ergonomics, Canvas/System Map readability, actual FRAME visual feel, renderer compositing, thermals, or a complete interactive trip. Physical iPhone testing remains required before v0.1.4.8 is accepted.

See `MOBILE-GITHUB-PAGES.md` for the release sequence, including the explicit **Caelum-4361 b-A SAFE BYPASS** test, planet/moon orbit insertion, target save/load persistence, and regression of the already accepted surface astronomy + takeoff path.

## Package validation

A repo-root candidate archive was created and tested as deployed content:

- ZIP integrity (`unzip -t`): **PASS**.
- Repository-root layout: **PASS** — `index.html`, `package.json`, docs and `src/` are at archive root; no wrapper directory.
- Clean-unzip `npm run qa`: **PASS — 187/187 tests**.
- `.github/workflows/*`: **none present**.
- Self-contained local HTTP smoke: **HTTP 200** for `/`, `styles.css?v=148`, `src/main.js?v=148`, `src/app/app.js?v=148`, `src/render/threeRenderer.js?v=148`, `src/render/cockpitView.js?v=148`, `src/ui/systemMap.js?v=148`, `src/navigation/systemNavigation.js`, `src/navigation/frameGuardRoute.js`, `src/physics/frameOrbitInsertion.js`, and `VERSION.json`.

The final distributable is rebuilt from the same frozen worktree after this report is written, then rechecked before release.
