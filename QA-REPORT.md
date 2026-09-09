# Universe Lab v0.1.4.6.1.2 — Integrated Cockpit Diagnostics MFD QA Report

## Release identity

- Version: **0.1.4.6.1.2**
- Build marker: **DIAGMFD-14612**
- Direct baseline: **v0.1.4.6.1.1 — Cockpit Ergonomics, Lighting & Menu Cleanup Polish**
- Baseline archive SHA-256: `71ae17948cd72b07fd38b88adaa8d669bee5940ad2c3db48e647c6eb6d4436b3`
- Save schema: **1**, unchanged
- Three.js: **0.185.0**, unchanged
- Deployment target: GitHub Pages branch root
- Physical release gate: iPhone Safari/WebKit

## Implemented scope

This release moves the always-on ship-view debug/performance presentation into the cockpit instead of leaving it spread across the canopy.

- Added a fourth camera-attached CanvasTexture MFD: **SYSTEM DIAGNOSTICS**.
- Added a slim procedural right-side physical mount/rail and translucent screen material.
- Live monitor fields: renderer backend, FPS, physics ms, render ms, ship speed, simulation time, seed, major-body count, test-particle count, draw calls, prediction ms, experiment particle count and experiment ms.
- Existing top stat cards and the SEED/MAJOR/TEST/DRAW/PRED/EXP/LAB strip are hidden only while the 3D cockpit is active.
- Compact target ribbon remains visible in ship view and is shifted into the cleared top area.
- Tapping SYSTEM DIAGNOSTICS routes to the existing Flight/System drawer.
- No generated reference image or external cockpit asset is included in the distributable.

## Protected systems / non-goals

Unchanged:

- direct Newtonian gravity / velocity-Verlet integration
- `ShipDynamics` authority and propulsion values
- observer / inertial star catalog / sky continuity
- ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT lifecycle and recovery
- fixed-time landed orbital boundary
- save schema 1
- iPhone/iPad WebKit forced-WebGL2 policy
- BOOST / TRANSIT boundaries
- compact-object and magnetar physics boundaries
- surface weather/environment model

The diagnostics MFD is presentation and input routing only. It mirrors runtime values and owns no simulation state.

## Automated verification

- Exact v0.1.4.6.1.1 baseline SHA verified before editing: **PASS**.
- Baseline `npm run qa`: **151/151 PASS** before modification.
- Modified `npm run check`: **PASS**.
- Modified unit/regression suite: **152/152 PASS**.
- Local static HTTP resource checks for shell/CSS/main/app/renderer/cockpit/VERSION: **HTTP 200 PASS**.
- New cockpit regression verifies the fourth MFD, runtime telemetry wiring, top-HUD cleanup and diagnostics-screen action routing.
- Existing backend-policy, astronomical observer, landing/ascent, surface, navigation, transit, impact, compact-object and particle tests remain passing.
- Physical iPhone visual/touch/thermal acceptance remains required.

## Physical iPhone gate

Do not call v0.1.4.6.1.2 physically accepted until the user verifies the new right-side panel is fully visible and legible in landscape, does not collide with the SCIENCE MFD or thrust controls, the top canopy is materially cleaner, the telemetry values update correctly, and touch on the diagnostics MFD reliably opens Flight/System. Also verify COCKPIT OFF restores the ordinary top diagnostics fallback and that WebGL2 iOS remains active.
