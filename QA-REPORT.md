# Universe Lab v0.1.4.5.3 — Takeoff Flight Recovery Reliability Hotfix QA Report

## Release identity

- Version: **0.1.4.5.3**
- Build marker: **SHIPLAND-1453**
- Base: exact v0.1.4.5.2 archive (`681dd816fa5b0779e37f1f679379f158f3f6bb5019dace1aaca646d9193b6a2f`)
- Save schema: **1** unchanged
- Three.js: **0.185.0** pinned
- Deployment: GitHub Pages branch root
- Physical release gate: **iPhone Safari**

## Physically reported failure being targeted

v0.1.4.5.2 still failed the iPhone release gate. The ascent presentation ran, but the returned cockpit view appeared to remain at/near the planetary surface and the session felt frozen/unresponsive. A screenshot showed logical orbital telemetry with the planet dominating the returned view. The physical report therefore overrides the automated success of v0.1.4.5.2.

## v0.1.4.5.3 corrective scope

1. Return attitude is now body-relative **prograde**, not the steep planet-facing v0.1.4.5.2 camera pose.
2. Successful takeoff force-restores **running=true** and **1×** flight.
3. A registered hold-release mechanism force-clears WebKit pointer captures and neutralizes THRUST, REV, BRAKE, RCS, roll, LOOK and surface movement during the mode handoff.
4. Orbital handoff validation now includes live-running and neutral-input invariants.
5. `ASCENT COMPLETE` requires **three** successfully rendered orbital frames while simulation integration is held at zero dt for the verification window.
6. A failed post-render invariant recovers to a known live 1× orbital state instead of throwing into the global animation-loop fault latch.
7. A temporary on-screen diagnostic reports `surface`, `render`, `run`, `input` and verification-frame status for the physical iPhone test.

## Automated verification

- `npm run check`: **PASS**
- Static structure check: **PASS**
- JS/MJS `node --check`: **PASS**
- `npm test`: **119/119 PASS**
- New regression coverage verifies live-flight restoration, held-input clearing, prograde return-source logic, multi-frame verification and non-fatal handoff recovery.

## Physical acceptance sequence

The automated suite is not the release gate. On iPhone Safari test:

1. fresh load → land → board/takeoff;
2. diagnostic must progress from ASCENT/HANDOFF to **ORBIT VERIFIED · surface=OFF · render=SPACE · run=YES · input=YES**;
3. returned cockpit should face prograde/open space, not steeply down at surface terrain;
4. immediately test LOOK, THRUST, REV and BRAKE;
5. land again without refresh → takeoff again;
6. save while landed → reload → takeoff.

Do not call the takeoff bug physically fixed until those tests pass on-device.
