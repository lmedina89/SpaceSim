# Mobile GitHub Pages Deployment — Universe Lab v0.1.4.3.1

This archive is intended for direct repository-root upload from the existing iPhone workflow.

## GitHub Pages

Repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable contains no wrapper directory and no `.github/workflows/*` files.

## Confirm deployed release

After upload/reload verify:

- title/HUD says **v0.1.4.3**,
- MORE help shows **COCKPIT-1431**,
- FPS/physics/render telemetry populate in orbit,
- no `RUNTIME ERROR` banner appears.

If an older marker appears, Safari/GitHub Pages is serving stale files.

## v0.1.4.3 iPhone acceptance

1. Fresh `ORIGIN-001`: confirm the generated home planet is selected.
2. Press **LAND / DESCEND** from the near-orbital start position.
3. Verify surface HUD + movement pad fit iPhone landscape safe areas and the LOOK pad remains usable.
4. Hold/release every movement direction and SPRINT; verify movement always stops on release/cancel.
5. Walk toward the nearest surface signal and use **SCAN LOCAL** inside scan range.
6. Verify scanned POI reality text is readable and the HUD itself remains scrollable if space is tight.
7. Visit multiple anomaly types and verify terrain remains visible/readable beneath the effects.
8. SAVE on the surface, refresh/load, and verify local position + scanned POIs restore.
9. TAKEOFF / ORBIT and verify normal flight controls, System Map and 1× Newtonian flight return.
10. Regress TRANSIT, weather continuity, stellar close approach and the existing lab/COSMOS systems.

Container/Node QA cannot prove physical iPhone WebGPU FPS, touch feel, browser thermal behavior or final visual taste. Physical Safari remains the release gate.
