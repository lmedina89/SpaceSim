# Universe Lab v0.1.4.7.1 — Surface Astronomy Diagnostics / Pause iPhone Gate

This hotfix sits on the already physically accepted v0.1.4.7 rotating-surface foundation. Before accepting v0.1.4.7.1 on physical iPhone Safari:

1. Confirm HUD version **v0.1.4.7.1**, build marker **ASTROHUD-1471**, and renderer **WebGL2 iOS**.
2. LAND, open **DETAILS**, and confirm the existing **Astronomy time** and finite **Body rotation** readouts still behave exactly as v0.1.4.7.
3. Confirm **Body-fixed lat/lon**, **Rotation phase**, **Primary star alt/az**, and **Local solar time** all show finite values rather than `—` on the normal generated landable planet.
4. Leave DETAILS open for 20–30 seconds. Rotation phase and primary-star coordinates should evolve continuously with Astronomy time; body-fixed lat/lon should remain stable while you stand at the same landing site.
5. Tap **PAUSE SKY** after touchdown. Astronomy time and rotation phase should stop changing. Walk around and verify local movement still works; local Weather time should continue.
6. Tap **RESUME SKY**. Astronomy time and rotation phase should resume from the held instant, without a star-catalog jump/reseed.
7. SAVE while landed, LOAD, and verify diagnostics return coherently. If saved while SKY is paused, the paused celestial state should restore and the button should show **RESUME SKY**.
8. BOARD / TAKEOFF and confirm the already accepted handoff remains clean: no stale surface frame, no velocity spike, immediate controls, and successful multi-frame orbital verification.
9. Regress the cockpit/FRAME path briefly. This hotfix must not alter the four MFDs, engineering drawer, FRAME isolation, APPROACH/BRAKE, or renderer policy.
10. Watch short-landscape layout: the extra two diagnostic rows and full-width SKY button must remain scrollable/readable without covering the WALK pad.

Interpretation: ALT is signed degrees above/below the local geometric horizon. AZ is degrees clockwise from local north toward east. Local solar time is derived from primary-star hour angle; `12:00 SOLAR` means the primary star is on the observer's local meridian, not necessarily overhead.

## GitHub Pages deployment

Repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable must unzip directly into the repository root and contain no `.github/workflows/*` files. After upload/reload, confirm **v0.1.4.7.1**, **ASTROHUD-1471**, **WebGL2 iOS**, advancing surface SKY TIME, a finite ROTATION readout, the translucent four-MFD cockpit, dedicated engineering drawer, compact thrust controls, and the FRAME button. If an older marker appears, Safari/GitHub Pages is serving stale files.

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
