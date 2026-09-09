# Universe Lab v0.1.3 — QA Report

Release: **Particle Experiment Framework**

## Automated result

`npm run qa` passes completely.

- Static structure check: PASS
- JavaScript / MJS syntax checks: PASS
- Node test suite: **43 / 43 PASS**
- HTML ID / JavaScript selector audit: **0 missing references, 0 duplicate IDs**
- Static HTTP resource smoke: PASS (HTTP 200 for shell, CSS, main app, all three new particle modules, renderer)
- Generated-system long-run regression: PASS (8 seeds × 30 simulated days at 900 s steps; 0 spontaneous major-body swept collisions; max generated major-body count 18 in this sample)

## New v0.1.3 particle coverage

Tests now verify:

- typed spatial-hash cell insertion/retrieval,
- Gravity Cloud acceleration toward a major body under SI Newtonian gravity,
- experiment particles remain non-gravity-source test particles,
- Particle Life can birth an inactive slot from a valid neighboring population,
- sparse Species Forces neighbor work remains far below naïve N² pair counts,
- global particle-slot budget enforcement,
- 60× particle-active warp recommendation,
- Particle Gun inheritance of spacecraft velocity and forward launch direction,
- finite-radius major-body absorption of test particles,
- mode-specific mobile limits (including Species Forces clamp),
- fine particle modes consume a full three-second particle-safe frame interval without dropping simulation time.

## Retained regression coverage

The suite also retains the v0.1.2.1 baseline tests for:

- Newtonian gravity,
- velocity-Verlet orbital stability,
- deterministic/barycentric system generation,
- target orbital metrics and trajectory prediction,
- swept high-speed major-body collision detection,
- impact energy / angle / crater sanity / momentum conservation,
- bounded fragment generation and cascade suppression,
- body-color exposure-floor regression,
- ship basis/thrust/cruise integration,
- physical BRAKE behavior (no hidden damping),
- target-relative APPROACH/MATCH guidance,
- stopping-distance math and navigation warp safety.

## Indicative Node-side particle timings

These are development-machine/JIT timings only and are **not claims about iPhone performance**. Median of three warmed runs from the final code path:

| Mode | Slots | Simulated step | Indicative median |
|---|---:|---:|---:|
| Gravity Cloud | 5,000 | 1.0 s | ~0.62 ms |
| Gravity Cloud | 30,000 | 1.0 s | ~3.65 ms |
| Particle Life | 2,000 | 0.5 s | ~2.50 ms |
| Particle Life | 6,000 | 0.5 s | ~3.17 ms |
| Species Forces | 2,000 | 0.5 s | ~3.00 ms |
| Species Forces | 4,000 | 0.5 s | ~3.81 ms |

The mobile-first mode ceilings are intentionally below the 40,000 global slot budget for the more expensive artificial neighbor modes.

## Scientific integrity checks

v0.1.3 does not silently convert artificial rules into physical claims:

- Gravity Cloud / Particle Gun = physical test-particle trajectories under existing major Newtonian gravity.
- Particle Life = explicitly artificial continuous-3D cellular-automaton-inspired rules.
- Species Forces = explicitly artificial local attraction/repulsion using coarse spatial-cell aggregates.
- Experiment particles do not source long-range gravity.
- Global warp is capped to 60× while experiment fields exist so local simulation intervals remain resolved.
- High-count fields are session-local and intentionally excluded from schema-1 localStorage saves.

## Packaging/deployment checks required before release archive

The final ZIP must pass:

- repository files at ZIP root (no wrapper directory),
- ZIP integrity test,
- no `.github/workflows/*`,
- `index.html` / `package.json` / `VERSION.json` all report v0.1.3,
- Three.js remains pinned to 0.185.0.

## Remaining physical-device release gate

This environment cannot honestly substitute for the user's real iPhone Safari/WebGPU test. On-device validation should specifically check:

1. 5,000-particle Gravity Cloud visibility and FPS.
2. 2,000 → 6,000 Particle Life progression.
3. 2,000 → 4,000 Species Forces progression.
4. Particle Gun direction/spread and visible motion.
5. Particle fields remain in world space when the ship flies around/through them.
6. Active fields cap warp to 60× and APPROACH remains usable.
7. CLEAR PARTICLES removes fields and releases the particle warp cap.
8. Existing flight controls still long-press correctly on iOS.
9. Planet colors remain readable.
10. v0.1.2.1 impact fragment stability remains intact.

Do not claim a real interactive iPhone pass until those are physically tested.
