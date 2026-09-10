# Universe Lab v0.1.4.7.1 — Surface Astronomy Diagnostics & Pause Control QA Report

## Release identity

- Version: **0.1.4.7.1**
- Build marker: **ASTROHUD-1471**
- Direct baseline: **physically accepted v0.1.4.7 — Planetary Rotation & Continuous Surface Astronomy Foundation**
- Save schema: **1 unchanged**
- Three.js: **0.185.0 unchanged**
- Major-body physics: **direct Newtonian gravity + velocity-Verlet unchanged**
- Surface spacecraft boundary: **ShipDynamics/navigation remain excluded while landed**
- iPhone/iPad WebKit policy: **forced WebGL2 backend retained**

## Scope verified

### Read-only surface astronomy diagnostics

- Added DETAILS fields for procedural body-fixed latitude/longitude, current body rotation phase, primary-star altitude/azimuth, and geometric local solar time.
- Primary-star ALT/AZ is read from the same canonical `AstronomicalObserverModel` body record passed to the surface renderer.
- Surface HUD refresh occurs after the canonical observer solve and before rendering so diagnostics/rendering share one astronomical frame.
- `localSolarTimeHours()` uses body-fixed observer longitude minus primary-star substellar longitude; 12:00 is local meridian transit.
- Longitude zero is explicitly procedural and is not presented as a real planetary cartographic datum.

### Accessible landed astronomy pause

- Added **PAUSE SKY / RESUME SKY** inside surface DETAILS.
- It toggles the existing `running` flag already used by v0.1.4.7 to gate landed celestial `SimulationClock.advance()`.
- Local movement and deterministic surface weather remain driven by `realDt` and continue while celestial time is paused.
- The button is enabled only in `LANDED`; descent and ascent lifecycle behavior is not changed.
- The hidden Flight/System PAUSE control and the surface control synchronize labels through one UI sync method.

### Compatibility / protected systems

- Save schema remains 1; no new persistent field is required.
- No change to generated rotation metadata, body-fixed anchor serialization, N-body integration, ShipDynamics, FRAME translation/exit matching, cockpit MFD geometry, renderer backend policy, or takeoff handoff physics.
- Cache tags advance to `?v=1471` through HTML → main → app → renderer/cockpit paths to reduce mixed-version Safari loads.

## Automated QA

`npm run qa` on the release worktree:

- Static structure: **PASS — 43 required files**.
- JS/MJS syntax: **PASS**.
- Node tests: **177/177 PASS**.
- New coverage verifies noon/midnight local-solar-time geometry, surface diagnostic shell/wiring, canonical observer reuse, SKY pause gating, and HUD/render ordering.
- Existing 1.4.7 planetary rotation, exact legacy `ORIGIN-001` orbital signature, surface save/load/ascent, observer continuity, cockpit/MFD, FRAME isolation, gravity, trajectory, WebKit backend and mobile-input tests all remain passing.

## Physical iPhone gate

1. Confirm **v0.1.4.7.1 / ASTROHUD-1471 / WebGL2 iOS**.
2. LAND and verify all four new diagnostic values are finite.
3. Verify LAT/LON remains stable at one site while rotation phase and star ALT/AZ evolve.
4. PAUSE SKY: Astronomy time/rotation phase stop; walking and weather continue.
5. RESUME SKY: celestial diagnostics resume continuously with no sky reseed.
6. SAVE/LOAD (including optionally while paused) and verify button/readout continuity.
7. TAKEOFF and repeat the already accepted v0.1.4.7 ascent/orbit handoff check.
8. Check short-landscape HUD fit/FPS/thermals.

## Scientific boundaries retained

This hotfix does **not** add phase shading, eclipses/occultations, atmospheric radiative transfer/scattering, seasons, precession/nutation, tidal spin evolution, terrain rigid-body contact, aerodynamics, or MHD. ALT/AZ and local solar time are geometric observer diagnostics only.

## Protected-source comparison

A file-level comparison against the physically accepted v0.1.4.7 archive found no unexpected source changes. Gravity, velocity-Verlet, ShipDynamics, system generation, canonical astronomical observer math, surface renderer, cockpit geometry, landing-transition code, save system, FRAME module, and WebKit backend policy remain byte-for-byte unchanged. Intended edits are limited to app/UI/version/docs/tests plus the pure local-solar-time helper in `planetaryRotation.js`.

## Static hosting smoke

**PASS.** A self-contained local HTTP probe returned HTTP 200 for `/`, `styles.css?v=1471`, `src/main.js?v=1471`, `src/app/app.js?v=1471`, the versioned renderer/HUD/cockpit chain, `src/core/planetaryRotation.js`, and `VERSION.json`.
