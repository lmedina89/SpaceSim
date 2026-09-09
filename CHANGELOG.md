# Changelog

## v0.1.2.1 — Impact Stability & Scientific Flight Navigation Polish — 2026-09-08

- Replaced fictional DAMP velocity deletion with bounded physical BRAKE acceleration opposite inertial velocity.
- Added FLIGHT (20 m/s²) and CRUISE (120 m/s²) declared experimental propulsion modes.
- Added target-relative APPROACH and MATCH VELOCITY guidance using bounded acceleration commands.
- Added braking-safe approach velocity envelope and stopping-distance telemetry.
- Added navigation auto-warp (600× / 60× / 1×) that automatically steps simulation-time compression down near the target.
- Added navigation HUD with phase, remaining distance, closing speed, and braking distance.
- Reduced primary resolved impact fragments from up to six to at most two.
- Reduced resolved fragment mass share for planet/moon impacts to at most ~8% of impactor mass.
- Added 16-body active resolved-impact-fragment sub-budget below the 128 direct-gravity ceiling.
- Secondary resolved-fragment impacts produce no additional resolved gravity fragments.
- Same breakup-family fragments are collision-filtered; new fragments also receive collision grace.
- Reduced resolved-fragment minimum render size substantially.
- Bounded simultaneous impact FX and reduced additive flash stacking.
- Save schema remains 1; Three.js remains 0.185.0; no GitHub workflow files.

## v0.1.2 — Impact, Fragmentation & Explosion Foundation — 2026-09-08

- Added swept finite-radius major-body contact detection to reduce high-speed tunneling.
- Added isolated impact-analysis and impact-resolver modules.
- Added bounce, merge, absorb, and energetic-fragment response classes.
- Added momentum-conserving low-speed bounce and merge momentum handling.
- Added gravity-regime crater scaling based on the Collins/Melosh/Marcus relation with simple/complex final-diameter handling.
- Added persistent per-body impact/crater records without changing save schema 1.
- Added up to six large Newtonian fragment bodies under the existing direct-gravity source budget.
- Added visual-only energy-scaled flash, shock/ejecta ring, and directional ejecta particles.
- Added LAB impact presets: Small Meteor, Tunguska-ish, Chicxulub-class, Moonlet.
- Added scanner recorded-impact count and richer last-impact telemetry.
- Reworked planet readability after real iPhone testing proved v0.1.1.3 insufficient: non-stellar bodies now use a faint color-preserving emissive/exposure shell in addition to stellar StandardMaterial shading.
- Kept SI gravity, ship dynamics, trajectory prediction, seeded generation, time warp, iOS hold-input fixes, and save schema unchanged.

## v0.1.1.2 — iOS Hold Input & Pilot Layout Hotfix — 2026-09-08

Physical iPhone testing of v0.1.1.1 showed sustained flight-button presses could trigger WebKit text-selection handles/callouts and transfer the pointer away from THRUST/REV/DAMP. Landscape controls were also still visually crowded.

### Corrected

- Disable text selection, drag selection, long-press callouts, and context menus on the interactive simulator surface while leaving LAB inputs/selects editable.
- Harden hold lifecycle with pointer capture, lost-capture release, capture-phase document pointer release, visibility-change release, and window-blur release.
- Add explicit held-state feedback and `aria-pressed` updates.
- Recompose main thrusters into a larger thumb-safe cluster with a tall THRUST pad and separate REV/DAMP pads.
- Narrow/shift the landscape navigation strip into the free center region so it no longer crowds the right-side pilot cluster.
- Preserve the v0.1.1.1 scientific motion cues and all authoritative physics unchanged.

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

## v0.1.1.3 — Stellar Lighting Readability Hotfix

- Fixed generated planets and moons appearing nearly featureless black at ordinary planetary distances.
- Root cause: inverse-distance PointLight attenuation was being evaluated after astronomical positions were compressed into renderer units, so the visual irradiance collapsed even though body colors/materials were present.
- Stellar lighting is now exposure-normalized in render space (`PointLight` decay 0) while retaining the star as the positional light source, preserving the correct starward day/night hemisphere orientation.
- Stellar light color now follows the generated star color.
- Reduced ambient illumination so true night sides remain very dark instead of becoming uniformly game-lit.
- This is a rendering-only correction. SI gravity, masses, trajectories, ship dynamics, collisions, time integration, and saves are unchanged.
