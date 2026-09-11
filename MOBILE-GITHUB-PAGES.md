# Universe Lab v0.1.4.9.1 — Observation Planner iPhone Gate

Before physically accepting `OBSPLAN-1491` on iPhone Safari/WebKit:

1. Hard reload and confirm **v0.1.4.9.1**, build **OBSPLAN-1491**, and **WebGL2 iOS**.
2. Open NAV, select a planet or moon, tap **PLAN OBSERVATIONS**, run the default 30-day search, and confirm the progress UI remains responsive rather than freezing touch/rendering.
3. Verify the planner says **BODY CENTER** in orbit and returns finite T+, angular separation, apparent-disk and coverage values. Tapping an event card should select that event body as the normal NAV target without moving anything.
4. Land on the detailed home world, open DETAILS → **PLAN SKY EVENTS**. The reference must switch to **CURRENT LANDED SITE** and event cards should include primary-star altitude / below-horizon status where applicable.
5. Run PAUSE SKY before a landed search if you want a stable start epoch; resume afterwards and confirm normal astronomy continues. If the live epoch advances substantially while results remain open, the planner should warn that timing is stale.
6. Try a 90/180-day search and cancel it once. Cancellation must leave live position/time/NAV/FRAME/surface state untouched.
7. Regress v0.1.4.9 appearance: phase/angular-size fields, dark planetary night side, surface finite star/body disks, no progressive fog darkening.
8. Regress FRAME including `Caelum-4361 b-A` SAFE BYPASS, save/load, and takeoff.

The planner is a predictive read-only numerical tool, not an automation that moves the ship to an event. Physical iPhone responsiveness/thermal behavior remains the release gate.

---

# Universe Lab v0.1.4.9 — Celestial Appearance, Phases & Eclipse Geometry iPhone Gate

Before accepting v0.1.4.9 on physical iPhone Safari/WebKit:

1. Hard reload and confirm **v0.1.4.9**, build marker **CELEST-149**, and renderer **WebGL2 iOS**. An older marker means Safari/GitHub Pages has mixed cached files.
2. In ORIGIN, open NAV/BODY CATALOG and select several planets/moons. **Observed angular diameter**, **Illuminated fraction**, and **Stellar shadow** must remain finite/sensible; a star should report self-luminous rather than a reflected phase.
3. FRAME toward a planet or moon and watch angular diameter. It should increase smoothly as physical range falls; the target marker must remain a UI aid rather than enlarging the physical disk. Regress normal planet insertion and the `Caelum-4361 b-A` **SAFE BYPASS**.
4. From space, inspect a planet/moon from several geometries. The bright hemisphere/terminator should face the live primary-star direction. Physical planets/moons should not glow uniformly from the night side.
5. LAND on the existing detailed world and open DETAILS. Verify **Primary star disk**, **Stellar occultation**, **NAV target phase**, and **NAV target angular size** update without breaking existing SKY TIME, ROTATION, LAT/LON, ALT/AZ, SOLAR time or PAUSE/RESUME.
6. Leave the dusty/foggy surface running for several minutes. Background/fog should react to lighting/weather but must not progressively darken merely because frames are accumulating. Watch FPS, render time and thermals.
7. If you can obtain a natural star/moon alignment, verify the nearer disk crosses in front of the stellar disk and the direct scene light dims with the reported stellar covered fraction. Do not manufacture a visual eclipse if geometry says NONE.
8. SAVE/LOAD while landed, then TAKEOFF. The accepted rotating-surface observer, appearance values and ascent handoff must remain continuous.
9. Regress an impact preset/close compact-object scenario briefly; v0.1.4.9 must not disturb the accepted v0.1.4.8.2 collision/timestep hardening.

Interpretation boundaries: phase/apparent-size/finite-disk overlap geometry is physical for the current spherical-body model. Space/surface brightness remains exposure-normalized presentation rather than calibrated photometry; the surface phase sphere is a Lambertian proxy; full Rayleigh/Mie scattering, atmospheric refraction, detailed albedo/BRDF, and multi-occulter disk-union eclipses are not modeled yet.

---

# Universe Lab v0.1.4.8.2 — Impact & Numerical Hardening iPhone Gate

Before accepting v0.1.4.8.2 on physical iPhone Safari/WebKit:

1. Confirm **v0.1.4.8.2**, build marker **IMPNUM-1482**, and renderer **WebGL2 iOS** after a hard reload. If an older marker appears, do not test; cached files are mixed.
2. Regress the normal `ORIGIN-001` path first: BODY CATALOG, LOG/TRUE maps, normal planet FRAME arrival, `Caelum-4361 b-A` SAFE BYPASS, manual FRAME exit, surface LAND, PAUSE/RESUME SKY, SAVE/LOAD, and TAKEOFF. This release must not disturb those accepted systems.
3. In LAB, spawn two neutron-star/magnetar-class compact objects at a close but non-overlapping separation if the UI permits it. Let them evolve and watch **physics ms / FPS / runtime error**. The new massive-pair limiter should trade additional physics work for stability instead of allowing a huge 300 s close-encounter step. Do not interpret the motion near relativistic regimes as GR.
4. Exercise an impact preset/asteroid collision. Verify the app records a finite impact and remains responsive; a swept fast impact must not visibly tunnel through and then resolve deep inside the target. The exact contact root is primarily automated-test validated because frame-rate presentation is not a precision measurement.
5. If a generated gas planet is used as an impact target, verify no rocky crater diagnostic is reported. Gas-envelope impact behavior remains simplified and does not model atmospheric entry/hydrodynamics.
6. Exercise any trajectory-prediction view available in the scanner/flight computer. Normal short predictions should remain responsive. A very long strong-gravity forecast may explicitly report **numerical step budget limited**; that warning is intentional and preferable to silently claiming false precision.
7. Run several minutes with the normal minor particle/debris field visible and watch FPS/thermals. The fine-step path should create less per-frame CPU/GC pressure; high-warp large substeps still update immediately, so do not expect a fixed 30 real-time-Hz rate at every warp.
8. Re-test one save/load cycle after impacts/LAB use and one fresh-system reset. No schema migration was introduced.

