# Universe Lab v0.1.4.7 — Planetary Rotation & Continuous Surface Astronomy Foundation QA Report

## Release identity

- Version: **0.1.4.7**
- Build marker: **ROTASTRO-147**
- Direct baseline: **v0.1.4.6.1.3.1 — Cockpit MFD Transparency & Engineering Diagnostics Polish**
- Save schema: **1 unchanged**
- Three.js: **0.185.0 unchanged**
- Major-body physics: **direct Newtonian gravity + velocity-Verlet retained**
- iPhone/iPad WebKit policy: **forced WebGL2 backend retained**

## Scope verified

### Deterministic planetary rotation

- Added `src/core/planetaryRotation.js` for rigid body-fixed/inertial transforms, finite spin phase, tangent-basis construction and landing-anchor capture.
- Generated planets and moons receive finite deterministic rotation metadata.
- Rotation uses an **independent per-body seeded RNG stream** and does not consume the legacy orbital system-generation RNG.
- A locked pre-v0.1.4.7 `ORIGIN-001` orbital signature verifies existing body positions/velocities are not perturbed by the new metadata.

### Body-fixed surface observer

- Touchdown captures a normalized body-fixed surface direction plus capture-time/model metadata.
- `solveSurfaceObserver()` converts that anchor into the current inertial local-up direction and derives the tangent east/north frame from the parent body's spin axis.
- Older schema-1 sessions without the new anchor retain the legacy inertial-position fallback rather than failing load.

### Continuous landed celestial time

- Surface mode no longer freezes the celestial simulation merely because the local scene is active.
- `surfaceAstronomyStep()` advances the authoritative major-body world through the existing integrator while deliberately **not** calling ordinary spacecraft `ShipDynamics.step()` or navigation.
- Surface astronomical time is forced to **1×** in this foundation build; high time-warp is blocked while landed.
- PAUSE may stop celestial time while local surface exploration/weather remains responsive.
- TAKEOFF hands the spacecraft back to a safe orbit around the parent body's current advanced state and retains the accepted multi-frame ascent verification path.

### Dynamic inertial sky projection

- Surface mode continues to use the same deterministic inertial star catalog as space.
- Star/horizon reprojection uses preallocated buffers and a bounded update cadence to avoid rebuilding/reseeding the catalog or performing a full 23k-star allocation each render.
- Live Sun/major-body directions continue to come from the canonical astronomical observer.
- Daylight/twilight/night presentation responds to physically derived stellar altitude; it remains a visual exposure proxy, **not** atmospheric radiative transfer/scattering.

### Save/cache compatibility

- Save schema remains **1**.
- Existing generated bodies from older saves deterministically backfill rotation metadata while preserving saved physical mass/radius/position/velocity.
- Active surface sessions may optionally persist the body-fixed anchor and capture metadata.
- Shell/module cache tags are updated to `?v=147` to reduce mixed-version Safari/GitHub Pages loads.

## Automated QA

`npm run qa` on the release worktree:

- Static structure: **PASS — 43 required files**.
- JS/MJS syntax checks: **PASS**.
- Node test suite: **173/173 PASS**.
- New focused coverage verifies rotation round-trips and periodicity, translating/rotating body-fixed observers, preallocated inertial-star horizon reprojection, spacecraft-isolated surface N-body stepping, body-fixed session serialization, old-save rotation backfill, and the locked legacy `ORIGIN-001` orbital signature.
- Existing cockpit/MFD, FRAME isolation, gravity, trajectory, observer continuity, landing/takeoff recovery, renderer-backend, cosmic/weather, navigation and mobile-input regression tests remain passing.

## Scientific boundaries retained

This release does **not** claim atmospheric scattering/radiative transfer, seasons, axial precession/nutation, tidal spin evolution, terrain rigid-body contact, aerodynamics, physically integrated landing/ascent, phase shading, eclipses/occultations, or magnetohydrodynamics. The new rotation system is a deterministic rigid observer foundation intended to support those later layers without faking them now.

## Physical release gate

Automated QA cannot certify physical iPhone WebKit presentation, dynamic-starfield thermal cost, subtle sidereal drift readability, touch ergonomics, or the surface-to-orbit framebuffer handoff. Physical iPhone Safari remains the release gate.

Primary checks after GitHub upload/reload:

1. Confirm **v0.1.4.7**, **ROTASTRO-147**, and **WebGL2 iOS**.
2. LAND and verify **SKY TIME** advances at 1× while **ROTATION** reports a finite period/direction.
3. Verify the star pattern is continuous through descent/landing and then evolves without reseeding as the body-fixed horizon rotates.
4. PAUSE/RESUME on the surface and confirm only celestial time pauses; local exploration/weather remains usable.
5. SAVE/LOAD while landed and verify the same local site returns without a sky-frame discontinuity.
6. TAKEOFF and confirm visible orbital rendering, parent-relative safe return, immediate control response, and the existing `ORBIT VERIFIED` handoff behavior.
7. Run the surface for several minutes and watch FPS/thermals for sustained regression.

## Static hosting smoke

**PASS.** A self-contained local HTTP probe returned HTTP 200 for `/`, `styles.css?v=147`, `src/main.js?v=147`, the versioned main → app → renderer/HUD → cockpit module chain, the new `src/core/planetaryRotation.js`, and `VERSION.json`.
