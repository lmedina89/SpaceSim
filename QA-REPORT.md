# Universe Lab v0.1.4.6.1.1 — Cockpit Ergonomics, Lighting & Menu Cleanup QA Report

## Release identity

- Version: **0.1.4.6.1.1**
- Build marker: **COCKPIT-14611**
- Direct baseline: **v0.1.4.6.1 — Interactive 3D Cockpit Visual Foundation**
- Baseline archive SHA-256: `a71bccccb1890b8cd82cee3b69f1fcad149fb498a34fc1c86cbf14683cb7e055`
- Save schema: **1**, unchanged
- Three.js: **0.185.0**, unchanged
- Deployment target: GitHub Pages branch root
- Physical release gate: iPhone Safari/WebKit

## Requested physical-feedback fixes

The v0.1.4.6.1 physical screenshot established that the cockpit concept and wide forward view were liked, but the horizontal glare-shield/dash geometry visually crossed the NAV/FLIGHT/SCIENCE MFD bank. This release is intentionally narrow:

- MFD faces/bezels are moved forward toward the pilot and raised enough to clear the dash top.
- The glare shield is thinner and remains behind the MFD faces.
- The redundant bottom **MORE** launcher is removed.
- The center **FLIGHT** MFD remains the single intended Flight/System entry, preserving the existing controls without duplication.
- A hidden-by-default **COCKPIT** restore failsafe appears only when the user deliberately disables the cockpit, preventing a persisted OFF preference from creating an inaccessible Flight/System path on phone.
- Restrained emissive console accents are added.
- Five small status lamps are live telemetry indicators rather than decoration: **POWER**, **TARGET**, **NAV**, **PROPULSION**, **CAUTION**.
- Cockpit lighting adds no `PointLight` or `SpotLight`; it uses emissive/basic materials only to limit mobile GPU cost.

## Functional cockpit contract preserved

- NAVIGATION MFD → System Map
- FLIGHT MFD → Flight/System drawer
- SCIENCE MFD → Science drawer
- MAP / TGT / APPR / ENG / PRO / RET / SCAN / SCI / OVR physical keys remain real actions
- Cockpit ray-picking still runs before celestial-body picking
- OBSERVE and surface modes still hide the cockpit
- Existing schema-1 `cockpitEnabled` preference remains backward-compatible
- Cockpit UI owns no physics, navigation, target, experiment, or save authority

## Protected systems / non-goals

This pass does **not** redesign or alter:

- direct Newtonian gravity
- velocity-Verlet integration
- `ShipDynamics` authority
- canonical astronomical observer / inertial star catalog
- fixed-time surface sky continuity
- landing/descent/ascent state machine and recovery
- accepted iPhone/iPad forced-WebGL2 renderer backend policy
- BOOST / TRANSIT model boundaries
- magnetar Newtonian behavior or placement
- surface generation/weather/anomaly physics boundaries
- save schema

## Automated verification

Final source-tree verification before packaging:

- `npm run check`: **PASS**
- static structure/import checks: **PASS**
- all JS/MJS `node --check`: **PASS**
- `npm test`: **151/151 PASS**
- cockpit-specific regression coverage includes:
  - MFD faces positioned in front of the glare shield
  - emissive-only live status lighting
  - absence of the bottom `moreToggle`
  - FLIGHT MFD still opening `morePanel` / Flight-System
  - cockpit restore failsafe present and bound
  - all original cockpit MFD/key action routes preserved
- iPhone/iPad backend-policy regression tests: **PASS**
- astronomical observer / sky-continuity regression tests: **PASS**
- landing/ascent handoff regression tests: **PASS**
- local static HTTP resource checks for shell/CSS/main/app/renderer/cockpit/VERSION: **HTTP 200 PASS**
- provisional clean-unzip repo-root QA: **151/151 PASS**
- ZIP integrity (`unzip -t`): **PASS**
- `.github/workflows/*`: **absent**

## Physical iPhone gate

Automated checks cannot establish the final on-device visual depth relationship between dashboard geometry and MFDs, touch ergonomics, WebKit presentation, sustained thermals, or whether the subtle lighting is aesthetically balanced.

Do not call v0.1.4.6.1.1 physically accepted until the user verifies:

1. **WebGL2 iOS** remains active.
2. all three MFD faces are fully readable with no horizontal cockpit bar slicing across them.
3. bottom **MORE** is gone while FLIGHT MFD still opens Flight/System.
4. the five primary bottom controls remain usable: LAB / TARGET / SCAN / APPROACH / WARP.
5. all three MFDs and nine cockpit keys still respond correctly.
6. cockpit status lights are subtle and state-responsive rather than distracting.
7. COCKPIT OFF exposes the small restore failsafe and restore works.
8. OBSERVE → SHIP VIEW remains correct.
9. LAND → TAKEOFF returns to visible controllable orbit without the stale-surface regression.
10. the wide astronomy view remains the dominant composition and FPS/thermal behavior stays acceptable.
