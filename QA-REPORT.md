# Universe Lab v0.1.4.4.1 — Surface HUD & Mobile Exploration Polish QA Report

## Build identity

- Source checkpoint: v0.1.4.4 Planetary Environments & Surface Weather
- Build marker: **SURFHUD-1441**
- Save schema: **1** (unchanged)
- Three.js: **0.185.0** (unchanged)
- GitHub Pages: branch-root compatible

## Automated status

- `npm run check`: passed
- Node syntax checks: passed for all JS/MJS source/tests
- `npm test`: **106/106 passing**

New coverage verifies compact-by-default surface HUD state, persistence of expanded/collapsed preference, correct placement of scan/sprint vs save/takeoff controls, plus all inherited landing-region, weather, parked-ship, cockpit, surface, physics and navigation behavior.

## Protected behavior

The build does not replace the Newtonian solver, velocity-Verlet integration, spacecraft dynamics, BOOST/TRANSIT separation, observation-camera isolation, collision/impact model, cosmic discovery layer, stellar rendering, space-weather CME timeline, surface renderer, weather state machine, parked ship or save schema. The update is limited to surface presentation/UI state.

## Browser/device gate

Automated source/unit QA cannot substitute for physical WebGPU/mobile acceptance. Release gate remains iPhone Safari for touch controls, safe-area layout, weather visibility, parked-ship scale, sustained FPS and thermals.
