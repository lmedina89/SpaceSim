# Universe Lab v0.1.4.6.1.3.1 — Cockpit MFD / Engineering iPhone Gate

Before accepting this release on physical iPhone Safari:

1. Confirm HUD version **v0.1.4.6.1.3.1**, build marker **MFDENG-146131**, and SYSTEM DIAGNOSTICS still reports **WebGL2 iOS**.
2. Confirm the right-side **SYSTEM DIAGNOSTICS** MFD is in the same accepted ship-mounted position as v0.1.4.6.1.2. It must not have been moved to solve the control overlap.
3. Confirm THRUST / REV / BRAKE are materially smaller/lower on iPhone landscape and no longer cover the diagnostics screen. They must remain easy to tap and release reliably.
4. Confirm NAV / FLIGHT / SCIENCE / SYSTEM DIAGNOSTICS are all slightly see-through while their text remains easy to read against a dense starfield or bright planet.
5. Confirm the diagnostics cyan edge no longer masks the right/lower telemetry and the physical projector rail reads outside the display glass.
6. Tap SYSTEM DIAGNOSTICS and confirm the dedicated **ENGINEERING / DIAGNOSTICS** read-only drawer opens; it must not reopen Flight/System. Tap the center FLIGHT MFD and confirm Flight/System still opens there.
7. Confirm the bottom primary strip reads **LAB · TARGET · SCAN · APPROACH · FRAME · WARP** and still fits the landscape safe area.
8. Select a distant body, tap **FRAME** once, and confirm FRAME engages without holding a finger down. The button should show **FRAME ON** and the FLIGHT MFD should switch to FRAME status.
9. While FRAME is active, verify the target distance falls rapidly, the display reports a FRAME rate/ETA rather than pretending the coordinate rate is ordinary ship km/s, and WARP remains 1×.
10. Tap **FRAME** again before arrival. Confirm it disengages, target-relative velocity becomes near zero because the spacecraft matched the target inertial velocity, then ordinary gravity begins affecting the spacecraft again.
11. Repeat and allow automatic arrival. Confirm the ship stops outside a safe observation envelope rather than flying through the target.
12. With the simulation running, watch another body/orbit while FRAME is active if practical. Celestial motion/gravity must continue normally; FRAME must not drag, freeze, reposition or velocity-match any body.
13. Exercise a route that crosses another massive-body guard if available and confirm FRAME drops out before crossing rather than tunneling through it. A safety dropout preserves local spacecraft velocity instead of target matching.
14. Reproduce the >0.1c Newtonian model-limit pause using BOOST/time acceleration if desired. While paused, select a safe target and engage FRAME; the spacecraft should be able to translate/recover while the paused simulation clock does not advance. After FRAME matches the target frame, RESUME should return to ordinary physics.
15. Regress real-physics **APPROACH**, STOP RELATIVE, BRAKE, FLIGHT/CRUISE/BOOST, LOOK, the three primary MFDs, the diagnostics MFD touch action, COCKPIT OFF/restore, OBSERVE, and LAND → TAKEOFF.
16. Run for several minutes and watch for MFD clipping, bottom-bar crowding, stuck touch state, runtime errors, stale surface frames, transparent-screen artifacts, or sustained FPS/thermal regression.

FRAME DRIVE is explicitly fictional and spacecraft-only. Physical acceptance must confirm both sides of that boundary: convenient travel for the ship, no rewrite of celestial mechanics.

## GitHub Pages deployment

Repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable must unzip directly into the repository root and contain no `.github/workflows/*` files. After upload/reload, confirm **v0.1.4.6.1.3.1**, **MFDENG-146131**, **WebGL2 iOS**, the translucent four-MFD cockpit, slim diagnostics edge, dedicated engineering drawer, compact thrust controls, and the FRAME button. If an older marker appears, Safari/GitHub Pages is serving stale files.

Automated QA cannot prove physical iPhone WebKit presentation, touch ergonomics, thermal behavior, or the subjective cockpit layout. Physical Safari remains the release gate.

---

## v0.1.4.6 physical sky-continuity gate

1. Confirm **WebGL2 iOS** remains visible; this release does not re-enable native WebGPU on iPhone/iPad.
2. In orbit, frame the Sun and at least one major planet/moon against a recognizable star pattern.
3. LAND / DESCEND without changing time; during descent and after landing, verify those objects remain in consistent directions and no new star pattern appears.
4. Turn 90°/180° on the surface; the sky must respond to heading, with objects below the local horizon hidden.
5. Verify daylight/weather can wash stars out but returning darkness/clear visibility does not produce a reseed.
6. BOARD / TAKEOFF and confirm the orbital sky returns continuously and flight controls respond.
7. Repeat LAND → TAKEOFF once without refresh, then repeat after a schema-1 surface SAVE/LOAD.
8. Spawn two magnetars and confirm they appear separated and move under Newtonian gravity; do not expect magnetic attraction/repulsion.
9. Watch FPS/thermal behavior for several minutes in iPhone landscape and capture any stale surface, sky jump, missing Sun, runtime error or sustained regression.

Automated QA cannot establish physical WebKit presentation, touch behavior, thermal performance or visual continuity. Physical iPhone Safari remains the release gate.

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
10. Regress FRAME, weather continuity, stellar close approach and the existing lab/COSMOS systems.

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

## v0.1.4.5.4 renderer-isolation + landing-cycle acceptance

1. Fresh ORIGIN-001 → LAND / DESCEND and confirm the ship visibly descends before controls unlock.
2. Walk more than 36 m from the spacecraft; DETAILS should show RETURN TO SHIP and TAKEOFF must stay locked.
3. Return within 36 m; BOARD / TAKEOFF should enable.
4. Start ascent and confirm movement/scan controls lock while the ship visibly lifts with VTOL effects.
5. At ascent completion, confirm the surface framebuffer disappears immediately and the restored orbital cockpit is the first visible committed frame; `ASCENT COMPLETE` must not appear while surface terrain is still on screen.
6. Confirm the ship controls respond at safe orbit/1×, then immediately LAND / DESCEND again and confirm the second surface session loads normally with no freeze.
7. Repeat after SAVE/LOAD from the surface.
8. Inspect the rebuilt ship exterior for clipping/sinking and verify nav/strobe/landing lights and landing gear remain performant on iPhone.

For this build, first confirm the renderer badge is **WebGL2 iOS**. Successful physical takeoff must also show the temporary green diagnostic reaching **ORBIT VERIFIED · surface=OFF · render=SPACE · run=YES · input=YES** *and* the canvas itself must visibly present the orbital scene. Confirm THRUST, REV, BRAKE, LOOK and at least one RCS control respond immediately after ascent. If the old surface image remains while the HUD says WebGL2 iOS, record a screenshot; that would falsify the native-WebGPU-only hypothesis and move the next repair toward shared-renderer teardown/presentation timing.
