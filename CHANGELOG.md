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
