# Universe Lab v0.1.2 QA Report

Date: 2026-09-08

## Result

Automated foundation QA: **PASS**.

Physical iPhone Safari remains the interactive release gate for WebGPU body-color readability, impact FX visibility, continuous touch controls, and real-device performance.

## Automated checks completed

### Static / syntax

- repository-root structure validated
- pinned Three.js 0.185.0 import verified
- v0.1.2 shell/package version alignment verified
- mobile VisualViewport and iOS hold-input protections retained
- impact preset controls present
- impact resolver module present
- renderer-independent body-color exposure floor present
- all JS/MJS files passed `node --check`
- HTML id → JS `querySelector` audit: 80 HTML ids, 46 unique referenced ids, 0 missing

### Numerical/unit tests

**22/22 passed**.

Coverage includes:

- solar gravity `GM/r²`
- reduced-mass impact energy
- `Q_R` / reduced-mass momentum telemetry
- head-on impact-angle convention
- Chicxulub-class crater estimate sanity range
- resolved-fragment mass budget
- represented gravitational-mass conservation through energetic impact response
- low-speed bounce linear-momentum conservation
- swept collision detection for a projectile crossing a target between endpoints
- one-year near-circular velocity-Verlet orbit boundedness
- launcher mass/density/radius relation
- circular osculating metrics
- deterministic PRNG
- WebGPU stellar-light + body exposure-floor regression
- spacecraft orthonormal basis with roll
- declared 20 m/s² main-thrust acceleration
- 60-second thrust delta-v/displacement regression
- deterministic seeded generation
- barycentric initial momentum
- metadata planet/moon counts
- bounded low-Earth trajectory prediction
- swept finite-radius predicted collision

### Generated-system stress

Eight deterministic systems were integrated for 30 simulated days using 900-second steps and the new swept major-body collision monitor.

- spontaneous generated-system collision events: **0**
- maximum generated major-body count observed: **25**

This is a regression/stability sample, not a proof that every possible seed is stable indefinitely.

### Static HTTP smoke

Local static HTTP requests returned 200 for:

- `index.html`
- `styles.css`
- `src/main.js`
- `src/app/app.js`
- `src/physics/impactResolver.js`
- `src/render/threeRenderer.js`

## Scientific-model checks

- authoritative physics remains SI / Float64
- direct mutual Newtonian gravity retained
- velocity-Verlet retained
- save schema remains 1
- impact FX are visual-only and cannot add mass/forces
- resolved fragments obey the current direct-gravity source budget
- unresolved fragment mass is accreted into the surviving authoritative target rather than double-counted as visual debris
- crater model is explicitly documented as scaling-law approximation, not hydrocode
- black-hole trajectories remain explicitly Newtonian

## v0.1.2 impact-specific notes

### Swept contact

The live collision monitor now checks minimum pair separation over the relative straight segment between pre-step and post-step positions. This substantially reduces high-warp/high-speed tunneling compared with endpoint-only overlap detection.

It remains an approximation because the actual trajectories curve continuously under gravity during a long step.

### Crater model

The implementation uses a Collins/Melosh/Marcus-style gravity-regime transient diameter relation and simple/complex final-diameter handling. Tests validate only numerical sanity and expected scale; they do not claim hydrocode accuracy.

### Fragmentation

A small number of fragments is intentionally resolved as full gravity sources. The partition model is heuristic and isolated for replacement by a future calibrated disruption model.

## Real-device checks still required

On deployed GitHub Pages / iPhone Safari:

1. HUD must read `v0.1.2`.
2. Caelum-4361 d should show its tan/orange seeded body color instead of a featureless black sphere.
3. Night-side contrast should remain visibly darker than the exposed/day side.
4. THRUST/REV/DAMP sustained holds must not trigger selection handles/callouts.
5. LAB impact presets must fit and remain editable.
6. A predicted asteroid contact should become a live resolved impact without tunneling at moderate warp.
7. Impact flash/ring/ejecta should be visible without obscuring the entire scene.
8. Scanner recorded-impact count and last-impact telemetry should update.
9. Save/load should preserve target `damageRecords`.
10. Real FPS/render/physics timing should be observed at 4k, 10k, and 20k minor particles.

## Packaging contract

The final distributable must:

- unzip directly into repository root
- contain no wrapper directory
- contain no `.github/workflows/*`
- pass ZIP integrity testing
- be suitable for GitHub Pages `main` → `/(root)` deployment
