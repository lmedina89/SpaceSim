# Universe Lab v0.1.4.1.1 — QA Report

## Release identity

- Version: **0.1.4.1.1**
- Release: **Navigation & Experiment Lifecycle Polish**
- Build marker: **NAVLIFE-1411**
- Save schema: **1**
- Three.js: **0.185.0**
- Deployment: GitHub Pages `main` → `/(root)`
- `.github/workflows/*`: intentionally absent from the mobile distributable

## Automated QA result

Final `npm run qa` result: **85/85 tests PASS**, plus static structure checks and `node --check` on all JS/MJS source/test files.

New navigation/lifecycle coverage includes:

- speculative BOOST produces exactly the declared bounded 5,000 m/s² acceleration,
- TURN & BURN stays acceleration-bounded and removes lateral velocity rather than rotating velocity by fiat,
- TURN & BURN recognizes an already-aligned inertial vector,
- TRANSIT tier normalization / coordinate-rate calculation,
- TRANSIT arrival envelope reserves enough real BOOST braking room for preserved local Δv,
- automatic transit tier step-down near destination,
- transit position integration cannot overshoot its arrival envelope,
- swept transit clearance catches a massive body crossed between real frames,
- transit engagement clearance blocks unsafe local starts,
- completed particle fields release the 60× manager warp cap without being deleted,
- completed fields retain the last live observation bounds,
- fields that go extinct before first observation derive a final frame from retained final particle positions rather than snapping to their spawn origin,
- deterministic REPLAY reconstructs the original active field state.

All prior gravity/orbit/impact/compact-object/cosmic/space-weather/overlay/particle/observation/runtime-fault regressions remain enabled.

## App method / DOM integrity

Static audit of `UniverseLabApp`:

- **66** class method definitions,
- **63** unique direct `this.method()` call names,
- **0 unresolved direct method calls**.

HTML / app selector audit:

- **165** HTML IDs,
- **165 unique**,
- **0 duplicates**,
- **116** direct app selector IDs,
- **0 missing selectors**.

The static suite explicitly requires the new velocity marker, PROGRADE, RETROGRADE, TURN & BURN, TRANSIT controls/drawer, REPLAY FIELD, `transitDrive.js`, v0.1.4.1.1 shell version and `NAVLIFE-1411` marker.

## Long-run seeded-system stress

Eight independently generated systems (`NAVLIFE-A` … `NAVLIFE-H`) were integrated for **30 simulated days each** with 900 s major-body steps using the live direct Newtonian gravity solver + velocity-Verlet integrator + swept finite-radius collision monitor.

Result:

- spontaneous finite-radius collisions: **0**,
- non-finite position/velocity states: **0**,
- largest sampled physical body count: **25**,
- rogue planets across sample: **5**.

This is a numerical regression/stability check, not a claim of long-term astrophysical formation stability.

## Static HTTP smoke

An in-process local static HTTP server returned **200** for:

- `index.html`
- `styles.css`
- `src/main.js`
- `src/app/app.js`
- `src/physics/transitDrive.js`
- `src/experiments/particles/particleExperimentManager.js`
- `src/render/threeRenderer.js`
- `src/ui/hud.js`

## Scientific separation checked

- FLIGHT / CRUISE / BOOST are bounded local accelerations applied to the real spacecraft state. BOOST is explicitly labeled speculative.
- PROGRADE / RETROGRADE change attitude only.
- TURN & BURN uses bounded acceleration to change the actual velocity vector.
- TRANSIT is explicitly fictional reference-frame translation; its displayed 1–1,000 c coordinate rate is **not** added to Newtonian spacecraft velocity and is not represented as GR/Alcubierre physics.
- AUTO CAPTURE hands transit arrival off to BOOST + the existing physical APPROACH/BRAKING/CAPTURE/HOLD controller.
- Particle warp safety is now tied to live particle work, not retained completed-field objects.

## Physical iPhone release gate

Container QA cannot prove iPhone WebGPU rendering, Safari pointer behavior, thermals or perceived navigation feel. Recommended device sequence:

1. Confirm **v0.1.4.1.1 / NAVLIFE-1411**, no runtime ERR, and normal HUD/sim time advances.
2. Cycle FLIGHT → CRUISE → BOOST. Manual BOOST should set warp to 1× and show THRUST 5,000.
3. Point away from the cyan velocity marker, press TURN & BURN, and confirm the marker moves toward the reticle while velocity changes over time rather than snapping.
4. Test PROGRADE and RETROGRADE.
5. Select a distant body, open TRANSIT, start at 100 c, and confirm local SHIP speed does not become 100 c.
6. Verify transit steps down near destination and AUTO CAPTURE hands off to BOOST + APPROACH without overshooting.
7. Request 3,600×, spawn Particle Life, confirm live field caps at 60×; after extinction confirm the final frame remains useful and 3,600× restores automatically. Test REPLAY FIELD.
8. Regress COSMOS, CME/overlays, black hole/compact objects, one impact and one physical comet.
