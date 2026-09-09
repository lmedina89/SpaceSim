# Universe Lab v0.1.4.6.1 — Interactive 3D Cockpit Visual Foundation QA Report

## Release identity

- Version: **0.1.4.6.1**
- Build marker: **COCKPIT-1461**
- Baseline archive SHA-256: `2c150f00091dc07382ca4880d618aa3b6b20ee5c0ae10cd576ffce3e1fa71cdb`
- Baseline identity: **v0.1.4.6 / SKYOBS-146**
- Save schema: **1**, unchanged
- Three.js: **0.185.0**, pinned
- Deployment: GitHub Pages branch root; no workflows
- Physical release gate: **iPhone/iPad Safari/WebKit**

## Scope implemented

- Added `src/render/cockpitView.js`, a camera-attached procedural Three.js cockpit shell.
- Kept the forward astronomy window deliberately large: low glare shield/dashboard plus thin side/upper canopy structure instead of a view-blocking cockpit cave.
- Added three live CanvasTexture MFDs: **NAVIGATION**, **FLIGHT**, **SCIENCE**.
- NAV shows target, range, relative velocity, guidance mode and simulation warp.
- FLIGHT shows inertial ship speed, engine mode, acceleration cap, active control state and simulation time/warp.
- SCIENCE shows target class, physical radius, temperature, local target gravity and scientific-overlay state.
- Every visible cockpit screen is touch-active: NAV opens System Map, FLIGHT opens Flight/System, SCIENCE opens Science.
- Every visible physical cockpit key is functional: **MAP, TGT, APPR, ENG, PRO, RET, SCAN, SCI, OVR**.
- Cockpit ray-picking runs before celestial-body picking so a real cockpit control cannot accidentally target a body behind it.
- Existing UniverseLabApp systems remain authoritative. Cockpit inputs only route to existing navigation/engine/scanner/science/overlay actions.
- Existing COCKPIT ON/OFF preference remains schema-1 compatible.
- Cockpit auto-hides in OBSERVE and local surface modes and returns in SHIP VIEW.
- Removed the old decorative CSS dashboard/struts from the visible shell; retained only subtle glass/reflection/status presentation above the 3D renderer.
- No external cockpit model or texture asset is bundled, preserving a clean later path to replace the procedural shell with an optimized GLB.

## Regression boundaries preserved

The cockpit pass does not modify:

- direct Newtonian gravity,
- velocity-Verlet integration,
- `ShipDynamics` physics authority,
- canonical astronomical observer math,
- inertial star catalog / surface sky continuity,
- landing/descent/ascent lifecycle or recovery,
- magnetar Newtonian behavior,
- BOOST/TRANSIT physics boundaries,
- save schema,
- Three.js version, or
- the accepted iPhone/iPad WebKit forced-WebGL2 backend policy.

## Automated verification

- `npm run check`: **PASS**
- Static structure/import-token checks: **PASS**
- Every JS/MJS file via `node --check`: **PASS**
- `npm test`: **148/148 PASS**
- Cockpit-specific automated tests: **5 new tests PASS**
- Save schema: **1**
- Three.js import map: **0.185.0**
- iPhone/iPad renderer policy regression tests: **PASS**
- Astronomical observer/sky-continuity regressions: **PASS**
- Landing/ascent handoff regressions: **PASS**
- Clean-unzip GitHub-root layout: **PASS**
- `.github/workflows/*`: **absent**
- Local static HTTP resource checks for shell, CSS, main/app/renderer/cockpit modules and VERSION.json: **HTTP 200 PASS**

## Performance design review

Cockpit geometry is static and camera-attached. It uses shared materials, three bounded-resolution CanvasTextures, and a bounded ~180 ms screen refresh cadence instead of repainting MFD text on every render frame. Interaction uses ray-picking only on completed taps. No GLB loader, post-processing stack, dynamic reflection probe, or additional simulation loop was added.

## Physical iPhone release gate

Automated checks cannot establish final visual proportion, MFD legibility, touch hit accuracy, WebKit framebuffer behavior, sustained FPS, or thermal performance. Follow the first checklist in `MOBILE-GITHUB-PAGES.md` on the physical iPhone.

Do not declare v0.1.4.6.1 physically accepted until the user confirms the cockpit view, all 12 cockpit touch surfaces (3 MFDs + 9 physical keys), normal sky targeting, COCKPIT OFF/ON, OBSERVE return, LAND/TAKEOFF return, and sky-continuity regression sequence.
