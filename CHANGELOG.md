# Changelog

## v0.1.1 — Scientific Flight & Experiment Control — 2026-09-08

Built directly from the phone-safe v0.1.0.1 baseline.

### Added

- Tap/reticle target selection and persistent target marker.
- Flight scanner with target-relative gravity/orbit telemetry.
- Two-body osculating eccentricity, periapsis, apoapsis, escape/circular speed, radial velocity, and orbital-energy state.
- Forward N-body trajectory predictor using cloned major-body state + velocity-Verlet integration.
- Swept finite-radius collision prediction between trajectory timesteps.
- Toggleable live spacecraft path visualization.
- Configurable 1 h / 6 h / 1 d / 7 d / 30 d prediction horizons.
- Mass-launcher trajectory preview and predicted-contact readout.
- Material/density-driven asteroid radius calculation.
- Forward, reverse, local-axis RCS translation, and roll controls.
- Deterministic low-eccentricity planet generation, spectral/luminosity metadata, moons, Hill-sphere satellite bounds, and barycentric system initialization.
- Collision telemetry for center-of-mass energy, reduced-mass momentum, and Q_R specific impact energy.
- Separate render/prediction performance timings and renderer draw-call telemetry when available.
- New numerical tests for orbital metrics, trajectory prediction, swept collision prediction, spacecraft basis, launcher density/radius, barycentric initialization, and metadata consistency.

### Corrected

- Minor test-particle initial velocities now inherit the central star's barycentric velocity.
- Generated-system center of mass and total momentum are explicitly shifted to the barycentric rest frame.
- Moons receive a larger minimum render radius for practical targeting without changing physical radius.

### Preserved

- Save schema remains 1.
- Phone-safe GitHub Pages branch/root deployment.
- No `.github/workflows/*` files in the distributable archive.
- Three.js remains pinned to 0.185.0.
- Collision response/craters/explosions are still intentionally absent rather than faked.

## v0.1.1.1 — Mobile Flight UX & Motion-Cue Hotfix

Physical iPhone testing of v0.1.1 showed that Safari's visible browser viewport could be shorter than the CSS layout viewport, causing the portrait flight controls and utility bar to extend behind browser chrome. It also showed that scientifically correct astronomical translation can feel visually stationary because the ship-centered floating origin removes ordinary parallax and the decorative deep-star field is intentionally distant.

Changes:
- Synchronize the application height to `window.visualViewport.height` on supported mobile browsers, including resize/orientation/browser-toolbar changes.
- Replace the ten-button bottom utility bar with six primary controls: LAB, TARGET, SCAN, PATH, WARP, MORE.
- Move RCS, SCIENCE, HOME, PAUSE, SAVE, and LOAD into a compact secondary drawer.
- Keep THRUST / REV / DAMP in one horizontal row in portrait instead of a tall right-side stack.
- Compact portrait telemetry so ship speed remains visible while renderer/physics detail is hidden from the top strip.
- Hide the seed/performance chip in portrait; the underlying data remains available in the simulation and desktop layout.
- Fade transient status messages after a short interval so they do not permanently cover flight.
- Add a WARP quick control cycling 1× → 60× → 600× → 3,600×. This changes simulated elapsed time, not spatial rendering scale or gravity equations.
- Add a visual-only logarithmic navigation motion-reference field and small FOV thrust cue. They change no authoritative physics state and exist only to make inertial motion perceptible against astronomical distances.
- Replace the huge target ring with small constant-angular-size target-center brackets.
- HOME/new-system placement now uses the same physical orbital state but starts with a prograde-biased pilot view instead of pointing directly at the target center.
- No save-schema change and no gravity/integrator changes.
