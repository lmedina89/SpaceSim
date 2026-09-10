# Universe Lab v0.1.4.6.1.3.1 — Cockpit MFD Transparency & Engineering Diagnostics Polish QA Report

## Release identity

- Version: **0.1.4.6.1.3.1**
- Build marker: **MFDENG-146131**
- Direct baseline: **v0.1.4.6.1.3 — Frame Drive & Cockpit Flight-Control Polish**
- Save schema: **1 unchanged**
- Three.js: **0.185.0 unchanged**
- Orbital physics: **direct Newtonian gravity + velocity-Verlet unchanged**
- iPhone/iPad WebKit policy: **forced WebGL2 backend unchanged**

## Scope verified

### Four-screen translucency

- NAVIGATION, FLIGHT, SCIENCE and SYSTEM DIAGNOSTICS remain camera-attached Three.js/CanvasTexture MFDs at their existing transforms.
- All four displays now use semi-transparent smoked-glass canvas backgrounds so the outside scene can remain faintly visible through them.
- Telemetry/text is still drawn at normal canvas opacity for legibility.
- Transparent display materials disable depth writes to avoid treating the glass panes as opaque depth blockers.

### Diagnostics edge polish

- SYSTEM DIAGNOSTICS remains at the accepted v0.1.4.6.1.3 position `[0.755, 0.150, -0.815]`.
- Its canvas cyan outline is reduced from a 4 px outer stroke to a 2 px outer stroke with a subtler inner line.
- Its physical bezel is independently slimmed to `0.020` padding / `0.018` depth.
- The decorative cyan projector rail is narrowed and moved outside the screen edge so it should no longer mask right-side telemetry.

### Dedicated engineering interaction

- Tapping the center FLIGHT MFD still opens **FLIGHT / SYSTEM**.
- Tapping SYSTEM DIAGNOSTICS now opens a separate **ENGINEERING / DIAGNOSTICS** drawer.
- The engineering drawer is read-only and mirrors renderer, FPS, physics/render time, ship speed, sim time, seed, major/test counts, draw calls, prediction timing, experiment particle count and experiment-step timing.
- No engineering value is written back into the simulation.

### Safari/GitHub Pages cache hardening

- HTML loads `styles.css?v=146131` and `src/main.js?v=146131`.
- The changed JS module path is version-propagated through main → app → renderer/HUD → cockpitView so a refreshed build is less likely to combine a new shell with stale cockpit code.

## Automated QA

`npm run qa` on the release worktree:

- Static structure: **PASS** — 42 required files.
- JS/MJS syntax checks: **PASS**.
- Node test suite: **163/163 PASS**.
- New focused coverage verifies translucent MFD presentation, unchanged diagnostics transform, slim bezel/projector rail, dedicated engineering routing and live read-only telemetry wiring.
- Existing FRAME isolation, gravity, integration, observer, landing/takeoff, surface, cosmic, renderer-backend, navigation and mobile-input tests remain passing.

## Physical release gate

Automated QA cannot certify visual alpha balance, text readability over bright planets/stars, the exact apparent thickness of the diagnostics edge on physical iPhone WebKit, touch ergonomics, or thermal behavior. Physical iPhone Safari remains the release gate.

Primary checks after GitHub upload/reload:

1. Version reads **v0.1.4.6.1.3.1** and diagnostics reports **WebGL2 iOS**.
2. All four cockpit MFDs are slightly transparent but remain readable.
3. The diagnostics right/lower edge no longer looks blocked by an oversized cyan strip.
4. Tapping SYSTEM DIAGNOSTICS opens **ENGINEERING / DIAGNOSTICS**, not FLIGHT / SYSTEM.
5. Tapping FLIGHT still opens FLIGHT / SYSTEM.
6. THRUST / REV / BRAKE and FRAME remain unchanged from the accepted v0.1.4.6.1.3 behavior.

## Static hosting smoke

A local static HTTP server returned **HTTP 200** for `/`, the versioned CSS/main entry points, the versioned app/HUD/renderer/cockpit module chain, and `VERSION.json`.
