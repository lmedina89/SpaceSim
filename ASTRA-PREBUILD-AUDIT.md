# Astra Pre-build Audit — v0.1.4.6

## Verified baseline

- Input SHA-256 exactly matches `eb4b2a66d9d323718e36525cf8dd2701495425fd41f1bbbb45ecc9f38f5132d0`.
- Repository-root ZIP; no wrapper directory and no `.github/workflows/*`.
- Runtime/package version `0.1.4.5.4`, marker `RENDER-1454`, save schema `1`.
- Three.js import map remains pinned to `0.185.0`.
- `WebGPURenderer` receives boot-time `forceWebGL` for iPhone/iPad-class WebKit; no live backend swap.
- `npm run qa`: 123/123 passing, including static structure and all JS/MJS syntax checks.
- Untouched baseline committed as `d8469f14838eed26559b4a976770bf11822bebf7`.

## Existing capabilities to reuse

- `EntityRegistry` owns live finite-radius body records; body positions/velocities are SI `Float64Array` state.
- `DirectGravitySolver` and `VelocityVerletIntegrator` already provide mutual Newtonian major-body motion.
- `ShipDynamics` owns spacecraft position, velocity, yaw/pitch/roll and an orthonormal forward/right/up basis.
- `FloatingReferenceFrame` already converts authoritative inertial positions to camera-relative render coordinates.
- `SimulationClock.elapsedSimSeconds` is the canonical orbital time. App surface mode intentionally stops it while `surfaceWeather` advances separately.
- Space bodies already render from live relative positions. `stellarPerception` already separates physical apparent-angle inputs from visual LOD/exposure response.
- Seeded stars/band/nebulae are deterministic, generated once per `resetSystem`, and not rebuilt per frame.
- Surface session persists local x/z/yaw/pitch and weather under optional schema-1 fields.
- Landing/takeoff has a protected ORBIT→DESCENDING→LANDED→ASCENDING→ORBIT lifecycle, renderer-detach ordering, input release, live 1× restore and three-frame orbital verification.

## Actual gaps

- There is no canonical observer object joining inertial position, look basis, mode, parent body, local anchor, altitude, horizon and simulation time.
- Space flight computes camera basis from `ShipDynamics`; surface independently assumes local +Y up and uses unrelated local x/z coordinates.
- `SurfaceWorldVisual` constructs a fixed decorative sky gradient and fixed fake Sun direction. It never receives live body positions.
- The deterministic space starfield is absent from the separate surface scene. Landing therefore replaces it with an unrelated sky presentation.
- No reusable major-body observation records provide physical range, direction, angular radius or horizon state.
- No fixed-time transition diagnostic or observer-equivalence test exists.
- Generated surface regions have no explicit spherical anchor metadata. The frozen pre-landing ship/body radial vector can supply a deterministic anchor and survives schema-1 save/load without duplicate state.
- Controlled audit confirms two separated magnetars accelerate mutually at the Newtonian expected magnitude. Repeated LAB magnetar spawns currently receive identical position and velocity, producing a zero-direction degenerate pair.

## Proposed architecture and files

- Add `src/core/astronomicalObserver.js`: pure finite-vector/basis math plus a reusable `AstronomicalObserverModel` that updates stable observer/body records without mutating inputs.
- Extend `src/render/starfield.js`: separate deterministic inertial catalog creation from scene-view creation; reuse one catalog for space and surface, transform to the fixed local horizon only when entering a surface.
- Update `src/render/threeRenderer.js`: own the catalog, consume the canonical ship observer, keep the inertial star shell centered on the active camera, and pass the shared catalog/astronomy solution into surface rendering.
- Update `src/render/surfaceWorld.js`: replace the fixed Sun with live astronomical directions, horizon visibility, shared inertial stars and atmosphere/exposure hooks. Keep terrain/weather/local ship systems intact.
- Update `src/app/app.js`: construct/reconstruct observer solutions from live ship/body/session state; pass them to both render paths; record optional debug-only transition diagnostics.
- Update `src/experiments/labSpawner.js`: deterministic serial-based lateral/radial offsets for compact-object LAB placement, with collision-safe clearance and no magnetic force.
- Add focused observer/starfield/magnetar tests and extend static checks.
- Update required release documentation and identity files after core tests pass.

## Protected behavior

- No observer/renderer code may write body or spacecraft physics state.
- Preserve Newtonian gravity, velocity-Verlet, SI/Float64 ownership, flight computer, TRANSIT isolation, surface-time hold, cockpit overlay and all accepted landing/ascent hardening.
- Preserve `WebGPURenderer` plus iOS/iPadOS WebGL2 boot policy and Three.js 0.185.0.
- Do not add native WebGPU switching, MHD/magnetic forces, GR claims, full catalog import or 3D cockpit work.

## Save compatibility

- Keep schema `1` and storage key unchanged.
- Persist no observer cache. Reconstruct ship observers from saved `ShipDynamics`; reconstruct landed local up from the restored frozen ship-to-parent-body radial vector and local x/z/yaw/pitch.
- Treat malformed/non-finite observer inputs as a bounded safe fallback and test them; never write fallback state into physics.

## Performance risks and controls

- One cached 18,000-star inertial catalog; no per-frame generation or large-catalog transforms.
- Build a transformed surface star buffer only on surface entry; per-frame work is group translation/opacity, not catalog recomputation.
- Reuse observer vectors and body records; body solution remains O(number of major bodies), while existing gravity remains unchanged.
- Use relative-to-observer positions for precision. Keep physical angular radii separate from clamped visual proxy sizes.
- Atmospheric visibility changes material opacity; it does not delete astronomical records.

## Test plan

- Observer position/basis/finite guards; surface anchor/up/horizon basis; direction/range/angular radius; above/below horizon.
- Fixed-time descent→surface and surface→orbit direction continuity under equivalent observer state.
- Shared star catalog identity/determinism/no landing reseed; surface horizon transform.
- Save/load-equivalent observer reconstruction without schema change.
- Input immutability and renderer/static isolation checks.
- Existing iOS backend and ascent suites remain mandatory.
- Controlled magnetar pair gravity plus deterministic non-overlapping repeated LAB spawn.

## Stretch decision

- Accept the confirmed small magnetar placement repair and atmosphere/exposure hooks.
- Defer body rotation evolution, moving surface ephemerides, phases/eclipses, real-star catalog import, full scattering, GR/MHD and 3D cockpit. Fixed orbital time remains the explicit surface-sky time model for this release.