The distributable must unzip directly into repository root and contain no `.github/workflows/*`. Automated Node QA cannot prove iPhone WebKit presentation, thermal behavior, or touch ergonomics; physical Safari remains the release gate.

---


## Historical v0.1.4.8.1 scientific-consistency gate

Before accepting v0.1.4.8.1 on physical iPhone Safari/WebKit:

1. Confirm **v0.1.4.8.1**, build marker **SCICONS-1481**, and renderer **WebGL2 iOS**.
2. Load the existing v0.1.4.8/1.4.7.1 save and verify the landed surface remains at the same location/orientation, rotation diagnostics remain finite, save/load works, and takeoff remains clean. This specifically validates preservation of saved v1 rotation frames.
3. Start a fresh `ORIGIN-001` system and verify NAV still exposes the same star/7-planet/9-moon hierarchy and FRAME targeting/bypass behavior remains usable. Fresh body rotation values may differ because the corrected v2 spin model is intentional.
4. On a fresh system, inspect gas worlds in NAV for finite positive mass/radius/surface-gravity diagnostics and no UI regressions. Gas worlds remain non-landable.
5. Verify PAUSE SKY/RESUME SKY, surface astronomy time, landing/takeoff, cockpit MFDs, BODY CATALOG, LOG/TRUE map modes, normal planet/moon FRAME insertion, and the `b-A` SAFE BYPASS regression case still work.
6. Run several minutes in ship and surface views and watch FPS/thermals for regressions.

The distributable must unzip directly into repository root and contain no `.github/workflows/*`. If an older marker appears, Safari/GitHub Pages is serving stale files.

Before accepting v0.1.4.8 on physical iPhone Safari/WebKit:

1. Confirm **v0.1.4.8**, build marker **NAVSYS-148**, and renderer **WebGL2 iOS**.
2. Open **NAV / SYSTEM MAP** on a fresh `ORIGIN-001`. The BODY CATALOG must expose the primary star, all **7 planets**, and their **9 moons**; distant bodies must remain selectable even when not tappable at true scale.
3. Select several planets and moons from the catalog. Verify name/parent/range/radius/mass/gravity/orbit/rotation/Hill/surface/atmosphere fields remain finite and update while the simulation runs. Atmosphere must say unmodeled rather than inventing physics.
4. Compare map modes. **LOG SURVEY** must clearly say non-linear range. **TRUE SYSTEM** must show a linear X/Z whole-system geometry even though close inner structure may be visually compressed. Select a planet with moons and use **TRUE LOCAL**; its moon family should become usable at linear local scale.
5. Pick a distant planet, tap **SET NAV TARGET**, close/reopen NAV and verify the same live body remains the target. SAVE/LOAD and verify target persistence.
6. Use **FRAME TO TARGET** for a planet. The FRAME panel should advertise a circular arrival altitude. Allow FRAME to complete normally; the completion message should report **FRAME ORBIT INSERTION**, altitude and orbital speed.
7. Immediately inspect SCANNER orbital data after arrival. The target-relative state should be bound with near-zero radial speed / very low osculating eccentricity at insertion, then be allowed to evolve normally under full N-body gravity. Do not expect the full N-body trajectory to remain perfectly circular forever.
8. Repeat the normal completed FRAME trip to a **moon**, preferably using TRUE LOCAL to select it. Verify its parent planet remains geometrically coherent and the ship enters an orbit around the moon rather than merely matching the moon's inertial velocity.
9. Specifically select the tight inner `ORIGIN-001` moon **Caelum-4361 b-A** from the normal starting region and engage FRAME. The FRAME panel should show **SAFE BYPASS · Caelum-4361 b** instead of safety-dropping through the parent. Allow the trip to continue and verify it reaches the moon and completes orbit insertion without crossing the parent's guard.
10. Start another FRAME trip and manually disengage before arrival. Manual exit should retain the established explicit behavior: target inertial-velocity matching, not automatic orbit insertion.
11. Regress the accepted surface path: target the detailed home world, LAND, confirm continuous rotating-surface astronomy/PAUSE SKY, SAVE/LOAD, then TAKEOFF cleanly.
12. Watch NAV scrolling, selector size, MFD readability, touch targets, 60-FPS behavior and thermals in short iPhone landscape.

Realism interpretation: FRAME remains fictional. The arrival orbit is an instantaneous two-body osculating state using the target's live mass/radius/velocity. The Hill constraint is conservative but approximate, and atmosphere/aerodynamics are still unmodeled. LOG SURVEY is a navigation aid, not a physical distance plot.

## GitHub Pages deployment

Repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable must unzip directly into the repository root and contain no `.github/workflows/*` files. After upload/reload, confirm **v0.1.4.8**, **NAVSYS-148**, **WebGL2 iOS**, the new BODY CATALOG/map modes, and the existing four-MFD cockpit. If an older marker appears, Safari/GitHub Pages is serving stale files.

Automated QA cannot prove physical iPhone WebKit presentation, touch ergonomics, thermal behavior, or subjective map readability. Physical Safari remains the release gate.

---

## Historical v0.1.4.7.1 surface astronomy diagnostics / pause gate

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
