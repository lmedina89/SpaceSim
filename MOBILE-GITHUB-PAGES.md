# Mobile GitHub Pages Deployment — Universe Lab v0.1.4.5.3

This archive is intended for direct repository-root upload from the existing iPhone workflow.

## GitHub Pages

Repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable contains no wrapper directory and no `.github/workflows/*` files.

## Confirm deployed release

After upload/reload verify:

- title/HUD says **v0.1.4.5.3**,
- MORE help shows **SHIPLAND-1453**,
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

## Surface-weather acceptance

1. In FLIGHT SCANNER, verify the landing-region selector lists Shatterfall Basin, Glasswind Flats and Frostscar Rise.
2. Land at Shatterfall and turn back toward the landing beacon; confirm the parked spacecraft exterior is visible and the HUD reports ship distance.
3. Stay on the surface for roughly 20–40 seconds; confirm the Weather/Wind/Surface clock fields update and a seeded weather change eventually appears.
4. Save during a non-clear event, reload, and confirm the same event resumes rather than rerolling.
5. Test at least one second region and confirm terrain/environment emphasis changes without a runtime `ERR`.
6. Check iPhone landscape thermals/FPS during dust/frost/lightning events; weather uses bounded point/line/sprite layers and must not cause sustained runaway draw cost.

## Compact surface HUD acceptance

- Land on Shatterfall in landscape and confirm the default surface HUD is a small top-right strip, not the full telemetry drawer.
- Confirm SCAN and SPRINT remain directly accessible.
- Tap DETAILS and confirm full telemetry plus SAVE and TAKEOFF / ORBIT appear without covering the WALK pad.
- Tap HIDE and confirm the compact strip returns.
- SAVE while expanded, reload the surface save, and confirm the expanded preference is restored.
- Confirm the smaller WALK pad remains comfortably thumb-usable inside the right safe area.

## v0.1.4.5.3 landing-cycle / live-flight orbital-handoff acceptance

1. Fresh ORIGIN-001 → LAND / DESCEND and confirm the ship visibly descends before controls unlock.
2. Walk more than 36 m from the spacecraft; DETAILS should show RETURN TO SHIP and TAKEOFF must stay locked.
3. Return within 36 m; BOARD / TAKEOFF should enable.
4. Start ascent and confirm movement/scan controls lock while the ship visibly lifts with VTOL effects.
5. At ascent completion, confirm the surface framebuffer disappears immediately and the restored orbital cockpit is the first visible committed frame; `ASCENT COMPLETE` must not appear while surface terrain is still on screen.
6. Confirm the ship controls respond at safe orbit/1×, then immediately LAND / DESCEND again and confirm the second surface session loads normally with no freeze.
7. Repeat after SAVE/LOAD from the surface.
8. Inspect the rebuilt ship exterior for clipping/sinking and verify nav/strobe/landing lights and landing gear remain performant on iPhone.

For this build, successful physical takeoff must also show the temporary green diagnostic reaching **ORBIT VERIFIED · surface=OFF · render=SPACE · run=YES · input=YES**. The returned view should face body-relative prograde rather than down into the planet. Confirm THRUST, REV, BRAKE, LOOK and at least one RCS control respond immediately after ascent.
