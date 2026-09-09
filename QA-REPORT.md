# Universe Lab v0.1.4.5 — Landing Reliability & Spacecraft Presence QA Report

## Build identity

- Source checkpoint: v0.1.4.4.1 Surface HUD & Mobile Exploration Polish
- Build marker: **SHIPLAND-145**
- Save schema: **1** (unchanged)
- Three.js: **0.185.0** (unchanged)
- GitHub Pages: branch-root compatible

## Automated status

- `npm run check`: passed
- Node syntax checks: passed for all JS/MJS source/tests
- `npm test`: **111/111 passing**

New coverage verifies the explicit landing transition lifecycle, duplicate-entry blocking, ascent locking/orbital reset, upgraded spacecraft/VTOL render tokens, boarding-distance gating, recovery integration, plus all inherited surface/weather/cockpit/physics/navigation tests.

## Protected behavior

The Newtonian solver, velocity-Verlet integration, local ship propulsion, BOOST/TRANSIT separation, collision/impact model, stellar rendering, cosmic discovery, space weather, anomaly generation and surface weather logic are not replaced. The exterior ship remains renderer-local and does not become a hidden gravity/rigid-body source.

## Browser/device gate

Automated QA cannot prove the actual iPhone WebGPU transition feel. Physical Safari must verify: visible descent, boarding gate, visible ascent, clean orbital return, immediate re-land eligibility, no freeze after a takeoff/landing cycle, ship proportions/lighting, safe areas, FPS and thermals.
