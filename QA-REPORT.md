# Universe Lab v0.1.4.5.2 — Ascent Orbit Handoff Reliability Hotfix QA Report

## Build identity

- Source checkpoint: **v0.1.4.5.1 Landing Startup Reliability Hotfix**
- Build marker: **SHIPLAND-1452**
- Save schema: **1** (unchanged)
- Three.js: **0.185.0** (unchanged)
- GitHub Pages: branch-root compatible

## Reported physical failure addressed

On iPhone Safari, TAKEOFF could play the short ascent visual and switch the DOM/cockpit back to orbital presentation while the last surface framebuffer remained visible. The app then appeared frozen on the surface even though the lifecycle/UI had already claimed a successful orbital return.

The repaired path treats ORBIT as a commit state rather than the beginning of cleanup. Surface renderer/session/UI ownership is detached first; the ship/camera/1× state is restored and validated; the same animation callback then renders the normal orbital scene at zero simulation dt. `ASCENT COMPLETE` is emitted only after that orbital render succeeds.

## Automated status

- `npm run check`: passed
- Node syntax checks: passed for all JS/MJS source/tests
- `npm test`: **117/117 passing**

New targeted coverage verifies:

- clean orbital-handoff invariants pass only when surface/session/renderer/UI ownership is fully detached,
- stale surface ownership is rejected even when the lifecycle already says ORBIT,
- wrong camera/warp and non-finite ship state are rejected,
- the ascent-completion frame falls through to the orbital renderer in the same animation callback,
- success is committed only after the orbital render call, and
- surface renderer ownership is cleared before disposal.

## Protected behavior

The Newtonian solver, velocity-Verlet integration, local FLIGHT/CRUISE/BOOST propulsion, TRANSIT separation, collision/impact model, stellar rendering, cosmic discovery, space weather, anomaly generation, surface generation/weather, landed spacecraft geometry and save schema are not redesigned by this hotfix.

## Browser/device gate

Automated QA cannot prove the actual iPhone WebGPU/Safari transition. Physical Safari remains the release gate. Test in this order:

1. ORBIT → LAND / DESCEND → TOUCHDOWN.
2. BOARD / TAKEOFF and watch the ascent visual.
3. Verify the surface disappears immediately when ascent completes and the first visible frame is the restored orbital cockpit view.
4. Verify `ASCENT COMPLETE` appears only after that orbital view is visible.
5. Confirm flight controls respond and simulation state is not frozen.
6. Immediately LAND / DESCEND again, complete a second takeoff, and verify the cycle repeats.
7. Save on the surface, refresh/load, then take off and repeat the orbital-return check.

If physical Safari still fails, capture the visible `RUNTIME ERROR` message if one appears; v0.1.4.5.2 intentionally avoids claiming the device gate is passed until this is physically tested.
