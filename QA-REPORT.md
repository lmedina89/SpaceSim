# Universe Lab v0.1.4.8.2 — Impact & Numerical Hardening QA Report

## Release identity

- Version: **0.1.4.8.2**
- Build marker: **IMPNUM-1482**
- Save schema: **1 (unchanged)**
- Three.js: **0.185.0 (unchanged)**
- Baseline: exact v0.1.4.8.1 `SCICONS-1481` release ZIP

## Scope

This release addresses impact/collision correctness and numerical/performance hardening findings from the full v0.1.4.8 audit. The audited direct pairwise Newtonian gravity law and velocity-Verlet major-body integrator remain unchanged. v0.1.4.8.1 generator/rotation/save compatibility, v0.1.4.8 NAV/FRAME, surface astronomy/landing, and the iPhone/iPad forced-WebGL2 backend remain protected.

Implemented hardening:

- reusable flat previous-state collision snapshots;
- first swept finite-radius contact root with interpolated contact position/velocity;
- gas-world material normalization and no rocky crater estimate for gas giants;
- COM-frame representative fragmentation with target recoil, 3-D represented momentum conservation, and a bounded ejecta/recoil energy budget;
- mandatory black-hole collision sink with mass/momentum accretion and Schwarzschild-radius refresh;
- dynamically re-evaluated close massive-pair timestep ceiling;
- bounded fine-step minor-field cadence and source scratch reuse;
- one-way test-particle trajectory prediction with local/pair adaptive steps, reusable scratch, bounded work, and explicit `accuracyLimited` telemetry;
- numerical circular-CR3BP roots for L1/L2/L3, including comparable-mass binaries.

## Independent numerical validation performed during development

A randomized 2,000-impact stress check of fragment-resolution cases found represented mass conservation to about **2.2e-16 relative**, 3-D linear momentum conservation to about **4.0e-16 normalized relative**, and no represented ejecta/recoil kinetic-energy budget overrun beyond floating-point roundoff (worst ratio about **1.0000000000000002**).

A 500-generated-system timestep sweep left every ordinary generated system at the existing **300 s** major-body ceiling. A deliberately close pair of 1.55-solar-mass magnetars separated by 120,000 km reduced the pairwise ceiling to about **5.18 s**, demonstrating that the new limiter activates on pathological close LAB encounters without penalizing normal generated systems.

A server-side ORIGIN benchmark with roughly 4,000 minor test particles and 19 major sources over 120 calls at 1/60 simulation-second input measured an average of roughly **5.14 ms/call** on the old always-step path versus **1.77 ms/call** with the bounded 30 Hz fine-step cadence (60 actual particle updates). This is an environment-specific engineering benchmark, not an iPhone FPS guarantee.

Analytic swept-contact spot checks and permanent automated tests verify the first root is used rather than closest approach. Comparable-mass CR3BP regression verifies equal-primary normalized roots `L1 = 0`, `L2 ≈ +1.19840614455492`, and `L3 ≈ -1.19840614455492`.

## Numerical-model boundaries

- Contact state is interpolated assuming linear relative motion inside one completed global substep. The post-contact remainder is drifted ballistically; it is **not** a full event-driven N-body re-integration.
- Fragmentation is a bounded representative-body heuristic, not material hydrodynamics/strength/fracture/vaporization physics.
- Black-hole absorption is a Newtonian sink treatment with Schwarzschild-radius bookkeeping, not general relativity.
- Massive-pair adaptive stepping improves Newtonian resolution but does not make compact-object close encounters relativistically valid.
- Trajectory prediction is deliberately CPU-bounded; `accuracyLimited` means the requested horizon cannot honor the preferred numerical step within its work budget.
- Lagrange overlays remain instantaneous circular restricted-three-body diagnostics, not full N-body equilibrium solutions.

## Automated release gate

Release-candidate verification from the frozen v0.1.4.8.2 worktree:

- `npm run qa`: **PASS** — static structure **49 required files**, all JS/MJS syntax valid, **206/206** Node tests passing;
- ZIP integrity (`unzip -t`): **PASS**;
- clean-unzip `npm run qa`: **PASS**, **206/206**;
- local static HTTP smoke from the extracted archive: **14/14 HTTP 200** for the shell, versioned CSS/main/app/renderer/HUD/map/cockpit chain, collision/impact modules, new massive-pair step control, trajectory predictor, and `VERSION.json`;
- `.github/workflows/*`: **absent**;
- release archive is repo-root ready (no wrapper directory).

The final archive is rebuilt from this same frozen tree after recording this report, then the clean-unzip QA, HTTP smoke, archive integrity, workflow absence, and byte-for-byte tree comparison are repeated before handoff.

Physical iPhone Safari/WebKit remains the final presentation/performance gate.
