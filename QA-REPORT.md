# Universe Lab v0.1.4.4 — Planetary Environments & Surface Weather QA Report

## Build identity

- Source checkpoint: v0.1.4.3.1 Ship Cockpit View
- Build marker: **ENVWX-144**
- Save schema: **1** (unchanged)
- Three.js: **0.185.0** (unchanged)
- GitHub Pages: branch-root compatible

## Automated status

- `npm run check`: passed
- Node syntax checks: passed for all JS/MJS source/tests
- `npm test`: **104/104 passing**

New coverage verifies three deterministic landing regions, finite terrain and parked-ship sites, deterministic surface-weather timelines, save/load weather continuity, explicit separation of ordinary vs impossible weather classes, and inherited cockpit/surface/physics/navigation behavior.

## Protected behavior

The build does not replace the Newtonian solver, velocity-Verlet integration, spacecraft dynamics, BOOST/TRANSIT separation, observation-camera isolation, collision/impact model, cosmic discovery layer, stellar rendering, space-weather CME timeline or save schema. Surface weather is a local presentation state machine only.

## Browser/device gate

Automated source/unit QA cannot substitute for physical WebGPU/mobile acceptance. Release gate remains iPhone Safari for touch controls, safe-area layout, weather visibility, parked-ship scale, sustained FPS and thermals.
