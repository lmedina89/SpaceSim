# Mobile GitHub Pages Deployment — Universe Lab v0.1.4.1.1

This archive is intended for direct repository-root upload from the existing iPhone workflow.

## GitHub Pages

Repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable intentionally contains **no `.github/workflows/*` files** and has no wrapper directory.

## Confirm the deployed release

After upload/reload verify:

- title/HUD says **v0.1.4.1.1**,
- MORE help shows **NAVLIFE-1411**,
- FPS/physics/render/ship telemetry populate,
- SIM TIME advances,
- no `RUNTIME ERROR` banner appears.

If an older marker appears, GitHub Pages/Safari is serving stale files.

## Recommended device validation

1. Normal SHIP VIEW for 15–30 seconds.
2. Cycle ENGINE to BOOST; THRUST should display **5,000**.
3. Test PROGRADE/RETROGRADE and verify only attitude changes.
4. Build sideways velocity, point elsewhere, engage TURN & BURN and watch the `V⃗` marker converge toward the reticle.
5. Select a distant target → MORE → TRANSIT DRIVE → 100 c → AUTO CAPTURE. Confirm distance collapses quickly without adding the transit rate to local ship km/s.
6. Confirm arrival hands off to BOOST-powered physical APPROACH/CAPTURE/HOLD.
7. Spawn Particle Life, request 3,600×, verify `LAB 60×` while it is alive.
8. Let it become COMPLETE/EXTINCT; verify the final FRAME remains visible and the requested high warp returns automatically.
9. REPLAY FIELD and verify the live 60× cap returns.
10. Recheck COSMOS, space weather, overlays, black holes/compact objects, impacts and normal particle experiments.

Container/Node QA cannot prove real iPhone WebGPU frame rate, touch feel or thermal behavior. Physical Safari remains the release gate.
