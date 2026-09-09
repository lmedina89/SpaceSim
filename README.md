# Universe Lab v0.1.1.3 — iOS Hold Input & Pilot Layout Hotfix

A mobile-first browser-based 3D scientific sandbox built around one deterministic seeded solar system, a spacecraft laboratory, real Newtonian trajectories, and future plug-in experiments ranging from impacts and fluids to particle life and quantum demonstrations.

This archive is **GitHub repository-root ready**. Unzip it directly into the repository root. There is no wrapper folder and there are deliberately **no `.github/workflows/*` files**, preserving compatibility with iPhone Git clients whose OAuth tokens cannot modify GitHub Actions workflows.


## What changed in v0.1.1.3

Physical iPhone testing showed WebKit text-selection handles could appear during sustained THRUST/REV/DAMP presses and steal the active pointer. This hotfix treats the flight surface as a game controller rather than selectable page content.

- Suppresses iOS text selection, drag gestures, long-press callouts, and context menus on the simulator control surface while preserving normal editing inside LAB inputs/selects.
- Hold controls use `touch-action: none`, pointer capture, `lostpointercapture`, capture-phase document `pointerup`/`pointercancel`, visibility-change, and window-blur release paths so an interrupted touch cannot leave a thruster stuck on.
- Active holds now have a clear pressed visual state and `aria-pressed` state.
- Main thrusters use a larger two-column pilot cluster: a large THRUST pad plus separate REV and DAMP pads.
- Landscape bottom navigation is narrowed and shifted into the clear region between LOOK and the thruster cluster instead of crowding the flight controls.
- Portrait preserves a full-width navigation strip but keeps the larger flight cluster above it.
- The 0.1.1.1 visual motion cues, scientific state, gravity, integration, trajectories, save schema, and experiment behavior are unchanged.

## What changed in v0.1.1

### Scientific spacecraft instrumentation

- Tap visible celestial bodies to target them, or use **TARGET** to select the body nearest the reticle direction.
- **SCAN** exposes target-relative center distance, surface altitude, relative/radial velocity, local target gravity, escape speed, circular speed, osculating eccentricity, periapsis, apoapsis, and bound/unbound state.
- The scanner clearly separates **two-body osculating telemetry** from the full current **N-body trajectory prediction**.
- **AIM TARGET** rotates ship attitude toward the selected object without applying thrust.

### N-body trajectory prediction

- **PATH** draws a forward-predicted spacecraft trajectory.
- Prediction clones the current major-body state and integrates the entire cloned massive system plus the ship/projectile using the same direct Newtonian gravity + velocity-Verlet model as the live simulation.
- 1 h, 6 h, 1 d, 7 d, and 30 d horizons are available.
- Finite-radius contacts use swept segment/sphere checks between integration steps, reducing missed collisions on coarse prediction steps.
- Minor test particles and future pilot inputs are intentionally excluded from prediction.

### Improved spacecraft control

- Forward thrust: 20 m/s².
- Reverse thrust: 12 m/s².
- RCS translation: ±6 m/s² on ship-local right/up axes.
- Roll control rotates the view/control frame around the forward vector.
- Touch LOOK controls yaw/pitch attitude.
- DAMP remains an explicitly fictional inertial-damping navigation aid.
- This is a 6-DOF-style control foundation, **not yet a rigid-body angular-momentum/torque simulation**.

### Configurable physical mass launcher

The launcher now accepts:

- material preset,
- editable bulk density,
- mass,
- launch speed.

Spherical radius is derived from mass and bulk density. The selectable material presets are porous rock, water ice, basalt, and iron-rich material.

**PREVIEW TRAJECTORY** shows the launch path before the object is created and reports a predicted finite-radius contact when one occurs within the selected horizon. The launched object then becomes a normal major gravity source in the live simulation.

### Seeded-system upgrade

- Star mass, radius, temperature, luminosity proxy, and spectral class are deterministic from the seed.
- Planet initial states now use low-eccentricity near-Keplerian orbits rather than circular-only placement.
- Deterministic moons are generated where the parent Hill sphere allows a conservative satellite region.
- Planet/moon local state is barycentrically corrected.
- The entire generated system is shifted into a center-of-mass rest frame.
- One primary and one secondary non-gas world can be tagged as future detailed-surface candidates. No terrain is claimed yet.

### Collision telemetry

Major-body finite-radius contact now reports:

- relative contact speed,
- center-of-mass kinetic energy using reduced mass,
- reduced-mass relative momentum,
- specific impact energy `Q_R = E_cm / (m1 + m2)`.

There is still deliberately **no fake crater, fragmentation, explosion, or deformation response**. That is the next impact milestone.

### Performance instrumentation

The HUD now separates:

- FPS,
- physics-frame cost,
- render-call cost,
- trajectory-prediction cost,
- draw calls when the renderer backend exposes them,
- major-body count,
- minor test-particle count.

## GitHub Pages — phone-safe deployment

1. Unzip this archive directly into the root of the GitHub repository.
2. Commit/push to `main`.
3. GitHub → **Settings → Pages**.
4. Choose **Deploy from a branch**.
5. Select **main** and **/(root)**.
6. Save.

Do not add a Pages Actions workflow when using a phone Git client that lacks GitHub's `workflow` OAuth scope.

## Controls

### iPhone / touch

- **LOOK**: drag to yaw/pitch.
- **THRUST**: forward acceleration.
- **REV**: reverse acceleration.
- **DAMP**: fictional inertial damping.
- **RCS**: opens local-axis up/down/left/right translation and roll controls.
- Tap a visible body: select target.
- **TARGET**: target nearest reticle direction.
- **SCAN**: detailed telemetry.
- **PATH**: toggle spacecraft predicted trajectory.
- **LAB**: seed generation, time warp, particle count, trajectory horizon, launcher, black hole.

### Keyboard

- `W`: forward thrust
- `X`: reverse thrust
- `S`: damping
- `A` / `D`: left/right RCS
- `R` / `F`: up/down RCS
- `Q` / `E`: roll
- Arrow keys: yaw/pitch
- `T`: target nearest reticle direction
- `P`: trajectory path toggle

## Architecture priorities

1. Scientific simulation state is independent of rendering.
2. Authoritative state uses SI units + Float64.
3. Exact direct Newtonian gravity remains the small-N backend.
4. High-count fields remain typed-array data, not object-per-particle state.
5. Renderer works in a floating spacecraft-local frame.
6. Specialized future solvers plug into the universe rather than replacing the universe core.

See `ARCHITECTURE.md` and `SCIENTIFIC-NOTES.md`.

## Validation

```bash
npm run qa
```

v0.1.1 contains 13 automated numerical/unit tests plus repository/syntax checks. See `QA-REPORT.md` for the release results and known limitations.

## Next planned milestone

**v0.1.2 — Impact, Fragmentation & Explosion Foundation**

The intent is to turn physically measured contact events into a scalable response pipeline: continuous/swept collision handling for launched bodies, impact geometry, physically budgeted fragmentation/ejecta, persistent debris, and visual explosion effects driven by the computed energy rather than arbitrary animation strength.

### Mobile v0.1.1.3 flight hotfix

On iPhone, the app now tracks the *visible* Safari viewport, keeps THRUST/REV/DAMP in a compact horizontal portrait row, uses a six-button primary bar with a MORE drawer, and keeps ship speed visible. A purely visual navigation-reference streak field makes inertial travel readable even though the scientific floating origin and astronomical scale remove much of the parallax players expect from ordinary games. Use **WARP** for real time-compression when you want to cross orbital distances faster; it cycles through 1×, 60×, 600×, and 3,600×.
