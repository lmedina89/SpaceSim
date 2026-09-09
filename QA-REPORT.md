# Universe Lab v0.1.3.1 — QA Report

Release: **Particle Framework + Navigation Arrival Safety Hotfix**

## Automated result

`npm run qa` passes completely.

- Static structure check: PASS
- JavaScript / MJS syntax checks: PASS
- Node test suite: **50 / 50 PASS**
- Save schema: **1 (unchanged)**
- Three.js pin: **0.185.0 (unchanged)**

## New v0.1.3.1 navigation coverage

The new regression set verifies:

- APPROACH no longer treats stand-off distance alone as completion,
- APPROACH transitions into persistent **HOLD** rather than releasing guidance,
- HOLD uses bounded counter-thrust to cancel selected-target gravity and settle target-relative position/velocity,
- propulsion-safe stand-off radius keeps target gravity within a reserved fraction of the selected drive authority,
- 3-solar-mass black-hole APPROACH from 10 Gm reaches HOLD without entering the Newtonian model limit or crossing the safe stand-off,
- the black-hole regression settles to <10 m/s residual target-relative speed,
- adaptive strong-gravity physics substep limits become smaller than the ordinary 300 s ceiling near Earth-like gravity,
- the Newtonian validity guard detects >10% c spacecraft speed,
- the black-hole near-field guard detects entry inside the configured Schwarzschild-radius boundary,
- SimulationClock honors caller-supplied adaptive substep ceilings,
- SimulationClock can stop remaining accelerated-time substeps immediately when a scientific-model validity boundary is reached.

## Retained v0.1.3 particle coverage

All Particle Experiment Framework tests remain green:

- typed spatial-hash insertion/retrieval,
- Gravity Cloud SI major-body acceleration and test-particle/non-source status,
- Particle Life birth behavior,
- Species Forces spatial-work reduction versus naïve N² work,
- global and mode-specific particle budgets,
- Particle Gun ship-velocity inheritance and forward direction,
- finite-radius experiment-particle absorption,
- particle-safe integration/warp behavior.

## Retained impact / flight / generation coverage

The suite continues to verify:

- Newtonian gravity,
- velocity-Verlet orbit stability,
- deterministic/barycentric system generation,
- swept high-speed major-body collision detection,
- impact energy / angle / crater sanity / momentum conservation,
- bounded representative fragmentation and cascade suppression,
- body-color exposure-floor regression,
- FLIGHT/CRUISE declared acceleration,
- physical BRAKE behavior with no hidden damping,
- trajectory prediction and orbital telemetry.

## Long-run generated-system regression

Eight deterministic generated systems were integrated for **30 simulated days** each at **900 s** major-body steps.

- spontaneous swept major-body collisions: **0**
- maximum generated major-body count in this sample: **20**

This is a regression check, not a claim that all seeds are indefinitely stable.

## Scientific boundary introduced by this hotfix

The renderer and guidance system must not disguise an invalid Newtonian solution as real relativity. v0.1.3.1 therefore pauses rather than clamping state when:

- ship inertial speed reaches **10% of c**, or
- the craft enters the black-hole near-field guard (**100 Schwarzschild radii**, with a **100 km minimum**).

These are model-validity boundaries, not physical barriers. General relativity remains future work.

APPROACH uses a propulsion-safe stand-off derived from the selected target's `GM/r²` field and active engine acceleration. On capture it keeps applying real bounded thrust in HOLD until manual input cancels guidance.

## Packaging/deployment checks required before release archive

Final packaging verifies:

- repository files at ZIP root (no wrapper directory),
- ZIP integrity,
- no `.github/workflows/*`,
- `index.html`, `package.json`, and `VERSION.json` all report v0.1.3.1,
- Three.js remains pinned to 0.185.0,
- static HTTP 200 smoke for shell/CSS/main/app/flightComputer/particle manager/renderer.

## Remaining physical-device release gate

The automated suite cannot substitute for the user's real iPhone Safari/WebGPU test. On-device validation should specifically check:

1. Target a normal planet and press APPROACH: APPROACH → BRAKING → CAPTURE → HOLD.
2. Once HOLD appears, leave controls untouched and confirm the target stays nearby instead of the ship flying away.
3. Touch THRUST/REV/BRAKE/RCS while holding; manual takeover should release HOLD and return warp to 1×.
4. Spawn a black hole, use CRUISE + APPROACH, and confirm the computer stops much farther out rather than diving toward the visual event horizon.
5. Confirm ship speed never numerically explodes to the hundreds of thousands of km/s seen in v0.1.2.1. If the 10% c limit is reached by another experiment, the simulator should visibly pause with a MODEL LIMIT message.
6. Re-test v0.1.3 Gravity Cloud / Particle Life / Species Forces / Particle Gun functionality and FPS.
7. Confirm v0.1.2.1 fragment restraint and planet-color readability remain intact.

Do not claim a physical iPhone pass until those are actually tested on-device.
