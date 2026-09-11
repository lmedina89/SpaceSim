# Universe Lab v0.1.4.7 — Planetary Rotation / Continuous Surface Astronomy iPhone Gate

Before accepting this release on physical iPhone Safari:

1. Confirm HUD version **v0.1.4.7**, build marker **ROTASTRO-147**, and SYSTEM DIAGNOSTICS still reports **WebGL2 iOS**.
2. LAND / DESCEND on the normal generated home planet and open surface DETAILS. Confirm **SKY TIME** advances while unpaused and **ROTATION** reports a finite period/direction instead of `STATIC FRAME`.
3. Note the sky time, remain landed for at least a minute, and confirm celestial time continues rather than freezing at touchdown. Local WEATHER time should also continue on its separate clock.
4. Turn around and verify the same star catalog remains continuous: no reseed/pop to a different pattern, no lower-hemisphere stars leaking through the ground, and no sudden Sun/planet jump at the landing handoff.
5. Leave the surface running long enough to observe at least subtle astronomical drift on a short-period generated world if practical. Daylight/twilight presentation should follow the live star altitude rather than a fixed landing-time light direction.
6. Tap PAUSE while landed. Confirm SKY TIME stops while local exploration/weather remains responsive; RESUME should restart celestial time. Surface warp must remain limited to **1×**.
7. SAVE while landed, reload, and confirm the same region/local player state returns and the body-fixed observer resumes without a sky discontinuity.
8. BOARD / TAKEOFF and confirm the surface framebuffer clears, the ship returns around the parent body's **current** advanced position, `ASCENT COMPLETE` follows the existing multi-frame orbital verification, and normal flight controls respond immediately.
9. Repeat LAND → TAKEOFF once without refresh. Watch specifically for stale surface frames, large sky jumps, runtime errors, or a spacecraft handoff displaced from the parent body.
10. Regress the accepted cockpit: four translucent MFDs, dedicated ENGINEERING / DIAGNOSTICS drawer, compact THRUST / REV / BRAKE controls, FRAME button, and real-physics APPROACH/BRAKE.
11. Regress FRAME isolation: FRAME may move only the spacecraft; it must not rewrite or drag celestial bodies.
12. Run the surface for several minutes and watch FPS/thermals. The full inertial star-catalog horizon reprojection is cadence-limited, but physical iPhone WebKit remains the performance gate.

The new rotation model is a rigid deterministic observer foundation. It does **not** yet claim atmospheric scattering, axial precession/nutation, tidal spin evolution, seasons, phase shading, eclipses/occultations, or aerodynamic surface flight.

## GitHub Pages deployment

Repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable must unzip directly into the repository root and contain no `.github/workflows/*` files. After upload/reload, confirm **v0.1.4.7**, **ROTASTRO-147**, **WebGL2 iOS**, advancing surface SKY TIME, a finite ROTATION readout, the translucent four-MFD cockpit, dedicated engineering drawer, compact thrust controls, and the FRAME button. If an older marker appears, Safari/GitHub Pages is serving stale files.

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
