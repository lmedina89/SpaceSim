# Universe Lab v0.1.2.1 — QA Report

## Release

**Impact Stability & Scientific Flight Navigation Polish**

This build is derived directly from the physically tested v0.1.2 baseline. It is a focused repair/polish release for (1) runaway resolved-fragment cascades/performance and (2) impractical manual travel/time-warp control.

## Automated result

`npm run qa` — **PASS**

- static repository structure check: PASS
- all JavaScript/MJS `node --check`: PASS
- Node numerical/unit tests: **34/34 PASS**

### New v0.1.2.1 regression coverage

- stopping distance uses `v²/(2a)`
- MATCH VELOCITY acceleration is target-relative and capped
- far APPROACH accelerates toward target within the selected engine cap
- high-speed near-target APPROACH commands braking
- BRAKE produces bounded acceleration opposite inertial velocity rather than deleting velocity
- auto-warp recommendation collapses near precision-sensitive target states
- simplified 1 Gm APPROACH regression reaches the configured stand-off without target crossing in ~32 real-time-equivalent seconds using automatic 600×/60× guidance warp
- CRUISE engine integrates the declared 120 m/s² acceleration
- setting the BRAKE flag alone no longer damps velocity inside ShipDynamics
- same-family impact fragments are collision-filtered
- fresh impact fragments honor collision grace
- secondary resolved-fragment impacts can be resolved with zero new gravity fragments
- primary planet-impact resolved fragment mass remains <= about 8% of impactor mass and <= 2 bodies

### Retained science regressions

Gravity, velocity-Verlet orbit boundedness, seeded determinism/barycentric initialization, ship basis, impact energy/Q_R, impact angle, crater sanity range, mass conservation, low-speed bounce momentum conservation, trajectory prediction, swept trajectory contact, renderer body-color exposure floor, and launcher radius tests all remain passing.

## Generated-system stress

Eight deterministic generated systems were each integrated for **30 simulated days** with 900 s major-body steps and swept collision monitoring.

Result:

- systems: 8
- simulated days/system: 30
- spontaneous major-body collisions: **0**
- maximum generated gravity-source count observed: **23**

This is a numerical stress check, not evidence of long-term astrophysical stability.

## Static browser-resource smoke

Local HTTP serving returned **200** for:

- `index.html`
- `styles.css`
- `src/main.js`
- `src/app/app.js`
- `src/physics/flightComputer.js`
- `src/physics/impactResolver.js`
- `src/render/threeRenderer.js`

HTML/control audit:

- unique HTML IDs: PASS
- JavaScript `#id` references missing from shell: **0**

## Impact-stability architecture checks

- per-primary-event resolved fragment cap: **2**
- active resolved impact-fragment sub-budget: **16**
- secondary impact fragment generation: **0 new gravity fragments**
- same breakup-family recursive collision suppression: active
- fresh-fragment collision grace: active
- planet/moon resolved fragment mass share: approximately <= 8% of projectile mass
- unresolved mass remains represented through target accretion under the current approximation
- resolved fragment minimum render size reduced substantially from v0.1.2
- simultaneous impact presentation effects bounded to prevent additive flash accumulation

## Scientific flight checks

Declared propulsion:

- FLIGHT main acceleration: **20 m/s²**
- CRUISE main acceleration: **120 m/s²**
- FLIGHT reverse acceleration: **12 m/s²**
- CRUISE reverse acceleration: **72 m/s²**
- RCS: **6 m/s²**

BRAKE, MATCH and APPROACH create bounded acceleration vectors that are integrated by the spacecraft velocity-Verlet step. They do not directly edit position/velocity.

APPROACH uses a braking-safe target-relative desired-velocity envelope based on remaining distance and available acceleration. APPROACH/MATCH automatically select 600× / 60× / 1× simulated-time compression as appropriate and return control at 1× after guidance completes or is manually interrupted.

The propulsion model remains explicitly experimental/fictitious technology. The numerical kinematics are integrated; the drive technology is not claimed to represent an existing spacecraft propulsion system.

## Packaging/deployment checks

Final distributable must satisfy:

- GitHub repository files at ZIP root, no wrapper directory
- no `.github/workflows/*`
- Three.js pinned to `0.185.0`
- save schema remains `1`
- GitHub Pages mode remains `main` → `/(root)`

## Physical-device gate

Automated tests do **not** substitute for the user's real iPhone Safari/WebGPU test. The release gate remains physical verification of:

1. no long-press selection regression,
2. CRUISE/APPROACH feel practical,
3. auto-warp steps down before target overshoot,
4. manual takeover returns to 1×,
5. BRAKE/MATCH visibly reduce velocity over simulated time rather than instantly,
6. Chicxulub-class impact produces restrained large chunks rather than a fragment-body cascade,
7. major-body count stays far below the direct 128-source ceiling after the impact settles,
8. FPS recovers after impact effects expire,
9. planet colors remain readable on iPhone WebGPU.

No automated interactive 3D/browser playthrough is claimed for this release.
